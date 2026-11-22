// Rules only: thief, guards, cameras, loot, alarm, coins, getaway door.
// No drawing, no browser — Node can import this for simulation playtests.
// step() advances one fixed 1/60s step and returns event flags.
import { CFG, LEVELS } from './config.js';

const TAU = Math.PI * 2;

export function angleDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return Math.abs(d);
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function losClear(obs, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x1 + dx * t;
    const y = y1 + dy * t;
    for (const r of obs) {
      if (pointInRect(x, y, r)) return false;
    }
  }
  return true;
}

function circleHitsRect(x, y, r, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < r * r;
}

function tryMove(obs, p, r, dx, dy) {
  const nx = p.x + dx;
  if (nx > CFG.BORDER + r && nx < CFG.W - CFG.BORDER - r) {
    let blocked = false;
    for (const rect of obs) {
      if (circleHitsRect(nx, p.y, r, rect)) {
        blocked = true;
        break;
      }
    }
    if (!blocked) p.x = nx;
  }
  const ny = p.y + dy;
  if (ny > CFG.BORDER + r && ny < CFG.H - CFG.BORDER - r) {
    let blocked = false;
    for (const rect of obs) {
      if (circleHitsRect(p.x, ny, r, rect)) {
        blocked = true;
        break;
      }
    }
    if (!blocked) p.y = ny;
  }
}

export function solidRects(level) {
  const out = [...level.walls, ...level.counters, ...level.pillars, ...level.planters];
  if (level.vault) out.push(level.vault);
  return out;
}

export function makeRoom(levelIndex, score, lives) {
  const level = LEVELS[levelIndex];
  const guards = level.guards.map((g) => ({
    axis: g.axis,
    fixed: g.fixed,
    from: g.from,
    to: g.to,
    speed: g.speed,
    x: g.axis === 'x' ? g.from : g.fixed,
    y: g.axis === 'x' ? g.fixed : g.from,
    dir: 1,
    pauseT: 0,
    facing: g.axis === 'x' ? 0 : Math.PI / 2,
    suspicion: 0,
    mode: 'patrol',
    lastSeen: null,
    unseenT: 0,
    searchT: 0,
    lookT: 0,
    target: null,
  }));
  const cameras = level.cameras.map((c) => ({
    x: c.x,
    y: c.y,
    min: c.min,
    max: c.max,
    speed: c.speed,
    angle: (c.min + c.max) / 2,
    dir: 1,
  }));
  const loot = level.gold.map((g) => ({ x: g.x, y: g.y, kind: 'gold', taken: false }));
  loot.push({ x: level.prize.x, y: level.prize.y, kind: 'prize', name: level.prize.name, taken: false });
  return {
    levelIndex,
    level,
    obs: solidRects(level),
    thief: { x: level.start.x, y: level.start.y },
    lives,
    score,
    roomStartScore: score,
    coins: CFG.coinsPerRoom,
    loot,
    doorOpen: false,
    alarm: 0,
    alarmPeak: 0,
    elapsed: 0,
    guards,
    cameras,
    coin: { active: false, flying: false, x: 0, y: 0, sx: 0, sy: 0, tx: 0, ty: 0, t: 0, ring: 0 },
    moving: false,
    nearGuard: false,
  };
}

// Would a thief standing at (x, y) be seen right now? Used by the autopilot.
export function seenAt(state, x, y) {
  let guard = false;
  let camera = false;
  for (const g of state.guards) {
    const dx = x - g.x;
    const dy = y - g.y;
    const d = Math.hypot(dx, dy);
    if (d < CFG.guardBump) {
      guard = true;
      break;
    }
    if (d < CFG.guardRange && angleDiff(g.facing, Math.atan2(dy, dx)) < CFG.guardHalfAngle) {
      if (losClear(state.obs, g.x, g.y, x, y)) {
        guard = true;
        break;
      }
    }
  }
  for (const c of state.cameras) {
    const dx = x - c.x;
    const dy = y - c.y;
    const d = Math.hypot(dx, dy);
    if (d < CFG.cameraRange && angleDiff(c.angle, Math.atan2(dy, dx)) < CFG.cameraHalfAngle) {
      if (losClear(state.obs, c.x, c.y, x, y)) {
        camera = true;
        break;
      }
    }
  }
  return { guard, camera };
}

export function nearestGuardDist(state, x, y) {
  let best = Infinity;
  for (const g of state.guards) {
    best = Math.min(best, Math.hypot(x - g.x, y - g.y));
  }
  return best;
}

function guardTargetPos(g) {
  return g.axis === 'x' ? { x: g.to, y: g.fixed } : { x: g.fixed, y: g.to };
}

function guardHomePos(g) {
  return g.axis === 'x' ? { x: g.from, y: g.fixed } : { x: g.fixed, y: g.from };
}

export function stepWorld(state, ctl, dt) {
  const ev = {
    picked: null,
    doorOpened: false,
    coinLanded: false,
    tossOk: false,
    tossFail: false,
    spotted: false,
    caught: false,
    lockdown: false,
    roomClear: null,
  };
  const level = state.level;
  state.elapsed += dt;

  // --- thief movement ---
  const speed = ctl.sneak ? CFG.sneakSpeed : CFG.walkSpeed;
  const mx = ctl.mx || 0;
  const my = ctl.my || 0;
  state.moving = mx !== 0 || my !== 0;
  if (state.moving) {
    tryMove(state.obs, state.thief, CFG.thiefRadius, mx * speed * dt, my * speed * dt);
  }

  // --- coin toss ---
  if (ctl.toss) {
    if (state.coins > 0 && !state.coin.active) {
      state.coins -= 1;
      const c = state.coin;
      let tx;
      let ty;
      if (ctl.tossTarget) {
        tx = Math.max(CFG.BORDER + 8, Math.min(CFG.W - CFG.BORDER - 8, ctl.tossTarget.x));
        ty = Math.max(CFG.BORDER + 8, Math.min(CFG.H - CFG.BORDER - 8, ctl.tossTarget.y));
      } else {
        tx = state.thief.x + Math.cos(ctl.facing || 0) * CFG.coinThrowDist;
        ty = state.thief.y + Math.sin(ctl.facing || 0) * CFG.coinThrowDist;
      }
      c.active = true;
      c.flying = true;
      c.sx = state.thief.x;
      c.sy = state.thief.y;
      c.tx = tx;
      c.ty = ty;
      c.t = 0;
      c.x = state.thief.x;
      c.y = state.thief.y;
      ev.tossOk = true;
    } else {
      ev.tossFail = true;
    }
  }
  const coin = state.coin;
  if (coin.active && coin.flying) {
    coin.t += dt / CFG.coinFlyTime;
    if (coin.t >= 1) {
      coin.flying = false;
      coin.x = coin.tx;
      coin.y = coin.ty;
      coin.ring = CFG.coinRingLife;
      ev.coinLanded = true;
      let best = null;
      let bestD = Infinity;
      for (const g of state.guards) {
        const d = Math.hypot(g.x - coin.x, g.y - coin.y);
        if (d < CFG.coinHearDist && d < bestD) {
          best = g;
          bestD = d;
        }
      }
      if (best) {
        best.mode = 'investigate';
        best.target = { x: coin.x, y: coin.y };
        best.lookT = 0;
      }
    } else {
      coin.x = coin.sx + (coin.tx - coin.sx) * coin.t;
      coin.y = coin.sy + (coin.ty - coin.sy) * coin.t;
    }
  }
  if (coin.ring > 0) coin.ring -= dt;

  // --- cameras sweep ---
  for (const c of state.cameras) {
    c.angle += c.speed * c.dir * dt;
    if (c.angle >= c.max) {
      c.angle = c.max;
      c.dir = -1;
    } else if (c.angle <= c.min) {
      c.angle = c.min;
      c.dir = 1;
    }
  }

  // --- vision: who sees the thief ---
  let anyGuardSees = false;
  let anyCamSees = false;
  const thief = state.thief;
  for (const g of state.guards) {
    const dx = thief.x - g.x;
    const dy = thief.y - g.y;
    const d = Math.hypot(dx, dy);
    let seen = false;
    if (d < CFG.guardBump) {
      seen = true;
    } else if (d < CFG.guardRange && angleDiff(g.facing, Math.atan2(dy, dx)) < CFG.guardHalfAngle) {
      seen = losClear(state.obs, g.x, g.y, thief.x, thief.y);
    }
    g.seen = seen;
    if (seen) {
      anyGuardSees = true;
      g.lastSeen = { x: thief.x, y: thief.y };
      g.unseenT = 0;
      const closeness = 1 - Math.min(1, d / CFG.guardRange);
      g.suspicion += (CFG.suspicionBase + CFG.suspicionClose * closeness) * dt * (ctl.sneak ? CFG.suspicionSneak : 1);
      if (g.suspicion >= 1) {
        g.suspicion = 1;
        if (g.mode !== 'chase') {
          g.mode = 'chase';
          ev.spotted = true;
        }
      }
    } else {
      g.suspicion = Math.max(0, g.suspicion - CFG.suspicionDecay * dt);
      g.unseenT += dt;
    }
  }
  for (const c of state.cameras) {
    const dx = thief.x - c.x;
    const dy = thief.y - c.y;
    const d = Math.hypot(dx, dy);
    let seen = false;
    if (d < CFG.cameraRange && angleDiff(c.angle, Math.atan2(dy, dx)) < CFG.cameraHalfAngle) {
      seen = losClear(state.obs, c.x, c.y, thief.x, thief.y);
    }
    c.sees = seen;
    if (seen) anyCamSees = true;
  }

  // --- alarm ---
  if (anyGuardSees) state.alarm += CFG.alarmGuardRate * dt;
  if (anyCamSees) state.alarm += CFG.alarmCameraRate * dt;
  if (!anyGuardSees && !anyCamSees) state.alarm -= CFG.alarmDecay * dt;
  state.alarm = Math.max(0, Math.min(CFG.alarmMax, state.alarm));
  state.alarmPeak = Math.max(state.alarmPeak, state.alarm);
  if (state.alarm >= CFG.alarmMax) {
    ev.lockdown = true;
    return ev;
  }

  // --- noise: moving thief draws patrolling guards ---
  if (state.moving) {
    const noiseR = ctl.sneak ? CFG.noiseSneak : CFG.noiseWalk;
    for (const g of state.guards) {
      if (g.mode === 'patrol') {
        const d = Math.hypot(g.x - thief.x, g.y - thief.y);
        if (d < noiseR) {
          g.mode = 'investigate';
          g.target = { x: thief.x, y: thief.y };
          g.lookT = 0;
        }
      }
    }
  }

  // --- guards move ---
  for (const g of state.guards) {
    if (g.mode === 'patrol') {
      if (g.pauseT > 0) {
        g.pauseT -= dt;
      } else {
        const step = g.speed * g.dir * dt;
        if (g.axis === 'x') {
          g.x += step;
          g.facing = g.dir > 0 ? 0 : Math.PI;
          if (g.x >= g.to) {
            g.x = g.to;
            g.dir = -1;
            g.pauseT = CFG.guardPause;
          } else if (g.x <= g.from) {
            g.x = g.from;
            g.dir = 1;
            g.pauseT = CFG.guardPause;
          }
        } else {
          g.y += step;
          g.facing = g.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          if (g.y >= g.to) {
            g.y = g.to;
            g.dir = -1;
            g.pauseT = CFG.guardPause;
          } else if (g.y <= g.from) {
            g.y = g.from;
            g.dir = 1;
            g.pauseT = CFG.guardPause;
          }
        }
      }
    } else if (g.mode === 'chase') {
      const dx = thief.x - g.x;
      const dy = thief.y - g.y;
      const d = Math.hypot(dx, dy);
      if (d < CFG.guardTouch) {
        ev.caught = true;
        return ev;
      }
      if (d > 0) {
        const sp = CFG.guardChaseSpeed * dt;
        tryMove(state.obs, g, 13, (dx / d) * sp, (dy / d) * sp);
        g.facing = Math.atan2(dy, dx);
      }
      if (!g.seen && g.unseenT > CFG.loseSightTime) {
        g.mode = 'search';
        g.searchT = CFG.searchTime;
      }
    } else if (g.mode === 'search') {
      g.searchT -= dt;
      if (g.lastSeen) {
        const dx = g.lastSeen.x - g.x;
        const dy = g.lastSeen.y - g.y;
        const d = Math.hypot(dx, dy);
        if (d > 6) {
          const sp = g.speed * 1.2 * dt;
          tryMove(state.obs, g, 13, (dx / d) * sp, (dy / d) * sp);
          g.facing = Math.atan2(dy, dx);
        }
      }
      if (g.searchT <= 0) {
        g.mode = 'return';
        g.target = null;
      }
    } else if (g.mode === 'investigate') {
      const t = g.target;
      if (!t) {
        g.mode = 'return';
      } else {
        const dx = t.x - g.x;
        const dy = t.y - g.y;
        const d = Math.hypot(dx, dy);
        if (d < 10) {
          g.lookT += dt;
          if (g.lookT > 1.0) {
            g.mode = 'return';
            g.target = null;
          }
        } else {
          const sp = g.speed * 1.2 * dt;
          tryMove(state.obs, g, 13, (dx / d) * sp, (dy / d) * sp);
          g.facing = Math.atan2(dy, dx);
        }
      }
    } else if (g.mode === 'return') {
      const from = guardHomePos(g);
      const to = guardTargetPos(g);
      const dFrom = Math.hypot(from.x - g.x, from.y - g.y);
      const dTo = Math.hypot(to.x - g.x, to.y - g.y);
      const dest = dFrom < dTo ? from : to;
      const dx = dest.x - g.x;
      const dy = dest.y - g.y;
      const d = Math.hypot(dx, dy);
      if (d < 8) {
        g.mode = 'patrol';
        g.dir = dest === to ? -1 : 1;
        if (g.axis === 'x') g.x = dest.x;
        else g.y = dest.y;
        g.pauseT = 0;
      } else {
        const sp = g.speed * dt;
        tryMove(state.obs, g, 13, (dx / d) * sp, (dy / d) * sp);
        g.facing = Math.atan2(dy, dx);
      }
    }
  }

  // --- loot pickup ---
  for (const item of state.loot) {
    if (!item.taken && Math.hypot(thief.x - item.x, thief.y - item.y) < CFG.pickupRadius) {
      item.taken = true;
      if (item.kind === 'gold') {
        state.score += CFG.goldScore;
        ev.picked = 'gold';
      } else {
        state.score += CFG.prizeScore;
        ev.picked = 'prize';
      }
    }
  }
  if (!state.doorOpen && state.loot.every((i) => i.taken)) {
    state.doorOpen = true;
    ev.doorOpened = true;
  }

  // --- getaway door ---
  if (state.doorOpen) {
    const d = Math.hypot(thief.x - level.exit.x, thief.y - level.exit.y);
    if (d < CFG.doorRadius) {
      const par = state.elapsed < CFG.parSeconds ? CFG.parScore : 0;
      const clean = state.alarmPeak < CFG.cleanAlarmPeak ? CFG.cleanScore : 0;
      const bonus = CFG.roomScore + par + clean;
      state.score += bonus;
      ev.roomClear = {
        loot: state.score - bonus - state.roomStartScore,
        room: CFG.roomScore,
        par,
        clean,
        total: state.score,
        elapsed: state.elapsed,
        alarmPeak: state.alarmPeak,
      };
      return ev;
    }
  }

  state.nearGuard = nearestGuardDist(state, thief.x, thief.y) < 220;
  return ev;
}
