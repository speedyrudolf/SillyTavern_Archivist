// launcher for standalone mode and helper for in-process mounting
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const configPath = path.resolve(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const router = require('./router');

async function initForApp(app, opts = {}) {
  const mountPath = (opts && opts.mountPath) || '/archivist';
  // serve static frontend under mountPath
  const frontendDir = path.resolve(__dirname, '../frontend');
  app.use(mountPath, express.static(frontendDir));
  app.use(mountPath, router);
  console.log(`Archivist mounted at ${mountPath}`);
}

async function startStandalone() {
  const app = express();
  app.use(cors());
  // serve frontend from root
  const frontendDir = path.resolve(__dirname, '../frontend');
  app.use('/', express.static(frontendDir));
  app.use('/', router);
  const port = config.port || 3080;
  return new Promise((resolve, reject) => {
    const s = app.listen(port, () => {
      console.log(`Archivist service listening on http://localhost:${port}`);
      resolve(s);
    });
    s.on('error', reject);
  });
}

module.exports = { initForApp, startStandalone };
