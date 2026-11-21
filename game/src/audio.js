// Synthesized sound effects only — short oscillator blips, no audio files.
// The AudioContext is created lazily on the first user gesture via unlock();
// every method no-ops when the context cannot be created.

export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC =
        typeof window !== 'undefined'
          ? window.AudioContext || window.webkitAudioContext
          : null;
      if (!AC) return null;
      ctx = new AC();
    } catch (_e) {
      ctx = null;
    }
    return ctx;
  }

  function blip(freq, dur, type, gain, delay) {
    const ac = ensure();
    if (!ac || muted) return;
    try {
      const t0 = ac.currentTime + (delay || 0);
      const osc = ac.createOscillator();
      const amp = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      amp.gain.setValueAtTime(0.0001, t0);
      amp.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + 0.01);
      amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(amp);
      amp.connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch (_e) {
      // Audio must never break the game.
    }
  }

  function unlock() {
    const ac = ensure();
    if (ac && ac.state === 'suspended') {
      ac.resume().catch(() => {});
    }
  }

  function found() {
    // Two rising notes.
    blip(660, 0.12, 'sine', 0.14, 0);
    blip(880, 0.18, 'sine', 0.14, 0.09);
  }

  function miss() {
    // Low buzz.
    blip(110, 0.25, 'sawtooth', 0.1, 0);
    blip(98, 0.25, 'sawtooth', 0.08, 0.02);
  }

  function hint() {
    blip(1175, 0.15, 'triangle', 0.1, 0);
  }

  function level() {
    // Arpeggio up.
    blip(523, 0.12, 'sine', 0.13, 0);
    blip(659, 0.12, 'sine', 0.13, 0.1);
    blip(784, 0.12, 'sine', 0.13, 0.2);
    blip(1047, 0.22, 'sine', 0.14, 0.3);
  }

  function over() {
    // Descending notes.
    blip(392, 0.18, 'sine', 0.13, 0);
    blip(311, 0.18, 'sine', 0.13, 0.16);
    blip(233, 0.32, 'sine', 0.13, 0.32);
  }

  function click() {
    blip(1200, 0.05, 'square', 0.04, 0);
  }

  function setMuted(m) {
    muted = !!m;
  }

  function isMuted() {
    return muted;
  }

  return { unlock, found, miss, hint, level, over, click, setMuted, isMuted };
}
