import type { FastifyInstance } from "fastify";
import { getLeaderboard } from "../domain/leaderboard.js";
import type { ApiStore } from "../server.js";

export type DisplayRouteOptions = { demoLabel?: boolean };

const clientScript = `
const params = new URLSearchParams(location.search);
const gymId = params.get("gym") || "gym-1";
const app = document.querySelector("#app");
const chimeMuted = params.get("mute") === "1";
let leaderboard = null;
let welcome = null;
let welcomeTimer;
let audioCtx;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character] || character));
}

function playWelcomeChime() {
  if (chimeMuted) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const now = audioCtx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const start = now + i * 0.12;
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.6);
    });
  } catch (_error) {
    // Audio is optional. The visual welcome must still work.
  }
}

function brandLockup() {
  return '<div class="brand-lockup"><span class="pn-word">PUMP <b>NATION</b></span>' +
    '<span class="pn-sub">FITNESS</span><span class="pn-sector">SECTOR 46</span>' +
    '<span class="pn-tagline">Pump Nation, one day at a time.</span></div>';
}

function render() {
  if (!app) return;
  const activeWelcome = welcome && Date.now() < Date.parse(welcome.expiresAt);
  if (activeWelcome) {
    app.innerHTML = '<main class="display-shell welcome-active"><section class="leaderboard-panel is-dimmed">' +
      brandLockup() +
      '<div class="idle-copy"><span>LIVE MEMBER BOARD</span><strong>YOUR NEXT REP STARTS TODAY</strong></div>' +
      '</section><section class="welcome-card" aria-live="polite">' +
      '<div class="welcome-kicker">CHECK-IN COMPLETE</div><div class="flame" aria-hidden="true">🔥</div>' +
      '<h1>WELCOME BACK, ' + escapeHtml(welcome.memberDisplayName.toUpperCase()) + '!</h1>' +
      '<div class="welcome-streak"><span>' + escapeHtml(String(welcome.activeStreak)) + '</span><strong>DAY STREAK</strong></div>' +
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
  playWelcomeChime();
  clearTimeout(welcomeTimer);
  const remaining = Math.max(0, Date.parse(welcome.expiresAt) - Date.now());
  welcomeTimer = setTimeout(() => { welcome = null; render(); }, remaining);
});
source.addEventListener("leaderboard", (event) => {
  try { leaderboard = JSON.parse(event.data); } catch (_error) { render(); return; }
  render();
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
body{margin:0;min-height:100vh;background:radial-gradient(circle at 52% 12%,var(--color-accent-2) 0,#141414 31%,var(--color-bg) 72%);overflow-x:hidden}
body:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.22;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px);background-size:100% 5px}
#app{min-height:100vh;display:grid;place-items:center;padding:clamp(1rem,3vw,3rem)}
.display-shell{width:min(94vw,1320px);display:grid;gap:clamp(1.25rem,2.4vw,2.5rem);position:relative}
.display-header{display:flex;justify-content:space-between;align-items:end;gap:2rem}
.brand-lockup{display:grid;gap:.25rem}
.pn-word{font-family:"Poppins",Arial,sans-serif;font-weight:800;font-size:clamp(1.8rem,4vw,3.6rem);color:#fff;letter-spacing:.02em;line-height:1}
.pn-word b{color:var(--color-accent-1);font-weight:800}
.pn-sub{font-family:"Poppins",Arial,sans-serif;font-weight:500;letter-spacing:.6em;color:var(--color-accent-1);font-size:clamp(.7rem,1.2vw,1rem)}
.pn-sector{font-size:clamp(.6rem,1vw,.8rem);letter-spacing:.3em;color:var(--color-secondary-text)}
.pn-tagline{font-size:clamp(.8rem,1.4vw,1.1rem);color:#fff;margin-top:.5rem}
.display-footer{margin:0;text-align:center;color:var(--color-secondary-text);font-size:clamp(.6rem,1.2vw,.9rem);font-weight:700;letter-spacing:.18em}
.live-pill{border:1px solid var(--color-accent-2);border-radius:999px;padding:.7rem 1rem;color:var(--color-secondary-text);font-size:clamp(.6rem,1vw,.8rem);font-weight:800;letter-spacing:.12em;white-space:nowrap}
.live-pill i{display:inline-block;width:.55rem;height:.55rem;background:var(--color-accent-1);border-radius:50%;margin-right:.5rem;box-shadow:0 0 12px var(--color-accent-1)}
.leaderboard-panel{border:1px solid var(--color-accent-2);border-radius:1.2rem;background:linear-gradient(145deg,var(--color-panel),var(--color-bg));box-shadow:0 1.5rem 4rem rgba(0,0,0,.28);padding:clamp(1rem,2vw,2rem)}
.section-heading{display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid var(--color-accent-2);padding:0 .7rem 1rem;color:var(--color-secondary-text);font-size:clamp(.65rem,1vw,.9rem);font-weight:800;letter-spacing:.14em}
.section-heading strong{color:var(--color-accent-1)}
.leaderboard{list-style:none;padding:0;margin:1rem 0 0;display:grid;gap:.55rem}
.leaderboard-row{display:grid;grid-template-columns:clamp(2.6rem,5vw,4.5rem) minmax(0,1fr) auto minmax(5rem,8vw);align-items:center;gap:clamp(.65rem,1.5vw,1.5rem);padding:clamp(.75rem,1.4vw,1.25rem);border:1px solid transparent;border-radius:.75rem;background:var(--color-panel);font-size:clamp(1rem,2vw,1.65rem)}
.leaderboard-row:first-child{border-color:var(--color-accent-1);background:linear-gradient(90deg,var(--color-accent-2),var(--color-panel))}
.rank{display:grid;place-items:center;width:clamp(2rem,4vw,3.2rem);height:clamp(2rem,4vw,3.2rem);border-radius:.7rem;background:var(--color-panel);color:var(--color-secondary-text);font-weight:900;font-size:clamp(.8rem,1.7vw,1.2rem)}
.rank-1{background:var(--color-rank-1);color:var(--color-on-orange)}.rank-2{background:var(--color-accent-1);color:var(--color-on-orange)}.rank-3{background:var(--color-accent-2);color:#fff}
.member-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:850;letter-spacing:.02em}
.streak-value{color:var(--color-accent-1);font-size:clamp(1.3rem,3vw,2.5rem);font-weight:950;white-space:nowrap}.streak-value small{font-size:.42em;color:var(--color-secondary-text);letter-spacing:.08em}
.personal-best{color:var(--color-secondary-text);font-size:clamp(.65rem,1.2vw,1rem);white-space:nowrap}.personal-best b{display:block;color:var(--color-accent-1);font-size:.7em;letter-spacing:.12em;margin-bottom:.15rem}
.empty-state{min-height:14rem;display:grid;place-items:center;align-content:center;gap:.7rem;color:var(--color-secondary-text);text-align:center;border:1px dashed var(--color-accent-2);background:var(--color-panel)}
.empty-state strong{color:var(--color-secondary-text);font-size:clamp(1.2rem,2.5vw,2rem)}.empty-flame{font-size:3rem}.empty-state span:last-child{font-size:clamp(.8rem,1.4vw,1rem)}
.welcome-active{min-height:calc(100vh - 2 * clamp(1rem,3vw,3rem));grid-template-columns:minmax(0,1fr) minmax(18rem,36rem);align-items:center}
.is-dimmed{opacity:.3;filter:blur(1px);transform:scale(.985)}
.idle-copy{display:grid;gap:.7rem;text-align:center;margin-top:3rem;color:var(--color-secondary-text);font-size:.7rem;letter-spacing:.18em}.idle-copy strong{color:var(--color-secondary-text);font-size:clamp(1rem,2vw,1.4rem)}
.welcome-card{padding:clamp(2rem,5vw,5rem) clamp(1.5rem,4vw,4rem);text-align:center;border:2px solid var(--color-accent-1);border-radius:1.5rem;background:linear-gradient(150deg,var(--color-accent-2),var(--color-bg));box-shadow:0 0 4rem rgba(228,80,26,.2),inset 0 0 3rem rgba(245,136,33,.08)}
.welcome-kicker{color:var(--color-secondary-text);font-size:clamp(.7rem,1.2vw,1rem);font-weight:900;letter-spacing:.2em}.flame{font-size:clamp(4rem,10vw,8rem);line-height:1;margin:1.3rem 0}.welcome-card h1{font-size:clamp(1.5rem,3.7vw,3.7rem);line-height:1.05;margin:0;overflow-wrap:anywhere}.welcome-streak{display:flex;justify-content:center;align-items:baseline;gap:.7rem;color:var(--color-accent-1);margin:1.2rem 0}.welcome-streak span{font-size:clamp(4rem,10vw,8rem);font-weight:950;line-height:.9}.welcome-streak strong{font-size:clamp(1rem,2vw,1.5rem);letter-spacing:.1em}.welcome-best{border-top:1px solid var(--color-accent-1);padding-top:1rem;color:var(--color-secondary-text);font-size:clamp(.7rem,1.2vw,.9rem);letter-spacing:.14em}.welcome-best strong{color:var(--color-secondary-text);margin-left:.4rem}
.demo{position:fixed;top:1rem;right:1rem;color:var(--color-accent-1);font-size:.7rem;font-weight:800;letter-spacing:.14em;z-index:2}
@media (max-width: 700px){#app{padding:1rem}.display-header{align-items:start;flex-direction:column;gap:1rem}.live-pill{align-self:flex-end}.leaderboard-row{grid-template-columns:2.4rem minmax(0,1fr) auto;gap:.55rem}.personal-best{display:none}.welcome-active{min-height:calc(100vh - 2rem);grid-template-columns:1fr}.is-dimmed{display:none}.welcome-card{grid-column:1}.section-heading strong{display:none}.pn-word{font-size:1.8rem}}
</style>
</head>
<body data-events-path="/v1/gyms/" data-display-mode="broadcast">${demoLabel ? '<div class="demo">DEMO MODE</div>' : ""}<div id="app"><noscript>PUMP NATION FITNESS, Waiting for first check-in</noscript></div><script src="/display/client.js"></script></body>
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