// app.js - Plesk Phusion Passenger startup file for Next.js
const fs = require('fs');
const path = require('path');

// Ensure NODE_ENV is production
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const standaloneServerPath = path.join(__dirname, '.next', 'standalone', 'server.js');

if (fs.existsSync(standaloneServerPath)) {
  console.log('> Starting Next.js via Standalone Server...');
  require(standaloneServerPath);
} else {
  console.log('> Starting Next.js via Programmatic HTTP Server...');
  const { createServer } = require('http');
  const next = require('next');

  const app = next({ dev: false });
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
