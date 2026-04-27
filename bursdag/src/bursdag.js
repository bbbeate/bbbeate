const KEY = 'bursdag-bg';
const root = document.documentElement;

function rand(min, max) { return Math.random() * (max - min) + min; }

function applyBg(hex) {
  root.style.setProperty('--bursdag-bg', hex);
}

const saved = localStorage.getItem(KEY);
if (saved) applyBg(saved);

// dvd-bounce the date label around the viewport
const dateEl = document.querySelector('.bursdag-date');
if (dateEl) {
  let x = rand(0, Math.max(0, window.innerWidth - dateEl.offsetWidth));
  let y = rand(0, Math.max(0, window.innerHeight - dateEl.offsetHeight));
  let vx = (0.2 + Math.random() * 0.25) * (Math.random() < 0.5 ? -1 : 1);
  let vy = (0.2 + Math.random() * 0.25) * (Math.random() < 0.5 ? -1 : 1);
  let r = 0;
  const vr = 0.08 * (Math.random() < 0.5 ? -1 : 1);
  function tick() {
    const w = dateEl.offsetWidth;
    const h = dateEl.offsetHeight;
    const maxX = window.innerWidth - w;
    const maxY = window.innerHeight - h;
    x += vx;
    y += vy;
    r += vr;
    if (x <= 0)    { x = 0;    vx = Math.abs(vx); }
    if (x >= maxX) { x = maxX; vx = -Math.abs(vx); }
    if (y <= 0)    { y = 0;    vy = Math.abs(vy); }
    if (y >= maxY) { y = maxY; vy = -Math.abs(vy); }
    dateEl.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg)`;
    requestAnimationFrame(tick);
  }
  tick();
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

const pickerEl = document.querySelector('.bursdag-picker');
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
