import { spawnSync } from 'child_process';
import { createWriteStream, existsSync, mkdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import https from 'https';

const EXPO_GO_URL =
  'https://github.com/expo/expo-go-releases/releases/download/Expo-Go-54.0.6/Expo-Go-54.0.6.apk';
const EXPO_GO_APK = join(homedir(), '.expo', 'android-apk-cache', 'Expo-Go-54.0.6.apk');
const EXPO_GO_PACKAGE = 'host.exp.exponent';
const EXPECTED_SIZE = null;

function getAndroidSdk() {
  return (
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    join(homedir(), 'AppData', 'Local', 'Android', 'Sdk')
  );
}

function adbPath(sdk) {
  const name = process.platform === 'win32' ? 'adb.exe' : 'adb';
  return join(sdk, 'platform-tools', name);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  return result.status ?? 1;
}

function downloadWithNode(url, dest, retries = 5) {
  return new Promise((resolve, reject) => {
    const attempt = (left) => {
      const file = createWriteStream(dest);
      const request = https.get(url, { headers: { 'User-Agent': 'node' } }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          file.close();
          downloadWithNode(response.headers.location, dest, left).then(resolve).catch(reject);
          return;
        }
        if (response.statusCode !== 200) {
          file.close();
          if (left > 0) {
            console.log(`Download failed (${response.statusCode}), retrying...`);
            setTimeout(() => attempt(left - 1), 3000);
            return;
          }
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve());
        });
      });
      request.on('error', (error) => {
        file.close();
        if (left > 0) {
          console.log(`Download error (${error.message}), retrying...`);
          setTimeout(() => attempt(left - 1), 3000);
          return;
        }
        reject(error);
      });
    };
    attempt(retries);
  });
}

async function downloadApk(dest) {
  mkdirSync(dirname(dest), { recursive: true });
  console.log('Downloading Expo Go (this is a large file, ~197 MB)...');

  if (process.platform === 'win32') {
    const status =
      spawnSync(
        'curl.exe',
        [
          '-L',
          '--retry',
          '10',
          '--retry-delay',
          '5',
          '--retry-all-errors',
          '-o',
          dest,
          EXPO_GO_URL,
        ],
        { stdio: 'inherit', shell: false },
      ).status ?? 1;
    if (status === 0) {
      return;
    }
    console.log('curl download failed, trying Node fallback...');
  }

  await downloadWithNode(EXPO_GO_URL, dest);
}

function isApkReady(path) {
  if (!existsSync(path)) {
    return false;
  }
  const size = statSync(path).size;
  return size > 50_000_000;
}

function isExpoGoInstalled(adb) {
  const result = spawnSync(adb, ['shell', 'pm', 'path', EXPO_GO_PACKAGE], {
    encoding: 'utf8',
    shell: false,
  });
  return result.status === 0 && result.stdout.trim().length > 0;
}

async function main() {
  const sdk = getAndroidSdk();
  const adb = adbPath(sdk);

  if (!existsSync(adb)) {
    console.error(
      `adb not found at ${adb}. Install Android Studio and set ANDROID_HOME, or add platform-tools to PATH.`,
    );
    process.exit(1);
  }

  const devices = spawnSync(adb, ['devices'], { encoding: 'utf8', shell: false });
  const hasDevice = (devices.stdout || '')
    .split('\n')
    .some((line) => line.trim().endsWith('device') && !line.startsWith('List'));

  if (!hasDevice) {
    console.log(
      'No Android device/emulator detected. Start your emulator, then run npm run android again.',
    );
    process.exit(0);
  }

  if (isExpoGoInstalled(adb)) {
    console.log('Expo Go is already installed on the device.');
    return;
  }

  if (!isApkReady(EXPO_GO_APK)) {
    try {
      await downloadApk(EXPO_GO_APK);
    } catch (error) {
      console.error(`Failed to download Expo Go: ${error.message}`);
      console.error(
        'You can also install Expo Go from the Play Store on your emulator, then run npm run android again.',
      );
      process.exit(1);
    }

    if (!isApkReady(EXPO_GO_APK)) {
      console.error(
        `Downloaded APK looks incomplete (${statSync(EXPO_GO_APK).size} bytes). Retry npm run android:setup.`,
      );
      process.exit(1);
    }
  } else {
    console.log('Using cached Expo Go APK.');
  }

  console.log('Installing Expo Go on the device...');
  const remoteApk = '/data/local/tmp/expo-go.apk';
  const pushStatus = run(adb, ['push', EXPO_GO_APK, remoteApk]);
  if (pushStatus !== 0) {
    console.error('Failed to copy Expo Go APK to the device.');
    process.exit(1);
  }

  const installStatus = run(adb, ['shell', 'pm', 'install', '-r', remoteApk]);
  if (installStatus !== 0) {
    console.error(
      'Failed to install Expo Go. Try installing it from the Play Store on your emulator.',
    );
    process.exit(1);
  }

  console.log('Expo Go installed successfully.');
}

main();
