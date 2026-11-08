const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const element of fs.readdirSync(from)) {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  }
}

const rootDir = path.resolve(__dirname, '..');
const srcStatic = path.join(rootDir, '.next', 'static');
const destNginxStatic = path.join(rootDir, '_next', 'static');
const destStandaloneStatic = path.join(rootDir, '.next', 'standalone', '.next', 'static');
const srcPublic = path.join(rootDir, 'public');
const destStandalonePublic = path.join(rootDir, '.next', 'standalone', 'public');

console.log('🚀 Running postbuild asset sync for Plesk / Nginx...');

if (fs.existsSync(srcStatic)) {
  console.log('  -> Copying static assets to _next/static (Nginx direct)...');
  copyFolderSync(srcStatic, destNginxStatic);
  console.log('  -> Copying static assets to .next/standalone/.next/static...');
  copyFolderSync(srcStatic, destStandaloneStatic);
}

if (fs.existsSync(srcPublic)) {
  console.log('  -> Copying public assets to .next/standalone/public...');
  copyFolderSync(srcPublic, destStandalonePublic);
}

console.log('✅ Postbuild asset sync complete!');
