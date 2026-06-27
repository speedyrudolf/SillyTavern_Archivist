const fs = require('fs');
const path = require('path');

const storageFile = path.resolve(__dirname, '../storage.json');

function _read() {
  if (!fs.existsSync(storageFile)) return { pending: [], accepted: [], rejected: [], ignore: [] };
  try {
    return JSON.parse(fs.readFileSync(storageFile, 'utf8')) || { pending: [], accepted: [], rejected: [], ignore: [] };
  } catch (err) {
    return { pending: [], accepted: [], rejected: [], ignore: [] };
  }
}
function _write(obj) { fs.writeFileSync(storageFile, JSON.stringify(obj, null, 2), 'utf8'); }

async function addPending(suggestion) {
  const st = _read();
  st.pending.push(suggestion);
  _write(st);
}
async function getPending() {
  const st = _read();
  return st.pending;
}
async function accept(id) {
  const st = _read();
  const idx = st.pending.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('pending not found');
  const item = st.pending.splice(idx, 1)[0];
  st.accepted = st.accepted || [];
  st.accepted.push({ ...item, acceptedAt: Date.now() });
  _write(st);
}
async function reject(id) {
  const st = _read();
  const idx = st.pending.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('pending not found');
  const item = st.pending.splice(idx, 1)[0];
  st.rejected = st.rejected || [];
  st.rejected.push({ ...item, rejectedAt: Date.now() });
  _write(st);
}
async function getAccepted() { return _read().accepted || []; }
async function clearAccepted() { const st = _read(); st.accepted = []; _write(st); }

module.exports = { addPending, getPending, accept, reject, getAccepted, clearAccepted };
