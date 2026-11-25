// Mouse and keyboard: clicks land on the stall, keys are shortcuts for the same
// moves. The handler only reports what happened; main.js decides what it means.
import { LAYOUT, grillSlotRect, sauceRect, trayRect } from './config.js';
import { SAUCE_TYPES, SKEWER_TYPES } from './recipes.js';

export const ACTION_CONFIRM = 1 << 0;
export const ACTION_PAUSE = 1 << 1;
export const ACTION_MUTE = 1 << 2;

function inside(point, rect) {
  return point.x >= rect.x && point.x < rect.x + rect.w && point.y >= rect.y && point.y < rect.y + rect.h;
}

/** Which stall zone a point (in logical pixels) falls in, if any. */
export function zoneAt(point) {
  if (inside(point, LAYOUT.soundButton)) return { kind: 'sound' };
  if (inside(point, LAYOUT.pauseButton)) return { kind: 'pause' };
  if (inside(point, LAYOUT.serveButton)) return { kind: 'serve' };
  if (inside(point, LAYOUT.plate)) return { kind: 'plate' };
  for (let slot = 0; slot < 6; slot += 1) {
    if (inside(point, grillSlotRect(slot))) return { kind: 'grill', slot };
  }
  for (let index = 0; index < SKEWER_TYPES.length; index += 1) {
    if (inside(point, trayRect(index))) return { kind: 'tray', type: SKEWER_TYPES[index].id };
  }
  for (let index = 0; index < SAUCE_TYPES.length; index += 1) {
    if (inside(point, sauceRect(index))) return { kind: 'sauce', sauce: SAUCE_TYPES[index].id };
  }
  const board = LAYOUT.board;
  if (inside(point, board)) {
    const ticketHeight = 88 + 10;
    const index = Math.floor((point.y - board.y - 34) / ticketHeight);
    if (index >= 0) return { kind: 'ticket', index };
  }
  return { kind: 'none' };
}

export function createInput(canvas, toLogical) {
  const clicks = [];
  let actions = 0;
  let lastKey = null;

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    clicks.push(toLogical(event.clientX - rect.left, event.clientY - rect.top));
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    lastKey = event.key.toLowerCase();
    if (event.key === ' ' || event.key === 'Enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.key === 'p' || event.key === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.key === 'm') {
      actions |= ACTION_MUTE;
    }
  });

  return {
    /** Drain the clicks since the last frame, in logical pixels. */
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The last letter key pressed since the last frame, if any. */
    takeKey() {
      const key = lastKey;
      lastKey = null;
      return key;
    },
  };
}
