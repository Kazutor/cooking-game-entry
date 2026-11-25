// Every pixel of the night market: the stall, the grill, the tickets, the plate.
// All drawing is vector shapes on one canvas — no image files, nothing loaded.
import {
  COOK_BURNT,
  COOK_PERFECT,
  GRILL_SLOTS,
  LAYOUT,
  VIEW,
  grillSlotRect,
  sauceRect,
  trayRect,
} from './config.js';
import { SAUCE_TYPES, SKEWER_TYPES, sauceById, skewerById } from './recipes.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const INK = '#f7ead2';
const INK_DIM = '#cbb693';
const WOOD = '#6b4226';
const WOOD_DARK = '#4a2c17';
const AWNING_RED = '#c0392b';
const AWNING_CREAM = '#f7ead2';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

/** Colour of a skewer's meat at a grill progress: raw, golden, then charcoal. */
function meatColor(type, progress) {
  const def = skewerById(type);
  if (progress >= COOK_BURNT) return def.burnt;
  if (progress < 0.45) return def.raw;
  if (progress < COOK_PERFECT) return def.cooked;
  return def.cooked;
}

/** One skewer: a bamboo stick with three cubes of meat, laid flat. */
function drawSkewer(ctx, x, y, type, progress, scale = 1) {
  const len = 120 * scale;
  const cube = 20 * scale;
  ctx.strokeStyle = '#d9b380';
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.stroke();
  const color = meatColor(type, progress);
  for (let index = 0; index < 3; index += 1) {
    const cx = x + 18 * scale + index * 34 * scale;
    ctx.fillStyle = color;
    roundRect(ctx, cx, y - cube / 2, cube, cube, 5 * scale);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    roundRect(ctx, cx, y + cube / 4, cube, cube / 4, 3 * scale);
    ctx.fill();
  }
  if (progress >= COOK_BURNT) {
    ctx.fillStyle = 'rgba(60,60,60,0.5)';
    roundRect(ctx, x + 14 * scale, y - cube / 2, 3 * 34 * scale, cube, 5 * scale);
    ctx.fill();
  }
}

/** A little coloured dot for a skewer type, used on tickets and the plate. */
function skewerDot(ctx, x, y, type, r = 9) {
  const def = skewerById(type);
  ctx.fillStyle = def.cooked;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b1610';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawNightSky(ctx, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, 470);
  sky.addColorStop(0, '#17102e');
  sky.addColorStop(0.7, '#2b1540');
  sky.addColorStop(1, '#3d1f33');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.width, 470);
  // Stars.
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let index = 0; index < 40; index += 1) {
    const x = (index * 173) % 1280;
    const y = (index * 97) % 120;
    ctx.globalAlpha = 0.25 + 0.45 * Math.abs(Math.sin(index * 1.7 + time * 0.4));
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
  // Distant rooftops and a moon.
  ctx.fillStyle = '#241636';
  ctx.fillRect(0, 380, 1280, 90);
  ctx.fillStyle = '#1c1029';
  for (let index = 0; index < 7; index += 1) {
    ctx.beginPath();
    ctx.moveTo(index * 190 - 20, 380);
    ctx.lineTo(index * 190 + 60, 300);
    ctx.lineTo(index * 190 + 140, 380);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#f7ead2';
  ctx.beginPath();
  ctx.arc(1120, 90, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8d5ae';
  ctx.beginPath();
  ctx.arc(1108, 82, 8, 0, Math.PI * 2);
  ctx.arc(1132, 100, 6, 0, Math.PI * 2);
  ctx.fill();
  // String lights across the top of the stall.
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 66);
  ctx.quadraticCurveTo(640, 108, 1280, 66);
  ctx.stroke();
  for (let index = 0; index < 14; index += 1) {
    const t = index / 13;
    const x = t * 1280;
    const y = 66 + Math.sin(t * Math.PI) * 34;
    const glow = 0.75 + 0.25 * Math.sin(time * 2 + index);
    ctx.globalAlpha = glow;
    ctx.fillStyle = index % 2 === 0 ? '#ffb347' : '#ff6b5e';
    ctx.beginPath();
    ctx.arc(x, y + 8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = glow * 0.25;
    ctx.beginPath();
    ctx.arc(x, y + 8, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTopBar(ctx, state) {
  const bar = LAYOUT.topBar;
  ctx.fillStyle = 'rgba(20,10,8,0.72)';
  ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
  text(ctx, '🔥 SATE SENJA', 24, 42, 28, '#ffb347');
  text(ctx, `Night Market Grill  •  Day ${state.day}`, 250, 41, 17, INK_DIM);
  text(ctx, `🪙 ${state.coins} / ${state.target}`, 560, 42, 22, '#ffd76a');
  // Shift clock: a bar that drains as the night runs out.
  const clockX = 760;
  const clockW = 200;
  const frac = Math.max(0, state.timeLeft / 150);
  ctx.fillStyle = '#241a12';
  roundRect(ctx, clockX, 20, clockW, 24, 12);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#7fb069' : frac > 0.25 ? '#e8a34c' : '#c0392b';
  roundRect(ctx, clockX, 20, clockW * frac, 24, 12);
  ctx.fill();
  const mm = Math.floor(state.timeLeft / 60);
  const ss = Math.floor(state.timeLeft % 60);
  text(ctx, `⏱ ${mm}:${String(ss).padStart(2, '0')}`, clockX + clockW / 2, 38, 15, '#fff', 'center');
  // Strikes: three lanterns, lit while the stall still has patience to lose.
  for (let index = 0; index < 3; index += 1) {
    const x = 1000 + index * 24;
    ctx.fillStyle = index < 3 - state.strikes ? '#ff6b5e' : '#4a2c17';
    ctx.beginPath();
    ctx.arc(x, 32, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  text(ctx, 'strikes', 1000, 56, 11, INK_DIM, 'left', 'normal');
  drawButton(ctx, LAYOUT.pauseButton, 'II Pause');
  drawButton(ctx, LAYOUT.soundButton, '♪ Sound');
}

function drawButton(ctx, rect, label) {
  ctx.fillStyle = '#3a2a1a';
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.strokeStyle = '#8a6a45';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 6, 15, INK, 'center');
}

function drawBoard(ctx, state, time) {
  const board = LAYOUT.board;
  ctx.fillStyle = WOOD;
  roundRect(ctx, board.x, board.y, board.w, board.h, 12);
  ctx.fill();
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'ORDER BOARD', board.x + 16, board.y + 26, 17, '#ffd76a');
  text(ctx, 'click a ticket to serve it', board.x + board.w - 14, board.y + 25, 11, INK_DIM, 'right', 'normal');
  state.tickets.forEach((ticket, index) => {
    const y = board.y + 34 + index * (LAYOUT.ticket.h + LAYOUT.ticket.gap);
    const selected = index === state.selectedTicket;
    const urgent = ticket.patience < 0.35;
    ctx.fillStyle = selected ? '#f7ead2' : '#efe0c0';
    roundRect(ctx, board.x + 8, y, LAYOUT.ticket.w, LAYOUT.ticket.h, 8);
    ctx.fill();
    if (selected) {
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (urgent && Math.sin(time * 6) > 0) {
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 2;
      roundRect(ctx, board.x + 8, y, LAYOUT.ticket.w, LAYOUT.ticket.h, 8);
      ctx.stroke();
    }
    text(ctx, `#${ticket.id}`, board.x + 20, y + 24, 15, '#4a2c17');
    ticket.skewers.forEach((type, skewerIndex) => {
      skewerDot(ctx, board.x + 64 + skewerIndex * 26, y + 20, type, 10);
    });
    text(
      ctx,
      ticket.skewers.map((type) => skewerById(type).name).join(' + '),
      board.x + 64 + ((ticket.skewers.length - 1) * 26) / 2,
      y + 46,
      10,
      '#4a2c17',
      'center',
      'normal',
    );
    const sauce = sauceById(ticket.sauce);
    ctx.fillStyle = sauce.color;
    roundRect(ctx, board.x + 200, y + 10, 76, 26, 13);
    ctx.fill();
    text(ctx, sauce.name, board.x + 238, y + 28, 12, '#fff', 'center');
    // Patience bar.
    ctx.fillStyle = '#d8c8a8';
    roundRect(ctx, board.x + 20, y + 62, 244, 12, 6);
    ctx.fill();
    ctx.fillStyle = ticket.patience > 0.5 ? '#7fb069' : ticket.patience > 0.25 ? '#e8a34c' : '#c0392b';
    roundRect(ctx, board.x + 20, y + 62, 244 * Math.max(0, ticket.patience), 12, 6);
    ctx.fill();
  });
  if (state.tickets.length === 0) {
    text(ctx, 'No orders — the crowd is coming…', board.x + 16, board.y + 80, 14, INK_DIM, 'left', 'normal');
  }
}

function drawGrill(ctx, state, time) {
  const grill = LAYOUT.grill;
  // Stall awning over the grill.
  for (let index = 0; index < 7; index += 1) {
    ctx.fillStyle = index % 2 === 0 ? AWNING_RED : AWNING_CREAM;
    ctx.fillRect(grill.x - 20 + index * 86, 118, 86, 26);
  }
  ctx.fillStyle = '#2b1610';
  roundRect(ctx, grill.x, grill.y, grill.w, grill.h, 12);
  ctx.fill();
  // Charcoal embers glow under the skewers.
  const ember = 0.5 + 0.3 * Math.sin(time * 3);
  for (let index = 0; index < 12; index += 1) {
    const x = grill.x + 30 + ((index * 97) % (grill.w - 60));
    const y = grill.y + grill.h - 34 - ((index * 53) % 40);
    ctx.globalAlpha = ember * (0.4 + (index % 3) * 0.2);
    ctx.fillStyle = index % 2 === 0 ? '#ff6b35' : '#ffb347';
    ctx.beginPath();
    ctx.arc(x, y, 5 + (index % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Smoke.
  for (const puff of state.smoke) {
    ctx.globalAlpha = Math.max(0, puff.life / 1.6) * 0.35;
    ctx.fillStyle = '#cfc4b0';
    ctx.beginPath();
    ctx.arc(puff.x, puff.y, puff.size * (2 - puff.life / 1.6), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Slots.
  for (let slot = 0; slot < GRILL_SLOTS; slot += 1) {
    const rect = grillSlotRect(slot);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const skewer = state.grill[slot];
    if (!skewer) {
      text(ctx, 'empty', rect.x + rect.w / 2, rect.y + rect.h / 2 + 5, 13, 'rgba(255,255,255,0.35)', 'center', 'normal');
      continue;
    }
    drawSkewer(ctx, rect.x + 22, rect.y + rect.h / 2, skewer.type, skewer.progress, 1);
    // Cook meter under the skewer.
    const frac = Math.min(1, skewer.progress / COOK_BURNT);
    ctx.fillStyle = '#1c1008';
    roundRect(ctx, rect.x + 22, rect.y + rect.h - 22, 124, 10, 5);
    ctx.fill();
    let meter = '#e8a34c';
    if (skewer.progress >= COOK_PERFECT * 0.55 && skewer.progress < COOK_PERFECT) meter = '#7fb069';
    if (skewer.progress >= COOK_PERFECT && skewer.progress < COOK_BURNT) meter = '#ffd76a';
    if (skewer.progress >= COOK_BURNT) meter = '#3a2418';
    ctx.fillStyle = meter;
    roundRect(ctx, rect.x + 22, rect.y + rect.h - 22, 124 * frac, 10, 5);
    ctx.fill();
    if (skewer.progress >= COOK_PERFECT * 0.55 && skewer.progress < COOK_BURNT) {
      text(ctx, 'PERFECT — grab it!', rect.x + rect.w / 2, rect.y + 16, 12, '#ffd76a', 'center');
    } else if (skewer.progress >= COOK_BURNT) {
      text(ctx, 'BURNT — click to bin it', rect.x + rect.w / 2, rect.y + 16, 12, '#ff9a7a', 'center');
    }
  }
  text(ctx, 'CHARCOAL GRILL — click a tray, then a slot', grill.x, grill.y + grill.h + 22, 13, INK_DIM, 'left', 'normal');
}

function drawPlate(ctx, state, time) {
  const plate = LAYOUT.plate;
  ctx.fillStyle = WOOD;
  roundRect(ctx, plate.x, plate.y, plate.w, plate.h, 12);
  ctx.fill();
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'SERVING PLATE', plate.x + 16, plate.y + 26, 17, '#ffd76a');
  // The plate itself.
  ctx.fillStyle = '#fbf6ea';
  ctx.beginPath();
  ctx.ellipse(plate.x + plate.w / 2, plate.y + 138, 128, 62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8c8a8';
  ctx.lineWidth = 3;
  ctx.stroke();
  state.plate.skewers.forEach((type, index) => {
    drawSkewer(ctx, plate.x + 62, plate.y + 96 + index * 34, type, 1, 0.85);
  });
  if (state.plate.sauce) {
    const sauce = sauceById(state.plate.sauce);
    // A zigzag drizzle along the bottom rim of the plate, under the skewers.
    ctx.strokeStyle = sauce.dark;
    ctx.lineWidth = 4;
    ctx.beginPath();
    const drizzleY = plate.y + 176;
    ctx.moveTo(plate.x + 66, drizzleY);
    for (let index = 1; index <= 8; index += 1) {
      ctx.lineTo(plate.x + 66 + index * 21, drizzleY + (index % 2 === 0 ? 6 : -6));
    }
    ctx.stroke();
    text(ctx, `${sauce.name} sauce`, plate.x + plate.w / 2, plate.y + 216, 13, '#f7ead2', 'center');
  }
  if (state.plate.skewers.length === 0) {
    text(ctx, 'empty — plate your skewers here', plate.x + plate.w / 2, plate.y + 138, 13, '#a89880', 'center', 'normal');
  }
  // Serve button.
  const button = LAYOUT.serveButton;
  const ticket = state.tickets[state.selectedTicket];
  const matches = ticket && state.plate.skewers.length > 0 && state.plate.sauce !== null;
  const ready = matches && state.plate.skewers.length === ticket.skewers.length;
  const glow = ready ? 0.6 + 0.4 * Math.sin(time * 5) : 0;
  ctx.fillStyle = state.plate.skewers.length === 0 ? '#5a4632' : ready ? '#c0392b' : '#8a5a2b';
  roundRect(ctx, button.x, button.y, button.w, button.h, 10);
  ctx.fill();
  if (ready) {
    ctx.globalAlpha = glow * 0.5;
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 4;
    roundRect(ctx, button.x - 3, button.y - 3, button.w + 6, button.h + 6, 12);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  text(ctx, ready ? '🍽 SERVE IT!  (Space)' : 'SERVE  (Space)', button.x + button.w / 2, button.y + 36, 20, '#fff', 'center');
  if (ticket) {
    text(ctx, `serving ticket #${ticket.id}`, button.x + button.w / 2, button.y + button.h + 20, 12, INK_DIM, 'center', 'normal');
  }
}

function drawCounter(ctx, state) {
  const counter = LAYOUT.counter;
  ctx.fillStyle = '#3d2716';
  roundRect(ctx, counter.x, counter.y, counter.w, counter.h, 12);
  ctx.fill();
  text(ctx, 'INGREDIENTS — click a tray, then the grill', counter.x + 16, counter.y + 14, 12, INK_DIM, 'left', 'normal');
  SKEWER_TYPES.forEach((type, index) => {
    const rect = trayRect(index);
    const carrying = state.carrying && state.carrying.type === type.id;
    ctx.fillStyle = carrying ? '#ffe9b0' : '#efe0c0';
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    if (carrying) {
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    drawSkewer(ctx, rect.x + 14, rect.y + 44, type.id, 0, 0.95);
    text(ctx, `${type.name}  [${type.key}]`, rect.x + rect.w / 2, rect.y + rect.h - 10, 13, '#4a2c17', 'center');
  });
  text(ctx, 'SAUCES — click a bowl, then the plate', counter.x + 16 + 4 * (LAYOUT.tray.w + LAYOUT.tray.gap) + 24, counter.y + 14, 12, INK_DIM, 'left', 'normal');
  SAUCE_TYPES.forEach((sauce, index) => {
    const rect = sauceRect(index);
    const selected = state.selectedSauce === sauce.id;
    ctx.fillStyle = sauce.color;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    if (selected) {
      ctx.strokeStyle = '#ffd76a';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(rect.x + rect.w / 2, rect.y + 34, 34, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, `${sauce.name}  [${sauce.key}]`, rect.x + rect.w / 2, rect.y + rect.h - 10, 13, '#fff', 'center');
  });
  // Carried skewer follows the cursor.
  if (state.carrying && state.mouse) {
    ctx.globalAlpha = 0.9;
    drawSkewer(ctx, state.mouse.x - 60, state.mouse.y, state.carrying.type, 0, 1);
    ctx.globalAlpha = 1;
  }
  // Floating score popups.
  for (const note of state.popups) {
    ctx.globalAlpha = Math.max(0, Math.min(1, note.life));
    text(ctx, note.text, note.x, note.y - (1.4 - note.life) * 30, 20, note.color, 'center');
  }
  ctx.globalAlpha = 1;
}

function drawTitle(ctx, state, best) {
  ctx.fillStyle = 'rgba(12,6,20,0.86)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, '🔥 SATE SENJA 🔥', VIEW.width / 2, 190, 64, '#ffb347', 'center');
  text(ctx, 'A night-market satay stall. One grill, one rush, one perfect plate.', VIEW.width / 2, 232, 20, INK, 'center', 'normal');
  text(ctx, 'Grill skewers to golden, sauce them to match the ticket, serve before the customer walks off.', VIEW.width / 2, 262, 16, INK_DIM, 'center', 'normal');
  const panel = { x: 340, y: 300, w: 600, h: 190 };
  ctx.fillStyle = 'rgba(43,26,16,0.95)';
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 14);
  ctx.fill();
  ctx.strokeStyle = '#8a6a45';
  ctx.lineWidth = 2;
  ctx.stroke();
  const lines = [
    ['1  •  Click a tray (or press 1–4) to grab a raw skewer', 330],
    ['2  •  Click a grill slot to cook it — grab it in the golden window', 362],
    ['3  •  Click the plate, pour a sauce (Q / W / E), then SERVE (Space)', 394],
    ['Earn the night’s coin target before the clock runs out. 3 walk-offs ends the night.', 426],
  ];
  for (const [line, y] of lines) text(ctx, line, panel.x + 30, y, 16, INK, 'left', 'normal');
  text(ctx, 'CLICK or press ENTER to open the stall', VIEW.width / 2, 540, 22, '#ffd76a', 'center');
  text(ctx, `Best shift: ${best} coins  •  P pause  •  M mute`, VIEW.width / 2, 578, 14, INK_DIM, 'center', 'normal');
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(12,6,20,0.7)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  text(ctx, 'PAUSED', VIEW.width / 2, 330, 56, INK, 'center');
  text(ctx, 'Press P or click to keep grilling', VIEW.width / 2, 380, 18, INK_DIM, 'center', 'normal');
}

function drawOver(ctx, state, best) {
  const summary = state.daySummary;
  ctx.fillStyle = 'rgba(12,6,20,0.86)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const won = state.won;
  text(ctx, won ? '🎉 SHIFT COMPLETE!' : '🌙 THE STALL CLOSES…', VIEW.width / 2, 180, 48, won ? '#ffd76a' : '#ff9a7a', 'center');
  text(
    ctx,
    won
      ? `Day ${summary.day} hit its target — ${summary.coins} coins against ${summary.target}. The crowd wants more.`
      : `Day ${summary.day} made ${summary.coins} of ${summary.target} coins. The night market forgives — once.`,
    VIEW.width / 2,
    224,
    18,
    INK,
    'center',
    'normal',
  );
  const panel = { x: 390, y: 260, w: 500, h: 210 };
  ctx.fillStyle = 'rgba(43,26,16,0.95)';
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 14);
  ctx.fill();
  ctx.strokeStyle = '#8a6a45';
  ctx.lineWidth = 2;
  ctx.stroke();
  const rows = [
    [`Plates served`, `${summary.served}`],
    [`Tips earned`, `${summary.tips} coins`],
    [`Skewers burnt`, `${summary.burnt}`],
    [`Wrong plates`, `${summary.wrong}`],
    [`Best shift`, `${best} coins`],
  ];
  rows.forEach(([label, value], index) => {
    const y = 300 + index * 32;
    text(ctx, label, panel.x + 30, y, 17, INK_DIM, 'left', 'normal');
    text(ctx, value, panel.x + panel.w - 30, y, 17, INK, 'right');
  });
  text(
    ctx,
    won ? 'Press ENTER for Day ' + (summary.day + 1) + ' — the rush gets faster' : 'Press ENTER to try the night again',
    VIEW.width / 2,
    530,
    20,
    '#ffd76a',
    'center',
  );
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = VIEW.width * dpr;
  canvas.height = VIEW.height * dpr;
  ctx.scale(dpr, dpr);

  return {
    draw(state, screen, best, time) {
      ctx.clearRect(0, 0, VIEW.width, VIEW.height);
      drawNightSky(ctx, time);
      drawTopBar(ctx, state);
      drawBoard(ctx, state, time);
      drawGrill(ctx, state, time);
      drawPlate(ctx, state, time);
      drawCounter(ctx, state);
      if (screen === SCREEN_TITLE) drawTitle(ctx, state, best);
      else if (screen === SCREEN_PAUSED) drawPaused(ctx);
      else if (screen === SCREEN_OVER) drawOver(ctx, state, best);
    },
  };
}
