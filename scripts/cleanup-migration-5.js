const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '../app');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function (file) {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });
  return arrayOfFiles;
}

const allScreens = getAllFiles(appDir).filter((f) => f.endsWith('.tsx'));

allScreens.forEach((filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace "export function ScreenName" with "export default function ScreenName"
  content = content.replace(
    /export\s+function\s+([A-Z][a-zA-Z0-9_]*)/g,
    'export default function $1',
  );

  fs.writeFileSync(filePath, content);
});

// Update app.json to add a scheme
const appJsonPath = path.join(__dirname, '../app.json');
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  if (!appJson.expo.scheme) {
    appJson.expo.scheme = appJson.expo.slug || 'soouqlive-mobile';
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  }
}

console.log('Cleanup script 5 complete!');
