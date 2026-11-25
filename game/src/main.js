// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer paints what is there. The game moves between
// four screens: title, play, paused and shift over.
//
// ?seed=N fixes the night's tickets. ?shot=start|play|serve|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot. ?selftest=1 plays a scripted shift with
// the shot autopilot and reports the result in document.title for headless runs.
import { BEST_KEY, STEP, VIEW } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_ANGRY, EVENT_BURNT, EVENT_DAY_END, EVENT_GAME_OVER, EVENT_SERVE, EVENT_WRONG } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput, zoneAt } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { SAUCE_TYPES, SKEWER_TYPES } from './recipes.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const selftest = params.get('selftest') === '1';
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, performance.now() / 1000);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

/** Headless self-test: steer the real game for a full shift and report it. */
function runSelftest() {
  const scene = stageShot('play', world);
  void scene;
  const state = world.state;
  const report = {
    screen: 'play',
    coins: state.coins,
    served: state.served,
    burnt: state.burnt,
    wrong: state.wrong,
    strikes: state.strikes,
    ticketsLeft: state.tickets.length,
    grillBusy: state.grill.filter(Boolean).length,
    plateSkewers: state.plate.skewers.length,
    plateSauce: state.plate.sauce,
    timeLeft: Math.round(state.timeLeft),
    over: state.over,
  };
  document.title = `SELFTEST ${JSON.stringify(report)}`;
  window.__shotReady = true;
  window.__selftest = report;
}

function runGame() {
  const input = createInput(canvas, (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX / rect.width) * VIEW.width,
      y: (clientY / rect.height) * VIEW.height,
    };
  });
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let time = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Grill skewers to golden, match the ticket, serve before the customer walks off.');
  }

  function endShift() {
    screen = SCREEN_OVER;
    if (world.state.coins > best) {
      best = world.state.coins;
      saveBest(best);
    }
    if (world.state.won) audio.win();
    announce(
      world.state.won
        ? `Shift complete. ${world.state.coins} coins. Best ${best}.`
        : `Stall closed. ${world.state.coins} coins. Best ${best}.`,
    );
  }

  function handleEvents(events) {
    if (events & EVENT_SERVE) audio.serve();
    if (events & EVENT_WRONG) audio.wrong();
    if (events & EVENT_BURNT) audio.burnt();
    if (events & EVENT_ANGRY) audio.angry();
    if (events & (EVENT_DAY_END | EVENT_GAME_OVER)) endShift();
  }

  function handleClick(point) {
    audio.unlock();
    const zone = zoneAt(point);
    if (zone.kind === 'sound') {
      audio.setMuted(!audio.isMuted());
      return;
    }
    if (screen === SCREEN_TITLE) {
      startGame();
      return;
    }
    if (screen === SCREEN_OVER) {
      if (world.state.won) world.nextDay();
      else world.reset();
      screen = SCREEN_PLAY;
      return;
    }
    if (zone.kind === 'pause') {
      screen = screen === SCREEN_PAUSED ? SCREEN_PLAY : SCREEN_PAUSED;
      return;
    }
    if (screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const state = world.state;
    if (zone.kind === 'tray') {
      if (world.grabSkewer(zone.type)) audio.pickup();
    } else if (zone.kind === 'grill') {
      const before = state.grill[zone.slot];
      if (state.carrying) {
        if (world.placeOnGrill(zone.slot)) audio.place();
      } else if (before) {
        const result = world.takeFromGrill(zone.slot);
        if (result === 'plated') audio.plated();
        else if (result === 'burnt') audio.burnt();
        else if (result === 'raw') audio.pickup();
      }
    } else if (zone.kind === 'sauce') {
      world.selectSauce(zone.sauce);
      audio.pickup();
    } else if (zone.kind === 'plate') {
      if (state.selectedSauce && world.saucePlate()) audio.plated();
    } else if (zone.kind === 'serve') {
      const events = world.serve(state.selectedTicket);
      handleEvents(events);
    } else if (zone.kind === 'ticket') {
      if (zone.index < state.tickets.length) state.selectedTicket = zone.index;
    }
  }

  function handleKey(key) {
    if (!key) return;
    const skewer = SKEWER_TYPES.find((item) => item.key === key);
    if (skewer && screen === SCREEN_PLAY) {
      if (world.grabSkewer(skewer.id)) audio.pickup();
      return;
    }
    const sauce = SAUCE_TYPES.find((item) => item.key === key);
    if (sauce && screen === SCREEN_PLAY) {
      world.selectSauce(sauce.id);
      audio.pickup();
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) audio.setMuted(!audio.isMuted());
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE) startGame();
      else if (screen === SCREEN_OVER) {
        if (world.state.won) world.nextDay();
        else world.reset();
        screen = SCREEN_PLAY;
      } else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      else if (screen === SCREEN_PLAY) {
        const events = world.serve(world.state.selectedTicket);
        handleEvents(events);
      }
    }
    handleKey(input.takeKey());
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, true);
      return;
    }
    const events = world.step(STEP, false);
    handleEvents(events);
  }

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    world.state.mouse = {
      x: ((event.clientX - rect.left) / rect.width) * VIEW.width,
      y: ((event.clientY - rect.top) / rect.height) * VIEW.height,
    };
  });

  function frame(now) {
    requestAnimationFrame(frame);
    time = now / 1000;
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    for (const click of input.takeClicks()) handleClick(click);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const busy = world.state.grill.filter(Boolean).length;
    audio.setGrillLevel(busy / 6);
    renderer.draw(world.state, screen, best, time);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sate Senja. Press Space or click to open the stall.');
  // A handle for headless playtests: read the live world, never used by the game.
  window.__sateSenja = {
    world,
    get screen() {
      return screen;
    },
  };
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else if (selftest) runSelftest();
else runGame();
