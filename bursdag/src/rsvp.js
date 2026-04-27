const GIST_ID = '994ceaf91c6e831a4db9b91a4609df99';
const FILE = 'rsvp.json';
const TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const API = `https://api.github.com/gists/${GIST_ID}`;

const toggle = document.querySelector('.rsvp-toggle');
const form = document.querySelector('.rsvp-form');
const nameInput = document.querySelector('.rsvp-input[name="name"]');
const commentInput = document.querySelector('.rsvp-input[name="comment"]');
const submit = document.querySelector('.rsvp-submit');
const list = document.querySelector('.rsvp-list');
const status = document.querySelector('.rsvp-status');

let rsvps = [];

async function loadRsvps() {
  status.textContent = 'laster...';
  try {
    const res = await fetch(API, {
      headers: TOKEN ? { Authorization: `token ${TOKEN}` } : {}
    });
    const data = await res.json();
    const content = data.files?.[FILE]?.content || '[]';
    rsvps = JSON.parse(content);
    render();
    status.textContent = '';
  } catch (e) {
    status.textContent = 'kunne ikke laste rsvp';
  }
}

function render() {
  list.innerHTML = '';
  const starred = rsvps.filter(r => r.name.startsWith('***')).sort((a, b) => b.ts - a.ts);
  const regular = rsvps.filter(r => !r.name.startsWith('***'));
  [...starred, ...regular].forEach(r => {
    const isStar = r.name.startsWith('***');
    const li = document.createElement('li');
    li.className = isStar ? 'rsvp-item rsvp-item-star' : 'rsvp-item';
    const name = document.createElement('span');
    name.className = 'rsvp-item-name';
    name.textContent = isStar ? r.name.replace(/^\*\*\*\s*/, '') : r.name;
    li.appendChild(name);
    if (r.comment) {
      const c = document.createElement('span');
      c.className = 'rsvp-item-comment';
      c.textContent = r.comment;
      li.appendChild(c);
    }
    list.appendChild(li);
  });
}

async function saveRsvps() {
  const res = await fetch(API, {
    method: 'PATCH',
    headers: {
      Authorization: `token ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      files: { [FILE]: { content: JSON.stringify(rsvps, null, 2) } }
    })
  });
  if (!res.ok) throw new Error(await res.text());
}

toggle.addEventListener('click', () => {
  form.classList.toggle('open');
  if (form.classList.contains('open')) nameInput.focus();
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const comment = commentInput.value.trim();
  if (!name) return;
  if (!TOKEN) {
    status.textContent = 'mangler token, ingen lagring';
    return;
  }
  submit.disabled = true;
  status.textContent = 'sender...';
  rsvps.push({ name, comment, ts: Date.now() });
  try {
    await saveRsvps();
    nameInput.value = '';
    commentInput.value = '';
    form.classList.remove('open');
    render();
    status.textContent = 'takk!';
    setTimeout(() => { status.textContent = ''; }, 2000);
  } catch (err) {
    rsvps.pop();
    status.textContent = 'feil ved lagring';
  } finally {
    submit.disabled = false;
  }
});

loadRsvps();
