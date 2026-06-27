const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const configPath = path.resolve(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Build an express Router with all Archivist API routes. This keeps routes
// available both to standalone server and when mounted inside SillyTavern.

const lorebookManager = require('./lorebook_manager');
const aiEngine = require('./ai_engine');
const storage = require('./storage');

const router = express.Router();
router.use(bodyParser.json({ limit: '5mb' }));

// API: list lorebooks (files in lorebook dir)
router.get('/api/lorebooks', async (req, res) => {
  try {
    const files = await lorebookManager.listLorebooks();
    res.json({ ok: true, files });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// API: read a lorebook
router.get('/api/lorebook', async (req, res) => {
  const file = req.query.file;
  if (!file) return res.status(400).json({ ok: false, error: 'file required' });
  try {
    const content = await lorebookManager.readLorebook(file);
    res.json({ ok: true, content });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// API: trigger analysis of recent messages (messages supplied by client)
router.post('/api/analyze', async (req, res) => {
  const { messages, lorebookFile } = req.body || {};
  try {
    // read lorebook if provided
    let lorebook = null;
    if (lorebookFile) lorebook = await lorebookManager.readLorebook(lorebookFile);

    // Build prompt/context and call AI engines (lumimaid for chat reasoning, qwen for json)
    const suggestions = await aiEngine.generateSuggestions(messages || [], lorebook || [], config);

    // store suggestions as pending (one per change)
    for (const s of suggestions) {
      await storage.addPending(s);
    }
    res.json({ ok: true, suggestionsCount: suggestions.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// API: pending list
router.get('/api/pending', async (req, res) => {
  const pending = await storage.getPending();
  res.json({ ok: true, pending });
});

// API: accept (moves pending->accepted)
router.post('/api/accept', async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ ok: false, error: 'id required' });
  try {
    await storage.accept(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// API: reject
router.post('/api/reject', async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ ok: false, error: 'id required' });
  try {
    await storage.reject(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// API: apply accepted changes (backup + write). Manual only.
router.post('/api/apply', async (req, res) => {
  try {
    if (config.requireManualApply !== true) {
      return res.status(400).json({ ok: false, error: 'manual apply not enabled in config' });
    }
    const accepted = await storage.getAccepted();
    if (!accepted || accepted.length === 0) return res.json({ ok: true, applied: 0 });

    // for each accepted change, write to the specified lorebook file
    let applied = 0;
    for (const ch of accepted) {
      // ch should include: id, file, entryName, oldText, newText
      if (!ch.file) continue;
      // read file
      const content = await lorebookManager.readLorebook(ch.file);
      // apply patch: this skeleton does a naive replace of oldText -> newText for the entry
      // In production you should implement structured JSON patching using entry IDs.
      const patched = lorebookManager.applyPatchToContent(content, ch);
      if (patched) {
        await lorebookManager.backupAndWrite(ch.file, patched);
        applied++;
      }
    }
    // clear accepted list after apply
    await storage.clearAccepted();
    res.json({ ok: true, applied });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// small health
router.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

module.exports = router;
