// The screenshot scenes behind ?shot=cover|play|level|end. Each one drives the real world
// forward through its public API — clicks on real difference centres, never state edits
// except where the contract allows (timeLeft for the cover, strikes for the end) — so the
// frame is what a short game really looks like and the same seed always gives the same frame.
import { sceneDiffs } from './scenes.js';
import { SCREEN_LEVEL, SCREEN_OVER, SCREEN_PLAY } from './render.js';

/** Click the first `count` difference centres (right-panel, panel-local coords). */
function clickDiffs(world, count) {
  const diffs = sceneDiffs(world.state.level.id);
  const total = Math.min(count, diffs.length);
  for (let index = 0; index < total; index += 1) {
    world.click(diffs[index].x, diffs[index].y, 'right');
  }
}

/**
 * Set `world` to the named scene (cover, play, level or end; any other name is cover) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    clickDiffs(world, 1);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'level') {
    clickDiffs(world, world.state.totalDiffs);
    world.finishLevel();
    return { screen: SCREEN_LEVEL, best: world.state.score };
  }
  if (name === 'end') {
    world.state.strikes = 3;
    world.endRun();
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  // 'cover' and anything else: level 1 (Harbor Dawn), 3 found, half the timer left.
  world.nextLevel();
  clickDiffs(world, 3);
  world.state.timeLeft = world.state.levelTime / 2;
  return { screen: SCREEN_PLAY, best: 0 };
}
