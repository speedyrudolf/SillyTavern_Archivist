const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../config.json'), 'utf8'));

// generateSuggestions(messages, lorebook, config) -> returns array of suggestion objects
// Suggestion object shape (minimal): { id, file, entryName, type, oldText, newText, confidence, explanation }

async function generateSuggestions(messages, lorebook, cfg) {
  // cfg may override config
  const c = cfg || config;

  // For demo the function does two calls:
  //  - callLumimaid to do reasoning
  //  - callQwen to produce structured JSON suggestions
  // In practice adapt to your koboldcpp endpoints and response formats.

  // Compose a short prompt summary from messages
  const recent = messages.slice(-Math.min(50, messages.length)).map(m => `${m.speaker}: ${m.text}`).join('\n');
  const lumResp = await callLumimaid(c.lumimaidUrl, `Analyze these messages and summarize any changes in characters' status or facts:\n${recent}`);

  // Now call Qwen to produce JSON suggestions. For the skeleton we will mock or expect a simple JSON response.
  const qwenPrompt = `Based on the analysis: ${lumResp}\n\nProduce a JSON array named suggestions where each suggestion has: file (filename), entryName, type, oldText, newText, confidence (0-1), explanation.`;
  const qwenResp = await callQwen(c.qwenUrl, qwenPrompt);

  // Try to parse JSON out of qwenResp
  let suggestions = [];
  try {
    // If the model returns JSON directly, parse. Otherwise for skeleton create a mock suggestion.
    const parsed = JSON.parse(qwenResp);
    if (Array.isArray(parsed)) {
      suggestions = parsed;
    } else if (Array.isArray(parsed.suggestions)) {
      suggestions = parsed.suggestions;
    }
  } catch (err) {
    // fallback: create a mock suggestion using the lumResp
    suggestions = [{
      id: require('uuid').v4(),
      file: (fs.readdirSync(path.resolve(process.cwd(), config.lorebookDir)).find(f => f.endsWith('.json')) || null),
      entryName: 'Mock Entry from Archivist',
      type: 'Character',
      oldText: '<<placeholder old>>',
      newText: `Suggested change based on messages: ${lumResp}`,
      confidence: 0.6,
      explanation: 'Fallback mock suggestion: Qwen output not parseable as JSON.'
    }];
  }

  // Normalize suggestions: ensure id and defaults
  suggestions = suggestions.map(s => ({ id: s.id || require('uuid').v4(), file: s.file || (fs.readdirSync(path.resolve(process.cwd(), config.lorebookDir)).find(f => f.endsWith('.json'))), type: s.type || 'Misc', entryName: s.entryName || '(unnamed)', oldText: s.oldText || '', newText: s.newText || '', confidence: typeof s.confidence === 'number' ? s.confidence : 0.5, explanation: s.explanation || '' }));
  return suggestions;
}

async function callLumimaid(baseUrl, prompt) {
  // simple POST to /api/v1/generate (adjust as needed for your koboldcpp wrapper)
  try {
    const res = await fetch(`${baseUrl}/api/v1/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, max_new_tokens: 256, temperature: 0.2 })
    });
    if (!res.ok) throw new Error('Lumimaid request failed ' + res.status);
    const json = await res.json();
    // Many koboldcpp wrappers return generated text in json.generations[0].text or json.data[0].generations
    // Try common locations
    if (json.output && typeof json.output === 'string') return json.output;
    if (json.generations && Array.isArray(json.generations) && json.generations[0] && json.generations[0].text) return json.generations[0].text;
    if (json.data && Array.isArray(json.data) && json.data[0] && json.data[0].text) return json.data[0].text;
    return JSON.stringify(json);
  } catch (err) {
    console.error('lumimaid call failed', err);
    return 'ERROR: ' + err.message;
  }
}

async function callQwen(baseUrl, prompt) {
  try {
    const res = await fetch(`${baseUrl}/api/v1/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, max_new_tokens: 1024, temperature: 0.0 })
    });
    if (!res.ok) throw new Error('Qwen request failed ' + res.status);
    const json = await res.json();
    if (json.output && typeof json.output === 'string') return json.output;
    if (json.generations && Array.isArray(json.generations) && json.generations[0] && json.generations[0].text) return json.generations[0].text;
    if (json.data && Array.isArray(json.data) && json.data[0] && json.data[0].text) return json.data[0].text;
    return JSON.stringify(json);
  } catch (err) {
    console.error('qwen call failed', err);
    return 'ERROR: ' + err.message;
  }
}

module.exports = {
  generateSuggestions
};
