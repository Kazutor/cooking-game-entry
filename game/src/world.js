// The stall's state and rules: tickets arrive, skewers grill, plates are built
// and served, the shift clock runs down. No drawing and no input here — the
// renderer paints this state and main.js feeds it clicks.
import {
  COOK_BURNT,
  COOK_PERFECT,
  COOK_SECONDS,
  GRILL_SLOTS,
  PLATE_MAX,
  SERVE_BASE,
  SHIFT_SECONDS,
  STRIKES_MAX,
  TIP_MAX,
  WRONG_PENALTY,
} from './config.js';
import { dayPlan, makeTicket } from './recipes.js';

export const EVENT_NONE = 0;
export const EVENT_SERVE = 1 << 0;
export const EVENT_WRONG = 1 << 1;
export const EVENT_BURNT = 1 << 2;
export const EVENT_ANGRY = 1 << 3;
export const EVENT_DAY_END = 1 << 4;
export const EVENT_GAME_OVER = 1 << 5;
export const EVENT_PLATE = 1 << 6;

export function createWorld(random) {
  const world = {
    random,
    state: null,
    reset() {
      world.state = {
        day: 1,
        coins: 0,
        target: dayPlan(1).target,
        timeLeft: SHIFT_SECONDS,
        strikes: 0,
        tickets: [],
        nextTicketId: 1,
        spawnIn: 2.5,
        grill: Array.from({ length: GRILL_SLOTS }, () => null),
        plate: { skewers: [], sauce: null },
        carrying: null, // { type } of the raw skewer in hand
        selectedSauce: null,
        selectedTicket: 0,
        popups: [], // { x, y, text, color, life }
        smoke: [], // { x, y, life, size }
        served: 0,
        burnt: 0,
        wrong: 0,
        tips: 0,
        over: false,
        won: false,
        daySummary: null,
      };
      world.spawnTicket();
    },
  };

  function spawnTicket() {
    const state = world.state;
    const plan = dayPlan(state.day);
    if (state.tickets.length >= plan.maxTickets) return;
    state.tickets.push(makeTicket(random, state.day, state.nextTicketId));
    state.nextTicketId += 1;
  }
  world.spawnTicket = spawnTicket;

  function popup(x, y, text, color) {
    world.state.popups.push({ x, y, text, color, life: 1.4 });
  }
  world.popup = popup;

  /** Take a raw skewer off the counter into the player's hand. */
  world.grabSkewer = function grabSkewer(type) {
    const state = world.state;
    if (state.over || state.carrying) return false;
    state.carrying = { type };
    return true;
  };

  /** Put the carried skewer on an empty grill slot. */
  world.placeOnGrill = function placeOnGrill(slot) {
    const state = world.state;
    if (state.over || !state.carrying || state.grill[slot]) return false;
    state.grill[slot] = { type: state.carrying.type, progress: 0 };
    state.carrying = null;
    return true;
  };

  /**
   * Lift a skewer off the grill: perfectly grilled goes to the plate, burnt goes
   * in the bin, undercooked goes back to the player's hand.
   */
  world.takeFromGrill = function takeFromGrill(slot) {
    const state = world.state;
    const skewer = state.grill[slot];
    if (state.over || !skewer) return 'empty';
    if (skewer.progress >= COOK_BURNT) {
      state.grill[slot] = null;
      state.burnt += 1;
      popup(640, 260, 'Burnt! Binned.', '#ff9a7a');
      return 'burnt';
    }
    if (skewer.progress < COOK_PERFECT * 0.55) {
      if (state.carrying) return 'hands-full';
      state.carrying = { type: skewer.type };
      state.grill[slot] = null;
      return 'raw';
    }
    if (state.plate.skewers.length >= PLATE_MAX) return 'plate-full';
    state.grill[slot] = null;
    state.plate.skewers.push(skewer.type);
    return 'plated';
  };

  /** Choose a sauce bowl; the next click on the plate pours it. */
  world.selectSauce = function selectSauce(sauce) {
    const state = world.state;
    if (state.over) return false;
    state.selectedSauce = sauce;
    return true;
  };

  /** Pour the selected sauce over the skewers waiting on the plate. */
  world.saucePlate = function saucePlate() {
    const state = world.state;
    if (state.over || !state.selectedSauce || state.plate.skewers.length === 0) return false;
    state.plate.sauce = state.selectedSauce;
    state.selectedSauce = null;
    return true;
  };

  /** Does the plate hold exactly what `ticket` asked for? */
  world.plateMatches = function plateMatches(ticket) {
    const state = world.state;
    if (state.plate.sauce !== ticket.sauce) return false;
    if (state.plate.skewers.length !== ticket.skewers.length) return false;
    const wanted = [...ticket.skewers].sort();
    const have = [...state.plate.skewers].sort();
    return wanted.every((type, index) => type === have[index]);
  };

  /**
   * Serve the plate to a ticket. A match pays the base plus a tip scaled by the
   * patience left; a miss costs coins, scares the customer and empties the plate.
   */
  world.serve = function serve(ticketIndex) {
    const state = world.state;
    const ticket = state.tickets[ticketIndex];
    if (state.over || !ticket || state.plate.skewers.length === 0) return EVENT_NONE;
    if (!world.plateMatches(ticket)) {
      state.wrong += 1;
      state.coins = Math.max(0, state.coins - WRONG_PENALTY);
      ticket.patience = Math.max(0, ticket.patience - 0.5);
      state.plate = { skewers: [], sauce: null };
      popup(1100, 200, `Wrong order! -${WRONG_PENALTY}`, '#ff9a7a');
      return EVENT_WRONG;
    }
    const tip = Math.round(ticket.patience * TIP_MAX);
    const earned = SERVE_BASE + tip;
    state.coins += earned;
    state.tips += tip;
    state.served += 1;
    popup(1100, 200, `+${earned} coins`, '#ffd76a');
    state.tickets.splice(ticketIndex, 1);
    state.plate = { skewers: [], sauce: null };
    if (state.selectedTicket >= state.tickets.length) state.selectedTicket = 0;
    return EVENT_SERVE;
  };

  /** Throw the plate's contents away and start the dish again. */
  world.clearPlate = function clearPlate() {
    const state = world.state;
    if (state.over) return false;
    state.plate = { skewers: [], sauce: null };
    return true;
  };

  function endShift(won) {
    const state = world.state;
    state.over = true;
    state.won = won;
    state.daySummary = {
      day: state.day,
      coins: state.coins,
      target: state.target,
      served: state.served,
      burnt: state.burnt,
      wrong: state.wrong,
      tips: state.tips,
    };
    return won ? EVENT_DAY_END : EVENT_GAME_OVER;
  }

  /** Advance cooking, patience, the spawn clock and the shift clock. */
  world.step = function step(dt, attract) {
    const state = world.state;
    let events = EVENT_NONE;
    if (state.over) return events;

    // Grill: every skewer on the coals cooks a little further.
    for (let slot = 0; slot < GRILL_SLOTS; slot += 1) {
      const skewer = state.grill[slot];
      if (!skewer) continue;
      const before = skewer.progress;
      skewer.progress += dt / COOK_SECONDS;
      if (before < COOK_BURNT && skewer.progress >= COOK_BURNT) {
        events |= EVENT_BURNT;
        popup(640, 240, 'A skewer burnt!', '#ff9a7a');
      }
    }

    // Smoke rises off any skewer on the grill.
    if (state.grill.some(Boolean) && random() < dt * 14) {
      const slot = Math.floor(random() * GRILL_SLOTS);
      const skewer = state.grill[slot];
      if (skewer) {
        state.smoke.push({
          x: 380 + (slot % 3) * 184 + 84 + (random() - 0.5) * 30,
          y: 190,
          life: 1.6,
          size: 8 + random() * 10,
        });
      }
    }
    for (const puff of state.smoke) {
      puff.life -= dt;
      puff.y -= 34 * dt;
    }
    state.smoke = state.smoke.filter((puff) => puff.life > 0);
    for (const note of state.popups) note.life -= dt;
    state.popups = state.popups.filter((note) => note.life > 0);

    // Tickets lose patience; an ignored customer walks off angry.
    const plan = dayPlan(state.day);
    for (let index = state.tickets.length - 1; index >= 0; index -= 1) {
      const ticket = state.tickets[index];
      ticket.patience -= dt / ticket.patienceSeconds;
      if (ticket.patience <= 0) {
        state.tickets.splice(index, 1);
        if (!attract) {
          state.strikes += 1;
          events |= EVENT_ANGRY;
          popup(180, 120, 'Customer walked off!', '#ff9a7a');
          if (state.selectedTicket >= state.tickets.length) state.selectedTicket = 0;
          if (state.strikes >= STRIKES_MAX) return endShift(false) | events;
        }
      }
    }

    // New orders keep arriving while the night is young.
    state.spawnIn -= dt;
    if (state.spawnIn <= 0) {
      state.spawnIn = plan.spawnSeconds * (0.85 + random() * 0.3);
      spawnTicket();
    }

    if (!attract) {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        return endShift(state.coins >= state.target) | events;
      }
    }
    return events;
  };

  /** Start the next day after a shift the stall won. */
  world.nextDay = function nextDay() {
    const state = world.state;
    const day = state.day + 1;
    const coins = state.coins;
    const served = state.served;
    const burnt = state.burnt;
    const wrong = state.wrong;
    const tips = state.tips;
    world.reset();
    const fresh = world.state;
    fresh.day = day;
    fresh.coins = coins;
    fresh.target = dayPlan(day).target;
    fresh.served = served;
    fresh.burnt = burnt;
    fresh.wrong = wrong;
    fresh.tips = tips;
  };

  world.reset();
  return world;
}
