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

  // Remove navigation types import
  content = content.replace(
    /import\s+{?[^;]*\bRootStackParamList\b[^}]*}?\s+from\s+['"][^'"]+navigation\/types['"];?/g,
    '',
  );
  content = content.replace(
    /import\s+{?[^;]*\bAuthStackParamList\b[^}]*}?\s+from\s+['"][^'"]+navigation\/types['"];?/g,
    '',
  );
  content = content.replace(
    /import\s+type\s*{[^}]*}\s+from\s+['"][^'"]+navigation\/types['"];?/g,
    '',
  );
  content = content.replace(/import\s+{[^}]*}\s+from\s+['"][^'"]+navigation\/types['"];?/g, '');
  content = content.replace(
    /import\s+{[^}]*NativeStackScreenProps[^}]*}\s+from\s+['"][^'"]+native-stack['"];?/g,
    '',
  );

  // Remove prop types like: ({ navigation, route }: NativeStackScreenProps<...>)
  content = content.replace(
    /\(\{\s*navigation\s*(?:,\s*route)?\s*\}\s*:\s*[a-zA-Z0-9_<>,]+?\)/g,
    '()',
  );
  content = content.replace(/\(\{\s*navigation\s*(?:,\s*route)?\s*\}\s*:\s*any\)/g, '()');
  content = content.replace(/\(\{\s*navigation\s*(?:,\s*route)?\s*\}\)/g, '()');

  // Inject const router = useRouter(); if router is used but not defined
  if (content.includes('router.') && !content.includes('const router = useRouter()')) {
    // Add useRouter import if missing
    if (!content.includes('useRouter')) {
      content = "import { useRouter } from 'expo-router';\n" + content;
    }
    // Inject const router = useRouter() inside the component
    // Find export default function or export function
    content = content.replace(
      /(export\s+(?:default\s+)?function\s+[a-zA-Z0-9_]+\s*\([^)]*\)\s*{)/,
      '$1\n  const router = useRouter();',
    );
  }

  // Fix pathing issues for components
  // In `src/screens/main/HomeScreen.tsx`, components was at `../../components`
  // In `app/(tabs)/index.tsx`, components is at `../../src/components`
  content = content.replace(/from\s+['"]\.\.\/\.\.\/components/g, "from '../../src/components");

  fs.writeFileSync(filePath, content);
});

console.log('Cleanup script complete!');
