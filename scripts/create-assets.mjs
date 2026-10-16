import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '..', 'assets');

// Minimal valid 1024x1024 purple PNG (generated placeholder)
const iconBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

if (!existsSync(assetsDir)) {
  mkdirSync(assetsDir, { recursive: true });
}

const icon = Buffer.from(iconBase64, 'base64');
const files = [
  'icon.png',
  'favicon.png',
  'android-icon-foreground.png',
  'android-icon-background.png',
  'android-icon-monochrome.png',
];

for (const file of files) {
  writeFileSync(join(assetsDir, file), icon);
}

console.log('Created placeholder assets in assets/');
