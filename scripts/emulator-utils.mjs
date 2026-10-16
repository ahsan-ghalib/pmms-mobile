import { spawn, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AVD_NAME = 'Medium_Phone';

export function getAndroidSdk() {
  return (
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    join(homedir(), 'AppData', 'Local', 'Android', 'Sdk')
  );
}

export function getAndroidEnv() {
  const sdk = getAndroidSdk();
  const sep = process.platform === 'win32' ? ';' : ':';
  return {
    ...process.env,
    ANDROID_HOME: sdk,
    ANDROID_SDK_ROOT: sdk,
    PATH: [join(sdk, 'platform-tools'), join(sdk, 'emulator'), process.env.PATH || ''].join(sep),
  };
}

export function toolPath(sdk, folder, name) {
  const file = process.platform === 'win32' ? `${name}.exe` : name;
  return join(sdk, folder, file);
}

function run(cmd, args, env) {
  return spawnSync(cmd, args, { encoding: 'utf8', shell: false, env });
}

export function resetAdb(env) {
  const sdk = env.ANDROID_HOME;
  const adb = toolPath(sdk, 'platform-tools', 'adb');

  for (const device of listDevices(env)) {
    if (device.state !== 'device') {
      run(adb, ['disconnect', device.id], env);
    }
  }

  run(adb, ['kill-server'], env);
  run(adb, ['start-server'], env);
}

export function listDevices(env) {
  const sdk = env.ANDROID_HOME;
  const adb = toolPath(sdk, 'platform-tools', 'adb');
  const result = run(adb, ['devices'], env);
  return (result.stdout || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('List'))
    .map((line) => {
      const [id, state] = line.split(/\s+/);
      return { id, state };
    });
}

export function hasReadyDevice(env) {
  return listDevices(env).some((d) => d.state === 'device');
}

export function isBootComplete(env) {
  const sdk = env.ANDROID_HOME;
  const adb = toolPath(sdk, 'platform-tools', 'adb');
  const result = run(adb, ['shell', 'getprop', 'sys.boot_completed'], env);
  return (result.stdout || '').trim() === '1';
}

export function startEmulator(env, avd = AVD_NAME) {
  const sdk = env.ANDROID_HOME;
  const emulator = toolPath(sdk, 'emulator', 'emulator');
  if (!existsSync(emulator)) {
    console.error(`Emulator not found at ${emulator}`);
    return false;
  }

  console.log(`Starting ${avd} (low-memory mode for 8GB PCs)...`);
  const child = spawn(
    emulator,
    [
      '-avd',
      avd,
      '-memory',
      '1536',
      '-cores',
      '2',
      '-no-boot-anim',
      '-gpu',
      'host',
      '-no-snapshot-load',
    ],
    { detached: true, stdio: 'ignore', env, shell: false },
  );
  child.unref();
  return true;
}

export async function waitForDevice(env, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (hasReadyDevice(env)) {
      return true;
    }
    await sleep(2000);
  }
  return false;
}

export async function waitForBoot(env, timeoutMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (isBootComplete(env)) {
      return true;
    }
    await sleep(2000);
  }
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureEmulatorReady(env) {
  resetAdb(env);

  if (hasReadyDevice(env)) {
    if (!isBootComplete(env)) {
      console.log('Waiting for emulator to finish booting...');
      const booted = await waitForBoot(env);
      if (!booted) {
        console.error('Emulator started but did not finish booting in time.');
        return false;
      }
    }
    return true;
  }

  if (!startEmulator(env)) {
    return false;
  }

  console.log('Waiting for emulator to connect...');
  const connected = await waitForDevice(env, 120000);
  if (!connected) {
    console.error(
      'Emulator did not connect. Open Android Studio > Device Manager and start Medium_Phone manually.',
    );
    return false;
  }

  console.log('Waiting for Android to finish booting...');
  const booted = await waitForBoot(env, 180000);
  if (!booted) {
    console.error('Emulator is too slow to boot. Close other apps and try again.');
    return false;
  }

  console.log('Emulator is ready.');
  return true;
}

export function getReadyDeviceId(env) {
  const device = listDevices(env).find((d) => d.state === 'device');
  return device?.id ?? null;
}

export async function waitForMetro(timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch('http://127.0.0.1:8081/status');
      if (response.ok) {
        return true;
      }
    } catch {
      // Metro not ready yet
    }
    await sleep(1500);
  }
  return false;
}

export async function openExpoOnDevice(env, url = 'exp://127.0.0.1:8081') {
  const sdk = env.ANDROID_HOME;
  const adb = toolPath(sdk, 'platform-tools', 'adb');
  const deviceId = getReadyDeviceId(env);

  if (!deviceId) {
    console.error(
      'No Android device connected. Restart the emulator and run npm run android again.',
    );
    return false;
  }

  spawnSync(adb, ['-s', deviceId, 'reverse', 'tcp:8081', 'tcp:8081'], {
    stdio: 'inherit',
    env,
    shell: false,
  });

  const result = spawnSync(
    adb,
    ['-s', deviceId, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url],
    { encoding: 'utf8', env, shell: false },
  );

  if (result.status !== 0) {
    console.error('Failed to open Expo Go. Open it manually and enter:', url);
    return false;
  }

  console.log(`Opened ${url} on ${deviceId}`);
  return true;
}
