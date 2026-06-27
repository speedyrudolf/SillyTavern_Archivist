async function api(path, method='GET', body=null) {
  const opt = { method, headers: {} };
  if (body) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const res = await fetch(path, opt);
  return res.json();
}

async function refreshLorebooks() {
  const r = await api('/api/lorebooks');
  if (!r.ok) return;
  const sel = document.getElementById('lorebookFile');
  sel.innerHTML = '';
  for (const f of r.files) {
    const o = document.createElement('option'); o.value = f; o.textContent = f; sel.appendChild(o);
  }
}

async function refreshPending() {
  const r = await api('/api/pending');
  if (!r.ok) return;
  const list = document.getElementById('pendingList');
  list.innerHTML = '';
  for (const p of r.pending) {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<strong>${escapeHtml(p.entryName||'(new)')}</strong> <small>${(p.confidence||0).toFixed(2)}</small>
      <div>Old: <pre>${escapeHtml(p.oldText||'')}</pre></div>
      <div>New: <pre>${escapeHtml(p.newText||'')}</pre></div>
      <div>Explanation: <pre>${escapeHtml(p.explanation||'')}</pre></div>
      <div><button data-id='${p.id}' class='accept'>Accept</button> <button data-id='${p.id}' class='reject'>Reject</button></div>`;
    list.appendChild(div);
  }
  document.querySelectorAll('.accept').forEach(b => b.onclick = async (e) => { await api('/api/accept', 'POST', { id: e.target.getAttribute('data-id') }); refreshPending(); });
  document.querySelectorAll('.reject').forEach(b => b.onclick = async (e) => { await api('/api/reject', 'POST', { id: e.target.getAttribute('data-id') }); refreshPending(); });
}

function escapeHtml(s) { if (!s) return ''; return s.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]); }

document.getElementById('refreshLorebooks').onclick = refreshLorebooks;
document.getElementById('scanBtn').onclick = async () => {
  let messages = [];
  try { messages = JSON.parse(document.getElementById('scanMessages').value || '[]'); } catch (err) { alert('invalid messages JSON'); return; }
  const file = document.getElementById('lorebookFile').value;
  await api('/api/analyze', 'POST', { messages, lorebookFile: file });
  await refreshPending();
};

document.getElementById('applyBtn').onclick = async () => {
  if (!confirm('Apply all accepted changes? This will backup and overwrite lorebook files.')) return;
  const r = await api('/api/apply', 'POST');
  if (r.ok) { alert('Applied: ' + (r.applied||0)); refreshPending(); } else { alert('Error: ' + r.error); }
};

window.onload = async () => { await refreshLorebooks(); await refreshPending(); };
