// Frontend logic: talks to the backend API and renders entries.

const API = (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) || '';

const els = {
  form: document.getElementById('entry-form'),
  title: document.getElementById('title'),
  topic: document.getElementById('topic'),
  notes: document.getElementById('notes'),
  formError: document.getElementById('form-error'),
  list: document.getElementById('entries'),
  empty: document.getElementById('empty'),
  filter: document.getElementById('filter'),
  status: document.getElementById('status'),
  statusText: document.getElementById('status-text'),
  total: document.getElementById('stat-total'),
  done: document.getElementById('stat-done'),
  pct: document.getElementById('stat-pct'),
  version: document.getElementById('version'),
  env: document.getElementById('env'),
};

let entries = [];

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body.errors ? body.errors.join(', ') : body.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body;
}

function setStatus(ok, text) {
  els.status.classList.toggle('ok', ok);
  els.status.classList.toggle('down', !ok);
  els.statusText.textContent = text;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function render() {
  const filter = els.filter.value;
  const visible = filter ? entries.filter((e) => e.topic === filter) : entries;

  els.list.replaceChildren();
  for (const entry of visible) {
    const li = document.createElement('li');
    li.className = 'entry' + (entry.completed ? ' is-done' : '');

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = entry.completed;
    check.setAttribute('aria-label', 'Mark as completed');
    check.addEventListener('change', () => toggle(entry, check.checked));

    const body = document.createElement('div');
    body.className = 'entry-body';

    const title = document.createElement('p');
    title.className = 'entry-title';
    title.textContent = entry.title;
    body.append(title);

    if (entry.notes) {
      const notes = document.createElement('p');
      notes.className = 'entry-notes';
      notes.textContent = entry.notes;
      body.append(notes);
    }

    const meta = document.createElement('p');
    meta.className = 'entry-meta';
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = entry.topic;
    meta.append(tag, ' ' + formatDate(entry.created_at));
    body.append(meta);

    const del = document.createElement('button');
    del.className = 'icon-btn';
    del.type = 'button';
    del.textContent = '✕';
    del.setAttribute('aria-label', `Delete "${entry.title}"`);
    del.addEventListener('click', () => removeEntry(entry));

    li.append(check, body, del);
    els.list.append(li);
  }
  els.empty.hidden = visible.length > 0;
}

async function refresh() {
  try {
    const [list, stats] = await Promise.all([api('/api/entries'), api('/api/stats')]);
    entries = list;
    els.total.textContent = stats.total;
    els.done.textContent = stats.completed;
    els.pct.textContent = stats.total ? Math.round((stats.completed / stats.total) * 100) + '%' : '0%';
    render();
    setStatus(true, 'Connected');
  } catch (err) {
    setStatus(false, 'API unreachable');
    console.error(err);
  }
}

async function toggle(entry, completed) {
  try {
    await api(`/api/entries/${entry.id}`, { method: 'PATCH', body: JSON.stringify({ completed }) });
  } catch (err) {
    alert(err.message);
  }
  refresh();
}

async function removeEntry(entry) {
  if (!confirm(`Delete "${entry.title}"?`)) return;
  try {
    await api(`/api/entries/${entry.id}`, { method: 'DELETE' });
  } catch (err) {
    alert(err.message);
  }
  refresh();
}

els.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  els.formError.textContent = '';
  try {
    await api('/api/entries', {
      method: 'POST',
      body: JSON.stringify({
        title: els.title.value,
        topic: els.topic.value,
        notes: els.notes.value,
      }),
    });
    els.form.reset();
    els.title.focus();
    refresh();
  } catch (err) {
    els.formError.textContent = err.message;
  }
});

els.filter.addEventListener('change', render);

async function start() {
  try {
    const info = await api('/api/info');
    for (const topic of info.topics) {
      els.topic.append(new Option(topic, topic));
      els.filter.append(new Option(topic, topic));
    }
    els.version.textContent = `version ${info.version}`;
    els.env.textContent = `${info.environment} · ${info.store}`;
  } catch (err) {
    setStatus(false, 'API unreachable');
    console.error(err);
    return;
  }
  refresh();
}

start();
