import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

console.log('[SYNC] Syncing dist/ build output to root directory for GitHub Pages direct hosting...');

if (!fs.existsSync(distDir)) {
  console.error('[SYNC ERROR] dist directory does not exist. Run vite build first.');
  process.exit(1);
}

// 1. Copy dist/index.html to root index.html
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  fs.copyFileSync(path.join(distDir, 'index.html'), path.join(rootDir, 'index.html'));
  console.log('[SYNC] Copied dist/index.html -> ./index.html');
}

// 2. Copy dist/404.html to root 404.html
if (fs.existsSync(path.join(distDir, '404.html'))) {
  fs.copyFileSync(path.join(distDir, '404.html'), path.join(rootDir, '404.html'));
  console.log('[SYNC] Copied dist/404.html -> ./404.html');
}

// 3. Ensure root .nojekyll exists
fs.writeFileSync(path.join(rootDir, '.nojekyll'), '# Disable Jekyll\n');
console.log('[SYNC] Created ./.nojekyll');

// 4. Copy dist/assets to root assets recursively
const rootAssetsDir = path.join(rootDir, 'assets');
const distAssetsDir = path.join(distDir, 'assets');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(distAssetsDir)) {
  copyDirRecursive(distAssetsDir, rootAssetsDir);
  console.log('[SYNC] Recursively synced dist/assets/ -> ./assets/');
}

// 5. Ensure public logo files are at root and assets
const publicLogo = path.join(rootDir, 'public', 'wang_logo.png');
if (fs.existsSync(publicLogo)) {
  fs.copyFileSync(publicLogo, path.join(rootDir, 'wang_logo.png'));
  const targetAistudio = path.join(rootAssetsDir, 'aistudio');
  if (!fs.existsSync(targetAistudio)) fs.mkdirSync(targetAistudio, { recursive: true });
  fs.copyFileSync(publicLogo, path.join(targetAistudio, 'wang_logo.png'));
  console.log('[SYNC] Synced wang_logo.png to ./wang_logo.png and ./assets/aistudio/wang_logo.png');
}

console.log('[SYNC SUCCESS] Root is now 100% prepared and synchronized for GitHub Pages root deployment!');
