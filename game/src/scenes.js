// scenes.js — hand-drawn scenes for Double Take (worker B).
// Every scene is drawn ONLY with canvas paths/shapes/text. No images, no assets.
// Deterministic: each drawScene call rebuilds its own seeded RNG from the scene
// id, so the left (variant 0) and right (variant 1) panels render identically
// except at the difference sites. Random values are only consumed for static
// background texture at the top of each draw, before any variant branch.

export const SCENES = [
  { id: 'market',   name: 'Night Market',   diffs: 6, time: 90 },
  { id: 'harbor',   name: 'Harbor Dawn',    diffs: 6, time: 85 },
  { id: 'garden',   name: 'Rose Garden',    diffs: 7, time: 80 },
  { id: 'workshop', name: 'Clock Workshop', diffs: 7, time: 75 },
  { id: 'street',   name: 'Café Corner',    diffs: 7, time: 70 },
  { id: 'beach',    name: 'Shell Beach',    diffs: 7, time: 65 },
];

// Click targets, panel-local coords (0..592 x 0..548). Each entry is the centre
// of the object that differs between variants, in the same order as the
// variant branches inside the matching draw function.
const DIFFS = {
  market: [
    { x: 110, y: 95,  r: 26 }, // hanging lantern recolored
    { x: 300, y: 435, r: 24 }, // jar on the ground removed
    { x: 455, y: 390, r: 26 }, // fruit basket moved
    { x: 520, y: 300, r: 22 }, // cat added on the right stall
    { x: 205, y: 150, r: 28 }, // big lantern resized
    { x: 85,  y: 250, r: 24 }, // hanging sign flipped
  ],
  harbor: [
    { x: 350, y: 120, r: 22 }, // gull removed
    { x: 150, y: 400, r: 28 }, // boat hull recolored
    { x: 480, y: 460, r: 24 }, // crate moved
    { x: 520, y: 130, r: 24 }, // lighthouse window removed
    { x: 250, y: 470, r: 22 }, // buoy resized
    { x: 420, y: 200, r: 22 }, // mast flag flipped
  ],
  garden: [
    { x: 100, y: 400, r: 24 }, // tulip recolored
    { x: 300, y: 150, r: 22 }, // butterfly removed
    { x: 480, y: 420, r: 24 }, // flower pot moved
    { x: 296, y: 185, r: 22 }, // bird added on the fountain
    { x: 296, y: 265, r: 26 }, // fountain jet resized
    { x: 450, y: 200, r: 22 }, // butterfly flipped
    { x: 180, y: 300, r: 22 }, // rose removed
  ],
  workshop: [
    { x: 296, y: 140, r: 28 }, // clock hands moved
    { x: 120, y: 380, r: 24 }, // hammer removed
    { x: 500, y: 120, r: 24 }, // lamp shade recolored
    { x: 420, y: 220, r: 22 }, // gear added on the shelf
    { x: 200, y: 300, r: 24 }, // wrench resized
    { x: 350, y: 320, r: 22 }, // book flipped (lean)
    { x: 80,  y: 200, r: 22 }, // screwdriver recolored
  ],
  street: [
    { x: 480, y: 470, r: 24 }, // cat removed
    { x: 200, y: 420, r: 24 }, // bicycle basket recolored
    { x: 120, y: 150, r: 26 }, // café sign moved down
    { x: 540, y: 380, r: 22 }, // flower pot added
    { x: 296, y: 120, r: 28 }, // awning resized (wider)
    { x: 380, y: 400, r: 20 }, // cup flipped (handle side)
    { x: 500, y: 200, r: 24 }, // window shutter recolored
  ],
  beach: [
    { x: 150, y: 200, r: 30 }, // umbrella recolored
    { x: 300, y: 470, r: 22 }, // shell removed
    { x: 450, y: 380, r: 28 }, // boat moved
    { x: 520, y: 150, r: 22 }, // coconut added under the palm
    { x: 200, y: 500, r: 22 }, // starfish resized
    { x: 380, y: 430, r: 22 }, // bucket flipped
    { x: 100, y: 450, r: 24 }, // beach ball recolored
  ],
};

export function sceneDiffs(sceneId) {
  const d = DIFFS[sceneId];
  return d ? d.map((o) => ({ x: o.x, y: o.y, r: o.r })) : [];
}

// --- deterministic RNG -----------------------------------------------------

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- tiny drawing helpers --------------------------------------------------

function circ(ctx, x, y, r, fill) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}
function ell(ctx, x, y, rx, ry, fill) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}
function rect(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
}
function poly(ctx, pts, fill) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function line(ctx, x1, y1, x2, y2, color, w) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}
function text(ctx, s, x, y, size, color, align) {
  ctx.font = 'bold ' + size + 'px system-ui, sans-serif';
  ctx.fillStyle = color; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function drawLantern(ctx, x, y, s, body, glow) {
  line(ctx, x, y - 26 * s, x, y - 12 * s, '#0c0f16', 2);
  ell(ctx, x, y, 13 * s, 17 * s, body);
  ell(ctx, x, y, 7 * s, 11 * s, glow);
  rect(ctx, x - 6 * s, y - 20 * s, 12 * s, 4 * s, '#f2c94c');
  rect(ctx, x - 6 * s, y + 16 * s, 12 * s, 4 * s, '#f2c94c');
}

function drawJar(ctx, x, y, s, body, lid) {
  ell(ctx, x, y - 8 * s, 11 * s, 13 * s, body);
  rect(ctx, x - 7 * s, y - 24 * s, 14 * s, 6 * s, lid);
  ell(ctx, x, y + 2 * s, 5 * s, 3 * s, 'rgba(255,255,255,0.35)');
}

function drawGull(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, y); ctx.quadraticCurveTo(x - 6 * s, y - 9 * s, x, y);
  ctx.quadraticCurveTo(x + 6 * s, y - 9 * s, x + 14 * s, y);
  ctx.strokeStyle = '#2b3242'; ctx.lineWidth = 2.5 * s; ctx.stroke();
}

function drawButterfly(ctx, x, y, s, flip, c1, c2) {
  const d = flip ? -1 : 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(d, 1);
  ell(ctx, -7 * s, -5 * s, 8 * s, 6 * s, c1);
  ell(ctx, -7 * s, 5 * s, 7 * s, 5 * s, c2);
  ell(ctx, 7 * s, -5 * s, 8 * s, 6 * s, c1);
  ell(ctx, 7 * s, 5 * s, 7 * s, 5 * s, c2);
  ell(ctx, 0, 0, 2.5 * s, 8 * s, '#2b2b2b');
  ctx.restore();
}

function drawCat(ctx, x, y, s, color) {
  ell(ctx, x, y, 16 * s, 11 * s, color);            // body
  circ(ctx, x + 13 * s, y - 10 * s, 8 * s, color);  // head
  poly(ctx, [[x + 8 * s, y - 15 * s], [x + 10 * s, y - 24 * s], [x + 14 * s, y - 16 * s]], color);
  poly(ctx, [[x + 15 * s, y - 17 * s], [x + 19 * s, y - 25 * s], [x + 21 * s, y - 16 * s]], color);
  ctx.beginPath(); ctx.moveTo(x - 15 * s, y + 4 * s);
  ctx.quadraticCurveTo(x - 26 * s, y - 6 * s, x - 22 * s, y - 16 * s);
  ctx.strokeStyle = color; ctx.lineWidth = 4 * s; ctx.stroke();
}

// --- dispatcher ------------------------------------------------------------

export function drawScene(ctx, sceneId, variant) {
  const v = variant ? 1 : 0;
  switch (sceneId) {
    case 'market': drawMarket(ctx, v); break;
    case 'harbor': drawHarbor(ctx, v); break;
    case 'garden': drawGarden(ctx, v); break;
    case 'workshop': drawWorkshop(ctx, v); break;
    case 'street': drawStreet(ctx, v); break;
    case 'beach': drawBeach(ctx, v); break;
    default: rect(ctx, 0, 0, 592, 548, '#20242f');
  }
}

// --- 1. Night Market -------------------------------------------------------

function drawMarket(ctx, v) {
  const rng = mulberry32(hashStr('market'));
  const stars = [];
  for (let i = 0; i < 46; i++) stars.push([rng() * 592, rng() * 200, 0.6 + rng() * 1.4]);
  rect(ctx, 0, 0, 592, 548, '#16203a');
  for (const [x, y, r] of stars) circ(ctx, x, y, r, 'rgba(255,255,255,0.75)');
  circ(ctx, 505, 68, 30, '#f5e6b8'); circ(ctx, 495, 60, 26, '#f9efc9');
  rect(ctx, 0, 420, 592, 128, '#3a2c1e');
  rect(ctx, 0, 420, 592, 6, '#57402a');

  // string lights across the top
  line(ctx, 0, 40, 592, 58, '#0c0f16', 2);
  for (let i = 0; i < 9; i++) {
    const x = 30 + i * 64, y = 44 + i * 2;
    circ(ctx, x, y + 8, 5, ['#f2c94c', '#e5534b', '#59d98c'][i % 3]);
  }

  // DIFF 1: hanging lantern recolored (red <-> teal)
  drawLantern(ctx, 110, 95, 1, v ? '#2ec4b6' : '#e5534b', v ? '#b8fff8' : '#ffd9d4');
  // DIFF 5: big lantern resized (1x <-> 1.45x)
  drawLantern(ctx, 205, 150, v ? 1.45 : 1, '#f2c94c', '#fff3c4');

  // left stall
  rect(ctx, 60, 180, 8, 150, '#5d4126'); rect(ctx, 232, 180, 8, 150, '#5d4126');
  for (let i = 0; i < 5; i++) rect(ctx, 52 + i * 40, 180, 40, 52, i % 2 ? '#f5e6c8' : '#c0392b');
  poly(ctx, [[52, 232], [92, 246], [132, 232], [172, 246], [212, 232], [252, 246], [252, 232]], '#c0392b');
  rect(ctx, 55, 320, 190, 110, '#7a5230'); rect(ctx, 55, 320, 190, 12, '#9c6b3f');
  // DIFF 6: hanging sign flipped (arrow points right <-> left)
  rect(ctx, 62, 238, 46, 30, '#f5e6c8');
  ctx.save(); ctx.translate(85, 253); if (v) ctx.scale(-1, 1);
  poly(ctx, [[-12, 0], [4, -7], [4, -2], [14, -2], [14, 2], [4, 2], [4, 7]], '#c0392b');
  ctx.restore();
  drawJar(ctx, 90, 300, 1, '#4fc3f7', '#2b7fb8');
  drawJar(ctx, 130, 300, 1, '#59d98c', '#2f8f57');
  drawJar(ctx, 175, 300, 1, '#c792ea', '#8a5fb0');
  text(ctx, 'PASAR', 150, 360, 20, '#f5e6c8');
  text(ctx, 'MALAM', 150, 386, 14, '#f2c94c');

  // right stall
  rect(ctx, 340, 250, 8, 180, '#5d4126'); rect(ctx, 540, 250, 8, 180, '#5d4126');
  for (let i = 0; i < 5; i++) rect(ctx, 332 + i * 44, 250, 44, 48, i % 2 ? '#f5e6c8' : '#2e7d6b');
  rect(ctx, 330, 340, 220, 100, '#7a5230'); rect(ctx, 330, 340, 220, 12, '#9c6b3f');
  drawJar(ctx, 360, 322, 1, '#f2c94c', '#b8952e');
  drawJar(ctx, 400, 322, 1, '#e5534b', '#9c2f28');
  // DIFF 4: cat added on the right stall (variant 1 only)
  if (v) drawCat(ctx, 520, 300, 1, '#3a3f4a');
  // DIFF 3: fruit basket moved (x 455 <-> 495)
  const bx = v ? 495 : 455;
  ell(ctx, bx, 392, 26, 12, '#8a5a2b');
  circ(ctx, bx - 12, 382, 8, '#e5534b'); circ(ctx, bx, 378, 8, '#f2c94c'); circ(ctx, bx + 12, 382, 8, '#59d98c');
  text(ctx, 'BUAH', 440, 380, 16, '#f5e6c8');

  // DIFF 2: jar on the ground removed (variant 1 only)
  if (!v) drawJar(ctx, 300, 435, 1.2, '#c792ea', '#8a5fb0');
  drawJar(ctx, 255, 448, 1, '#4fc3f7', '#2b7fb8');
  drawJar(ctx, 345, 448, 1, '#59d98c', '#2f8f57');
  // extra set dressing
  rect(ctx, 40, 470, 120, 40, '#5d4126'); rect(ctx, 40, 470, 120, 8, '#7a5230');
  circ(ctx, 70, 462, 9, '#e5534b'); circ(ctx, 100, 462, 9, '#f2c94c'); circ(ctx, 130, 462, 9, '#59d98c');
}

// --- 2. Harbor Dawn ----------------------------------------------------------

function drawHarbor(ctx, v) {
  const rng = mulberry32(hashStr('harbor'));
  const sparkles = [];
  for (let i = 0; i < 26; i++) sparkles.push([rng() * 592, 330 + rng() * 180, 1 + rng() * 2]);
  // dawn sky bands
  rect(ctx, 0, 0, 592, 140, '#f2a65a');
  rect(ctx, 0, 140, 592, 110, '#e88ca0');
  rect(ctx, 0, 250, 592, 90, '#7f7fb8');
  circ(ctx, 296, 300, 42, '#fff3c4'); circ(ctx, 296, 300, 30, '#ffe98a');
  // sea
  rect(ctx, 0, 330, 592, 218, '#2b6a8f');
  rect(ctx, 0, 330, 592, 6, '#4fc3f7');
  for (let i = 0; i < 8; i++) line(ctx, 30 + i * 70, 360 + (i % 3) * 40, 80 + i * 70, 360 + (i % 3) * 40, 'rgba(255,255,255,0.35)', 2);
  for (const [x, y, r] of sparkles) circ(ctx, x, y, r, 'rgba(255,255,255,0.5)');

  // DIFF 1: gull removed (variant 1 only)
  if (!v) drawGull(ctx, 350, 120, 1);
  drawGull(ctx, 180, 90, 0.9); drawGull(ctx, 430, 80, 1.1); drawGull(ctx, 90, 160, 0.8);

  // lighthouse (right)
  rect(ctx, 498, 90, 46, 250, '#f5e6c8');
  rect(ctx, 498, 130, 46, 26, '#e5534b'); rect(ctx, 498, 190, 46, 26, '#e5534b'); rect(ctx, 498, 250, 46, 26, '#e5534b');
  rect(ctx, 492, 60, 58, 34, '#2b3242');
  // DIFF 4: lighthouse window removed (variant 1 only)
  if (!v) rect(ctx, 512, 118, 18, 16, '#ffd94d');
  poly(ctx, [[488, 60], [521, 34], [554, 60]], '#c0392b');
  // light beam
  ctx.save(); ctx.globalAlpha = 0.25;
  poly(ctx, [[498, 74], [300, 30], [300, 118]], '#fff3c4'); ctx.restore();

  // DIFF 2: boat hull recolored (red <-> green)
  poly(ctx, [[100, 400], [200, 400], [180, 428], [120, 428]], v ? '#2f8f57' : '#c0392b');
  rect(ctx, 142, 360, 8, 42, '#5d4126');
  poly(ctx, [[150, 362], [150, 396], [188, 396]], '#f5e6c8');
  // DIFF 6: mast flag flipped (points right <-> left)
  ctx.save(); ctx.translate(420, 200); if (v) ctx.scale(-1, 1);
  poly(ctx, [[0, 0], [26, 7], [0, 14]], '#f2c94c'); ctx.restore();
  // second boat
  poly(ctx, [[380, 430], [470, 430], [452, 456], [398, 456]], '#7a5230');
  rect(ctx, 418, 392, 7, 40, '#5d4126');
  poly(ctx, [[425, 394], [425, 428], [458, 428]], '#e8ecf2');
  line(ctx, 421, 200, 421, 392, '#5d4126', 3);

  // dock + crates
  rect(ctx, 0, 470, 592, 30, '#6b4a2a'); rect(ctx, 0, 470, 592, 6, '#8a5a2b');
  for (let i = 0; i < 7; i++) line(ctx, 40 + i * 84, 476, 40 + i * 84, 494, '#4a3018', 2);
  rect(ctx, 60, 428, 42, 42, '#b8952e'); line(ctx, 60, 449, 102, 449, '#8a6d1f', 3); line(ctx, 81, 428, 81, 470, '#8a6d1f', 3);
  // DIFF 3: crate moved (y 438 <-> 468, i.e. stacked vs on the dock)
  const cy = v ? 468 : 438;
  rect(ctx, 459, cy, 42, 42, '#a9803e'); line(ctx, 459, cy + 21, 501, cy + 21, '#7a5a24', 3);
  rect(ctx, 520, 428, 40, 42, '#b8952e');
  // DIFF 5: buoy resized (1x <-> 1.5x)
  const bs = v ? 1.5 : 1;
  ell(ctx, 250, 470, 12 * bs, 9 * bs, '#e5534b');
  rect(ctx, 250 - 3 * bs, 470 - 18 * bs, 6 * bs, 10 * bs, '#f2c94c');
  ell(ctx, 250, 470, 12 * bs, 9 * bs, 'rgba(255,255,255,0.15)');
  ell(ctx, 330, 500, 10, 7, '#f2c94c');
}

// --- 3. Rose Garden ---------------------------------------------------------

function drawGarden(ctx, v) {
  const rng = mulberry32(hashStr('garden'));
  const petals = [];
  for (let i = 0; i < 22; i++) petals.push([rng() * 592, 380 + rng() * 150, 1 + rng() * 2]);
  rect(ctx, 0, 0, 592, 548, '#a8d8a0');
  rect(ctx, 0, 0, 592, 120, '#bfe8f5');
  circ(ctx, 80, 60, 28, '#fff3c4');
  // hedges
  ell(ctx, 60, 480, 130, 60, '#3e7d44'); ell(ctx, 540, 480, 120, 60, '#3e7d44');
  ell(ctx, 60, 460, 90, 40, '#4c9453'); ell(ctx, 540, 460, 90, 40, '#4c9453');
  // lawn
  rect(ctx, 0, 380, 592, 168, '#6fb35e');
  for (const [x, y, r] of petals) circ(ctx, x, y, r, 'rgba(255,255,255,0.5)');

  // fountain (centre)
  ell(ctx, 296, 330, 95, 26, '#7f9fb8');
  ell(ctx, 296, 326, 80, 20, '#4fc3f7');
  rect(ctx, 290, 230, 12, 95, '#cfd6dd');
  ell(ctx, 296, 230, 34, 10, '#cfd6dd');
  // DIFF 5: fountain jet resized (taller in variant 1)
  const jh = v ? 78 : 46;
  ctx.beginPath(); ctx.moveTo(296, 232);
  ctx.quadraticCurveTo(276, 232 - jh, 296, 232 - jh - 18);
  ctx.quadraticCurveTo(316, 232 - jh, 296, 232);
  ctx.fillStyle = '#8fd8ff'; ctx.fill();
  circ(ctx, 296, 232 - jh - 14, 6, '#bfeaff');
  // DIFF 4: bird added on the fountain rim (variant 1 only)
  if (v) {
    ell(ctx, 296, 185, 10, 7, '#3a4a5a');
    circ(ctx, 305, 179, 5, '#3a4a5a');
    poly(ctx, [[309, 179], [315, 181], [309, 183]], '#f2c94c');
  }

  // flower beds
  function tulip(x, y, s, color) {
    line(ctx, x, y, x, y + 26 * s, '#2f7d32', 3);
    ell(ctx, x, y - 6 * s, 7 * s, 10 * s, color);
    poly(ctx, [[x - 7 * s, y - 10 * s], [x - 3 * s, y - 18 * s], [x, y - 11 * s], [x + 3 * s, y - 18 * s], [x + 7 * s, y - 10 * s]], color);
  }
  // DIFF 1: tulip recolored (pink <-> orange)
  tulip(100, 400, 1, v ? '#f2994a' : '#e86aa0');
  tulip(140, 415, 1, '#e86aa0'); tulip(60, 415, 1, '#f2994a');
  tulip(470, 400, 1, '#e86aa0'); tulip(510, 415, 1, '#f2994a'); tulip(430, 415, 1, '#e86aa0');
  // DIFF 7: rose removed (variant 1 only)
  if (!v) {
    circ(ctx, 180, 300, 12, '#c0392b');
    circ(ctx, 172, 296, 6, '#e5534b'); circ(ctx, 188, 296, 6, '#e5534b');
    line(ctx, 180, 312, 180, 340, '#2f7d32', 3);
  }
  circ(ctx, 215, 315, 10, '#c0392b'); line(ctx, 215, 325, 215, 350, '#2f7d32', 3);
  circ(ctx, 150, 330, 10, '#e86aa0'); line(ctx, 150, 340, 150, 365, '#2f7d32', 3);

  // bench (left)
  rect(ctx, 40, 440, 130, 12, '#8a5a2b'); rect(ctx, 40, 470, 130, 12, '#8a5a2b');
  rect(ctx, 48, 452, 10, 40, '#5d4126'); rect(ctx, 152, 452, 10, 40, '#5d4126');
  rect(ctx, 40, 420, 10, 70, '#5d4126'); rect(ctx, 160, 420, 10, 70, '#5d4126');

  // DIFF 3: flower pot moved (x 480 <-> 440)
  const px = v ? 440 : 480;
  poly(ctx, [[px - 16, 420], [px + 16, 420], [px + 11, 448], [px - 11, 448]], '#c96f4a');
  circ(ctx, px - 6, 412, 7, '#e86aa0'); circ(ctx, px + 6, 412, 7, '#f2994a'); circ(ctx, px, 404, 7, '#e86aa0');

  // DIFF 2: butterfly removed (variant 1 only)
  if (!v) drawButterfly(ctx, 300, 150, 1, false, '#c792ea', '#f2c94c');
  // DIFF 6: butterfly flipped (wings mirror)
  drawButterfly(ctx, 450, 200, 1, v, '#4fc3f7', '#f2c94c');
  drawButterfly(ctx, 120, 180, 0.9, false, '#f2994a', '#e86aa0');
  text(ctx, 'ROSE GARDEN', 296, 520, 18, '#2f4a2a');
}

// --- 4. Clock Workshop -----------------------------------------------------

function drawWorkshop(ctx, v) {
  const rng = mulberry32(hashStr('workshop'));
  const dust = [];
  for (let i = 0; i < 24; i++) dust.push([rng() * 592, rng() * 548, 0.8 + rng() * 1.6]);
  rect(ctx, 0, 0, 592, 548, '#8a6b45');
  rect(ctx, 0, 0, 592, 380, '#a08055');
  rect(ctx, 0, 380, 592, 168, '#6b4a2a');
  for (const [x, y, r] of dust) circ(ctx, x, y, r, 'rgba(255,255,255,0.18)');
  // pegboard
  rect(ctx, 30, 40, 532, 300, '#b08d5f');
  for (let i = 0; i < 12; i++) for (let j = 0; j < 7; j++) circ(ctx, 55 + i * 44, 65 + j * 42, 2, 'rgba(0,0,0,0.25)');

  // big wall clock (centre top)
  circ(ctx, 296, 140, 62, '#f5e6c8');
  circ(ctx, 296, 140, 62, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(296, 140, 62, 0, Math.PI * 2); ctx.strokeStyle = '#5d4126'; ctx.lineWidth = 6; ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    circ(ctx, 296 + Math.sin(a) * 50, 140 - Math.cos(a) * 50, 3, '#2b2b2b');
  }
  // DIFF 1: clock hands moved (10:10 <-> 2:35)
  const ha = v ? 1.22 : -0.87, ma = v ? 2.62 : 0.35;
  line(ctx, 296, 140, 296 + Math.sin(ha) * 30, 140 - Math.cos(ha) * 30, '#2b2b2b', 5);
  line(ctx, 296, 140, 296 + Math.sin(ma) * 44, 140 - Math.cos(ma) * 44, '#2b2b2b', 3);
  circ(ctx, 296, 140, 5, '#c0392b');

  // shelves
  rect(ctx, 40, 220, 180, 12, '#5d4126');
  rect(ctx, 380, 220, 170, 12, '#5d4126');
  rect(ctx, 40, 320, 180, 12, '#5d4126');
  // DIFF 4: gear added on the right shelf (variant 1 only)
  if (v) {
    circ(ctx, 420, 220, 16, '#d8b25a');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      rect(ctx, 420 + Math.cos(a) * 15 - 3, 220 + Math.sin(a) * 15 - 3, 6, 6, '#d8b25a');
    }
    circ(ctx, 420, 220, 6, '#8a6d1f');
  }
  circ(ctx, 400, 208, 12, '#c0392b'); circ(ctx, 500, 206, 14, '#4fc3f7');
  // DIFF 6: book flipped (leans right <-> left)
  ctx.save(); ctx.translate(350, 320); ctx.rotate(v ? 0.22 : -0.22);
  rect(ctx, -10, -42, 20, 42, '#2e7d6b'); rect(ctx, -10, -42, 20, 6, '#f5e6c8');
  ctx.restore();
  rect(ctx, 60, 282, 18, 38, '#c0392b'); rect(ctx, 82, 282, 18, 38, '#f2c94c'); rect(ctx, 104, 282, 18, 38, '#4fc3f7');

  // DIFF 3: lamp shade recolored (green <-> purple)
  line(ctx, 500, 120, 500, 70, '#2b2b2b', 4);
  poly(ctx, [[478, 120], [522, 120], [512, 88], [488, 88]], v ? '#8a5fb0' : '#2f8f57');
  circ(ctx, 500, 126, 12, '#ffe98a');

  // workbench tools
  rect(ctx, 30, 400, 532, 20, '#7a5230'); rect(ctx, 30, 420, 532, 90, '#5d4126');
  // DIFF 2: hammer removed (variant 1 only)
  if (!v) {
    line(ctx, 120, 380, 120, 330, '#8a5a2b', 7);
    rect(ctx, 104, 316, 32, 16, '#3a3f4a');
  }
  // DIFF 5: wrench resized (1x <-> 1.5x)
  const ws = v ? 1.5 : 1;
  ctx.save(); ctx.translate(200, 300); ctx.scale(ws, ws);
  line(ctx, 0, 0, 0, -26, '#c0c8d0', 6);
  ctx.beginPath(); ctx.arc(0, -30, 9, 0.4, Math.PI * 2 - 0.4); ctx.strokeStyle = '#c0c8d0'; ctx.lineWidth = 6; ctx.stroke();
  ctx.restore();
  // DIFF 7: screwdriver recolored (red <-> blue)
  line(ctx, 80, 200, 80, 160, '#c0c8d0', 5);
  rect(ctx, 73, 200, 14, 34, v ? '#2b7fb8' : '#c0392b');
  // extra tools
  circ(ctx, 280, 395, 14, '#d8b25a');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    rect(ctx, 280 + Math.cos(a) * 13 - 2.5, 395 + Math.sin(a) * 13 - 2.5, 5, 5, '#d8b25a');
  }
  circ(ctx, 280, 395, 5, '#8a6d1f');
  rect(ctx, 450, 380, 60, 26, '#3a3f4a'); circ(ctx, 465, 393, 5, '#f2c94c'); circ(ctx, 495, 393, 5, '#4fc3f7');
  text(ctx, 'TICK', 296, 480, 22, '#f5e6c8'); text(ctx, 'TOCK', 296, 508, 16, '#f2c94c');
}

// --- 5. Café Corner ---------------------------------------------------------

function drawStreet(ctx, v) {
  const rng = mulberry32(hashStr('street'));
  const cobbles = [];
  for (let i = 0; i < 30; i++) cobbles.push([rng() * 592, 430 + rng() * 110, 3 + rng() * 5]);
  rect(ctx, 0, 0, 592, 548, '#cfe3f2');
  rect(ctx, 0, 0, 592, 300, '#b8d4e8');
  circ(ctx, 520, 55, 26, '#fff3c4');
  // buildings
  rect(ctx, 0, 90, 180, 330, '#e8b48a'); rect(ctx, 0, 90, 180, 16, '#c0392b');
  rect(ctx, 420, 70, 172, 350, '#f2d8a0'); rect(ctx, 420, 70, 172, 16, '#2e7d6b');
  // windows
  rect(ctx, 30, 140, 50, 60, '#7fb8d8'); rect(ctx, 100, 140, 50, 60, '#7fb8d8');
  rect(ctx, 30, 240, 50, 60, '#7fb8d8'); rect(ctx, 100, 240, 50, 60, '#7fb8d8');
  rect(ctx, 450, 140, 50, 60, '#7fb8d8');
  // DIFF 7: window shutter recolored (green <-> red)
  rect(ctx, 442, 136, 12, 68, v ? '#c0392b' : '#2e7d6b');
  rect(ctx, 500, 136, 12, 68, v ? '#c0392b' : '#2e7d6b');
  // street
  rect(ctx, 0, 420, 592, 128, '#9a8f80');
  for (const [x, y, r] of cobbles) circ(ctx, x, y, r, 'rgba(0,0,0,0.12)');

  // café front (centre)
  rect(ctx, 200, 180, 192, 240, '#f5e6c8');
  rect(ctx, 200, 180, 192, 14, '#5d4126');
  rect(ctx, 220, 260, 152, 160, '#7fb8d8');
  rect(ctx, 288, 260, 8, 160, '#5d4126'); rect(ctx, 220, 330, 152, 8, '#5d4126');
  // DIFF 5: awning resized (wider in variant 1)
  const aw = v ? 232 : 192, ax = 296 - aw / 2;
  for (let i = 0; i < 6; i++) rect(ctx, ax + (i * aw) / 6, 196, aw / 6, 40, i % 2 ? '#f5e6c8' : '#c0392b');
  poly(ctx, [[ax, 236], [ax + aw / 6, 248], [ax + (2 * aw) / 6, 236], [ax + (3 * aw) / 6, 248], [ax + (4 * aw) / 6, 236], [ax + (5 * aw) / 6, 248], [ax + aw, 236], [ax + aw, 236]], '#c0392b');
  // DIFF 3: café sign moved down (y 150 <-> 180)
  const sy = v ? 180 : 150;
  rect(ctx, 92, sy - 18, 56, 36, '#2b3242');
  text(ctx, 'CAFÉ', 120, sy, 15, '#f2c94c');
  line(ctx, 120, sy + 18, 120, 196, '#2b3242', 3);
  text(ctx, 'KOPI', 296, 452, 18, '#5d4126');

  // bicycle (left foreground)
  circ(ctx, 150, 420, 26, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(150, 420, 26, 0, Math.PI * 2); ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 4; ctx.stroke();
  ctx.beginPath(); ctx.arc(250, 420, 26, 0, Math.PI * 2); ctx.stroke();
  line(ctx, 150, 420, 200, 420, '#c0392b', 4);
  line(ctx, 200, 420, 228, 388, '#c0392b', 4);
  line(ctx, 228, 388, 250, 420, '#c0392b', 4);
  line(ctx, 200, 420, 178, 388, '#c0392b', 4);
  line(ctx, 178, 388, 150, 420, '#c0392b', 4);
  line(ctx, 228, 388, 214, 382, '#c0392b', 4);
  line(ctx, 178, 388, 168, 380, '#2b2b2b', 4);
  line(ctx, 214, 382, 244, 382, '#2b2b2b', 4);
  // DIFF 2: bicycle basket recolored (brown <-> teal)
  rect(ctx, 196, 396, 30, 22, v ? '#2e7d6b' : '#8a5a2b');
  circ(ctx, 206, 392, 5, '#e5534b'); circ(ctx, 218, 392, 5, '#f2c94c');

  // outdoor table + cup
  ell(ctx, 380, 400, 42, 10, '#f5e6c8'); line(ctx, 380, 400, 380, 448, '#5d4126', 5);
  // DIFF 6: cup flipped (handle right <-> left)
  rect(ctx, 368, 384, 20, 14, '#4fc3f7');
  ctx.beginPath(); ctx.arc(v ? 366 : 390, 391, 6, -Math.PI / 2, Math.PI / 2, !v); ctx.strokeStyle = '#4fc3f7'; ctx.lineWidth = 3; ctx.stroke();

  // DIFF 4: flower pot added on the right (variant 1 only)
  if (v) {
    poly(ctx, [[524, 380], [556, 380], [551, 408], [529, 408]], '#c96f4a');
    circ(ctx, 534, 372, 7, '#e86aa0'); circ(ctx, 546, 372, 7, '#f2994a'); circ(ctx, 540, 364, 7, '#e86aa0');
  }
  // DIFF 1: cat removed (variant 1 only)
  if (!v) drawCat(ctx, 480, 470, 1, '#e8a33d');
  // menu board
  rect(ctx, 330, 440, 60, 70, '#2b3242');
  text(ctx, 'MENU', 360, 458, 12, '#f2c94c');
  line(ctx, 340, 472, 380, 472, '#eef1f5', 2); line(ctx, 340, 484, 372, 484, '#eef1f5', 2);
}

// --- 6. Shell Beach ----------------------------------------------------------

function drawBeach(ctx, v) {
  const rng = mulberry32(hashStr('beach'));
  const grains = [];
  for (let i = 0; i < 40; i++) grains.push([rng() * 592, 300 + rng() * 240, 1 + rng() * 2]);
  rect(ctx, 0, 0, 592, 548, '#7fd4f7');
  circ(ctx, 90, 70, 32, '#fff3c4');
  // clouds
  ell(ctx, 300, 70, 60, 18, '#ffffff'); ell(ctx, 340, 60, 44, 15, '#ffffff');
  ell(ctx, 480, 110, 50, 15, '#ffffff');
  // sea
  rect(ctx, 0, 240, 592, 140, '#2b8fc4');
  for (let i = 0; i < 6; i++) line(ctx, 20 + i * 95, 270 + (i % 2) * 50, 90 + i * 95, 270 + (i % 2) * 50, 'rgba(255,255,255,0.4)', 3);
  // sand
  rect(ctx, 0, 360, 592, 188, '#f2dc9e');
  for (const [x, y, r] of grains) circ(ctx, x, y, r, 'rgba(180,140,60,0.5)');

  // palm (right)
  ctx.save(); ctx.translate(520, 360); ctx.rotate(0.12);
  rect(ctx, -8, -180, 16, 180, '#8a5a2b');
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.5;
    ctx.beginPath(); ctx.moveTo(0, -180);
    ctx.quadraticCurveTo(Math.cos(a) * 55, -180 + Math.sin(a) * 55 - 18, Math.cos(a) * 90, -180 + Math.sin(a) * 90 + 22);
    ctx.strokeStyle = '#2f8f57'; ctx.lineWidth = 8; ctx.stroke();
  }
  ctx.restore();
  // DIFF 4: coconut added under the palm (variant 1 only)
  if (v) { circ(ctx, 520, 150, 0, '#000'); circ(ctx, 505, 372, 10, '#6b4a2a'); circ(ctx, 528, 376, 10, '#6b4a2a'); }
  circ(ctx, 512, 178, 9, '#6b4a2a');

  // DIFF 1: umbrella recolored (red <-> teal)
  line(ctx, 150, 200, 150, 300, '#8a5a2b', 5);
  ctx.beginPath(); ctx.arc(150, 200, 62, Math.PI, 0); ctx.closePath();
  ctx.fillStyle = v ? '#2e7d6b' : '#e5534b'; ctx.fill();
  ctx.beginPath(); ctx.arc(150, 200, 62, Math.PI, 0); ctx.closePath();
  ctx.strokeStyle = '#f5e6c8'; ctx.lineWidth = 3; ctx.stroke();
  line(ctx, 150, 200, 150, 138, '#8a5a2b', 3);
  circ(ctx, 150, 138, 5, '#f2c94c');
  line(ctx, 118, 200, 150, 200, '#f5e6c8', 2); line(ctx, 182, 200, 150, 200, '#f5e6c8', 2);

  // DIFF 3: boat moved (x 450 <-> 500)
  const bx = v ? 500 : 450;
  poly(ctx, [[bx - 45, 380], [bx + 45, 380], [bx + 32, 402], [bx - 32, 402]], '#f5e6c8');
  line(ctx, bx, 380, bx, 330, '#5d4126', 4);
  poly(ctx, [[bx, 332], [bx, 376], [bx + 32, 376]], '#f2c94c');

  // DIFF 2: shell removed (variant 1 only)
  if (!v) {
    ell(ctx, 300, 470, 14, 10, '#f5e6c8');
    for (let i = -2; i <= 2; i++) line(ctx, 300 + i * 5, 462, 300 + i * 5, 478, '#e8b4b8', 2);
  }
  ell(ctx, 250, 500, 11, 8, '#e8b4b8');
  ell(ctx, 340, 505, 11, 8, '#c792ea');
  // DIFF 5: starfish resized (1x <-> 1.5x)
  const ss = v ? 1.5 : 1;
  ctx.save(); ctx.translate(200, 500); ctx.scale(ss, ss);
  poly(ctx, [[0, -12], [3, -3], [12, -3], [5, 3], [8, 12], [0, 6], [-8, 12], [-5, 3], [-12, -3], [-3, -3]], '#f2994a');
  ctx.restore();
  // DIFF 6: bucket flipped (opening up <-> down)
  ctx.save(); ctx.translate(380, 430); if (v) ctx.scale(1, -1);
  poly(ctx, [[-14, -10], [14, -10], [10, 12], [-10, 12]], '#e5534b');
  rect(ctx, -16, -14, 32, 6, '#c0392b');
  ctx.restore();
  // DIFF 7: beach ball recolored (blue <-> yellow panels)
  circ(ctx, 100, 450, 20, v ? '#f2c94c' : '#4fc3f7');
  ctx.beginPath(); ctx.arc(100, 450, 20, -0.6, 0.6); ctx.lineTo(100, 450); ctx.closePath();
  ctx.fillStyle = v ? '#4fc3f7' : '#f2c94c'; ctx.fill();
  circ(ctx, 100, 450, 7, '#ffffff');
  // towel
  rect(ctx, 420, 480, 110, 34, '#c792ea');
  rect(ctx, 420, 480, 110, 8, '#f5e6c8'); rect(ctx, 420, 506, 110, 8, '#f5e6c8');
  text(ctx, 'SHELL BEACH', 296, 530, 16, '#8a6d1f');
}
