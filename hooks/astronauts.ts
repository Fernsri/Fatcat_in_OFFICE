// The space crew: an alternative 32 × 32 pixel skin for the same roles and
// poses as the robots. Each role is its own kind of spacefarer: a different
// helmet, suit cut and details, not only a different color.

import { FRAMES, FRAME_MS, ROLES, SIZE, mixHex } from './robots'
import type { Pose, Role } from './robots'

export const SPACE = '#3D4152'

type Trio = readonly [base: string, light: string, dark: string]
type Helmet = 'round' | 'bubble' | 'slit' | 'raised' | 'porthole' | 'hood'
type Extra = 'backpack' | 'crest' | 'epaulettes' | 'collar' | 'toolbelt' | 'cable' | 'neckring' | 'coat' | 'quilted' | 'scarf' | 'bobbles' | 'splats'

type Look = {
  /** What this spacefarer is, for the board's captions. */
  kind: string
  suit: Trio
  helmet: Helmet
  shell: Trio
  /** Visor glass for round and raised helmets: base, deep shadow, shine. */
  visor: Trio
  boots: Trio
  gloves: Trio
  face?: { skin: string; hair: string }
  extras: Extra[]
}

const WHITE: Trio = ['#F4F5F7', '#FFFFFF', '#B3B8C2']
const NAVY: Trio = ['#132A44', '#0B1A2D', '#FFFFFF']

export const LOOKS: Record<Role, Look> = {
  lead: {
    kind: 'Commander', suit: WHITE, helmet: 'round', shell: WHITE, visor: ['#C9962E', '#7A5A12', '#FFF1B8'],
    boots: WHITE, gloves: ['#DCDFE4', '#FFFFFF', '#B3B8C2'], extras: ['backpack', 'crest', 'epaulettes'],
  },
  planner: {
    kind: 'Navigator', suit: ['#8E6BD6', '#B39BEA', '#6A4BB0'], helmet: 'bubble', shell: WHITE, visor: NAVY,
    boots: WHITE, gloves: ['#F4F5F7', '#FFFFFF', '#C9CDD5'], face: { skin: '#F2C6A0', hair: '#2B1B12' }, extras: ['collar'],
  },
  coder: {
    kind: 'Engineer', suit: ['#4B5260', '#646C7C', '#363B46'], helmet: 'slit', shell: ['#3E4451', '#566072', '#2A2F39'], visor: NAVY,
    boots: ['#2E333D', '#4B5260', '#1F232B'], gloves: ['#2E333D', '#4B5260', '#1F232B'], extras: ['toolbelt', 'cable'],
  },
  tester: {
    kind: 'Test pilot', suit: ['#F28C28', '#FFB066', '#C46A12'], helmet: 'raised', shell: WHITE, visor: NAVY,
    boots: ['#3A3F4B', '#5A6170', '#262A33'], gloves: ['#3A3F4B', '#5A6170', '#262A33'], face: { skin: '#E0AC69', hair: '#6B3E26' }, extras: ['neckring'],
  },
  reviewer: {
    kind: 'Inspector', suit: ['#24323A', '#34464F', '#18222A'], helmet: 'porthole', shell: ['#2C3A44', '#40525E', '#1C262E'], visor: NAVY,
    boots: ['#18222A', '#2C3A44', '#0F161B'], gloves: ['#C9A24A', '#E8C66A', '#9A7A2E'], extras: ['coat'],
  },
  researcher: {
    kind: 'Astronomer', suit: ['#3AA37A', '#62C298', '#2A7D5C'], helmet: 'hood', shell: ['#EFE6D2', '#FFFFFF', '#CFC3A8'], visor: NAVY,
    boots: ['#7A4A2C', '#9A6A3E', '#5A341E'], gloves: ['#7A4A2C', '#9A6A3E', '#5A341E'], face: { skin: '#F7D3B5', hair: '#B5651D' }, extras: ['quilted', 'scarf'],
  },
  designer: {
    kind: 'Star artist', suit: WHITE, helmet: 'round', shell: WHITE, visor: ['#6A2450', '#3E1230', '#FFC4E1'],
    boots: ['#E5508F', '#F59AC0', '#B23A6E'], gloves: ['#DCDFE4', '#FFFFFF', '#B3B8C2'], extras: ['bobbles', 'splats'],
  },
}

const GR = '#8E94A0', BRASS = '#C9A24A'

export function astroGrid(role: Role, pose: Pose, frame: number): (string | null)[][] {
  const R = ROLES[role]
  const L = LOOKS[role]
  const N = SIZE
  const f = ((frame % FRAMES) + FRAMES) % FRAMES
  const fg: (string | null)[][] = Array.from({ length: N }, () => new Array<string | null>(N).fill(null))
  const bg: (string | null)[][] = Array.from({ length: N }, () => new Array<string | null>(N).fill(null))
  const put = (x: number, y: number, c: string | null) => {
    const row = fg[y]
    if (row && x >= 0 && x < N) row[x] = c
  }
  const putBg = (x: number, y: number, c: string) => {
    const row = bg[y]
    if (row && x >= 0 && x < N) row[x] = c
  }
  const box = (x0: number, y0: number, x1: number, y1: number, c: string | null) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c)
  }
  const has = (e: Extra) => L.extras.includes(e)

  const RC = R.color, RL = mixHex(RC, '#FFFFFF', 0.45), RD = mixHex(RC, '#000000', 0.25)
  const [S, SL, SD] = L.suit
  const walk = pose === 'walk', think = pose === 'think', done = pose === 'done', fail = pose === 'fail', idle = pose === 'idle'
  let by = 0
  if (walk) by = f % 4 === 1 || f % 4 === 2 ? 1 : 0 // a slow, floaty bob
  if (done) by = [0, -1, -2, -3, -3, -2, -1, 0][f] ?? 0 // low gravity: a high hop
  const hy = by + (fail ? 1 : 0)
  const lift = done ? by : 0
  const legL = walk && f % 4 === 1 ? -1 : 0
  const legR = walk && f % 4 === 3 ? -1 : 0
  const blink = (walk || idle) && f === 6

  // space: stars, two twinkling, and the ground shadow
  for (const [x, y] of [[3, 3], [6, 12], [27, 14], [29, 22], [2, 20], [26, 26], [4, 27]] as const) putBg(x, y, '#555B70')
  putBg(28, 17, f % 4 < 2 ? '#C9D1E8' : '#6E7590')
  putBg(5, 7, f % 4 >= 2 ? '#C9D1E8' : '#6E7590')
  const sh = done ? -by : 0
  for (let x = 9 + sh; x <= 22 - sh; x++) putBg(x, 30, '#2E3140')
  putBg(7, 30, '#2E3140'); putBg(24, 30, '#2E3140')

  // behind the body: the commander's life-support pack and its antenna
  if (has('backpack')) {
    box(7, 16 + by, 8, 22 + by, GR); box(23, 16 + by, 24, 22 + by, GR)
    box(7, 16 + by, 7, 22 + by, '#A9AFBA'); box(24, 16 + by, 24, 22 + by, '#6E7480')
    put(7, 14 + by, GR); put(7, 15 + by, GR); put(7, 13 + by, f % 4 < 2 ? RL : RC)
  }

  // legs and boots
  const [B, BL, BD] = L.boots
  for (const [lx, up] of [[12, legL], [17, legR]] as const) {
    box(lx, 24 + by, lx + 2, 28 + lift + up, S)
    box(lx + 2, 24 + by, lx + 2, 28 + lift + up, SD)
    if (!has('quilted')) box(lx, 26 + lift + up, lx + 2, 26 + lift + up, L.suit === WHITE ? RC : SL)
    box(lx - 1, 28 + lift + up, lx + 2, 29 + lift + up, B)
    box(lx - 1, 28 + lift + up, lx, 28 + lift + up, BL)
    box(lx - 1, 29 + lift + up, lx + 2, 29 + lift + up, BD)
  }

  // the torso: each role has its own cut
  const wide = has('quilted') ? 1 : 0
  box(11 - wide, 17 + by, 20 + wide, 23 + by, S)
  box(11 - wide, 17 + by, 11 - wide, 22 + by, SL)
  box(20 + wide, 17 + by, 20 + wide, 23 + by, SD)
  box(12 - wide, 23 + by, 19 + wide, 23 + by, mixHex(S, SD, 0.5))
  if (has('coat')) {
    box(11, 24 + by, 14, 25 + by, S); box(17, 24 + by, 20, 25 + by, S)
    box(20, 24 + by, 20, 25 + by, SD); box(14, 17 + by, 14, 25 + by, RC); box(17, 17 + by, 17, 25 + by, RC)
    put(15, 18 + by, BRASS); put(16, 18 + by, BRASS); put(15, 21 + by, BRASS); put(16, 21 + by, BRASS)
    box(12, 17 + by, 13, 17 + by, RD); box(18, 17 + by, 19, 17 + by, RD)
  } else if (has('quilted')) {
    box(10, 19 + by, 21, 19 + by, SD); box(10, 21 + by, 21, 21 + by, SD)
    box(15, 17 + by, 16, 23 + by, mixHex(S, SD, 0.4))
  } else if (has('toolbelt')) {
    box(11, 21 + by, 20, 22 + by, '#7A5A3C'); box(15, 21 + by, 16, 21 + by, '#C9A24A')
    box(12, 22 + by, 13, 23 + by, '#5E432B'); box(18, 22 + by, 19, 23 + by, '#5E432B')
    box(12, 18 + by, 19, 18 + by, RD); put(13, 19 + by, RC)
  } else {
    box(13, 18 + by, 14, 19 + by, RC); put(13, 18 + by, RL)
    const belt = has('collar') ? '#F4F5F7' : RC
    box(11, 21 + by, 20, 21 + by, belt); box(11, 22 + by, 20, 22 + by, has('collar') ? '#C9CDD5' : RD)
    box(15, 21 + by, 16, 22 + by, has('collar') ? RL : RL)
  }
  if (has('collar')) { box(12, 17 + by, 19, 17 + by, '#F4F5F7'); put(15, 18 + by, '#F4F5F7'); put(16, 18 + by, '#F4F5F7') }
  if (has('neckring')) { box(12, 17 + by, 19, 17 + by, '#2E5A88'); box(17, 19 + by, 18, 20 + by, '#2E5A88'); put(17, 19 + by, '#FFFFFF') }
  if (has('epaulettes')) { box(9, 17 + by, 10, 17 + by, RC); box(21, 17 + by, 22, 17 + by, RC) }
  if (has('splats')) for (const [x, y, c] of [[12, 19, RC], [13, 19, RL], [18, 22, RC], [17, 23, RD], [19, 18, RL], [13, 27, RC]] as const) put(x, y + (y >= 24 ? lift : by), c)
  if (has('scarf')) { box(12, 16 + hy, 19, 17 + hy, '#E0B84A'); box(18, 18 + by, 19, 20 + by, '#E0B84A'); box(12, 17 + hy, 19, 17 + hy, '#C9A03A') }

  // arms: the screen-left one is free, the screen-right one holds the prop
  const [G, GL, GD] = L.gloves
  const glove = (x: number, y: number) => { box(x, y, x + 1, y + 1, G); put(x, y, GL); put(x + 1, y + 1, GD) }
  const arm = (left: boolean, gx: number, gy: number, up: boolean) => {
    const sx = left ? 9 : 21
    box(sx, 17 + by, sx + 1, 18 + by, S)
    if (up) {
      const ax = left ? sx - 2 : sx + 2
      box(ax, 13 + by, ax + 1, 16 + by, S)
      box(left ? ax : ax + 1, 13 + by, left ? ax : ax + 1, 16 + by, SD)
    } else {
      box(sx, 19 + by, sx + 1, gy - 1, S)
      box(left ? sx : sx + 1, 19 + by, left ? sx : sx + 1, gy - 1, SD)
      if (has('quilted')) box(sx, 21 + by, sx + 1, 21 + by, SD)
    }
    glove(gx, gy)
  }
  const sw = walk ? [0, -1, 0, 1][f % 4] ?? 0 : 0
  let free: [number, number] = [9, 23 + by + sw]
  let held: [number, number] = [21, 23 + by - sw]
  if (think) free = [12, 15 + hy]
  if (done) { free = [7, 11 + by]; held = [23, 11 + by] }
  if (fail) { free = [9, 24 + by]; held = [21, 24 + by] }
  if (think) {
    box(9, 17 + by, 10, 18 + by, S)
    box(10, 16 + hy, 11, 17 + by, S)
    glove(free[0], free[1])
  } else arm(true, free[0], free[1], done)
  arm(false, held[0], held[1], done)

  // ── heads ──────────────────────────────────────────────────────────────────
  const [SHb, SHl, SHd] = L.shell
  const inCircle = (x: number, y: number, cx: number, cy: number, r: number) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r
  const ring = (cx: number, cy: number, r0: number, r1: number, c: string) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inCircle(x, y, cx, cy, r1) && !inCircle(x, y, cx, cy, r0)) put(x, y, c)
  }
  const disc = (cx: number, cy: number, r: number, c: string) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inCircle(x, y, cx, cy, r)) put(x, y, c)
  }

  // a face: eyes, blush and mouth around row ey, with the pose's expression
  const face = (ey: number, skin: string) => {
    const INK = '#2B1B12', BLUSH = mixHex(skin, '#F08A8A', 0.55), MOUTH = '#B5544B'
    put(12, ey + 1, BLUSH); put(19, ey + 1, BLUSH)
    if (done) {
      for (const ex of [13, 18]) { put(ex - 1, ey + 1, INK); put(ex, ey, INK); put(ex + 1, ey + 1, INK) }
      box(14, ey + 2, 17, ey + 2, MOUTH); box(15, ey + 3, 16, ey + 3, '#E06A6A')
    } else if (fail) {
      for (const ex of [13, 18]) box(ex - 1, ey + 1, ex, ey + 1, INK)
      put(14, ey + 3, MOUTH); put(15, ey + 2, MOUTH); put(16, ey + 2, MOUTH); put(17, ey + 3, MOUTH)
      put(12, ey + 2, '#7FC8F8')
    } else if (blink) {
      for (const ex of [13, 18]) put(ex, ey + 1, INK)
      box(15, ey + 2, 16, ey + 2, MOUTH)
    } else {
      const up = think ? -1 : 0
      for (const ex of [13, 18]) { put(ex, ey + up, INK); put(ex, ey + 1 + up, INK) }
      if (think) put(16, ey + 2, MOUTH)
      else box(15, ey + 2, 16, ey + 2, MOUTH)
    }
  }

  // a classic round helmet shell, rows 4..15
  const roundShell = (b: string, l: string, d: string) => {
    box(12, 4 + hy, 19, 4 + hy, b); box(12, 4 + hy, 15, 4 + hy, l)
    box(10, 5 + hy, 21, 5 + hy, b); box(10, 5 + hy, 12, 5 + hy, l); put(21, 5 + hy, d)
    box(9, 6 + hy, 22, 13 + hy, b); box(9, 6 + hy, 9, 9 + hy, l); box(22, 6 + hy, 22, 13 + hy, d)
    box(10, 14 + hy, 21, 14 + hy, b); put(21, 14 + hy, d)
    box(11, 15 + hy, 20, 15 + hy, mixHex(b, d, 0.5))
  }
  box(13, 16 + hy, 18, 16 + hy, GR) // neck ring under every helmet

  if (L.helmet === 'round') {
    roundShell(SHb, SHl, SHd)
    const tint = fail && f % 2 === 0
    const [V0, VD0, VH] = L.visor
    const V = tint ? '#4A1A28' : V0
    const VDk = tint ? '#2E0F18' : VD0
    box(11, 7 + hy, 20, 7 + hy, '#7C8494')
    box(10, 8 + hy, 21, 12 + hy, V); box(11, 13 + hy, 20, 13 + hy, V); box(13, 14 + hy, 19, 14 + hy, V)
    for (const [x, y] of [[10, 11], [10, 12], [11, 12], [11, 13], [12, 13], [12, 14], [13, 14], [14, 13]] as const) put(x, y + hy, VDk)
    if (!(idle && f === 6)) { put(18, 9 + hy, VH); put(19, 10 + hy, VH); put(18, 10 + hy, mixHex(V, VH, 0.5)) }
    if (done) { put(14, 10 + hy, mixHex(V, VH, 0.7)); put(16, 9 + hy, mixHex(V, VH, 0.5)); put(13, 12 + hy, mixHex(V, VH, 0.4)) }
    if (think) for (const i of [0, 1, 2]) put(13 + i * 2, 11 + hy, Math.floor(f / 2) % 4 > i ? mixHex(V, VH, 0.6) : mixHex(V, VH, 0.2))
    put(22, 9 + hy, walk && f % 4 >= 2 ? RL : RC); put(22, 10 + hy, RC)
    if (has('crest')) { box(15, 3 + hy, 16, 5 + hy, RC); put(15, 3 + hy, RL) }
    if (has('bobbles')) {
      put(11, 3 + hy, GR); put(20, 3 + hy, GR)
      put(11, 2 + hy, f % 4 < 2 ? RL : RC); put(20, 2 + hy, f % 4 < 2 ? RC : RL)
      put(10, 2 + hy, RC); put(21, 2 + hy, RC)
    }
  }

  if (L.helmet === 'bubble') {
    // a fishbowl of glass: you see the navigator's face, and the stars behind it
    const F = L.face!
    box(12, 6 + hy, 19, 13 + hy, F.skin)
    put(12, 13 + hy, null); put(19, 13 + hy, null)
    box(12, 6 + hy, 19, 7 + hy, F.hair); put(12, 6 + hy, null); put(19, 6 + hy, null)
    put(12, 8 + hy, F.hair); put(19, 8 + hy, F.hair); box(13, 8 + hy, 14, 8 + hy, F.hair)
    face(10 + hy, F.skin)
    ring(15.5, 9.5 + hy, 6.6, 7.6, '#A9C7DA')
    for (const [x, y] of [[11, 4], [10, 5], [9, 6], [9, 7]] as const) put(x, y + hy, '#E8F6FF')
    put(20, 5 + hy, '#E8F6FF')
    box(11, 16 + hy, 20, 16 + hy, '#C9CDD5')
  }

  if (L.helmet === 'slit') {
    // the engineer's boxy helmet with a glowing scan slit
    box(9, 4 + hy, 22, 14 + hy, SHb)
    box(10, 4 + hy, 21, 4 + hy, SHl); box(9, 5 + hy, 9, 13 + hy, SHl)
    box(22, 5 + hy, 22, 13 + hy, SHd); box(10, 14 + hy, 21, 14 + hy, SHd)
    put(9, 4 + hy, null); put(22, 4 + hy, null); put(9, 14 + hy, null); put(22, 14 + hy, null)
    box(11, 8 + hy, 20, 11 + hy, '#0E1116')
    const glowC = fail ? (f % 2 ? '#FF6B5E' : '#7A2A2A') : RC
    if (done) {
      for (const ex of [13, 18]) { put(ex - 1, 10 + hy, RL); put(ex, 9 + hy, RL); put(ex + 1, 10 + hy, RL) }
    } else if (think) {
      for (const i of [0, 1, 2]) put(13 + i * 2, 9 + hy, Math.floor(f / 2) % 4 > i ? RL : RD)
    } else {
      box(11, 9 + hy, 20, 10 + hy, mixHex('#0E1116', glowC, 0.35))
      const scan = 11 + ((f * 2) % 10)
      box(scan, 9 + hy, scan, 10 + hy, fail ? glowC : RL)
    }
    box(10, 12 + hy, 10, 13 + hy, SHd); box(21, 12 + hy, 21, 13 + hy, SHd)
    box(19, 2 + hy, 20, 3 + hy, SHb); put(20, 2 + hy, RC)
    if (has('cable')) for (const [x, y] of [[23, 12], [23, 13], [24, 14], [24, 15], [23, 16]] as const) put(x, y + hy, RC)
  }

  if (L.helmet === 'raised') {
    // the test pilot's helmet with its visor flipped up over the brow
    roundShell(SHb, SHl, SHd)
    const [V, VDk, VH] = L.visor
    box(11, 4 + hy, 20, 6 + hy, V); box(12, 4 + hy, 19, 4 + hy, VDk); put(18, 5 + hy, VH)
    const F = L.face!
    box(11, 8 + hy, 20, 13 + hy, F.skin); box(12, 14 + hy, 19, 14 + hy, F.skin)
    box(11, 7 + hy, 20, 7 + hy, F.hair); put(11, 8 + hy, F.hair); put(20, 8 + hy, F.hair)
    face(10 + hy, F.skin)
    put(22, 9 + hy, RC); put(22, 10 + hy, RC)
  }

  if (L.helmet === 'porthole') {
    // the inspector's dark helmet: one brass-rimmed porthole and a glowing iris
    roundShell(SHb, SHl, SHd)
    disc(15.5, 10 + hy, 3.2, '#0E2A2C')
    ring(15.5, 10 + hy, 3.2, 4.3, BRASS)
    for (const [x, y] of [[13, 7], [14, 7]] as const) put(x, y + hy, '#E8C66A')
    const iris = fail ? (f % 2 ? '#FF6B5E' : '#7A2A2A') : RC
    if (done) { put(14, 10 + hy, RL); put(15, 9 + hy, RL); put(16, 9 + hy, RL); put(17, 10 + hy, RL) }
    else {
      const iy = think ? 9 : 10
      const ix = walk ? 15 + (f % 4 < 2 ? 0 : 1) : 15
      box(ix, iy + hy, ix + 1, iy + 1 + hy, blink ? '#0E2A2C' : iris)
      if (!blink) put(ix, iy + hy, fail ? '#FFB3AC' : RL)
    }
    for (const [x, y] of [[10, 7], [21, 7], [10, 13], [21, 13]] as const) put(x, y + hy, BRASS)
    put(22, 9 + hy, RC)
  }

  if (L.helmet === 'hood') {
    // the astronomer's parka: a hood with a fur rim around a rosy face
    const F = L.face!
    for (let y = 2; y <= 16; y++) for (let x = 7; x <= 24; x++) {
      const dx = (x - 15.5) / 7.6, dy = (y - (9.5 + hy)) / 7.2
      if (dx * dx + dy * dy <= 1) put(x, y + 0 * hy, S)
    }
    for (let y = 2; y <= 16; y++) for (let x = 7; x <= 24; x++) {
      const dx = (x - 15.5) / 5.8, dy = (y - (10 + hy)) / 5.4
      const d = dx * dx + dy * dy
      if (d <= 1) put(x, y, d > 0.55 ? ((x + y) % 2 ? SHb : SHl) : F.skin)
    }
    box(13, 7 + hy, 18, 7 + hy, F.hair); put(14, 8 + hy, F.hair)
    face(10 + hy, F.skin)
    put(15, 2 + hy, SD); put(16, 2 + hy, SD); put(16, 1 + hy, SD)
  }

  // ── the prop, in the screen-right glove ─────────────────────────────────────
  const [px, py] = held
  if (R.prop === 'tablet') {
    box(px + 2, py - 3, px + 5, py + 2, '#222222')
    box(px + 3, py - 2, px + 4, py + 1, RC); put(px + 3, py - 2, RL)
  } else if (R.prop === 'laptop') {
    box(px + 2, py - 3, px + 4, py + 3, '#C9D2DC'); box(px + 4, py - 3, px + 4, py + 3, '#9AA6B4')
    box(px + 2, py - 3, px + 3, py - 3, '#E6ECF2'); put(px + 3, py, RC)
  } else if (R.prop === 'clipboard') {
    // the navigator's star chart
    box(px + 2, py - 4, px + 6, py + 3, '#1E2A44')
    for (const [x, y] of [[3, -3], [5, -1], [4, 1], [6, 2], [3, 2]] as const) put(px + x, py + y, '#E8F6FF')
    put(px + 4, py - 2, RL); put(px + 5, py, RL)
    box(px + 2, py - 5, px + 6, py - 5, '#9A6A3E'); box(px + 2, py + 4, px + 6, py + 4, '#9A6A3E')
  } else if (R.prop === 'magnifier') {
    // the astronomer's telescope, raised toward the stars
    for (let k = 0; k < 6; k++) { put(px + 1 + k, py - 1 - k, '#C9A24A'); put(px + 2 + k, py - 1 - k, '#9A7A2E') }
    put(px + 3, py - 3, RC); put(px + 4, py - 3, RC)
    box(px + 7, py - 7, px + 8, py - 6, '#5A606A'); put(px + 8, py - 7, '#BFE3F5')
  } else if (R.prop === 'flask') {
    const LQ = '#7DD35A'
    box(px + 3, py - 6, px + 4, py - 3, '#DDEBF2'); box(px + 2, py - 7, px + 5, py - 7, '#9AA6B4')
    box(px + 2, py - 2, px + 5, py + 2, '#DDEBF2'); box(px + 1, py, px + 6, py + 2, '#DDEBF2')
    box(px + 2, py, px + 5, py + 2, LQ); box(px + 2, py, px + 3, py, mixHex(LQ, '#FFFFFF', 0.5))
    put(px + 3 + (f % 2), py - 1 - (f % 3), mixHex(LQ, '#FFFFFF', 0.3))
  } else if (R.prop === 'stamp') {
    box(px + 2, py - 6, px + 4, py - 5, '#7A4A2C'); put(px + 3, py - 4, '#7A4A2C')
    box(px + 1, py - 3, px + 5, py - 2, RC); box(px + 1, py - 3, px + 5, py - 3, RL)
    box(px + 1, py - 1, px + 5, py - 1, '#E5534B')
  } else {
    box(px + 1, py - 4, px + 1, py + 3, '#F4D35E'); put(px + 1, py + 3, '#C9A63A')
    box(px + 1, py - 6, px + 1, py - 5, '#9AA3AD')
    box(px, py - 8, px + 2, py - 7, RC); put(px + 1, py - 9, RD); put(px, py - 8, RL)
  }
  glove(px, py) // the holding glove stays in front of the prop

  // speech bubble: thinking dots, a done check, a failure mark
  if (think || done || fail) {
    const bc = think ? '#FFFFFF' : done ? '#5BA53C' : '#E5534B'
    const bo = f % 4 < 2 ? 0 : 1
    box(24, bo, 31, 5 + bo, bc)
    put(24, bo, null); put(31, bo, null); put(24, 5 + bo, null); put(31, 5 + bo, null)
    put(24, 6 + bo, bc); put(23, 7 + bo, bc)
    if (think) for (const i of [0, 1, 2]) put(25 + i * 2, 3 + bo, Math.floor(f / 2) % 4 > i ? '#26384C' : '#C9D1DA')
    else if (done) for (const [x, y] of [[25, 3], [26, 4], [27, 3], [28, 2], [29, 1]] as const) put(x, y + bo, '#FFFFFF')
    else { box(27, 1 + bo, 28, 2 + bo, '#FFFFFF'); box(27, 4 + bo, 28, 4 + bo, '#FFFFFF') }
  }

  return fg.map((row, y) => row.map((c, x) => c ?? bg[y]?.[x] ?? null))
}

/** An animated SVG of one role and pose, the same layout as the robots' (see robotSvg). */
export function astroSvg(role: Role, pose: Pose, backdrop = SPACE): string {
  const frames = Array.from({ length: FRAMES }, (_, k) => astroGrid(role, pose, k))
  const paths = (grid: (string | null)[][]) => {
    const byColor = new Map<string, string>()
    grid.forEach((row, y) => {
      let x = 0
      while (x < SIZE) {
        const c = row[x]
        let end = x + 1
        while (end < SIZE && row[end] === c) end++
        if (c) byColor.set(c, (byColor.get(c) ?? '') + `M${x} ${y}h${end - x}v1h${x - end}z`)
        x = end
      }
    })
    return [...byColor].map(([c, d]) => `<path fill="${c}" d="${d}"/>`).join('')
  }
  const first = frames[0] ?? []
  const still = first.map((row, y) => row.map((c, x) => (frames.every(g => g[y]?.[x] === c) ? c : null)))
  const moving = frames.map(g => g.map((row, y) => row.map((c, x) => (still[y]?.[x] === c ? null : c ?? backdrop))))
  const dur = (FRAMES * FRAME_MS) / 1000
  const groups = moving.map((g, k) => {
    const values = Array.from({ length: FRAMES }, (_, i) => (i === k ? 'visible' : 'hidden')).join(';')
    return `<g visibility="${k === 0 ? 'visible' : 'hidden'}"><animate attributeName="visibility" values="${values}" dur="${dur}s" calcMode="discrete" repeatCount="indefinite"/>${paths(g)}</g>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="crispEdges">`
    + `<rect width="${SIZE}" height="${SIZE}" fill="${backdrop}"/>${paths(still)}${groups.join('')}</svg>`
}
