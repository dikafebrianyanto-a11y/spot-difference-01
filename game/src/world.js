import { SCENES, sceneDiffs } from './scenes.js';
import { nearestDiff } from './differences.js';
import {
  TOLERANCE,
  MAX_STRIKES,
  HINTS_PER_LEVEL,
  HINT_FLASH,
  MISS_TIME_PENALTY,
  PANELS,
} from './config.js';

export const EVENT_FOUND = 1;
export const EVENT_MISS = 2;
export const EVENT_LEVEL = 4;
export const EVENT_OVER = 8;
export const EVENT_TIMEOUT = 16;

export function createWorld(random) {
  // random is accepted for API parity; levels run in SCENES order.
  void random;

  const state = {
    levelIndex: 0,
    level: SCENES[0],
    found: [],
    foundCount: 0,
    totalDiffs: 0,
    timeLeft: 0,
    levelTime: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    strikes: 0,
    hints: HINTS_PER_LEVEL,
    hintTarget: null,
    time: 0,
    status: 'title',
    cleared: false,
  };

  function loadLevel(index) {
    const scene = SCENES[index];
    state.levelIndex = index;
    state.level = scene;
    state.totalDiffs = scene.diffs;
    state.found = new Array(scene.diffs).fill(false);
    state.foundCount = 0;
    state.timeLeft = scene.time;
    state.levelTime = scene.time;
    state.hints = HINTS_PER_LEVEL;
    state.strikes = 0;
    state.hintTarget = null;
    state.time = 0;
    state.status = 'play';
  }

  function reset() {
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.cleared = false;
    loadLevel(0);
  }

  function click(px, py, panel) {
    if (state.status !== 'play') return 0;
    const rect = PANELS[panel];
    if (!rect) return 0;
    // Panel-local coords; ignore clicks outside the panel rect.
    if (px < 0 || py < 0 || px > rect.w || py > rect.h) return 0;

    const diffs = sceneDiffs(state.level.id);
    const idx = nearestDiff(diffs, state.found, px, py, TOLERANCE);
    if (idx < 0) {
      state.strikes += 1;
      state.combo = 0;
      state.timeLeft -= MISS_TIME_PENALTY;
      if (state.strikes >= MAX_STRIKES) {
        state.status = 'over';
        return EVENT_MISS | EVENT_OVER;
      }
      return EVENT_MISS;
    }

    state.found[idx] = true;
    state.foundCount += 1;
    state.score += 100 + 25 * state.combo;
    state.combo += 1;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;

    if (state.foundCount >= state.totalDiffs) {
      state.score += Math.round(state.timeLeft) * 10;
      state.status = 'level';
      return EVENT_FOUND | EVENT_LEVEL;
    }
    return EVENT_FOUND;
  }

  function useHint() {
    if (state.status !== 'play' || state.hints <= 0) return false;
    const diffs = sceneDiffs(state.level.id);
    let best = -1;
    for (let i = 0; i < diffs.length; i += 1) {
      if (!state.found[i]) {
        best = i;
        break;
      }
    }
    if (best < 0) return false;
    state.hints -= 1;
    state.hintTarget = {
      x: diffs[best].x,
      y: diffs[best].y,
      until: state.time + HINT_FLASH,
    };
    return true;
  }

  function step(dt) {
    if (state.status !== 'play') return 0;
    state.timeLeft -= dt;
    state.time += dt;
    if (state.hintTarget && state.time > state.hintTarget.until) {
      state.hintTarget = null;
    }
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.status = 'over';
      return EVENT_TIMEOUT;
    }
    return 0;
  }

  function nextLevel() {
    const next = state.levelIndex + 1;
    if (next >= SCENES.length) {
      state.status = 'over';
      state.cleared = true;
      return EVENT_OVER;
    }
    loadLevel(next);
    return 0;
  }

  function finishLevel() {
    state.status = 'level';
  }

  function endRun() {
    state.status = 'over';
  }

  // Fresh state for level 0; status starts at 'title' until the run begins.
  loadLevel(0);
  state.status = 'title';

  return { state, reset, click, useHint, step, nextLevel, finishLevel, endRun };
}
