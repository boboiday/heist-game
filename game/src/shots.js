// Deterministic screenshot scenes behind ?shot=start|play|alert|end&seed=1,
// plus the autopilot that plays the game for real in the play scene.
import { CFG } from './config.js';
import { makeRoom, stepWorld, seenAt, nearestGuardDist } from './world.js';
import { mulberry32 } from './random.js';

const DIRS = [
  { x: 1, y: 0 },
  { x: 0.7071, y: 0.7071 },
  { x: 0, y: 1 },
  { x: -0.7071, y: 0.7071 },
  { x: -1, y: 0 },
  { x: -0.7071, y: -0.7071 },
  { x: 0, y: -1 },
  { x: 0.7071, y: -0.7071 },
  { x: 0, y: 0 },
];

function nearestTarget(state) {
  const th = state.thief;
  let best = null;
  let bestD = Infinity;
  for (const item of state.loot) {
    if (item.taken) continue;
    const d = Math.hypot(item.x - th.x, item.y - th.y);
    if (d < bestD) {
      bestD = d;
      best = item;
    }
  }
  if (best) return { x: best.x, y: best.y, d: bestD, loot: true };
  return { x: state.level.exit.x, y: state.level.exit.y, d: Math.hypot(state.level.exit.x - th.x, state.level.exit.y - th.y), loot: false };
}

// The autopilot: head for the nearest loot, then the exit. Each step it scores
// nine candidate directions by distance-to-target after a lookahead plus big
// penalties for stepping into a cone or close to a guard. The lookahead shrinks
// near the target so the pilot does not overshoot it and decide to stand still.
export function pilotSteer(state, mem) {
  const th = state.thief;
  const target = nearestTarget(state);
  const chased = state.guards.some((g) => g.mode === 'chase');
  const here = seenAt(state, th.x, th.y);

  // Flee: chased, or standing in a cone with the alarm climbing.
  if (chased || ((here.guard || here.camera) && state.alarm > 25)) {
    let gx = 0;
    let gy = 0;
    let bestD = Infinity;
    for (const g of state.guards) {
      const d = Math.hypot(th.x - g.x, th.y - g.y);
      if (d < bestD) {
        bestD = d;
        gx = g.x;
        gy = g.y;
      }
    }
    const dx = th.x - gx;
    const dy = th.y - gy;
    const d = Math.hypot(dx, dy) || 1;
    mem.facing = Math.atan2(dy / d, dx / d);
    return { mx: dx / d, my: dy / d, sneak: false, toss: false, facing: mem.facing };
  }

  // Stuck: no progress toward the target for ~1.5s, sidestep for ~0.8s.
  if (mem.sidestepT > 0) {
    mem.sidestepT -= CFG.DT;
    return { mx: mem.side.x, my: mem.side.y, sneak: true, toss: false, facing: mem.facing };
  }
  if (target.d < mem.lastD - 4) {
    mem.lastD = target.d;
    mem.stuckT = 0;
  } else {
    mem.stuckT += CFG.DT;
    if (mem.stuckT > 1.5) {
      mem.stuckT = 0;
      mem.sidestepT = 0.8;
      const tx = target.x - th.x;
      const ty = target.y - th.y;
      const d = Math.hypot(tx, ty) || 1;
      const side = mem.rng() < 0.5 ? 1 : -1;
      mem.side = { x: (-ty / d) * side, y: (tx / d) * side };
      mem.facing = Math.atan2(mem.side.y, mem.side.x);
      return { mx: mem.side.x, my: mem.side.y, sneak: true, toss: false, facing: mem.facing };
    }
  }

  // Score the nine candidate directions.
  const look = Math.max(12, Math.min(60, target.d));
  let bestScore = Infinity;
  let bestDir = DIRS[8];
  for (const dir of DIRS) {
    const cx = th.x + dir.x * look;
    const cy = th.y + dir.y * look;
    let score = Math.hypot(target.x - cx, target.y - cy);
    const seen = seenAt(state, cx, cy);
    if (seen.guard) score += 400;
    if (seen.camera) score += 500;
    const gd = nearestGuardDist(state, cx, cy);
    if (gd < 60) score += 300 * (1 - gd / 60);
    if (score < bestScore) {
      bestScore = score;
      bestDir = dir;
    }
  }

  // Every way forward crosses a cone and we are safe where we stand: wait.
  if (bestDir.x === 0 && bestDir.y === 0 && state.alarm < 20 && !here.guard && !here.camera) {
    return { mx: 0, my: 0, sneak: true, toss: false, facing: mem.facing };
  }
  if (bestDir.x !== 0 || bestDir.y !== 0) {
    mem.facing = Math.atan2(bestDir.y, bestDir.x);
  }
  const sneak = here.guard || here.camera || bestScore > 300;
  return { mx: bestDir.x, my: bestDir.y, sneak, toss: false, facing: mem.facing };
}

function newMem(seed) {
  return { lastD: Infinity, stuckT: 0, sidestepT: 0, side: { x: 1, y: 0 }, facing: 0, rng: mulberry32(seed) };
}

const IDLE = { mx: 0, my: 0, sneak: false, toss: false, facing: 0 };

function runSteps(state, ctlFn, n) {
  let lastEv = null;
  for (let i = 0; i < n; i++) {
    lastEv = stepWorld(state, ctlFn(), CFG.DT);
    if (lastEv.caught || lastEv.lockdown || lastEv.roomClear) break;
  }
  return lastEv;
}

export function prepareShot(name, seed) {
  if (name === 'start') {
    const state = makeRoom(0, 0, 3);
    runSteps(state, () => IDLE, 300);
    return { state, screen: 'title', panel: null, message: '', facing: 0, sneaking: false };
  }

  if (name === 'play') {
    let state = makeRoom(0, 0, 3);
    const mem = newMem(seed);
    let facing = 0;
    for (let i = 0; i < 960; i++) {
      const ctl = pilotSteer(state, mem);
      facing = ctl.facing;
      const ev = stepWorld(state, ctl, CFG.DT);
      if (ev.caught || ev.lockdown) {
        // Roll the score back and reload the room, then keep playing.
        state = makeRoom(0, state.roomStartScore, 3);
        mem.lastD = Infinity;
        mem.stuckT = 0;
        mem.sidestepT = 0;
        continue;
      }
      if (ev.roomClear) break;
    }
    const taken = state.loot.filter((l) => l.taken).length;
    return {
      state,
      screen: 'play',
      panel: null,
      message: taken > 0 ? 'Loot ' + taken + '/4 — keep moving' : '',
      facing,
      sneaking: false,
    };
  }

  if (name === 'alert') {
    const state = makeRoom(0, 0, 3);
    const cam = state.cameras[0];
    cam.angle = 1.5;
    cam.dir = 1;
    // Thief frozen in the first camera's lens, ~130px out along its angle.
    state.thief.x = cam.x + Math.cos(1.5) * 130;
    state.thief.y = cam.y + Math.sin(1.5) * 130;
    state.alarm = 82;
    state.alarmPeak = 82;
    // One guard suspicious, close enough to show the "?" in frame.
    const g = state.guards[0];
    g.x = 700;
    g.y = 320;
    g.facing = Math.PI;
    g.suspicion = 0.7;
    g.pauseT = 1;
    runSteps(state, () => IDLE, 10);
    return { state, screen: 'play', panel: null, message: '', facing: 0, sneaking: false };
  }

  if (name === 'end') {
    const state = makeRoom(0, 0, 3);
    for (const item of state.loot) item.taken = true;
    state.score = 600;
    state.roomStartScore = 0;
    state.doorOpen = true;
    state.alarm = 0;
    state.alarmPeak = 12;
    state.elapsed = 40;
    state.thief.x = 1000;
    state.thief.y = 630;
    const mem = newMem(seed);
    let clear = null;
    for (let i = 0; i < 600; i++) {
      const ctl = pilotSteer(state, mem);
      const ev = stepWorld(state, ctl, CFG.DT);
      if (ev.roomClear) {
        clear = ev.roomClear;
        break;
      }
      if (ev.caught || ev.lockdown) break;
    }
    return {
      state,
      screen: 'roomclear',
      panel: clear ? { clear, last: false } : null,
      message: '',
      facing: 0,
      sneaking: false,
    };
  }

  return null;
}
