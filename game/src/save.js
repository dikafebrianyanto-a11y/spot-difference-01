// Best score persistence. localStorage can be off (private windows), so every access is
// guarded and a missing or unreadable value falls back to 0.

import { BEST_KEY } from './config.js';

/** The best score saved in this browser, or 0 when none is stored. */
export function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

/** Store the best score; silently no-ops when storage is unavailable. */
export function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}
