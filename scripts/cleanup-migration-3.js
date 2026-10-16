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

  // Remove CompositeScreenProps type Props
  content = content.replace(/type\s+Props\s*=\s*CompositeScreenProps<[^;]+>;/gs, '');
  content = content.replace(
    /import\s+{([^}]*CompositeScreenProps[^}]*)}\s+from\s+['"]@react-navigation\/native['"];?/g,
    '',
  );

  // Fix navigation.getParent()
  content = content.replace(
    /const\s+parent\s*=\s*navigation\.getParent\(\);[\s\S]*?navigation\.dispatch\(CommonActions\.navigate\(\{\s*name:\s*'Main'\s*\}\)\);/gs,
    "router.replace('/(tabs)');",
  );
  content = content.replace(
    /import\s+{([^}]*CommonActions[^}]*)}\s+from\s+['"]@react-navigation\/native['"];?/g,
    '',
  );

  // Quick fix for "JSX fragment has no corresponding closing tag" and other syntax errors caused by `<>`
  content = content.replace(/<[^>]*>\s*,\s*<>\s*>/gs, ''); // Leftovers of type Props

  // Any lingering `navigation.` inside files
  content = content.replace(/navigation\.navigate/g, 'router.push');
  content = content.replace(/navigation\.goBack/g, 'router.back');

  fs.writeFileSync(filePath, content);
});

console.log('Cleanup script 3 complete!');
