import type { LeaderboardSnapshot, WelcomeEvent } from "@streak/contracts";

export class DisplayState {
  leaderboard: LeaderboardSnapshot | null = null;
  welcome: WelcomeEvent | null = null;

  setLeaderboard(snapshot: LeaderboardSnapshot): void {
    this.leaderboard = snapshot;
  }

  setWelcome(event: WelcomeEvent): void {
    this.welcome = event;
  }
}

export function renderLeaderboard(snapshot: LeaderboardSnapshot | null): string {
  if (!snapshot) return `<main class="idle"><p>Waiting for leaderboard…</p></main>`;
  const rows = snapshot.entries.map((entry, index) =>
    `<li><strong>${index + 1}. ${escapeHtml(entry.memberDisplayName)}</strong><span>${entry.activeStreak}-day streak · Best: ${entry.personalBest}</span></li>`
  ).join("");
  return `<main class="idle"><h1>STREAK LEADERBOARD</h1><ol>${rows}</ol></main>`;
}

export function renderWelcome(event: WelcomeEvent | null, now: Date): string {
  if (!event || now.getTime() >= Date.parse(event.expiresAt)) return "";
  return `<main class="welcome"><div class="flame">🔥</div><h1>WELCOME BACK, ${escapeHtml(event.memberDisplayName.toUpperCase())}!</h1><p>${event.activeStreak}-DAY STREAK!</p><small>PERSONAL BEST: ${event.personalBest}</small></main>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character] ?? character);
}
