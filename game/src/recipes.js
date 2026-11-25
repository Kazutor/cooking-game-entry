// The menu: four skewers off the counter and three sauces, and the tickets the
// night market hands the stall. Every name is the stall's own.
export const SKEWER_TYPES = [
  { id: 'chicken', name: 'Ayam', key: '1', raw: '#f0c184', cooked: '#c97e2e', burnt: '#3a2418' },
  { id: 'beef', name: 'Sapi', key: '2', raw: '#c96a5a', cooked: '#7e2f1d', burnt: '#2b1610' },
  { id: 'tofu', name: 'Tahu', key: '3', raw: '#f6ead0', cooked: '#d9a441', burnt: '#4a3418' },
  { id: 'veggie', name: 'Sayur', key: '4', raw: '#a8c686', cooked: '#5d8a3c', burnt: '#33401f' },
];

export const SAUCE_TYPES = [
  { id: 'peanut', name: 'Kacang', key: 'Q', color: '#a06b2d', dark: '#7a4d1c' },
  { id: 'kecap', name: 'Kecap', key: 'W', color: '#4a2c14', dark: '#33200f' },
  { id: 'sambal', name: 'Sambal', key: 'E', color: '#c0392b', dark: '#8e2418' },
];

export function skewerById(id) {
  return SKEWER_TYPES.find((item) => item.id === id);
}

export function sauceById(id) {
  return SAUCE_TYPES.find((item) => item.id === id);
}

/**
 * Build one ticket for `day`: 1-3 skewers (more on later days) and one sauce.
 * The skewer mix is drawn from the menu so every ticket is a different little
 * puzzle of grill slots and counter trips.
 */
export function makeTicket(random, day, id) {
  const skewerCount = day >= 3 ? 2 + Math.floor(random() * 2) : 1 + Math.floor(random() * 2);
  const skewers = [];
  for (let index = 0; index < skewerCount; index += 1) {
    skewers.push(SKEWER_TYPES[Math.floor(random() * SKEWER_TYPES.length)].id);
  }
  const sauce = SAUCE_TYPES[Math.floor(random() * SAUCE_TYPES.length)].id;
  const patienceSeconds = Math.max(30, 52 - day * 5);
  return { id, skewers, sauce, patience: 1, patienceSeconds, served: false };
}

/** Day plan: how fast the night gets, and what the stall must earn. */
export function dayPlan(day) {
  return {
    target: 190 + day * 70,
    spawnSeconds: Math.max(6, 10 - day * 1.2),
    maxTickets: day >= 2 ? 4 : 3,
    patienceSeconds: Math.max(30, 52 - day * 5),
  };
}
