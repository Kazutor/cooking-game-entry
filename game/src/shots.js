// Staged scenes for ?shot=start|play|serve|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot (grill what the hungriest ticket needs, plate what is golden, sauce
// and serve what matches), so the frame is what a short game really looks like
// and the same seed always gives the same frame.
import { COOK_BURNT, COOK_PERFECT, GRILL_SLOTS, PLATE_MAX, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** The hungriest ticket the stall can still complete. */
function pickTicket(state) {
  let best = null;
  for (const ticket of state.tickets) {
    if (!best || ticket.patience < best.patience) best = ticket;
  }
  return best;
}

/** Step index of the last grill placement, so a staged scene can space them out. */
let lastPlaceStep = -1e9;

/**
 * One autopilot decision: grill, plate, sauce or serve, in that order.
 * `opts.holdServe` stages a finished plate instead of serving it;
 * `opts.plateAt` is the grill progress at which a skewer is plated (higher
 * keeps the grill visibly busy longer); `opts.grillGapSteps` spaces grill
 * placements out so the skewers cook at visibly different stages.
 */
function autopilot(world, opts = {}, stepIndex = 0) {
  const state = world.state;
  if (state.over) return;
  const ticket = pickTicket(state);
  if (!ticket) return;
  state.selectedTicket = state.tickets.indexOf(ticket);
  const plateAt = opts.plateAt ?? 0.6;

  // Holding a finished plate up for the camera: keep the grill busy for the
  // other tickets, but never plate or serve while the shot is staged.
  if (opts.holdServe && state.plate.skewers.length > 0 && world.plateMatches(ticket)) {
    for (const other of state.tickets) {
      if (other === ticket) continue;
      if (grillFor(world, other, { ignorePlate: true, stepIndex, grillGapSteps: 0 })) return;
    }
    return;
  }

  // Burnt skewers go in the bin at once.
  for (let slot = 0; slot < GRILL_SLOTS; slot += 1) {
    const skewer = state.grill[slot];
    if (skewer && skewer.progress >= COOK_BURNT) {
      world.takeFromGrill(slot);
      return;
    }
  }
  // Golden skewers the ticket still needs go on the plate (counted, so the
  // plate never holds more of a type than the ticket asks for).
  const countOf = (list, type) => list.filter((item) => item === type).length;
  for (let slot = 0; slot < GRILL_SLOTS; slot += 1) {
    const skewer = state.grill[slot];
    if (!skewer) continue;
    if (skewer.progress >= plateAt && skewer.progress < COOK_BURNT) {
      if (
        countOf(ticket.skewers, skewer.type) > countOf(state.plate.skewers, skewer.type) &&
        state.plate.skewers.length < PLATE_MAX
      ) {
        world.takeFromGrill(slot);
        return;
      }
    }
  }
  // A full, sauced, matching plate is served — unless this scene holds the
  // plate up for the camera.
  if (state.plate.skewers.length > 0) {
    if (state.plate.sauce !== ticket.sauce) {
      world.selectSauce(ticket.sauce);
      world.saucePlate();
      return;
    }
    if (world.plateMatches(ticket) && !opts.holdServe) {
      world.serve(state.selectedTicket);
      return;
    }
  }
  // Grill what the ticket still needs and is not already cooking or plated.
  grillFor(world, ticket, { stepIndex, grillGapSteps: opts.grillGapSteps ?? 0 });
}

/**
 * Put the next skewer `ticket` still needs on an empty grill slot. With
 * `ignorePlate`, the plate's skewers do not count toward the ticket (used
 * while a finished plate is held up for the camera). Returns true if a
 * skewer was placed.
 */
function grillFor(world, ticket, { ignorePlate = false, stepIndex = 0, grillGapSteps = 0 } = {}) {
  const state = world.state;
  const needed = [...ticket.skewers];
  if (!ignorePlate) {
    for (const type of state.plate.skewers) {
      const at = needed.indexOf(type);
      if (at !== -1) needed.splice(at, 1);
    }
  }
  for (const skewer of state.grill) {
    if (!skewer) continue;
    const at = needed.indexOf(skewer.type);
    if (at !== -1) needed.splice(at, 1);
  }
  if (needed.length > 0 && !state.carrying) {
    const empty = state.grill.findIndex((skewer) => skewer === null);
    if (empty !== -1 && stepIndex - lastPlaceStep >= grillGapSteps) {
      world.grabSkewer(needed[0]);
      world.placeOnGrill(empty);
      lastPlaceStep = stepIndex;
      return true;
    }
  }
  return false;
}

/** Step the world for `seconds`, steering every SAMPLE. */
function runFor(world, seconds, opts = {}) {
  const steps = Math.round(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    if (index % Math.round(SAMPLE / STEP) === 0) autopilot(world, opts, index);
    world.step(STEP, false);
    if (world.state.over) break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * best score to show. Unknown names stage the title. The play and serve scenes
 * stop at the first moment that looks like the game at its busiest — grill
 * full, tickets waiting, a plate on its way — instead of a fixed clock time.
 */
export function stageShot(name, world) {
  world.reset();
  lastPlaceStep = -1e9;
  if (name !== 'play' && name !== 'serve' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    runFor(world, END_LIMIT_SECONDS);
    if (!world.state.over) {
      // The pilot survived the whole shift: close the night by hand so the
      // summary screen still shows.
      world.state.timeLeft = 0;
      world.step(STEP, false);
    }
    return { screen: SCREEN_OVER, best: world.state.coins };
  }
  if (name === 'serve') {
    // Hold the first matching plate up for the camera, then let the grill
    // fill for the next ticket so the frame stays busy.
    const steps = Math.round(70 / STEP);
    let matchedAt = -1;
    for (let index = 0; index < steps; index += 1) {
      if (index % Math.round(SAMPLE / STEP) === 0) autopilot(world, { holdServe: true }, index);
      world.step(STEP, false);
      const state = world.state;
      const ticket = state.tickets[state.selectedTicket];
      if (matchedAt === -1 && ticket && state.plate.skewers.length > 0 && world.plateMatches(ticket)) {
        matchedAt = index;
      }
      if (matchedAt !== -1 && index - matchedAt >= Math.round(6 / STEP)) break;
      if (state.over) break;
    }
    return { screen: SCREEN_PLAY, best: world.state.coins };
  }
  // Play: keep the busiest moment the pilot reaches — grill full, tickets
  // waiting, a plate on its way — instead of a fixed clock time.
  let bestShot = null;
  let bestScore = -1;
  const steps = Math.round(90 / STEP);
  for (let index = 0; index < steps; index += 1) {
    // Plate late and space the grill out, so skewers sit on the coals at
    // visibly different stages instead of all landing at once.
    if (index % Math.round(SAMPLE / STEP) === 0) autopilot(world, { plateAt: 0.95, grillGapSteps: 150 }, index);
    world.step(STEP, false);
    const state = world.state;
    if (index % Math.round(0.5 / STEP) === 0) {
      const busy = state.grill.filter(Boolean).length;
      const ticket = state.tickets[state.selectedTicket];
      // A frame that shows every front at once wins: skewers on the grill AND
      // a plate on its way out AND tickets waiting.
      const score =
        busy * 4 +
        state.plate.skewers.length * 3 +
        state.tickets.length * 2 +
        (ticket && world.plateMatches(ticket) ? 3 : 0) +
        (busy >= 1 && state.plate.skewers.length >= 1 ? 4 : 0) +
        Math.min(2, state.coins / 100);
      if (score > bestScore) {
        bestScore = score;
        bestShot = JSON.parse(JSON.stringify(state));
      }
    }
    if (state.over) break;
  }
  if (bestShot) world.state = bestShot;
  return { screen: SCREEN_PLAY, best: world.state.coins };
}
