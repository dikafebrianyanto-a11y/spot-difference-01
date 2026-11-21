// Transient visual feedback. All positions are FIELD/logical coords
// (1280x720); the caller adds the panel origin before calling.
//   foundRing: expanding green ring, fading over 0.7 s.
//   missFlash: red vignette flash, fading over 0.4 s.
//   floatText: rising "+125" text, fading over 0.9 s.

const RING_LIFE = 0.7;
const FLASH_LIFE = 0.4;
const TEXT_LIFE = 0.9;
const FIELD_W = 1280;
const FIELD_H = 720;

export function createEffects() {
  const rings = [];
  const texts = [];
  let flash = FLASH_LIFE; // elapsed time since missFlash; >= FLASH_LIFE means idle

  function foundRing(x, y) {
    rings.push({ x, y, t: 0 });
  }

  function missFlash() {
    flash = 0;
  }

  function floatText(x, y, text) {
    texts.push({ x, y, text: String(text), t: 0 });
  }

  function update(dt) {
    for (let i = rings.length - 1; i >= 0; i -= 1) {
      rings[i].t += dt;
      if (rings[i].t >= RING_LIFE) rings.splice(i, 1);
    }
    for (let i = texts.length - 1; i >= 0; i -= 1) {
      texts[i].t += dt;
      if (texts[i].t >= TEXT_LIFE) texts.splice(i, 1);
    }
    if (flash < FLASH_LIFE) flash += dt;
  }

  function draw(ctx) {
    // Red vignette flash.
    if (flash < FLASH_LIFE) {
      const k = 1 - flash / FLASH_LIFE;
      const cx = FIELD_W / 2;
      const cy = FIELD_H / 2;
      const radius = Math.max(FIELD_W, FIELD_H) * 0.75;
      const grad = ctx.createRadialGradient(cx, cy, radius * 0.35, cx, cy, radius);
      grad.addColorStop(0, 'rgba(229,83,75,0)');
      grad.addColorStop(1, `rgba(229,83,75,${(0.5 * k).toFixed(3)})`);
      ctx.save();
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, FIELD_W, FIELD_H);
      ctx.restore();
    }

    // Expanding green rings.
    for (let i = 0; i < rings.length; i += 1) {
      const r = rings[i];
      const k = r.t / RING_LIFE;
      const radius = 8 + 34 * k;
      const alpha = 1 - k;
      ctx.save();
      ctx.strokeStyle = `rgba(89,217,140,${alpha.toFixed(3)})`;
      ctx.lineWidth = 4 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Rising fading score text.
    if (texts.length > 0) {
      ctx.save();
      ctx.font = 'bold 22px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < texts.length; i += 1) {
        const t = texts[i];
        const k = t.t / TEXT_LIFE;
        const y = t.y - 42 * k;
        const alpha = 1 - k;
        ctx.fillStyle = `rgba(89,217,140,${alpha.toFixed(3)})`;
        ctx.fillText(t.text, t.x, y);
      }
      ctx.restore();
    }
  }

  return { foundRing, missFlash, floatText, update, draw };
}
