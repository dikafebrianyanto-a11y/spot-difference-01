// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, level clear and
// game over.
//
// ?seed=N fixes the random sequence. ?shot=cover|play|level|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { PANELS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_FOUND, EVENT_LEVEL, EVENT_MISS, EVENT_OVER, EVENT_TIMEOUT } from './world.js';
import { ACTION_CONFIRM, ACTION_HINT, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_LEVEL, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createAudio } from './audio.js';
import { readBest, saveBest } from './save.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let audioUnlocked = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each find.
  function announce(message) {
    status.textContent = message;
  }

  /** The audio context may only start after a user gesture; unlock it once, on the first one. */
  function unlockAudio() {
    if (!audioUnlocked) {
      audioUnlocked = true;
      audio.unlock();
    }
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing ${world.state.level.name}. Find ${world.state.totalDiffs} differences.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    audio.over();
    announce(world.state.cleared
      ? `You found every difference. Final score ${world.state.score}. Best ${best}.`
      : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  /** Feed one logical click to the world: hit-test the panels, convert to panel-local coords. */
  function handleClick(click) {
    if (screen !== SCREEN_PLAY) return;
    unlockAudio();
    const panel = Object.keys(PANELS).find((name) => {
      const rect = PANELS[name];
      return click.x >= rect.x && click.x < rect.x + rect.w
        && click.y >= rect.y && click.y < rect.y + rect.h;
    });
    if (!panel) return;
    const rect = PANELS[panel];
    const scoreBefore = world.state.score;
    const events = world.click(click.x - rect.x, click.y - rect.y, panel);
    if (!events) return;
    audio.click();
    if (events & EVENT_FOUND) {
      audio.found();
      const gained = world.state.score - scoreBefore;
      announce(`Found ${world.state.foundCount} of ${world.state.totalDiffs}. +${gained} points.`);
    }
    if (events & EVENT_MISS) {
      audio.miss();
      announce(world.state.strikes >= 3
        ? 'Miss. No strikes left.'
        : `Miss. ${3 - world.state.strikes} ${world.state.strikes === 2 ? 'strike' : 'strikes'} left.`);
    }
    if (events & EVENT_LEVEL) {
      audio.level();
      screen = SCREEN_LEVEL;
      announce(`Level clear. Time bonus banked. Score ${world.state.score}. Press Space for the next level.`);
    }
    if (events & EVENT_OVER) endGame();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) unlockAudio();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_LEVEL) {
      world.nextLevel();
      if (world.state.status === 'over') {
        endGame();
      } else {
        screen = SCREEN_PLAY;
        announce(`Playing ${world.state.level.name}. Find ${world.state.totalDiffs} differences.`);
      }
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if (actions & ACTION_HINT && screen === SCREEN_PLAY) {
      if (world.useHint()) audio.hint();
    }
  }

  function step() {
    const events = world.step(STEP);
    if (events & EVENT_TIMEOUT) {
      announce('Time up.');
      endGame();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    for (const click of input.takeClicks()) handleClick(click);
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, input.hover());
  }

  // Leaving the tab pauses a running game rather than letting the timer run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Double Take. Spot the differences between the two scenes. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
