const GIST_ID = '994ceaf91c6e831a4db9b91a4609df99';
const FILE = 'text.html';
const TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const PASS = import.meta.env.VITE_BURSDAG_PASS;
const API = `https://api.github.com/gists/${GIST_ID}`;

const el = document.querySelector('.bursdag-text');
let unlocked = false;
let editing = false;
let dirty = false;

function enterEdit() {
  editing = true;
  el.contentEditable = 'true';
  el.classList.add('editing');
  el.focus();
}

function exitEdit() {
  editing = false;
  el.contentEditable = 'false';
  el.classList.remove('editing');
}

async function loadText() {
  try {
    const res = await fetch(API, {
      headers: TOKEN ? { Authorization: `token ${TOKEN}` } : {}
    });
    const data = await res.json();
    const content = data.files?.[FILE]?.content;
    if (content) el.innerHTML = content;
  } catch {}
}

async function saveText() {
  if (!dirty) return;
  dirty = false;
  try {
    await fetch(API, {
      method: 'PATCH',
      headers: { Authorization: `token ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: { [FILE]: { content: el.innerHTML } } })
    });
  } catch {}
}

let tapCount = 0;
let tapTimer;
el.addEventListener('click', e => {
  if (e.target.closest('a')) return;
  if (editing) return;
  if (unlocked) { enterEdit(); return; }
  tapCount++;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => { tapCount = 0; }, 800);
  if (tapCount >= 3) {
    tapCount = 0;
    if (!PASS) return;
    const ans = prompt('passord?');
    if (ans === PASS) {
      unlocked = true;
      enterEdit();
    }
  }
});

el.addEventListener('input', () => { dirty = true; });
el.addEventListener('blur', () => {
  if (editing) {
    exitEdit();
    saveText();
  }
});
el.addEventListener('keydown', e => {
  if (e.key === 'Escape') el.blur();
});

loadText();
