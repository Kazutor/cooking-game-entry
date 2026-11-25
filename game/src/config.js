// Geometry, timing and tuning for Sate Senja. One place holds every number the
// world, the renderer and the input layer share, so a layout change never drifts
// between them.
export const VIEW = { width: 1280, height: 720 };

// The stall, drawn in fixed logical pixels and scaled to the canvas.
export const LAYOUT = {
  topBar: { x: 0, y: 0, w: 1280, h: 64 },
  // Order board: tickets hang on the left wall.
  board: { x: 24, y: 84, w: 300, h: 300 },
  ticket: { w: 284, h: 88, gap: 10 },
  // Charcoal grill: six slots in two rows of three, centre stage.
  grill: { x: 360, y: 150, w: 560, h: 240 },
  grillSlot: { w: 168, h: 104, gapX: 16, gapY: 16 },
  // Serving plate, right of the grill.
  plate: { x: 956, y: 150, w: 300, h: 240 },
  serveButton: { x: 956, y: 404, w: 300, h: 56 },
  // Ingredient counter along the bottom.
  counter: { x: 24, y: 470, w: 1232, h: 120 },
  tray: { w: 150, h: 96, gap: 18 },
  sauceBowl: { w: 120, h: 96, gap: 18 },
  // Small buttons in the top bar.
  soundButton: { x: 1180, y: 12, w: 88, h: 40 },
  pauseButton: { x: 1080, y: 12, w: 88, h: 40 },
};

export const GRILL_COLS = 3;
export const GRILL_ROWS = 2;
export const GRILL_SLOTS = GRILL_COLS * GRILL_ROWS;

/** Grill slot centres, computed from the layout above. */
export function grillSlotRect(slot) {
  const col = slot % GRILL_COLS;
  const row = Math.floor(slot / GRILL_COLS);
  const g = LAYOUT.grill;
  const s = LAYOUT.grillSlot;
  return {
    x: g.x + col * (s.w + s.gapX),
    y: g.y + row * (s.h + s.gapY),
    w: s.w,
    h: s.h,
  };
}

/** Ingredient tray rect for the i-th skewer type (order of SKEWER_TYPES). */
export function trayRect(index) {
  const c = LAYOUT.counter;
  const t = LAYOUT.tray;
  return { x: c.x + 16 + index * (t.w + t.gap), y: c.y + 12, w: t.w, h: t.h };
}

/** Sauce bowl rect for the i-th sauce (order of SAUCE_TYPES). */
export function sauceRect(index) {
  const c = LAYOUT.counter;
  const s = LAYOUT.sauceBowl;
  const baseX = c.x + 16 + 4 * (LAYOUT.tray.w + LAYOUT.tray.gap) + 24;
  return { x: baseX + index * (s.w + s.gap), y: c.y + 12, w: s.w, h: s.h };
}

// Cooking: progress 0 = raw, 1 = perfectly grilled, 1.3 = burnt to charcoal.
export const COOK_PERFECT = 1.0;
export const COOK_BURNT = 1.3;
export const COOK_SECONDS = 9; // seconds of grill time to reach perfect
export const PLATE_MAX = 3;

export const SHIFT_SECONDS = 150;
export const STRIKES_MAX = 3;
export const SERVE_BASE = 20; // coins for a correct plate
export const TIP_MAX = 12; // extra coins when the customer is still happy
export const WRONG_PENALTY = 5;

export const STEP = 1 / 60;
export const BEST_KEY = 'sate-senja-best-coins';
