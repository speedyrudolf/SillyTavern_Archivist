const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../config.json'), 'utf8'));
const lorebookDir = path.resolve(process.cwd(), config.lorebookDir);

async function listLorebooks() {
  const files = fs.readdirSync(lorebookDir).filter(f => f.endsWith('.json'));
  return files;
}

async function readLorebook(file) {
  const full = path.join(lorebookDir, file);
  if (!fs.existsSync(full)) throw new Error('lorebook not found: ' + full);
  const raw = fs.readFileSync(full, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error('invalid json in lorebook: ' + full);
  }
}

function backupAndWrite(file, newContent) {
  const full = path.join(lorebookDir, file);
  const backupDir = path.resolve(process.cwd(), config.backupDir || './backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.basename(file, '.json');
  const backupFile = path.join(backupDir, `${base}.${now}.bak.json`);
  // write backup
  fs.copyFileSync(full, backupFile);
  // write new content
  fs.writeFileSync(full, JSON.stringify(newContent, null, 2), 'utf8');
}

function applyPatchToContent(content, change) {
  // content: parsed JSON of lorebook file
  // change: { entryName, oldText, newText }
  // This is a naive implementation — many lorebooks have arrays of entries.
  // We try to find an entry whose text contains oldText, and replace it.
  let modified = false;
  if (Array.isArray(content)) {
    const out = content.map(entry => {
      const e = JSON.parse(JSON.stringify(entry));
      if (e.content && typeof e.content === 'string' && change.oldText && e.content.includes(change.oldText)) {
        e.content = e.content.replace(change.oldText, change.newText);
        modified = true;
      }
      // sometimes entries have "text" or "description"
      if (!modified && e.text && typeof e.text === 'string' && change.oldText && e.text.includes(change.oldText)) {
        e.text = e.text.replace(change.oldText, change.newText);
        modified = true;
      }
      return e;
    });
    return modified ? out : null;
  } else if (typeof content === 'object') {
    const cloned = JSON.parse(JSON.stringify(content));
    // naive traversal
    function traverse(obj) {
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (typeof v === 'string') {
          if (change.oldText && v.includes(change.oldText)) {
            obj[k] = v.replace(change.oldText, change.newText);
            modified = true;
          }
        } else if (typeof v === 'object' && v !== null) {
          traverse(v);
        }
      }
    }
    traverse(cloned);
    return modified ? cloned : null;
  }
  return null;
}

module.exports = {
  listLorebooks,
  readLorebook,
  backupAndWrite,
  applyPatchToContent
};
