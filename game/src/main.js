// Boot, the one loop (fixed steps, catch-up capped), six screens,
// best score in localStorage, and the status line screen readers use.
import { CFG, LEVELS } from './config.js';
import { Input } from './input.js';
import { makeRoom, stepWorld } from './world.js';
import { drawScene, drawPanel } from './render.js';
import { Sfx } from './audio.js';
import { prepareShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const BEST_KEY = 'gilded-hour-best';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = parseInt(params.get('seed') || '1', 10) || 1;

let best = 0;
try {
  best = parseInt(window.localStorage.getItem(BEST_KEY) || '0', 10) || 0;
} catch (e) {
  best = 0;
}

function saveBest(score) {
  if (score > best) {
    best = score;
    try {
      window.localStorage.setItem(BEST_KEY, String(best));
    } catch (e) {
      /* storage unavailable */
    }
  }
}

let lastStatus = '';
function setStatus(text) {
  if (text !== lastStatus) {
    lastStatus = text;
    statusEl.textContent = text;
  }
}

// ---------- screenshot mode: render one staged scene, then stop ----------
if (shotName) {
  const shot = prepareShot(shotName, seed);
  if (shot) {
    const s = shot.state;
    drawScene(ctx, s, { time: s.elapsed, message: shot.message, facing: shot.facing, sneaking: shot.sneaking });
    if (shot.screen === 'title') drawPanel(ctx, 'title', { best });
    if (shot.screen === 'roomclear' && shot.panel) drawPanel(ctx, 'roomclear', shot.panel);
    const taken = s.loot.filter((l) => l.taken).length;
    setStatus(
      'Shot ' + shotName + '. ' + s.level.name + '. Loot ' + taken + '/4. Score ' + s.score +
      '. Alarm ' + Math.round(s.alarm) + '%. Lives ' + s.lives + '.'
    );
    window.__shotState = {
      shot: shotName,
      loot: taken,
      score: s.score,
      alarm: Math.round(s.alarm),
      alarmPeak: Math.round(s.alarmPeak),
      lives: s.lives,
      elapsed: Math.round(s.elapsed * 10) / 10,
      screen: shot.screen,
      clear: shot.panel ? shot.panel.clear : null,
    };
  } else {
    setStatus('Unknown shot: ' + shotName);
  }
  window.__shotReady = true;
} else {
  // ---------- interactive game ----------
  const input = new Input(canvas);
  const sfx = new Sfx();
  let screen = 'title';
  let room = makeRoom(0, 0, CFG.lives);
  let clearData = null;
  let gameOverLockdown = false;
  let message = '';
  let messageT = 0;
  let facing = 0;
  let sneaking = false;
  let stepCount = 0;
  let footT = 0;

  function showMessage(text, secs) {
    message = text;
    messageT = secs;
  }

  function startGame() {
    room = makeRoom(0, 0, CFG.lives);
    screen = 'play';
    clearData = null;
    showMessage('Take all 4 loot, then reach the GETAWAY door.', 4);
    setStatus('Playing. ' + room.level.name + '. Loot 0/4. Score 0.');
  }

  function nextRoom() {
    if (room.levelIndex + 1 >= LEVELS.length) {
      screen = 'win';
      saveBest(room.score);
      sfx.win();
      setStatus('Clean getaway. Final score ' + room.score + '. Best ' + best + '.');
      return;
    }
    room = makeRoom(room.levelIndex + 1, room.score, room.lives);
    screen = 'play';
    showMessage(room.level.name + ' — ' + room.level.hint, 4);
    setStatus('Playing. ' + room.level.name + '. Loot 0/4. Score ' + room.score + '.');
  }

  function loseLife(lockdown) {
    const livesLeft = room.lives - 1;
    const scoreBack = room.roomStartScore;
    const idx = room.levelIndex;
    sfx.stopKlaxon();
    if (livesLeft <= 0) {
      room.lives = 0;
      gameOverLockdown = lockdown;
      screen = 'gameover';
      saveBest(scoreBack);
      sfx.caught();
      setStatus((lockdown ? 'Lockdown. ' : 'Caught. ') + 'Game over. Score ' + scoreBack + '.');
      return;
    }
    room = makeRoom(idx, scoreBack, livesLeft);
    showMessage(lockdown ? 'LOCKDOWN — the room restarts.' : 'Caught — the room restarts.', 3);
    setStatus((lockdown ? 'Lockdown. ' : 'Caught. ') + 'Room restarts. Lives ' + livesLeft + '. Score ' + scoreBack + '.');
  }

  function doStep() {
    const steer = input.steer(room.thief.x, room.thief.y);
    sneaking = input.sneak;
    if (steer.x !== 0 || steer.y !== 0) facing = input.facing;
    const toss = input.take('toss');
    const tossTarget = input.tossTarget;
    input.tossTarget = null;
    const ev = stepWorld(room, {
      mx: steer.x,
      my: steer.y,
      sneak: sneaking,
      toss,
      tossTarget,
      facing,
    }, CFG.DT);
    stepCount++;
    if (room.moving) {
      footT -= CFG.DT;
      if (footT <= 0) {
        footT = 0.35;
        sfx.footstep(room.nearGuard);
      }
    }
    if (ev.tossOk) {
      sfx.toss();
      showMessage('Coin tossed.', 2);
      setStatus('Coin tossed. Coins left: ' + room.coins + '.');
    }
    if (ev.tossFail) {
      showMessage('No coins left.', 2);
      setStatus('No coins left.');
    }
    if (ev.coinLanded) sfx.clink();
    if (ev.picked === 'gold') {
      sfx.pickup();
      setStatus('Gold taken. Loot ' + room.loot.filter((l) => l.taken).length + '/4. Score ' + room.score + '.');
    }
    if (ev.picked === 'prize') {
      sfx.prize();
      showMessage('Prize taken: ' + room.level.prize.name + ' (+300)', 3);
      setStatus('Prize taken. Loot ' + room.loot.filter((l) => l.taken).length + '/4. Score ' + room.score + '.');
    }
    if (ev.doorOpened) {
      sfx.doorOpen();
      showMessage('All loot taken — the GETAWAY door is open!', 3);
      setStatus('All loot taken. Getaway door open. Score ' + room.score + '.');
    }
    if (ev.spotted) {
      sfx.sting();
      setStatus('Spotted! Alarm ' + Math.round(room.alarm) + '%.');
    }
    if (ev.caught) {
      loseLife(false);
      return;
    }
    if (ev.lockdown) {
      loseLife(true);
      return;
    }
    if (ev.roomClear) {
      clearData = { clear: ev.roomClear, last: room.levelIndex + 1 >= LEVELS.length };
      screen = 'roomclear';
      sfx.stopKlaxon();
      sfx.clear();
      setStatus('Room cleared. Score ' + ev.roomClear.total + '.');
    }
  }

  let lastT = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    const time = now / 1000;

    if (input.take('mute')) {
      const muted = sfx.toggleMute();
      showMessage(muted ? 'Muted.' : 'Sound on.', 1.5);
    }
    if (screen === 'title') {
      if (input.take('start')) {
        sfx.ensure();
        startGame();
      } else {
        // Patrol behind the title panel.
        stepWorld(room, { mx: 0, my: 0, sneak: false, toss: false, facing: 0 }, CFG.DT);
      }
    } else if (screen === 'play') {
      if (input.take('pause')) {
        screen = 'paused';
        sfx.stopKlaxon();
        setStatus('Paused.');
      } else {
        acc += dt;
        let n = 0;
        while (acc >= CFG.DT && n < 5) {
          doStep();
          acc -= CFG.DT;
          n++;
          if (screen !== 'play') break;
        }
        if (n === 5) acc = 0;
        sfx.klaxon(room.alarm >= 70 && screen === 'play');
      }
    } else if (screen === 'paused') {
      if (input.take('pause') || input.take('start')) {
        screen = 'play';
        setStatus('Playing. ' + room.level.name + '.');
      }
    } else if (screen === 'roomclear') {
      if (input.take('start')) nextRoom();
    } else if (screen === 'win' || screen === 'gameover') {
      if (input.take('start')) startGame();
    }

    if (messageT > 0) {
      messageT -= dt;
      if (messageT <= 0) message = '';
    }

    drawScene(ctx, room, {
      time,
      message,
      facing,
      sneaking: screen === 'play' && sneaking,
    });
    if (screen === 'title') drawPanel(ctx, 'title', { best });
    if (screen === 'paused') drawPanel(ctx, 'paused', {});
    if (screen === 'roomclear' && clearData) drawPanel(ctx, 'roomclear', clearData);
    if (screen === 'win') drawPanel(ctx, 'win', { score: room.score, best });
    if (screen === 'gameover') drawPanel(ctx, 'gameover', { score: room.roomStartScore, best, lockdown: gameOverLockdown });

    window.__shotReady = true;
    window.__game = { screen, score: room.score, lives: room.lives, steps: stepCount };
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  setStatus('The Gilded Hour. Press SPACE to begin.');
}
