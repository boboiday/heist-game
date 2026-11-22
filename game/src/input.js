// Keyboard + pointer input. Held keys give a steering vector; one-shot presses
// (start, pause, mute, toss) are queued as flags and consumed once per step.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.moveTarget = null; // {x, y} click-to-move target in field coords
    this.tossTarget = null; // {x, y} right-click toss target
    this.flags = { start: false, pause: false, mute: false, toss: false };
    this.facing = 0; // last movement angle, used for the E coin toss
    this.canvas = canvas;
    this._onKeyDown = (e) => this.keyDown(e);
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouse = (e) => this.mouse(e);
    this._onContext = (e) => e.preventDefault();
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousedown', this._onMouse);
    canvas.addEventListener('contextmenu', this._onContext);
  }

  keyDown(e) {
    const c = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(c)) {
      e.preventDefault();
    }
    if (e.repeat) return;
    this.keys.add(c);
    if (c === 'Space' || c === 'Enter') this.flags.start = true;
    if (c === 'KeyP' || c === 'Escape') this.flags.pause = true;
    if (c === 'KeyM') this.flags.mute = true;
    if (c === 'KeyE') this.flags.toss = true;
  }

  mouse(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 1280;
    const y = ((e.clientY - r.top) / r.height) * 720;
    if (e.button === 2) {
      this.tossTarget = { x, y };
      this.flags.toss = true;
    } else if (e.button === 0) {
      this.moveTarget = { x, y };
      this.flags.start = true; // click also starts / continues
    }
  }

  // Steering vector from held keys, or toward the click target if no keys.
  steer(px, py) {
    let dx = 0;
    let dy = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dy -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dy += 1;
    if (dx !== 0 || dy !== 0) {
      this.moveTarget = null;
      const len = Math.hypot(dx, dy);
      this.facing = Math.atan2(dy / len, dx / len);
      return { x: dx / len, y: dy / len };
    }
    if (this.moveTarget) {
      const tx = this.moveTarget.x - px;
      const ty = this.moveTarget.y - py;
      const d = Math.hypot(tx, ty);
      if (d < 10) {
        this.moveTarget = null;
        return { x: 0, y: 0 };
      }
      this.facing = Math.atan2(ty / d, tx / d);
      return { x: tx / d, y: ty / d };
    }
    return { x: 0, y: 0 };
  }

  get sneak() {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.keys.has('KeyC');
  }

  take(flag) {
    const v = this.flags[flag];
    this.flags[flag] = false;
    return v;
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('mousedown', this._onMouse);
    this.canvas.removeEventListener('contextmenu', this._onContext);
  }
}
