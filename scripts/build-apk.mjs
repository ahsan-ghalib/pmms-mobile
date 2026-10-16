import { spawnSync } from 'child_process';
import { copyFileSync, existsSync, statSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const sdk = join(homedir(), 'AppData', 'Local', 'Android', 'Sdk');
const javaHome = 'C:\\Program Files\\Android\\Android Studio\\jbr';
const expoCli = join(root, 'node_modules', 'expo', 'bin', 'cli');
const gradlew = join(root, 'android', 'gradlew.bat');
const apkDebugSrc = join(
  root,
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  'debug',
  'app-debug.apk',
);
const apkReleaseSrc = join(
  root,
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  'release',
  'app-release.apk',
);
const apkOut = join(root, 'soouqlive-customer.apk');

const env = {
  ...process.env,
  ANDROID_HOME: sdk,
  ANDROID_SDK_ROOT: sdk,
  JAVA_HOME: javaHome,
  PATH: [
    join(javaHome, 'bin'),
    join(sdk, 'platform-tools'),
    join(sdk, 'emulator'),
    process.env.PATH || '',
  ].join(';'),
};

function run(cmd, args, cwd = root) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { cwd, env, stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(join(root, 'assets', 'icon.png'))) {
  console.log('Step 1: Creating placeholder assets...');
  run(process.execPath, [join(__dirname, 'create-assets.mjs')]);
}

if (!existsSync(gradlew)) {
  console.log('Step 2: Generating native Android project...');
  run(process.execPath, [expoCli, 'prebuild', '--platform', 'android', '--no-install']);
} else {
  console.log('Step 2: Android project already exists, skipping prebuild.');
}

console.log('Step 3: Building APK (this may take several minutes)...');
run(gradlew, ['assembleDebug', '--no-daemon'], join(root, 'android'));

console.log('Step 4: Copying APK to project root...');
const builtApk = existsSync(apkDebugSrc) ? apkDebugSrc : apkReleaseSrc;
if (!existsSync(builtApk)) {
  console.error('APK not found after build.');
  process.exit(1);
}

copyFileSync(builtApk, apkOut);
console.log(`\nAPK ready: ${apkOut}`);
console.log(`Size: ${(statSync(apkOut).size / 1024 / 1024).toFixed(2)} MB`);
