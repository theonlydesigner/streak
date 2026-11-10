import type { FastifyInstance } from "fastify";
import { getLeaderboard } from "../domain/leaderboard.js";
import type { ApiStore } from "../server.js";

export type DisplayRouteOptions = { demoLabel?: boolean };

const clientScript = `
const params = new URLSearchParams(location.search);
const gymId = params.get("gym") || "gym-1";
const app = document.querySelector("#app");
const chimeMuted = params.get("mute") === "1";
const voiceOff = params.get("voice") === "0";
let leaderboard = null;
let welcome = null;
let welcomeTimer;
let audioCtx;
let noiseBuffer;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character] || character));
}

/* ---------- AUDIO (synthesized, no files, works offline) ---------- */

function getAudio() {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function getNoise() {
  if (noiseBuffer) return noiseBuffer;
  const length = audioCtx.sampleRate * 3;
  noiseBuffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

function kick(master, when) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(160, when);
  osc.frequency.exponentialRampToValueAtTime(40, when + 0.25);
  gain.gain.setValueAtTime(1, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
  osc.connect(gain).connect(master);
  osc.start(when);
  osc.stop(when + 0.32);
}

function tone(master, type, freq, when, length, peak, cutoff) {
  const osc = audioCtx.createOscillator();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
  osc.connect(filter).connect(gain).connect(master);
  osc.start(when);
  osc.stop(when + length + 0.05);
}

function noiseSwell(master, when, length, peak, freq) {
  const source = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  source.buffer = getNoise();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 0.8;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + length * 0.45);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
  source.connect(filter).connect(gain).connect(master);
  source.start(when);
  source.stop(when + length + 0.05);
}

function speakWelcome(w) {
  if (voiceOff || !window.speechSynthesis) return;
  try {
    const best = w.activeStreak > 1 && w.activeStreak >= w.personalBest;
    const text = "Welcome back " + w.memberDisplayName + ". " + w.activeStreak + " day streak. " +
      (best ? "New personal best! " : "") + "Let's go!";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 0.9;
    window.speechSynthesis.cancel();
    setTimeout(() => window.speechSynthesis.speak(utterance), 1000);
  } catch (_error) {
    // Speech is optional.
  }
}

function playWelcomeChime(w) {
  if (chimeMuted) return;
  try {
    getAudio();
    const now = audioCtx.currentTime + 0.02;
    const master = audioCtx.createGain();
    master.gain.value = 0.55;
    master.connect(audioCtx.destination);
    // Two kicks, then the drop at +0.6s
    kick(master, now);
    kick(master, now + 0.3);
    noiseSwell(master, now, 0.6, 0.25, 3000);
    kick(master, now + 0.6);
    // Power chord (A2, E3, A3)
    [110, 164.81, 220].forEach((f) => tone(master, "sawtooth", f, now + 0.6, 1.4, 0.22, 1800));
    // Rising fanfare
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(master, "triangle", f, now + 0.6 + i * 0.16, i === 3 ? 1.6 : 0.5, 0.2, 5000));
    // Crowd roar
    noiseSwell(master, now + 0.6, 2.4, 0.16, 1200);
    speakWelcome(w);
  } catch (_error) {
    // Audio is optional. The visual welcome must still work.
  }
}

function unlockAudio() {
  try { getAudio(); } catch (_error) { /* ignore */ }
  try {
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  } catch (_error) { /* ignore */ }
  const hint = document.querySelector("#sound-hint");
  if (hint) hint.remove();
}
window.addEventListener("pointerdown", unlockAudio, { once: true });
window.addEventListener("keydown", unlockAudio, { once: true });

/* ---------- FIRE + CONFETTI (canvas, behind the card) ---------- */

const fx = document.querySelector("#fx");
const fxCtx = fx ? fx.getContext("2d") : null;
const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const flames = [];
const confetti = [];
const confettiColors = ["#F58821", "#E4501A", "#FFB866", "#FFFFFF", "#C8C8C8"];
let fxUntil = 0;
let fxRunning = false;
let fxLast = 0;

function sizeFx() {
  if (!fx) return;
  fx.width = window.innerWidth;
  fx.height = window.innerHeight;
}
window.addEventListener("resize", sizeFx);
sizeFx();

function makeSprite(inner, outer) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.4, outer);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}
const sprites = [
  makeSprite("rgba(255,240,200,1)", "rgba(255,184,102,0.7)"),
  makeSprite("rgba(255,200,120,1)", "rgba(245,136,33,0.6)"),
  makeSprite("rgba(255,120,60,1)", "rgba(228,80,26,0.5)")
];

function spawnFlames(count) {
  if (!fx || flames.length > 420) return;
  for (let i = 0; i < count; i++) {
    flames.push({
      x: Math.random() * fx.width,
      y: fx.height + 20,
      vx: (Math.random() - 0.5) * 1.4,
      vy: -(2 + Math.random() * 5),
      size: 60 + Math.random() * 120,
      life: 0,
      max: 70 + Math.random() * 60
    });
  }
}

function burstConfetti() {
  if (!fx) return;
  const scale = fx.height / 1080;
  for (let i = 0; i < 180; i++) {
    confetti.push({
      x: fx.width / 2 + (Math.random() - 0.5) * fx.width * 0.3,
      y: fx.height * 0.38,
      vx: (Math.random() - 0.5) * 20 * scale,
      vy: -(6 + Math.random() * 14) * scale,
      w: 8 + Math.random() * 8,
      h: 5 + Math.random() * 7,
      rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 0.4,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)]
    });
  }
}

function fxFrame(ts) {
  if (!fxCtx) return;
  const dt = Math.min(2, (ts - fxLast) / 16.7 || 1);
  fxLast = ts;
  const scale = fx.height / 1080;
  fxCtx.clearRect(0, 0, fx.width, fx.height);
  const active = Date.now() < fxUntil;
  if (active) spawnFlames(Math.round(7 * dt));

  fxCtx.globalCompositeOperation = "lighter";
  for (let i = flames.length - 1; i >= 0; i--) {
    const p = flames[i];
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt * scale;
    const t = p.life / p.max;
    if (t >= 1) { flames.splice(i, 1); continue; }
    const size = p.size * (1 - t * 0.6) * scale;
    fxCtx.globalAlpha = (1 - t) * 0.55;
    fxCtx.drawImage(sprites[t < 0.35 ? 0 : t < 0.7 ? 1 : 2], p.x - size / 2, p.y - size / 2, size, size);
  }

  fxCtx.globalCompositeOperation = "source-over";
  fxCtx.globalAlpha = 1;
  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i];
    c.vy += 0.35 * scale * dt;
    c.vx *= 0.995;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.rot += c.vr * dt;
    if (c.y > fx.height + 40) { confetti.splice(i, 1); continue; }
    fxCtx.save();
    fxCtx.translate(c.x, c.y);
    fxCtx.rotate(c.rot);
    fxCtx.fillStyle = c.color;
    fxCtx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    fxCtx.restore();
  }

  if (active || flames.length || confetti.length) {
    requestAnimationFrame(fxFrame);
  } else {
    fxRunning = false;
    fxCtx.clearRect(0, 0, fx.width, fx.height);
  }
}

function startFx(durationMs) {
  if (!fxCtx || reduceMotion) return;
  sizeFx();
  fxUntil = Date.now() + durationMs;
  burstConfetti();
  if (!fxRunning) {
    fxRunning = true;
    fxLast = performance.now();
    requestAnimationFrame(fxFrame);
  }
}

/* ---------- RENDER ---------- */

function brandLockup() {
  return '<div class="brand-lockup"><span class="pn-word">PUMP <b>NATION</b></span>' +
    '<span class="pn-sub">FITNESS</span><span class="pn-sector">SECTOR 46</span>' +
    '<span class="pn-tagline">Pump Nation, one day at a time.</span></div>';
}

function welcomeActive() {
  return welcome && Date.now() < Date.parse(welcome.expiresAt);
}

function render() {
  if (!app) return;
  if (welcomeActive()) {
    const newBest = welcome.activeStreak > 1 && welcome.activeStreak >= welcome.personalBest;
    app.innerHTML = '<main class="display-shell welcome-active"><section class="leaderboard-panel is-dimmed">' +
      brandLockup() +
      '<div class="idle-copy"><span>LIVE MEMBER BOARD</span><strong>YOUR NEXT REP STARTS TODAY</strong></div>' +
      '</section><section class="welcome-card" aria-live="polite">' +
      '<div class="welcome-kicker">CHECK-IN COMPLETE</div><div class="flame" aria-hidden="true">🔥</div>' +
      '<h1>WELCOME BACK, ' + escapeHtml(welcome.memberDisplayName.toUpperCase()) + '!</h1>' +
      '<div class="welcome-streak"><span>' + escapeHtml(String(welcome.activeStreak)) + '</span><strong>DAY STREAK</strong></div>' +
      (newBest ? '<div class="pb-badge">NEW PERSONAL BEST</div>' : '') +
      '<div class="welcome-best">PERSONAL BEST <strong>' + escapeHtml(String(welcome.personalBest)) + ' DAYS</strong></div>' +
      '</section></main>';
    return;
  }
  const entries = (leaderboard?.entries || []).map((entry, index) =>
    '<li class="leaderboard-row"><span class="rank rank-' + (index + 1) + '">' + String(index + 1).padStart(2, "0") +
    '</span><span class="member-name">' + escapeHtml(entry.memberDisplayName) +
    '</span><span class="streak-value">' + escapeHtml(String(entry.activeStreak)) + '<small> DAYS</small></span>' +
    '<span class="personal-best"><b>BEST</b> ' + escapeHtml(String(entry.personalBest)) + '</span></li>').join("");
  const content = entries || '<li class="empty-state"><span class="empty-flame">🔥</span>' +
    '<strong>Waiting for first check-in</strong><span>The leaderboard will light up when members arrive.</span></li>';
  app.innerHTML = '<main class="display-shell"><header class="display-header">' +
    brandLockup() +
    '<div class="live-pill"><i></i> LIVE BOARD</div></header>' +
    '<section class="leaderboard-panel"><div class="section-heading"><span>TOP 10 MEMBERS</span><strong>ACTIVE STREAK</strong></div>' +
    '<ol class="leaderboard">' + content + '</ol></section><footer class="display-footer">POWERED BY STREAK</footer></main>';
}

fetch('/v1/gyms/' + encodeURIComponent(gymId) + '/leaderboard')
  .then((response) => { if (!response.ok) throw new Error("leaderboard unavailable"); return response.json(); })
  .then((snapshot) => { leaderboard = snapshot; render(); })
  .catch(() => render());

const source = new EventSource('/v1/gyms/' + encodeURIComponent(gymId) + '/events');
source.addEventListener("welcome", (event) => {
  try { welcome = JSON.parse(event.data); } catch (_error) { render(); return; }
  render();
  const remaining = Math.max(0, Date.parse(welcome.expiresAt) - Date.now());
  startFx(remaining);
  playWelcomeChime(welcome);
  clearTimeout(welcomeTimer);
  welcomeTimer = setTimeout(() => { welcome = null; render(); }, remaining);
});
source.addEventListener("leaderboard", (event) => {
  try { leaderboard = JSON.parse(event.data); } catch (_error) { render(); return; }
  // Do not rebuild the DOM mid-welcome, it would restart the card animation.
  if (!welcomeActive()) render();
});
source.onerror = () => render();
render();
`;

function renderShell(options: DisplayRouteOptions): string {
  const demoLabel = options.demoLabel ?? true;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pump Nation Fitness</title>
<style>
:root{--color-bg:#000000;--color-panel:#141414;--color-accent-1:#F58821;--color-accent-2:#E4501A;--color-rank-1:#FFB866;--color-secondary-text:#C8C8C8;--color-on-orange:#0A0A0A;color-scheme:dark;font-family:Arial,Helvetica,sans-serif;background:var(--color-bg);color:#fff}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:radial-gradient(circle at 52% 12%,var(--color-accent-2) 0,#141414 31%,var(--color-bg) 72%);overflow:hidden}
body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.22;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px);background-size:100% 5px}
#fx{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}
#app{position:relative;z-index:2;height:100vh;display:grid;place-items:stretch center;padding:2vh 3vw}.display-shell{width:min(94vw,1320px);display:grid;gap:clamp(1.25rem,2.4vw,2.5rem);position:relative}
.display-header{display:flex;justify-content:space-between;align-items:end;gap:2rem}
.brand-lockup{display:grid;gap:.25rem}
.pn-word{font-family:"Poppins",Arial,sans-serif;font-weight:800;font-size:clamp(1.4rem,5vh,3rem);color:#fff;letter-spacing:.02em;line-height:1}
.display-header .pn-tagline{display:none}.pn-word b{color:var(--color-accent-1);font-weight:800}
.pn-sub{font-family:"Poppins",Arial,sans-serif;font-weight:500;letter-spacing:.6em;color:var(--color-accent-1);font-size:clamp(.7rem,1.2vw,1rem)}
.pn-sector{font-size:clamp(.6rem,1vw,.8rem);letter-spacing:.3em;color:var(--color-secondary-text)}
.pn-tagline{font-size:clamp(.8rem,1.4vw,1.1rem);color:#fff;margin-top:.5rem}
.display-footer{margin:0;text-align:center;color:var(--color-secondary-text);font-size:clamp(.6rem,1.2vw,.9rem);font-weight:700;letter-spacing:.18em}
.live-pill{border:1px solid var(--color-accent-2);border-radius:999px;padding:.7rem 1rem;color:var(--color-secondary-text);font-size:clamp(.6rem,1vw,.8rem);font-weight:800;letter-spacing:.12em;white-space:nowrap}
.live-pill i{display:inline-block;width:.55rem;height:.55rem;background:var(--color-accent-1);border-radius:50%;margin-right:.5rem;box-shadow:0 0 12px var(--color-accent-1)}
.leaderboard-panel{border:1px solid var(--color-accent-2);border-radius:1.2rem;background:linear-gradient(145deg,var(--color-panel),var(--color-bg));box-shadow:0 1.5rem 4rem rgba(0,0,0,.28);padding:1.5vh 1.5vw;display:flex;flex-direction:column;min-height:0}
.display-shell:not(.welcome-active){height:100%;grid-template-rows:auto minmax(0,1fr) auto;gap:1.5vh}
.section-heading{display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid var(--color-accent-2);padding:0 .7rem 1vh;color:var(--color-secondary-text);font-size:clamp(.65rem,1vw,.9rem);font-weight:800;letter-spacing:.14em}
.section-heading strong{color:var(--color-accent-1)}
.leaderboard{list-style:none;padding:0;margin:1vh 0 0;display:grid;flex:1;min-height:0;grid-template-rows:repeat(10,minmax(0,1fr));gap:.6vh}
.leaderboard-row{display:grid;grid-template-columns:clamp(2rem,5vw,4.5rem) minmax(0,1fr) auto minmax(5rem,8vw);align-items:center;gap:clamp(.5rem,1.2vw,1.5rem);padding:0 1.2vw;min-height:0;border:1px solid transparent;border-radius:.5rem;background:var(--color-panel);font-size:clamp(.8rem,2.4vh,1.6rem)}
.leaderboard-row:first-child{border-color:var(--color-accent-1);background:linear-gradient(90deg,var(--color-accent-2),var(--color-panel))}
.rank{display:grid;place-items:center;width:4vh;height:4vh;min-width:1.6rem;min-height:1.6rem;border-radius:.5rem;background:var(--color-panel);color:var(--color-secondary-text);font-weight:900;font-size:clamp(.7rem,1.9vh,1.2rem)}
.rank-1{background:var(--color-rank-1);color:var(--color-on-orange)}.rank-2{background:var(--color-accent-1);color:var(--color-on-orange)}.rank-3{background:var(--color-accent-2);color:#fff}
.member-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:850;letter-spacing:.02em}
.streak-value{color:var(--color-accent-1);font-size:clamp(1.1rem,3.4vh,2.5rem);font-weight:950;white-space:nowrap}.streak-value small{font-size:.42em;color:var(--color-secondary-text);letter-spacing:.08em}
.personal-best{color:var(--color-secondary-text);font-size:clamp(.65rem,1.2vw,1rem);white-space:nowrap}.personal-best b{display:inline;color:var(--color-accent-1);font-size:.7em;letter-spacing:.12em;margin-right:.4rem}
.empty-state{grid-row:1/-1;min-height:0;display:grid;place-items:center;align-content:center;gap:.7rem;color:var(--color-secondary-text);text-align:center;border:1px dashed var(--color-accent-2);background:var(--color-panel)}
.empty-state strong{color:var(--color-secondary-text);font-size:clamp(1.2rem,2.5vw,2rem)}.empty-flame{font-size:3rem}.empty-state span:last-child{font-size:clamp(.8rem,1.4vw,1rem)}
.welcome-active{position:fixed;inset:0;width:auto;max-width:none;display:grid;place-items:center;gap:0;padding:clamp(1rem,3vw,3rem)}
.welcome-active>*{grid-area:1/1}
.welcome-active .is-dimmed{width:min(94vw,1320px)}
.is-dimmed{opacity:.18;filter:blur(2px);transform:scale(.985)}
.idle-copy{display:grid;gap:.7rem;text-align:center;margin-top:3rem;color:var(--color-secondary-text);font-size:.7rem;letter-spacing:.18em}.idle-copy strong{color:var(--color-secondary-text);font-size:clamp(1rem,2vw,1.4rem)}
.welcome-card{width:min(92vw,46rem);padding:clamp(2rem,5vw,4rem) clamp(1.5rem,4vw,3.5rem);text-align:center;border:2px solid var(--color-accent-1);border-radius:1.5rem;background:linear-gradient(150deg,rgba(228,80,26,.92),rgba(0,0,0,.94));box-shadow:0 0 6rem rgba(245,136,33,.55),0 0 2rem rgba(228,80,26,.5),inset 0 0 3rem rgba(245,136,33,.08);animation:pop .55s cubic-bezier(.2,1.3,.4,1) both}
.welcome-kicker{color:var(--color-secondary-text);font-size:clamp(.7rem,1.2vw,1rem);font-weight:900;letter-spacing:.2em}
.flame{font-size:clamp(4rem,10vw,8rem);line-height:1;margin:1.3rem 0;animation:pulse .9s ease-in-out infinite alternate}
.welcome-card h1{font-size:clamp(1.5rem,3.7vw,3.7rem);line-height:1.05;margin:0;overflow-wrap:anywhere}
.welcome-streak{display:flex;justify-content:center;align-items:baseline;gap:.7rem;color:var(--color-accent-1);margin:1.2rem 0}
.welcome-streak span{font-size:clamp(4rem,10vw,8rem);font-weight:950;line-height:.9}
.welcome-streak strong{font-size:clamp(1rem,2vw,1.5rem);letter-spacing:.1em}
.pb-badge{display:inline-block;margin:0 0 1rem;padding:.5rem 1.1rem;border-radius:999px;background:var(--color-rank-1);color:var(--color-on-orange);font-weight:950;letter-spacing:.16em;font-size:clamp(.7rem,1.3vw,1rem)}
.welcome-best{border-top:1px solid var(--color-accent-1);padding-top:1rem;color:var(--color-secondary-text);font-size:clamp(.7rem,1.2vw,.9rem);letter-spacing:.14em}.welcome-best strong{color:var(--color-secondary-text);margin-left:.4rem}
@keyframes pop{0%{transform:scale(.55);opacity:0}60%{transform:scale(1.06);opacity:1}100%{transform:scale(1)}}
@keyframes pulse{from{transform:scale(1)}to{transform:scale(1.12)}}
@media (prefers-reduced-motion: reduce){.welcome-card,.flame{animation:none}}
.demo{position:fixed;top:1rem;right:1rem;color:var(--color-accent-1);font-size:.7rem;font-weight:800;letter-spacing:.14em;z-index:5}
.sound-hint{position:fixed;bottom:1rem;right:1rem;color:var(--color-secondary-text);font-size:.7rem;font-weight:800;letter-spacing:.14em;z-index:5}
@media (max-width: 700px){#app{padding:1rem}.display-header{align-items:start;flex-direction:column;gap:1rem}.live-pill{align-self:flex-end}.leaderboard-row{grid-template-columns:2.4rem minmax(0,1fr) auto;gap:.55rem}.personal-best{display:none}.is-dimmed{display:none}.section-heading strong{display:none}.pn-word{font-size:1.8rem}}
</style>
</head>
<body data-events-path="/v1/gyms/" data-display-mode="broadcast">${demoLabel ? '<div class="demo">DEMO MODE</div><div class="sound-hint" id="sound-hint">CLICK ONCE TO ENABLE SOUND</div>' : ""}<canvas id="fx"></canvas><div id="app"><noscript>PUMP NATION FITNESS, Waiting for first check-in</noscript></div><script src="/display/client.js"></script></body>
</html>`;
}

export async function registerDemoDisplayRoute(
  app: FastifyInstance,
  store: ApiStore,
  options: DisplayRouteOptions = {}
): Promise<void> {
  const shell = renderShell(options);
  app.get("/display", async (_request, reply) => reply.type("text/html").send(shell));
  app.get("/display/client.js", async (_request, reply) =>
    reply.type("application/javascript").send(clientScript)
  );
  app.get<{ Params: { gymId: string } }>("/v1/gyms/:gymId/leaderboard", async (request, reply) => {
    if (request.params.gymId !== store.streaks.config.gymId) {
      return reply.code(404).send({ error: "gym not found" });
    }
    return reply.send(await getLeaderboard(store.streaks, request.params.gymId));
  });
}