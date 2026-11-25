// A small seeded generator (mulberry32) so a screenshot seed always stages the
// same night: the same tickets, the same grill, the same frame.
export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one element of `items` with the seeded generator. */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}
