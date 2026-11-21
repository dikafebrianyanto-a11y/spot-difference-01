// Keyboard and pointer input. One-shot presses (start/restart, pause, hint) are queued as
// bit flags and taken once by the loop, so a press between two frames is never lost and
// never counted twice. Pointer clicks and hover are reported in logical 1280x720 coords
// through the same letterbox transform the renderer uses:
//   scale = min(rectW/1280, rectH/720); ox = (rectW - 1280*scale)/2; oy = (rectH - 720*scale)/2
//   logical = ((clientX - rect.left - ox)/scale, (clientY - rect.top - oy)/scale)

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_HINT = 4;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const HINT = new Set(['KeyH']);

/** Convert a client point to logical coords via the letterbox transform. */
function toLogical(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
  const ox = (rect.width - FIELD.width * scale) / 2;
  const oy = (rect.height - FIELD.height * scale) / 2;
  return {
    x: (clientX - rect.left - ox) / scale,
    y: (clientY - rect.top - oy) / scale,
  };
}

export function createInput(canvas) {
  let actions = 0;
  let clicks = [];
  let hoverPoint = null;

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (HINT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_HINT;
    } else {
      return;
    }
    event.preventDefault();
  });

  // A key held while the tab is hidden never sends keyup: clear the held state on blur.
  window.addEventListener('blur', () => {
    actions = 0;
    hoverPoint = null;
  });

  canvas.addEventListener('pointerdown', (event) => {
    clicks.push(toLogical(canvas, event.clientX, event.clientY));
    actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointermove', (event) => {
    hoverPoint = toLogical(canvas, event.clientX, event.clientY);
  });
  canvas.addEventListener('pointerleave', () => {
    hoverPoint = null;
  });

  return {
    /** The clicks since the last call, as logical {x, y} points. */
    takeClicks() {
      const taken = clicks;
      clicks = [];
      return taken;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The current pointer position in logical coords, or null when off the canvas. */
    hover() {
      return hoverPoint;
    },
  };
}
