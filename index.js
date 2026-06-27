// Root entry for SillyTavern extension compatibility.
// When SillyTavern loads this extension it will require() this file and
// call the exported init(stApi, options) function. When run directly (node index.js)
// this file will start the standalone Archivist server.

const path = require('path');
const fs = require('fs');

const backend = require('./plugin/backend/index.js');
const startupLog = path.resolve(__dirname, 'plugin', 'startup-debug.log');

function writeStartupLog(msg) {
  try {
    fs.appendFileSync(startupLog, new Date().toISOString() + ' - ' + msg + '\n');
  } catch (err) {
    try { console.log('Failed to write startup debug log:', err); } catch (e) { }
  }
}

async function init(stApi, options = {}) {
  writeStartupLog('init called with stApi keys: ' + (stApi ? Object.keys(stApi).join(',') : 'no stApi') + ' | options keys: ' + (options ? Object.keys(options).join(',') : 'no options'));

  // try to detect common app objects
  const mountPath = (options && options.mountPath) || '/archivist';
  try {
    if (stApi && stApi.app) {
      await backend.initForApp(stApi.app, { mountPath, options });
      writeStartupLog('Mounted using stApi.app at ' + mountPath);
    } else if (stApi && stApi.expressApp) {
      await backend.initForApp(stApi.expressApp, { mountPath, options });
      writeStartupLog('Mounted using stApi.expressApp at ' + mountPath);
    } else if (stApi && stApi.server && stApi.server.app) {
      await backend.initForApp(stApi.server.app, { mountPath, options });
      writeStartupLog('Mounted using stApi.server.app at ' + mountPath);
    } else {
      writeStartupLog('Did not find app object on stApi; writing marker file for debugging');
      // write a marker file so user can see extension was required but not mounted
      try { fs.writeFileSync(path.resolve(__dirname, 'plugin', 'extension-required-noserver.txt'), 'required at ' + new Date().toISOString()); } catch (e) { writeStartupLog('failed to write marker file: ' + e.message); }
      throw new Error('SillyTavern API object with app is required to init Archivist in-process');
    }
  } catch (err) {
    writeStartupLog('init error: ' + (err && err.stack ? err.stack : err));
    throw err;
  }
  // return an object in case ST expects plugin lifecycle hooks in future
  return { mountPath };
}

// If run directly, start standalone server (already implemented in backend/index.js)
if (require.main === module) {
  writeStartupLog('Starting standalone server via index.js');
  backend.startStandalone().then(() => writeStartupLog('Standalone server started')).catch(err => {
    writeStartupLog('Failed to start standalone server: ' + (err && err.stack ? err.stack : err));
    console.error('Failed to start Archivist standalone server:', err);
    process.exit(1);
  });
}

module.exports = init;
