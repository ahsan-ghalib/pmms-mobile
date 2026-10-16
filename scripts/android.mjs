import { spawn, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  ensureEmulatorReady,
  getAndroidEnv,
  getReadyDeviceId,
  openExpoOnDevice,
  toolPath,
  waitForMetro,
} from './emulator-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = {
  ...getAndroidEnv(),
  EXPO_OFFLINE: '1',
};

console.log('Preparing Android environment...');

const ready = await ensureEmulatorReady(env);
if (!ready) {
  process.exit(1);
}

spawnSync(process.execPath, [join(__dirname, 'install-expo-go.mjs')], {
  stdio: 'inherit',
  env,
});

const adb = toolPath(env.ANDROID_HOME, 'platform-tools', 'adb');
const deviceId = getReadyDeviceId(env);

if (existsSync(adb) && deviceId) {
  spawnSync(adb, ['-s', deviceId, 'reverse', 'tcp:8081', 'tcp:8081'], {
    stdio: 'inherit',
    env,
    shell: false,
  });
  spawnSync(adb, ['-s', deviceId, 'shell', 'am', 'force-stop', 'host.exp.exponent'], {
    stdio: 'ignore',
    env,
    shell: false,
  });
}

console.log('Starting Expo (localhost mode)...');
console.log('Tip: do not press "a" — the app opens automatically when Metro is ready.');

const expoCli = join(process.cwd(), 'node_modules', 'expo', 'bin', 'cli');
const child = spawn(process.execPath, [expoCli, 'start', '--localhost'], {
  stdio: 'inherit',
  env,
  shell: false,
});

void (async () => {
  const metroReady = await waitForMetro();
  if (!metroReady) {
    return;
  }

  if (!getReadyDeviceId(env)) {
    console.log('Emulator disconnected. Reconnecting...');
    const reconnected = await ensureEmulatorReady(env);
    if (!reconnected) {
      return;
    }
  }

  await openExpoOnDevice(env);
})();

child.on('exit', (code) => process.exit(code ?? 1));
