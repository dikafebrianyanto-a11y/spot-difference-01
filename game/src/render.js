// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Text that holds a number is rebuilt only when the number changes, so a frame
// allocates nothing. This renderer owns the effects instance: each draw compares the
// world's found/strikes against the previous frame and fires the matching effect, so the
// main loop never has to drive effects itself.
import { FIELD, FONT, PANELS, PALETTE } from './config.js';
import { drawScene, sceneDiffs } from './scenes.js';
import { createEffects } from './effects.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEVEL = 'level';
export const SCREEN_OVER = 'over';

/** The overlay panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 600, top: 134, line: 34, bottom: 70 };
const LENS_RADIUS = 70;
const STRIKE_DOT = 9;
const STRIKE_GAP = 22;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const effects = createEffects();
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const foundLabel = cachedLabel('Found ');
  const timerLabel = cachedLabel('');
  const hintsLabel = cachedLabel('Hints ');
  const bestLabel = cachedLabel('Best ');
  const finalLabel = cachedLabel('Score ');
  const levelLabel = cachedLabel('Level ');
  let prevFound = [];
  let prevStrikes = 0;
  let lastDraw = 0;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  /** Fire one-shot effects for what changed since the previous frame. */
  function triggerEffects(state) {
    const diffs = sceneDiffs(state.level.id);
    for (let index = 0; index < state.found.length; index += 1) {
      if (!state.found[index] || prevFound[index]) continue;
      const diff = diffs[index];
      // Ring on both panels; the "+points" text only on the right one.
      effects.foundRing(PANELS.left.x + diff.x, PANELS.left.y + diff.y);
      effects.foundRing(PANELS.right.x + diff.x, PANELS.right.y + diff.y);
      effects.floatText(
        PANELS.right.x + diff.x,
        PANELS.right.y + diff.y,
        '+' + (100 + 25 * (state.combo - 1)),
      );
    }
    if (state.strikes > prevStrikes) effects.missFlash();
    prevFound = state.found.slice();
    prevStrikes = state.strikes;
  }

  function drawHud(state) {
    context.textBaseline = 'alphabetic';
    text(
      levelLabel(state.levelIndex + 1) + ' · ' + state.level.name,
      24, 30, 24, PALETTE.text, 'left',
    );
    text(
      foundLabel(state.foundCount) + ' / ' + state.totalDiffs,
      FIELD.width / 2, 30, 24, PALETTE.text, 'center',
    );
    text(scoreLabel(state.score), FIELD.width - 24, 30, 24, PALETTE.text, 'right');

    // Timer bar + seconds on the second HUD row.
    const barX = 24;
    const barY = 46;
    const barWidth = 420;
    const barHeight = 12;
    const fraction = Math.max(0, Math.min(1, state.timeLeft / state.levelTime));
    context.fillStyle = PALETTE.panel;
    context.fillRect(barX, barY, barWidth, barHeight);
    context.fillStyle = PALETTE.timer;
    context.fillRect(barX, barY, Math.round(barWidth * fraction), barHeight);
    text(
      timerLabel(Math.max(0, Math.ceil(state.timeLeft))) + 's',
      barX + barWidth + 12, barY + barHeight, 20, PALETTE.text, 'left',
    );
    text(hintsLabel(state.hints), FIELD.width - 24, barY + barHeight, 20, PALETTE.hint, 'right');
  }

  function drawBottomBar(state, best) {
    const y = 676;
    const hint = state.hintTarget
      ? 'Hint: follow the pulsing ring'
      : 'Click a difference · H — hint · P — pause';
    text(hint, 24, y, 20, PALETTE.muted, 'left');
    // Strikes as three dots: filled red for each strike taken, hollow for the rest.
    const firstDot = FIELD.width / 2 - STRIKE_DOT - STRIKE_GAP;
    for (let dot = 0; dot < 3; dot += 1) {
      const cx = firstDot + dot * STRIKE_GAP + STRIKE_DOT;
      context.beginPath();
      context.arc(cx, y - 6, STRIKE_DOT, 0, Math.PI * 2);
      if (dot < state.strikes) {
        context.fillStyle = PALETTE.miss;
        context.fill();
      } else {
        context.strokeStyle = PALETTE.muted;
        context.lineWidth = 2;
        context.stroke();
      }
    }
    text(bestLabel(best), FIELD.width - 24, y, 20, PALETTE.muted, 'right');
  }

  function drawPanelLabel(panel, label) {
    context.fillStyle = 'rgba(10, 12, 16, 0.65)';
    context.fillRect(panel.x + 6, panel.y + 6, 62, 24);
    text(label, panel.x + 37, panel.y + 23, 15, PALETTE.text, 'center');
  }

  function drawPanels(state) {
    const variants = [
      { panel: PANELS.left, variant: 0, label: 'LEFT' },
      { panel: PANELS.right, variant: 1, label: 'RIGHT' },
    ];
    for (let index = 0; index < variants.length; index += 1) {
      const { panel, variant, label } = variants[index];
      context.fillStyle = PALETTE.panel;
      context.fillRect(panel.x, panel.y, panel.w, panel.h);
      context.save();
      context.translate(panel.x, panel.y);
      drawScene(context, state.level.id, variant);
      context.restore();
      context.strokeStyle = PALETTE.panelEdge;
      context.lineWidth = 2;
      context.strokeRect(panel.x, panel.y, panel.w, panel.h);
      drawPanelLabel(panel, label);
    }
  }

  function drawFoundRings(state) {
    const diffs = sceneDiffs(state.level.id);
    for (let index = 0; index < state.found.length; index += 1) {
      if (!state.found[index]) continue;
      const diff = diffs[index];
      for (const panel of [PANELS.left, PANELS.right]) {
        const cx = panel.x + diff.x;
        const cy = panel.y + diff.y;
        context.strokeStyle = PALETTE.found;
        context.lineWidth = 3;
        context.beginPath();
        context.arc(cx, cy, diff.r + 5, 0, Math.PI * 2);
        context.stroke();
        text('✓', cx, cy + 7, 20, PALETTE.found, 'center');
      }
    }
  }

  function drawHintFlash(state) {
    if (!state.hintTarget) return;
    const pulse = 0.5 + 0.5 * Math.sin(state.time * 8);
    const radius = 20 + 7 * pulse;
    context.strokeStyle = PALETTE.hint;
    context.globalAlpha = 0.45 + 0.55 * pulse;
    context.lineWidth = 3;
    for (const panel of [PANELS.left, PANELS.right]) {
      context.beginPath();
      context.arc(panel.x + state.hintTarget.x, panel.y + state.hintTarget.y, radius, 0, Math.PI * 2);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  /** 2x circular magnifier at the cursor, re-running the scene clipped to the lens. */
  function drawMagnifier(state, hover) {
    if (!hover) return;
    let panel = null;
    let variant = 0;
    for (const [name, candidate] of [['left', PANELS.left], ['right', PANELS.right]]) {
      if (
        hover.x >= candidate.x && hover.x < candidate.x + candidate.w &&
        hover.y >= candidate.y && hover.y < candidate.y + candidate.h
      ) {
        panel = candidate;
        variant = name === 'left' ? 0 : 1;
      }
    }
    if (!panel) return;
    const localX = hover.x - panel.x;
    const localY = hover.y - panel.y;
    context.save();
    context.beginPath();
    context.arc(hover.x, hover.y, LENS_RADIUS, 0, Math.PI * 2);
    context.clip();
    context.translate(hover.x, hover.y);
    context.scale(2, 2);
    context.translate(-hover.x, -hover.y);
    context.translate(panel.x, panel.y);
    drawScene(context, state.level.id, variant);
    context.restore();
    context.strokeStyle = PALETTE.accent;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(hover.x, hover.y, LENS_RADIUS, 0, Math.PI * 2);
    context.stroke();
  }

  function drawOverlay(title, lines, prompt) {
    context.fillStyle = 'rgba(8, 10, 14, 0.62)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    text(title, FIELD.width / 2, y + 78, 48, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 40, 24, PALETTE.accent, 'center');
  }

  /** Paint one frame: the field, the HUD and panels, then the overlay for the screen the game is on. */
  function draw(state, screen, best, hover) {
    const now = performance.now();
    const dt = lastDraw === 0 ? 1 / 60 : Math.max(0, Math.min(0.1, (now - lastDraw) / 1000));
    lastDraw = now;
    triggerEffects(state);
    effects.update(dt);

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawPanels(state);
    drawFoundRings(state);
    drawHintFlash(state);
    drawHud(state);
    drawBottomBar(state, best);
    effects.draw(context);
    if (screen === SCREEN_PLAY) drawMagnifier(state, hover);

    if (screen === SCREEN_TITLE) {
      drawOverlay('Double Take', [
        'Two scenes, side by side — find every difference.',
        'Click a difference on either panel. H — hint, P — pause.',
        bestLabel(best),
      ], 'Press Space or click to start');
    } else if (screen === SCREEN_PAUSED) {
      drawOverlay('Paused', ['The clock is waiting for you.'], 'Press P to resume');
    } else if (screen === SCREEN_LEVEL) {
      const bonus = Math.round(state.timeLeft) * 10;
      drawOverlay(state.cleared ? 'You found them all!' : 'Level clear!', [
        'Found ' + state.foundCount + ' / ' + state.totalDiffs + ' differences',
        'Time bonus +' + bonus,
        finalLabel(state.score),
      ], state.cleared ? 'Press Space or click to play again' : 'Press Space for the next level');
    } else if (screen === SCREEN_OVER) {
      drawOverlay(state.cleared ? 'You found them all!' : 'Game over', [
        finalLabel(state.score),
        bestLabel(best),
      ], 'Press Space or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, effects };
}
