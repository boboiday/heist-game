// The Gilded Hour — every tuning number, colour and level in one place.
// Top-down 2D bank heist: Kit the thief, three rooms, guards, cameras, loot.
export const CFG = {
  W: 1280,
  H: 720,
  BORDER: 24,
  DT: 1 / 60,

  thiefRadius: 13,
  walkSpeed: 172,
  sneakSpeed: 88,

  lives: 3,
  coinsPerRoom: 3,
  coinFlyTime: 0.35,
  coinThrowDist: 150,
  coinHearDist: 330,
  coinRingLife: 1.2,

  goldScore: 100,
  prizeScore: 300,
  roomScore: 250,
  parScore: 250,
  parSeconds: 75,
  cleanScore: 400,
  cleanAlarmPeak: 50,

  guardRange: 224,
  guardHalfAngle: (32 * Math.PI) / 180,
  guardBump: 42,
  guardChaseSpeed: 150,
  guardTouch: 27,
  guardPause: 1.0,
  suspicionBase: 0.45,
  suspicionClose: 1.85,
  suspicionSneak: 0.5,
  suspicionDecay: 0.38,
  loseSightTime: 2.5,
  searchTime: 2.0,

  cameraRange: 300,
  cameraHalfAngle: (17 * Math.PI) / 180,

  alarmGuardRate: 26,
  alarmCameraRate: 42,
  alarmDecay: 14,
  alarmMax: 100,

  noiseWalk: 84,
  noiseSneak: 26,

  pickupRadius: 26,
  doorRadius: 30,

  colours: {
    floor: '#232c3d',
    floorTile: '#28324a',
    floorTrim: '#8a6d2f',
    wall: '#171d2b',
    wallTop: '#3a4763',
    counter: '#4a3220',
    counterTop: '#c9a227',
    pillar: '#9aa3b5',
    planter: '#1e4d2b',
    planterLeaf: '#2f7a44',
    vault: '#5a6274',
    vaultDoor: '#c9a227',
    guard: '#1d2f57',
    guardHelmet: '#c9a227',
    guardCone: 'rgba(212,175,55,0.20)',
    guardConeSus: 'rgba(230,126,34,0.28)',
    guardConeChase: 'rgba(220,60,50,0.30)',
    camera: '#123a4d',
    cameraCone: 'rgba(64,196,220,0.16)',
    cameraConeHot: 'rgba(220,60,50,0.30)',
    thief: '#d4af37',
    thiefCloak: '#14100a',
    gold: '#f5b942',
    prize: '#5aa2ff',
    doorLocked: '#6b7280',
    doorOpen: '#2fbf71',
    hud: '#e8e0c8',
    alarmGreen: '#37b24d',
    alarmAmber: '#f59f00',
    alarmRed: '#e03131',
    panel: 'rgba(10,14,24,0.92)',
    panelBorder: '#c9a227',
  },
};

// One room: walls/counters/pillars/planters/vault are solid rectangles {x,y,w,h}.
// Guards patrol a straight lane: axis 'x' (horizontal, fixed y) or 'y' (vertical,
// fixed x), between `from` and `to`. Cameras sit on a wall and sweep between two
// angles (radians, 0 = east, PI/2 = south).
export const LEVELS = [
  {
    name: 'ROOM I — THE LOBBY',
    hint: 'Take all 4 loot, then reach the GETAWAY door. E tosses a coin.',
    start: { x: 90, y: 630 },
    exit: { x: 1185, y: 630 },
    walls: [
      { x: 640, y: 72, w: 24, h: 228 },
      { x: 200, y: 400, w: 400, h: 24 },
    ],
    counters: [
      { x: 300, y: 190, w: 180, h: 36 },
      { x: 760, y: 190, w: 180, h: 36 },
    ],
    pillars: [
      { x: 170, y: 130, w: 28, h: 28 },
      { x: 560, y: 560, w: 28, h: 28 },
    ],
    planters: [
      { x: 300, y: 550, w: 44, h: 44 },
      { x: 900, y: 550, w: 44, h: 44 },
    ],
    vault: null,
    gold: [
      { x: 150, y: 110 },
      { x: 1130, y: 110 },
      { x: 640, y: 600 },
    ],
    prize: { x: 1100, y: 600, name: 'the Brass Key' },
    cameras: [
      { x: 400, y: 36, min: 0.7, max: 2.4, speed: 0.55 },
      { x: 36, y: 360, min: -0.9, max: 0.9, speed: 0.6 },
    ],
    guards: [
      { axis: 'x', fixed: 320, from: 300, to: 980, speed: 60 },
      { axis: 'y', fixed: 950, from: 140, to: 560, speed: 60 },
    ],
  },
  {
    name: 'ROOM II — THE VAULT HALL',
    hint: 'Three guards, three cameras. Time the sweeps, spend coins wisely.',
    start: { x: 90, y: 90 },
    exit: { x: 90, y: 630 },
    walls: [
      { x: 420, y: 80, w: 24, h: 90 },
      { x: 860, y: 560, w: 24, h: 80 },
      { x: 780, y: 360, w: 240, h: 24 },
    ],
    counters: [
      { x: 280, y: 140, w: 170, h: 36 },
      { x: 830, y: 140, w: 170, h: 36 },
    ],
    pillars: [
      { x: 560, y: 140, w: 28, h: 28 },
      { x: 560, y: 540, w: 28, h: 28 },
    ],
    planters: [
      { x: 180, y: 340, w: 44, h: 44 },
      { x: 1056, y: 340, w: 44, h: 44 },
    ],
    vault: null,
    gold: [
      { x: 150, y: 600 },
      { x: 1130, y: 110 },
      { x: 640, y: 440 },
    ],
    prize: { x: 1100, y: 600, name: 'the Sapphire Brooch' },
    cameras: [
      { x: 300, y: 36, min: 0.7, max: 2.4, speed: 0.5 },
      { x: 1244, y: 300, min: 2.24, max: 4.04, speed: 0.6 },
      { x: 36, y: 600, min: -2.0, max: -0.3, speed: 0.65 },
    ],
    guards: [
      { axis: 'x', fixed: 200, from: 200, to: 1100, speed: 66 },
      { axis: 'x', fixed: 520, from: 200, to: 1100, speed: 66 },
      { axis: 'y', fixed: 640, from: 120, to: 600, speed: 72 },
    ],
  },
  {
    name: 'ROOM III — THE VAULT',
    hint: 'Four guards, four cameras, one Star Sapphire. Stay clean.',
    start: { x: 90, y: 360 },
    exit: { x: 1190, y: 360 },
    walls: [
      { x: 120, y: 240, w: 400, h: 24 },
      { x: 760, y: 480, w: 400, h: 24 },
      { x: 640, y: 300, w: 24, h: 120 },
    ],
    counters: [
      { x: 280, y: 60, w: 170, h: 36 },
      { x: 830, y: 640, w: 170, h: 36 },
    ],
    pillars: [
      { x: 420, y: 540, w: 28, h: 28 },
      { x: 1050, y: 170, w: 28, h: 28 },
    ],
    planters: [
      { x: 200, y: 540, w: 44, h: 44 },
      { x: 1036, y: 540, w: 44, h: 44 },
    ],
    vault: { x: 560, y: 300, w: 160, h: 120 },
    gold: [
      { x: 220, y: 360 },
      { x: 1060, y: 360 },
      { x: 640, y: 620 },
    ],
    prize: { x: 640, y: 280, name: 'the Star Sapphire' },
    cameras: [
      { x: 36, y: 240, min: -0.9, max: 0.9, speed: 0.55 },
      { x: 1244, y: 360, min: 2.24, max: 4.04, speed: 0.6 },
      { x: 640, y: 36, min: 0.7, max: 2.4, speed: 0.5 },
      { x: 640, y: 684, min: -2.4, max: -0.7, speed: 0.65 },
    ],
    guards: [
      { axis: 'x', fixed: 120, from: 200, to: 1100, speed: 72 },
      { axis: 'x', fixed: 600, from: 200, to: 1100, speed: 72 },
      { axis: 'y', fixed: 320, from: 300, to: 640, speed: 78 },
      { axis: 'y', fixed: 960, from: 80, to: 420, speed: 78 },
    ],
  },
];
