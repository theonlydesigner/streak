import { DisplayState, renderLeaderboard, renderWelcome } from "./display-state.js";

const gymId = new URLSearchParams(window.location.search).get("gym") ?? "gym-1";
const eventsUrl = new URL(`/v1/gyms/${encodeURIComponent(gymId)}/events`, window.location.origin);
const state = new DisplayState();
const app = document.querySelector<HTMLDivElement>("#app");

function paint(): void {
  if (!app) return;
  const welcome = renderWelcome(state.welcome, new Date());
  app.innerHTML = welcome || renderLeaderboard(state.leaderboard);
}

function connect(): void {
  const source = new EventSource(eventsUrl);
  source.addEventListener("welcome", (event) => {
    state.setWelcome(JSON.parse((event as MessageEvent).data));
    paint();
    window.setTimeout(paint, 5100);
  });
  source.addEventListener("leaderboard", (event) => {
    state.setLeaderboard(JSON.parse((event as MessageEvent).data));
    paint();
  });
  source.onerror = () => {
    source.close();
    window.setTimeout(connect, 2000);
  };
}

paint();
connect();
