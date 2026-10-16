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

  // Strip out NativeStackScreenProps and RootStackParamList entirely
  // e.g. export function TryYourLuckScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Luck'>)
  content = content.replace(/:\s*NativeStackScreenProps<[^>]*>/g, '');
  content = content.replace(/:\s*RootStackParamList(?:\[[^\]]+\])?/g, '');
  content = content.replace(/:\s*MainTabParamList(?:\[[^\]]+\])?/g, '');
  content = content.replace(/:\s*AuthStackParamList(?:\[[^\]]+\])?/g, '');

  // Replace { navigation, route } with ()
  content = content.replace(/\(\{\s*navigation\s*,\s*route\s*\}\)/g, '()');
  content = content.replace(/\(\{\s*navigation\s*\}\)/g, '()');
  content = content.replace(/\(\{\s*route\s*\}\)/g, '()');

  // Change route.params to params
  content = content.replace(/route\.params/g, 'params');

  // Inject const params = useLocalSearchParams() if params is used but not declared
  if (content.includes('params.') && !content.includes('useLocalSearchParams')) {
    if (!content.includes('useRouter')) {
      content = "import { useLocalSearchParams } from 'expo-router';\n" + content;
    } else {
      content = content.replace(
        /import { useRouter } from 'expo-router';/,
        "import { useRouter, useLocalSearchParams } from 'expo-router';",
      );
    }
    content = content.replace(
      /(export\s+(?:default\s+)?function\s+[a-zA-Z0-9_]+\s*\([^)]*\)\s*{)/,
      '$1\n  const params = useLocalSearchParams();',
    );
  }

  // Remove lingering type usages from imports
  content = content.replace(/NativeStackScreenProps,?\s*/g, '');
  content = content.replace(/RootStackParamList,?\s*/g, '');
  content = content.replace(/MainTabParamList,?\s*/g, '');
  content = content.replace(/AuthStackParamList,?\s*/g, '');

  fs.writeFileSync(filePath, content);
});

// Fix index.ts duplicate issue
const rootIndexTs = path.join(__dirname, '../index.ts');
if (fs.existsSync(rootIndexTs)) {
  fs.unlinkSync(rootIndexTs);
}

console.log('Cleanup script 2 complete!');
