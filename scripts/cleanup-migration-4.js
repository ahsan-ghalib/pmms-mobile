const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '../app');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function (file) {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, '/', file));
    }
  });
  return arrayOfFiles;
}

const allScreens = getAllFiles(appDir).filter((f) => f.endsWith('.tsx'));

allScreens.forEach((filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove type Props = <'Something'>;
  content = content.replace(/type\s+Props\s*=\s*<[^>]+>;\n?/g, '');
  content = content.replace(/type\s+Props\s*=\s*any;\n?/g, '');

  fs.writeFileSync(filePath, content);
});

console.log('Cleanup script 4 complete!');
