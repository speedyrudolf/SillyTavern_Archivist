// Root entry for SillyTavern extension compatibility.
// When SillyTavern loads this extension it will require() this file and
// call the exported init(stApi, options) function. When run directly (node index.js)
// this file will start the standalone Archivist server.

const path = require('path');
const fs = require('fs');

const backend = require('./plugin/backend/index.js');

async function init(stApi, options = {}) {
  // stApi is expected to contain an Express `app` (the SillyTavern server app)
  // We mount the plugin's router at /archivist by default.
  const mountPath = (options && options.mountPath) || '/archivist';
  if (!stApi || !stApi.app) {
    throw new Error('SillyTavern API object with app is required to init the Archivist in-process');
  }
  await backend.initForApp(stApi.app, { mountPath, options });
  // return an object in case ST expects plugin lifecycle hooks in future
  return { mountPath };
}

// If run directly, start standalone server (already implemented in backend/index.js)
if (require.main === module) {
  // Start standalone server
  backend.startStandalone().catch(err => {
    console.error('Failed to start Archivist standalone server:', err);
    process.exit(1);
  });
}

module.exports = init;
