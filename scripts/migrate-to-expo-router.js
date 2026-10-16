const fs = require('fs');
const path = require('path');

const srcScreensDir = path.join(__dirname, '../src/screens');
const appDir = path.join(__dirname, '../app');

if (!fs.existsSync(appDir)) {
  fs.mkdirSync(appDir, { recursive: true });
}

// Helper to recursively get all files
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

const allScreens = getAllFiles(srcScreensDir);

allScreens.forEach((filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  const relativePath = path.relative(srcScreensDir, filePath);

  // Define destination path
  let destPath = path.join(appDir, relativePath);

  // Special mappings for tabs and auth to group them properly
  if (relativePath.startsWith('main/')) {
    destPath = path.join(appDir, '(tabs)', relativePath.replace('main/', ''));
    // Make HomeScreen the default index for tabs
    if (destPath.endsWith('HomeScreen.tsx')) {
      destPath = destPath.replace('HomeScreen.tsx', 'index.tsx');
    }
  } else if (relativePath.startsWith('auth/')) {
    destPath = path.join(appDir, '(auth)', relativePath.replace('auth/', ''));
    // Make LoginScreen the default index for auth
    if (destPath.endsWith('LoginScreen.tsx')) {
      destPath = destPath.replace('LoginScreen.tsx', 'index.tsx');
    }
  }

  // Ensure directory exists
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Read content
  let content = fs.readFileSync(filePath, 'utf8');

  // Regex replacements for React Navigation -> Expo Router

  // 1. Replace imports
  content = content.replace(
    /import\s+{([^}]*useNavigation[^}]*)}\s+from\s+['"]@react-navigation\/native['"];?/g,
    "import { useRouter } from 'expo-router';",
  );
  content = content.replace(
    /import\s+{([^}]*useRoute[^}]*)}\s+from\s+['"]@react-navigation\/native['"];?/g,
    "import { useLocalSearchParams } from 'expo-router';",
  );

  // 2. Replace hooks
  content = content.replace(
    /const\s+navigation\s*=\s*useNavigation[<>[a-zA-Z]*]?\(\);?/g,
    'const router = useRouter();',
  );
  content = content.replace(
    /const\s+route\s*=\s*useRoute[<>[a-zA-Z]*]?\(\);?/g,
    'const params = useLocalSearchParams();',
  );

  // 3. Replace navigation calls
  content = content.replace(
    /navigation\.navigate\(['"]([^'"]+)['"](?:,\s*({[^}]+}))?\)/g,
    (match, screenName, params) => {
      let routePath = screenName;
      // map screen names to paths (very basic mapping based on known structure)
      if (screenName === 'Home') routePath = '/(tabs)';
      else if (screenName === 'Login') routePath = '/(auth)';
      else if (screenName === 'SignUp') routePath = '/(auth)/SignUpScreen';
      else routePath = `/${screenName}`;

      if (params) {
        return `router.push({ pathname: '${routePath}', params: ${params} })`;
      }
      return `router.push('${routePath}')`;
    },
  );

  content = content.replace(/navigation\.goBack\(\)/g, 'router.back()');

  // Write file
  fs.writeFileSync(destPath, content);
  console.log(`Migrated: ${relativePath} -> ${path.relative(appDir, destPath)}`);
});

console.log('Migration script complete!');
