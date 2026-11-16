// app.js - Plesk Phusion Passenger startup file for Next.js
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// CRITICAL: Ensure SQLite database is ALWAYS located in the application root directory
// and NEVER inside the ephemeral .next directory!
const rootDataDir = path.join(__dirname, 'data');
if (!fs.existsSync(rootDataDir)) {
  try {
    fs.mkdirSync(rootDataDir, { recursive: true });
  } catch (e) {
    console.warn('Could not create root data dir:', e.message);
  }
}
process.env.DATA_DIR = process.env.DATA_DIR || rootDataDir;
process.env.DATABASE_PATH = process.env.DATABASE_PATH || path.join(rootDataDir, 'reunion.db');

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

// 1. Sync static assets for Nginx direct serving (_next/static)
const rootStaticDir = path.join(__dirname, '.next', 'static');
const nginxStaticDir = path.join(__dirname, '_next', 'static');
if (fs.existsSync(rootStaticDir)) {
  try {
    copyFolderSync(rootStaticDir, nginxStaticDir);
  } catch (err) {
    console.warn('Could not sync to _next/static:', err.message);
  }
}

// 2. Sync static & public assets into standalone folder if standalone exists
const standaloneDir = path.join(__dirname, '.next', 'standalone');
const standaloneServerPath = path.join(standaloneDir, 'server.js');
const standaloneStaticDir = path.join(standaloneDir, '.next', 'static');
const rootPublicDir = path.join(__dirname, 'public');
const standalonePublicDir = path.join(standaloneDir, 'public');

if (fs.existsSync(standaloneServerPath)) {
  if (fs.existsSync(rootStaticDir)) {
    try {
      copyFolderSync(rootStaticDir, standaloneStaticDir);
    } catch (err) {
      console.warn('Could not sync to standalone static:', err.message);
    }
  }
  if (fs.existsSync(rootPublicDir)) {
    try {
      copyFolderSync(rootPublicDir, standalonePublicDir);
    } catch (err) {
      console.warn('Could not sync to standalone public:', err.message);
    }
  }

  console.log('> Starting Next.js via Standalone Server...');
  require(standaloneServerPath);
} else {
  console.log('> Starting Next.js via Programmatic HTTP Server...');
  const { createServer } = require('http');
  const next = require('next');

  const app = next({ dev: false, dir: __dirname });
  const handle = app.getRequestHandler();
  const port = parseInt(process.env.PORT, 10) || 3000;

  app.prepare().then(() => {
    createServer((req, res) => {
      handle(req, res);
    }).listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://localhost:${port}`);
    });
  }).catch((err) => {
    console.error('Error starting server:', err);
    process.exit(1);
  });
}
