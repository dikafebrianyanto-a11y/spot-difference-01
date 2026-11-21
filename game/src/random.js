// Deterministic seeded RNG (mulberry32). Every draw comes from one 32-bit state, so a
// fixed seed replays the same sequence — used for level layouts and scene decoration.

/** mulberry32: a small, fast PRNG with a full 32-bit period for any non-zero seed. */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a seeded random source.
 * @param {number} seed a 32-bit int
 * @returns {{ next(): number, int(min: number, max: number): number,
 *   pick(array: unknown[]): unknown, shuffle(array: unknown[]): unknown[] }}
 */
export function createRandom(seed) {
  const next = mulberry32(seed);
  return {
    /** Next float in [0, 1). */
    next,
    /** Random integer in [min, max], inclusive on both ends. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** A random element of the array. */
    pick(array) {
      return array[Math.floor(next() * array.length)];
    },
    /** A new array with the elements shuffled (Fisher-Yates); the input is untouched. */
    shuffle(array) {
      const copy = array.slice();
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
      }
      return copy;
    },
  };
}
