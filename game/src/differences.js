// differences.js — click resolution for Double Take (worker B).
// diffs: [{x, y, r}] in panel-local coords; found: boolean[] parallel to diffs.

export function nearestDiff(diffs, found, x, y, tolerance) {
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < diffs.length; i++) {
    if (found[i]) continue;
    const d = diffs[i];
    const dx = x - d.x;
    const dy = y - d.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= d.r + tolerance && dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  }
  return best;
}
