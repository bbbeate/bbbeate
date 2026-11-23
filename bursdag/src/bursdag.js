const KEY = 'bursdag-bg';
const root = document.documentElement;

function rand(min, max) { return Math.random() * (max - min) + min; }

function applyBg(hex) {
  root.style.setProperty('--bursdag-bg', hex);
}

const pickerEl = document.querySelector('.bursdag-picker');

const saved = localStorage.getItem(KEY);
if (pickerEl && saved) applyBg(saved);

// dvd-bounce elements around the viewport
function bounce(el) {
  let x = rand(0, Math.max(0, window.innerWidth - el.offsetWidth));
  let y = rand(0, Math.max(0, window.innerHeight - el.offsetHeight));
  let vx = (0.2 + Math.random() * 0.25) * (Math.random() < 0.5 ? -1 : 1);
  let vy = (0.2 + Math.random() * 0.25) * (Math.random() < 0.5 ? -1 : 1);
  let r = 0;
  const vr = 0.08 * (Math.random() < 0.5 ? -1 : 1);
  function tick() {
    const maxX = window.innerWidth - el.offsetWidth;
    const maxY = window.innerHeight - el.offsetHeight;
    x += vx;
    y += vy;
    r += vr;
    if (x <= 0)    { x = 0;    vx = Math.abs(vx); }
    if (x >= maxX) { x = maxX; vx = -Math.abs(vx); }
    if (y <= 0)    { y = 0;    vy = Math.abs(vy); }
    if (y >= maxY) { y = maxY; vy = -Math.abs(vy); }
    el.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg)`;
    requestAnimationFrame(tick);
  }
  tick();
}

document.querySelectorAll('.bursdag-date').forEach(bounce);
// crawl elements clockwise along the viewport edges, evenly spaced
function crawlEdges(els) {
  const speed = 0.6;
  let offset = 0;
  function tick() {
    offset += speed;
    els.forEach((el, i) => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const maxX = window.innerWidth - w;
      const maxY = window.innerHeight - h;
      const perimeter = 2 * (maxX + maxY);
      let p = (offset + (i * perimeter) / els.length) % perimeter;
      let x, y, r;
      if (p < maxX) { x = p; y = 0; r = 180; }
      else if ((p -= maxX) < maxY) { x = maxX; y = p; r = 270; }
      else if ((p -= maxY) < maxX) { x = maxX - p; y = maxY; r = 0; }
      else { p -= maxX; x = 0; y = maxY - p; r = 90; }
      const scale = 1 + 0.4 * Math.sin(offset / 60 + i * 2);
      const onSide = r === 90 || r === 270;
      const toEdge = (1 - scale) * h / 2 + (onSide ? (w - h) / 2 : 0);
      el.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg) translate(0, ${toEdge}px) scale(${scale})`;
    });
    requestAnimationFrame(tick);
  }
  tick();
}

const edgeEls = [...document.querySelectorAll('.bursdag-edge')];
if (edgeEls.length) {
  Promise.all(edgeEls.map(el => el.complete ? null : new Promise(res => el.addEventListener('load', res, { once: true }))))
    .then(() => crawlEdges(edgeEls));
}

function showDiscoOverlay() {
  const o = document.createElement('div');
  o.className = 'bursdag-disco-overlay';
  const img = document.createElement('img');
  img.src = `${import.meta.env.BASE_URL}discoball.gif`;
  img.alt = '';
  o.appendChild(img);
  o.style.setProperty('--x', `${Math.floor(rand(15, 85))}vw`);
  o.style.setProperty('--y', `${Math.floor(rand(20, 80))}vh`);
  o.style.setProperty('--size', `${Math.floor(rand(120, 260))}px`);
  o.style.setProperty('--hue', `${Math.floor(rand(0, 360))}deg`);
  o.style.setProperty('--end-scale', rand(1.2, 2.4).toFixed(2));
  document.body.appendChild(o);
  setTimeout(() => o.remove(), 3000);
}

const discoBtn = document.querySelector('.bursdag-discoball');
if (discoBtn) {
  discoBtn.addEventListener('click', showDiscoOverlay);
}

const PAINT = [
  null, '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff',
  '#ff69b4', '#39ff14', '#00bfff', '#ffd700', '#ffa07a', '#dda0dd', '#f0e68c', '#20b2aa'
];

if (pickerEl) {
  PAINT.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bursdag-swatch';
    if (c === null) {
      b.classList.add('bursdag-swatch-default');
      b.setAttribute('aria-label', 'default');
      b.addEventListener('click', () => {
        root.style.removeProperty('--bursdag-bg');
        localStorage.removeItem(KEY);
      });
    } else {
      b.style.background = c;
      b.setAttribute('aria-label', c);
      b.addEventListener('click', () => {
        applyBg(c);
        localStorage.setItem(KEY, c);
      });
    }
    pickerEl.appendChild(b);
  });
}
