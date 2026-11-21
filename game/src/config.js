// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Click radius around a difference centre, in panel-local px (added to the diff's own r). */
export const TOLERANCE = 28;

/** Strikes before the run ends. */
export const MAX_STRIKES = 3;

/** Hints granted at the start of each level. */
export const HINTS_PER_LEVEL = 3;

/** How long a hint ring flashes, in seconds. */
export const HINT_FLASH = 2.0;

/** Seconds subtracted from the timer on a miss. */
export const MISS_TIME_PENALTY = 5;

/** The two scene panels, in logical coords. Panel-local coords are 0..592 x 0..548. */
export const PANELS = {
  left: { x: 24, y: 80, w: 592, h: 548 },
  right: { x: 664, y: 80, w: 592, h: 548 },
};

export const PALETTE = {
  backdrop: '#14161d',
  panel: '#20242f',
  panelEdge: '#3a4152',
  text: '#eef1f5',
  muted: '#8b93a3',
  accent: '#f2c94c',
  found: '#59d98c',
  miss: '#e5534b',
  timer: '#4fc3f7',
  hint: '#c792ea',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'double-take.best';

// Scoring: a find is worth 100 + 25*combo, where combo counts consecutive finds and
// resets to 0 on a miss. Clearing a level adds round(timeLeft)*10 as a time bonus.
