const flashEl = document.querySelector('.allehelgensaften-lightning');
const NS = 'http://www.w3.org/2000/svg';

function rand(min, max) { return Math.random() * (max - min) + min; }

function boltPoints(x, y, angle, length, segments) {
  const points = [[x, y]];
  const step = length / segments;
  for (let i = 0; i < segments; i++) {
    angle += rand(-0.5, 0.5);
    x += Math.sin(angle) * step;
    y += Math.cos(angle) * step;
    points.push([x, y]);
  }
  return points;
}

function addPath(svg, points, width) {
  const path = document.createElementNS(NS, 'polyline');
  path.setAttribute('points', points.map(p => p.join(',')).join(' '));
  path.setAttribute('stroke-width', width);
  svg.appendChild(path);
}

function drawBolt() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'allehelgensaften-bolt');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

  const main = boltPoints(rand(w * 0.15, w * 0.85), 0, rand(-0.3, 0.3), h * rand(0.6, 0.95), 18);
  addPath(svg, main, 4);
  main.slice(3, -3).forEach(([x, y]) => {
    if (Math.random() < 0.3) addPath(svg, boltPoints(x, y, rand(-1.2, 1.2), h * rand(0.08, 0.25), 6), 1.5);
  });

  document.body.appendChild(svg);
  setTimeout(() => svg.remove(), 600);
}

function strike() {
  drawBolt();
  flashEl.classList.remove('strike');
  document.body.classList.remove('allehelgensaften-shake');
  void flashEl.offsetWidth;
  flashEl.classList.add('strike');
  document.body.classList.add('allehelgensaften-shake');
  if (Math.random() < 0.5) setTimeout(drawBolt, 180);
}

if (flashEl && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  strike();
  setInterval(strike, 3000);
}

const video = document.querySelector('.allehelgensaften-video');
const muteBtn = document.querySelector('.allehelgensaften-mute');
const UNMUTE_EVENTS = ['click', 'touchend', 'keydown'];

function stopUnmuteListeners() {
  UNMUTE_EVENTS.forEach(e => document.removeEventListener(e, unmute));
}

function setSound(on) {
  video.muted = !on;
  return video.play();
}

function unmute(e) {
  if (e.target.closest('.allehelgensaften-mute')) return;
  setSound(true).then(stopUnmuteListeners).catch(() => {});
}

function renderMute() {
  muteBtn.classList.toggle('muted', video.muted);
  muteBtn.setAttribute('aria-pressed', String(video.muted));
  muteBtn.setAttribute('aria-label', video.muted ? 'lyd på' : 'lyd av');
}

if (video) {
  UNMUTE_EVENTS.forEach(e => document.addEventListener(e, unmute));
  video.addEventListener('volumechange', renderMute);
  muteBtn.addEventListener('click', () => {
    stopUnmuteListeners();
    setSound(video.muted).catch(() => {});
  });
  renderMute();
}

const countdownEl = document.querySelector('.allehelgensaften-countdown');

function pad(n) { return String(n).padStart(2, '0'); }

function renderCountdown() {
  const left = Math.floor((new Date(countdownEl.dataset.until) - Date.now()) / 1000);
  if (left <= 0) {
    countdownEl.textContent = 'nå!';
    return;
  }
  const hours = Math.floor(left / 3600);
  const minutes = Math.floor((left % 3600) / 60);
  countdownEl.textContent = `${hours}:${pad(minutes)}:${pad(left % 60)}`;
}

if (countdownEl) {
  renderCountdown();
  setInterval(renderCountdown, 1000);
}
