// Drawing only: room, HUD, panels. Reads world state, never changes it.
import { CFG } from './config.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wedge(ctx, x, y, angle, half, range) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + String(sec).padStart(2, '0');
}

export function drawScene(ctx, state, opts) {
  const C = CFG.colours;
  const level = state.level;
  const t = opts.time || 0;
  const W = CFG.W;
  const H = CFG.H;

  // --- floor ---
  ctx.fillStyle = C.floor;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = C.floorTile;
  ctx.lineWidth = 1;
  for (let x = CFG.BORDER; x <= W - CFG.BORDER; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, CFG.BORDER);
    ctx.lineTo(x, H - CFG.BORDER);
    ctx.stroke();
  }
  for (let y = CFG.BORDER; y <= H - CFG.BORDER; y += 64) {
    ctx.beginPath();
    ctx.moveTo(CFG.BORDER, y);
    ctx.lineTo(W - CFG.BORDER, y);
    ctx.stroke();
  }
  // brass trim border
  ctx.strokeStyle = C.floorTrim;
  ctx.lineWidth = 2;
  ctx.strokeRect(CFG.BORDER + 6, CFG.BORDER + 6, W - 2 * (CFG.BORDER + 6), H - 2 * (CFG.BORDER + 6));
  ctx.strokeStyle = 'rgba(138,109,47,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(CFG.BORDER + 14, CFG.BORDER + 14, W - 2 * (CFG.BORDER + 14), H - 2 * (CFG.BORDER + 14));

  // --- border walls ---
  ctx.fillStyle = C.wall;
  ctx.fillRect(0, 0, W, CFG.BORDER);
  ctx.fillRect(0, H - CFG.BORDER, W, CFG.BORDER);
  ctx.fillRect(0, 0, CFG.BORDER, H);
  ctx.fillRect(W - CFG.BORDER, 0, CFG.BORDER, H);
  ctx.fillStyle = C.wallTop;
  ctx.fillRect(0, CFG.BORDER - 4, W, 4);
  ctx.fillRect(0, H - CFG.BORDER, W, 4);
  ctx.fillRect(CFG.BORDER - 4, 0, 4, H);
  ctx.fillRect(W - CFG.BORDER, 0, 4, H);

  // --- obstacles ---
  for (const w of level.walls) {
    ctx.fillStyle = C.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = C.wallTop;
    ctx.fillRect(w.x, w.y, w.w, 4);
  }
  for (const c of level.counters) {
    ctx.fillStyle = C.counter;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = C.counterTop;
    ctx.fillRect(c.x, c.y, c.w, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(c.x, c.y + c.h - 6, c.w, 6);
  }
  for (const p of level.pillars) {
    ctx.fillStyle = C.pillar;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x + 3, p.y + 3, p.w - 6, p.h - 6);
  }
  for (const p of level.planters) {
    ctx.fillStyle = C.planter;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = C.planterLeaf;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2 - 8, p.y + p.h / 2 + 6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2 + 9, p.y + p.h / 2 - 5, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  if (level.vault) {
    const v = level.vault;
    ctx.fillStyle = C.vault;
    ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(v.x + 4, v.y + 4, v.w - 8, v.h - 8);
    ctx.fillStyle = C.vaultDoor;
    ctx.beginPath();
    ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b2f38';
    ctx.beginPath();
    ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.vaultDoor;
    ctx.beginPath();
    ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- loot ---
  for (const item of state.loot) {
    if (item.taken) continue;
    if (item.kind === 'gold') {
      const pulse = 0.7 + 0.3 * Math.sin(t * 3 + item.x);
      ctx.save();
      ctx.shadowColor = C.gold;
      ctx.shadowBlur = 14 * pulse;
      ctx.fillStyle = C.gold;
      ctx.translate(item.x, item.y);
      ctx.rotate(-0.3);
      rr(ctx, -11, -5, 22, 10, 3);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,230,150,0.9)';
      ctx.fillRect(item.x - 7, item.y - 3, 14, 2);
    } else {
      const pulse = 1 + 0.12 * Math.sin(t * 4);
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = C.prize;
      ctx.shadowBlur = 22;
      ctx.fillStyle = C.prize;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(13, 0);
      ctx.lineTo(0, 18);
      ctx.lineTo(-13, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(item.x - 4, item.y - 8);
      ctx.lineTo(item.x + 2, item.y - 2);
      ctx.lineTo(item.x - 2, item.y + 4);
      ctx.lineTo(item.x - 6, item.y - 1);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#cfe4ff';
      ctx.fillText(item.name, item.x, item.y + 36);
    }
  }

  // --- getaway door ---
  const ex = level.exit;
  ctx.save();
  if (state.doorOpen) {
    const glow = 0.7 + 0.3 * Math.sin(t * 5);
    ctx.shadowColor = C.doorOpen;
    ctx.shadowBlur = 20 * glow;
    ctx.fillStyle = C.doorOpen;
    rr(ctx, ex.x - 22, ex.y - 30, 44, 60, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#062b16';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GETAWAY', ex.x, ex.y - 38);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(ex.x - 3, ex.y - 22, 6, 44);
  } else {
    ctx.fillStyle = C.doorLocked;
    rr(ctx, ex.x - 22, ex.y - 30, 44, 60, 6);
    ctx.fill();
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(ex.x - 8, ex.y - 8, 16, 14);
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y - 8, 7, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#aab0bd';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOCKED', ex.x, ex.y - 38);
  }
  ctx.restore();

  // --- vision cones (under the actors) ---
  for (const g of state.guards) {
    let col = C.guardCone;
    if (g.mode === 'chase') col = C.guardConeChase;
    else if (g.suspicion > 0.25) col = C.guardConeSus;
    ctx.fillStyle = col;
    wedge(ctx, g.x, g.y, g.facing, CFG.guardHalfAngle, CFG.guardRange);
    ctx.fill();
  }
  for (const c of state.cameras) {
    ctx.fillStyle = c.sees ? C.cameraConeHot : C.cameraCone;
    wedge(ctx, c.x, c.y, c.angle, CFG.cameraHalfAngle, CFG.cameraRange);
    ctx.fill();
  }

  // --- cameras ---
  for (const c of state.cameras) {
    ctx.fillStyle = C.camera;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.sees ? '#ff4444' : '#59d8ef';
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(c.angle) * 5, c.y + Math.sin(c.angle) * 5, 4, 0, Math.PI * 2);
    ctx.fill();
    if (c.sees) {
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff5555';
      ctx.fillText('!', c.x, c.y - 16);
    }
  }

  // --- coin ---
  const coin = state.coin;
  if (coin.active && coin.flying) {
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (coin.ring > 0) {
    const p = 1 - coin.ring / CFG.coinRingLife;
    ctx.strokeStyle = 'rgba(245,185,66,' + (0.9 * (1 - p)).toFixed(2) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 6 + p * 34, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- guards ---
  for (const g of state.guards) {
    ctx.fillStyle = C.guard;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // helmet dot + facing tick
    ctx.fillStyle = C.guardHelmet;
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.facing) * 6, g.y + Math.sin(g.facing) * 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d8c27a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(g.x + Math.cos(g.facing) * 14, g.y + Math.sin(g.facing) * 14);
    ctx.lineTo(g.x + Math.cos(g.facing) * 20, g.y + Math.sin(g.facing) * 20);
    ctx.stroke();
    // suspicion arc
    if (g.suspicion > 0.02 && g.mode !== 'chase') {
      ctx.strokeStyle = g.suspicion > 0.6 ? '#ff8844' : '#ffd24d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 20, -Math.PI / 2, -Math.PI / 2 + g.suspicion * Math.PI * 2);
      ctx.stroke();
    }
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    if (g.mode === 'chase') {
      ctx.fillStyle = '#ff5555';
      ctx.fillText('!', g.x, g.y - 24);
    } else if (g.suspicion > 0.25) {
      ctx.fillStyle = '#ffcc44';
      ctx.fillText('?', g.x, g.y - 24);
    }
  }

  // --- thief ---
  const th = state.thief;
  if (opts.sneaking) {
    ctx.strokeStyle = 'rgba(212,175,55,0.7)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(th.x, th.y, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (state.moving) {
    const p = (t % 0.9) / 0.9;
    ctx.strokeStyle = 'rgba(212,175,55,' + (0.35 * (1 - p)).toFixed(2) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(th.x, th.y, 16 + p * 22, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = C.thiefCloak;
  ctx.beginPath();
  ctx.arc(th.x, th.y, CFG.thiefRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.thief;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = C.thief;
  ctx.beginPath();
  ctx.arc(th.x, th.y - 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.thief;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(th.x, th.y);
  ctx.lineTo(th.x + Math.cos(opts.facing || 0) * 18, th.y + Math.sin(opts.facing || 0) * 18);
  ctx.stroke();

  // --- vignette ---
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // --- red frame while the alarm is high ---
  if (state.alarm >= 70) {
    const a = 0.45 + 0.3 * Math.sin(t * 8);
    ctx.strokeStyle = 'rgba(224,49,49,' + a.toFixed(2) + ')';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);
  }

  drawHud(ctx, state, opts);
}

export function drawHud(ctx, state, opts) {
  const C = CFG.colours;
  const level = state.level;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // top-left: room + hint
  ctx.fillStyle = C.hud;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(level.name, 36, 52);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(232,224,200,0.75)';
  ctx.fillText(level.hint, 36, 72);
  // loot icons + count + coins
  const taken = state.loot.filter((i) => i.taken).length;
  for (let i = 0; i < 4; i++) {
    const x = 44 + i * 26;
    const y = 92;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    if (i < taken) {
      ctx.fillStyle = state.loot[i] && state.loot[i].kind === 'prize' ? C.prize : C.gold;
      ctx.fillRect(-6, -6, 12, 12);
    } else {
      ctx.strokeStyle = 'rgba(232,224,200,0.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-6, -6, 12, 12);
    }
    ctx.restore();
  }
  ctx.fillStyle = C.hud;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('Loot ' + taken + '/4', 150, 97);
  for (let i = 0; i < CFG.coinsPerRoom; i++) {
    ctx.fillStyle = i < state.coins ? C.gold : 'rgba(232,224,200,0.25)';
    ctx.beginPath();
    ctx.arc(250 + i * 18, 92, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(232,224,200,0.75)';
  ctx.font = '12px sans-serif';
  ctx.fillText('coins', 308, 96);

  // top-centre: alarm meter
  const mw = 280;
  const mx = CFG.W / 2 - mw / 2;
  const my = 34;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  rr(ctx, mx - 8, my - 8, mw + 16, 40, 6);
  ctx.fill();
  const ac = state.alarm < 40 ? C.alarmGreen : state.alarm < 70 ? C.alarmAmber : C.alarmRed;
  ctx.fillStyle = '#10141f';
  ctx.fillRect(mx, my, mw, 14);
  ctx.fillStyle = ac;
  ctx.fillRect(mx, my, mw * (state.alarm / 100), 14);
  ctx.strokeStyle = 'rgba(232,224,200,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx, my, mw, 14);
  ctx.fillStyle = C.hud;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ALARM ' + Math.round(state.alarm) + '%', CFG.W / 2, my + 30);

  // top-right: score, timer, lives
  ctx.textAlign = 'right';
  ctx.fillStyle = C.hud;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('SCORE ' + String(state.score).padStart(4, '0'), CFG.W - 36, 52);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(232,224,200,0.75)';
  ctx.fillText(fmtTime(state.elapsed) + '   PAR ' + fmtTime(CFG.parSeconds), CFG.W - 36, 72);
  for (let i = 0; i < CFG.lives; i++) {
    ctx.fillStyle = i < state.lives ? '#e03131' : 'rgba(232,224,200,0.2)';
    ctx.beginPath();
    ctx.arc(CFG.W - 44 - i * 22, 92, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // toast message
  if (opts.message) {
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const w = ctx.measureText(opts.message).width + 28;
    rr(ctx, CFG.W / 2 - w / 2, CFG.H - 66, w, 30, 6);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(opts.message, CFG.W / 2, CFG.H - 45);
  }
}

function panelCard(ctx, w, h) {
  const C = CFG.colours;
  const x = (CFG.W - w) / 2;
  const y = (CFG.H - h) / 2;
  ctx.fillStyle = C.panel;
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = C.panelBorder;
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 10);
  ctx.stroke();
  return { x, y };
}

function panelText(ctx, cx, y, lines) {
  for (const line of lines) {
    ctx.font = line.font;
    ctx.fillStyle = line.color || '#e8e0c8';
    ctx.textAlign = 'center';
    ctx.fillText(line.text, cx, y);
    y += line.gap || 30;
  }
  return y;
}

export function drawPanel(ctx, kind, data) {
  const cx = CFG.W / 2;
  if (kind === 'title') {
    const { x, y } = panelCard(ctx, 640, 420);
    let yy = panelText(ctx, cx, y + 62, [
      { text: 'THE GILDED HOUR', font: 'bold 44px sans-serif', color: '#d4af37', gap: 52 },
      { text: 'A bank heist in three rooms', font: 'italic 17px sans-serif', color: '#cfe4ff', gap: 34 },
      { text: 'You are Kit. Take every gold bar and the named prize,', font: '15px sans-serif', gap: 24 },
      { text: 'then slip out the GETAWAY door before the alarm peaks.', font: '15px sans-serif', gap: 36 },
      { text: 'WASD / arrows — move      SHIFT — sneak      E / right-click — toss a coin', font: '14px sans-serif', color: '#ffe9a8', gap: 24 },
      { text: 'P — pause      M — mute      SPACE — start', font: '14px sans-serif', color: '#ffe9a8', gap: 40 },
      { text: 'Guards chase. Cameras raise the alarm fast. Coins pull guards away.', font: '13px sans-serif', color: 'rgba(232,224,200,0.7)', gap: 34 },
      { text: 'Press SPACE to begin', font: 'bold 17px sans-serif', color: '#d4af37', gap: 30 },
    ]);
    if (data.best > 0) {
      ctx.font = '13px sans-serif';
      ctx.fillStyle = 'rgba(232,224,200,0.7)';
      ctx.textAlign = 'center';
      ctx.fillText('Best score: ' + data.best, cx, yy + 6);
    }
    void x;
  } else if (kind === 'paused') {
    panelCard(ctx, 420, 190);
    panelText(ctx, cx, CFG.H / 2 - 20, [
      { text: 'PAUSED', font: 'bold 34px sans-serif', color: '#d4af37', gap: 44 },
      { text: 'P or SPACE to continue', font: '15px sans-serif', gap: 30 },
    ]);
  } else if (kind === 'roomclear') {
    const d = data.clear;
    const { y } = panelCard(ctx, 560, 360);
    let yy = panelText(ctx, cx, y + 62, [
      { text: 'ROOM CLEARED', font: 'bold 38px sans-serif', color: '#2fbf71', gap: 48 },
      { text: 'Loot  ' + d.loot + '      Room  +250', font: '17px sans-serif', gap: 28 },
      { text: d.par > 0 ? 'Under par  +250' : 'Over par  +0', font: '17px sans-serif', gap: 28 },
      { text: d.clean > 0 ? 'Clean — alarm stayed under 50  +400' : 'Alarm peaked at ' + Math.round(d.alarmPeak) + '% — no clean bonus', font: '17px sans-serif', gap: 36 },
      { text: 'SCORE  ' + d.total, font: 'bold 24px sans-serif', color: '#d4af37', gap: 44 },
      { text: data.last ? 'Press SPACE for the final tally' : 'Press SPACE for the next room', font: '15px sans-serif', color: '#ffe9a8', gap: 30 },
    ]);
    void yy;
  } else if (kind === 'win') {
    const { y } = panelCard(ctx, 600, 340);
    panelText(ctx, cx, y + 66, [
      { text: 'CLEAN GETAWAY', font: 'bold 40px sans-serif', color: '#d4af37', gap: 52 },
      { text: 'Every room emptied. The Grand Meridian never saw you coming.', font: '16px sans-serif', gap: 34 },
      { text: 'FINAL SCORE  ' + data.score, font: 'bold 26px sans-serif', color: '#2fbf71', gap: 40 },
      { text: 'Best: ' + data.best, font: '15px sans-serif', color: 'rgba(232,224,200,0.75)', gap: 40 },
      { text: 'Press SPACE to play again', font: '15px sans-serif', color: '#ffe9a8', gap: 30 },
    ]);
  } else if (kind === 'gameover') {
    const { y } = panelCard(ctx, 560, 320);
    panelText(ctx, cx, y + 66, [
      { text: data.lockdown ? 'LOCKDOWN' : 'CAUGHT', font: 'bold 40px sans-serif', color: '#e03131', gap: 48 },
      { text: data.lockdown ? 'The alarm peaked. The bank sealed itself shut.' : 'A guard got hands on you. The night is over.', font: '16px sans-serif', gap: 36 },
      { text: 'SCORE  ' + data.score, font: 'bold 24px sans-serif', color: '#d4af37', gap: 44 },
      { text: 'Best: ' + data.best, font: '15px sans-serif', color: 'rgba(232,224,200,0.75)', gap: 40 },
      { text: 'Press SPACE to try again', font: '15px sans-serif', color: '#ffe9a8', gap: 30 },
    ]);
  }
}
