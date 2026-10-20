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

// 4. Copy dist/assets to root assets
const rootAssetsDir = path.join(rootDir, 'assets');
const distAssetsDir = path.join(distDir, 'assets');

if (fs.existsSync(distAssetsDir)) {
  if (!fs.existsSync(rootAssetsDir)) {
    fs.mkdirSync(rootAssetsDir, { recursive: true });
  }

  const files = fs.readdirSync(distAssetsDir);
  for (const file of files) {
    const srcPath = path.join(distAssetsDir, file);
    const destPath = path.join(rootAssetsDir, file);
    if (fs.statSync(srcPath).isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  console.log(`[SYNC] Synced ${files.length} asset files to ./assets/`);
}

console.log('[SYNC SUCCESS] Root is now 100% prepared and synchronized for GitHub Pages root deployment!');
