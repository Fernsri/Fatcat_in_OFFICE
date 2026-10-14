// The office cats: a third 32 × 32 pixel skin for the same roles and poses as
// the robots. Chubby, brightly colored cats, one round blob from ears to feet,
// each in its own coat and holding its own kit: the lead in a suit at a
// whiteboard, the rest in overalls in the role color.

import { FRAMES, ROLES, SIZE, mixHex, spriteSvg } from './robots'
import type { Pose, Role } from './robots'

/** The office wall behind the cats. */
export const OFFICE = '#FBF3EE'

type Trio = readonly [base: string, light: string, dark: string]
type Coat = 'solid' | 'tabby' | 'calico' | 'pointed'
type Kit = 'marker' | 'coffee' | 'laptop' | 'cable' | 'checklist' | 'magnifier' | 'ipad'

type Cat = {
  /** What this cat is, for the board's captions: "orange tabby". */
  kind: string
  fur: Trio
  coat: Coat
  /** A tabby's stripes, a calico's orange patch, a siamese cat's points. */
  mark?: string
  /** A calico's black patch. */
  mark2?: string
  /** A lighter chest; none for a cat already pale all over. */
  chest?: string
  outfit: 'suit' | 'overalls'
  kit: Kit
}

export const CATS: Record<Role, Cat> = {
  lead: { kind: 'orange tabby', fur: ['#F7A03C', '#FFC67E', '#DB7A22'], coat: 'tabby', mark: '#C9651B', chest: '#FFE3BF', outfit: 'suit', kit: 'marker' },
  planner: { kind: 'blue-grey cat', fur: ['#7088BC', '#97ACDA', '#566C9E'], coat: 'solid', chest: '#B9C8EA', outfit: 'overalls', kit: 'coffee' },
  coder: { kind: 'golden cat', fur: ['#FFC23C', '#FFDB85', '#E59F1A'], coat: 'solid', chest: '#FFF6E0', outfit: 'overalls', kit: 'laptop' },
  tester: { kind: 'calico cat', fur: ['#FFF7EC', '#FFFFFF', '#E6D8C4'], coat: 'calico', mark: '#F39237', mark2: '#3B3542', outfit: 'overalls', kit: 'cable' },
  reviewer: { kind: 'siamese cat', fur: ['#FBEEDB', '#FFFAF1', '#E3D0B3'], coat: 'pointed', mark: '#8A4F35', outfit: 'overalls', kit: 'checklist' },
  researcher: { kind: 'pink tabby', fur: ['#F49BAE', '#FFC4D0', '#D9738A'], coat: 'tabby', mark: '#E0607D', chest: '#FFE1E7', outfit: 'overalls', kit: 'magnifier' },
  designer: { kind: 'white cat', fur: ['#FFFDF8', '#FFFFFF', '#E9DFD2'], coat: 'solid', outfit: 'overalls', kit: 'ipad' },
}

const SUIT: Trio = ['#2C3E66', '#41578A', '#1E2B4A']
const SHOES: Trio = ['#2A2D33', '#454A53', '#17191D']
const OUT = '#2A2238'
const EYE = '#2A2238'
const NOSE = '#F27B93'
const BLUSH = '#FF9FB2'

const trio = (c: string): Trio => [c, mixHex(c, '#FFFFFF', 0.35), mixHex(c, '#000000', 0.22)]

/** The blob from the top of the head to the bottom of the belly: [y, x0, x1]. */
const BODY: [number, number, number][] = [
  [6, 9, 22],
  [7, 8, 23],
  ...[8, 9, 10, 11, 12, 13].map((y): [number, number, number] => [y, 7, 24]),
  ...[14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map((y): [number, number, number] => [y, 6, 25]),
  [25, 7, 24],
]

/**
 * One frame as rows of colors, like robotGrid: `null` is backdrop, every other
 * cell a `#rrggbb`. Frames loop every FRAMES.
 */
export function catGrid(role: Role, pose: Pose, frame: number): (string | null)[][] {
  const C = CATS[role]
  const N = SIZE
  const f = ((frame % FRAMES) + FRAMES) % FRAMES
  const fg: (string | null)[][] = Array.from({ length: N }, () => new Array<string | null>(N).fill(null))
  const bg: (string | null)[][] = Array.from({ length: N }, () => new Array<string | null>(N).fill(null))
  // drawn over the outline: the coffee's steam stays one pixel thin
  const over: (string | null)[][] = Array.from({ length: N }, () => new Array<string | null>(N).fill(null))
  const at = (grid: (string | null)[][], x: number, y: number, c: string | null) => {
    const row = grid[y]
    if (row && x >= 0 && x < N) row[x] = c
  }
  const put = (x: number, y: number, c: string | null) => at(fg, x, y, c)
  const box = (x0: number, y0: number, x1: number, y1: number, c: string | null) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c)
  }

  const RC = ROLES[role].color
  const cloth: Trio = C.outfit === 'suit' ? SUIT : trio(RC)
  const fur = C.fur
  const points: Trio = C.coat === 'pointed' && C.mark ? trio(C.mark) : fur

  const walk = pose === 'walk', think = pose === 'think', done = pose === 'done', fail = pose === 'fail', idle = pose === 'idle'
  let by = 0
  if (walk) by = f % 2
  if (done) by = [0, -1, -2, -2, -2, -1, 0, 0][f] ?? 0
  const hy = by + (fail ? 1 : 0)
  const lift = done ? by : 0

  // ground shadow; the lead's whiteboard behind, top left
  const sh = done ? -by : 0
  for (let x = 6 + sh; x <= 25 - sh; x++) at(bg, x, 29, '#EADCD3')
  for (let x = 8 + sh; x <= 23 - sh; x++) at(bg, x, 28, '#F1E5DD')
  if (C.kit === 'marker') {
    for (let y = 0; y <= 9; y++) for (let x = 0; x <= 6; x++) at(bg, x, y, x === 0 || x === 6 || y === 0 || y === 9 ? '#A9B2BE' : '#FFFFFF')
    for (const [x, y] of [[1, 7], [2, 6], [3, 6], [4, 4], [5, 3]] as const) at(bg, x, y, RC)
    for (let x = 1; x <= 5; x++) at(bg, x, 10, '#8E98A5') // the marker tray
  }

  // the tail, behind the body: curled up, up straight when cheering, flat on failure
  const tailPath: [number, number][] = done
    ? [[5, 24], [4, 23], [3, 22], [3, 21], [3, 20], [3, 19], [3, 18], [3, 17]]
    : fail
      ? [[5, 26], [4, 27], [3, 27], [2, 27], [1, 26]]
      : [[5, 24], [4, 23], [3, 22], [3, 21], [3, 20], [3, 19], [4, 18]]
  const sway = walk ? [0, -1, 0, 1][f % 4] ?? 0 : 0
  tailPath.forEach(([x, y], i) => {
    const dx = !done && !fail && y <= 20 ? sway : 0
    const ty = y + (fail ? 0 : by)
    const c = C.coat === 'pointed' ? points[0]
      : C.coat === 'tabby' && i % 2 === 1 ? (C.mark ?? fur[0])
        : C.coat === 'calico' && i >= tailPath.length - 3 ? (C.mark2 ?? fur[0])
          : fur[0]
    put(x + dx, ty, c); put(x + dx + 1, ty, c)
  })

  // four stubby legs: the outfit on top, paws (the lead's shoes) below
  const feet: Trio = C.outfit === 'suit' ? SHOES : points
  for (const [lx, pair] of [[8, 0], [12, 1], [18, 0], [22, 1]] as const) {
    const up = walk && f % 4 === (pair ? 3 : 1) ? -1 : 0
    box(lx, 26 + lift + up, lx + 1, 26 + lift + up, cloth[2])
    box(lx, 27 + lift + up, lx + 1, 27 + lift + up, feet[0])
    put(lx, 27 + lift + up, feet[1])
  }

  // ears, then the round body, lit from the top left
  const earFur = (left: boolean) => (C.coat === 'pointed' ? points[0] : C.coat === 'calico' ? (left ? C.mark : C.mark2) ?? fur[0] : fur[0])
  const ear = (left: boolean) => {
    const m = (x: number) => (left ? x : 31 - x)
    const rows: [number, number, number][] = fail ? [[5, 6, 9], [6, 6, 7]] : [[3, 8, 9], [4, 8, 10], [5, 8, 11]]
    for (const [y, a, b] of rows) for (let x = a; x <= b; x++) put(m(x), y + hy, earFur(left))
    const inner: [number, number, number][] = fail ? [[5, 7, 8]] : [[4, 9, 9], [5, 9, 10]]
    for (const [y, a, b] of inner) for (let x = a; x <= b; x++) put(m(x), y + hy, NOSE)
  }
  ear(true)
  ear(false)
  const top = BODY[0]?.[0] ?? 6
  const bottom = BODY[BODY.length - 1]?.[0] ?? 25
  for (const [y, x0, x1] of BODY) {
    const yy = y + hy
    box(x0, yy, x1, yy, fur[0])
    put(x0, yy, fur[1]); put(x1, yy, fur[2])
    if (y === top) box(x0, yy, x1, yy, fur[1])
    if (y === bottom) box(x0 + 1, yy, x1, yy, fur[2])
  }

  // coat markings and the pale chest
  if (C.chest) for (const [y, a, b] of [[12, 12, 19], [13, 11, 20], [14, 11, 20], [15, 12, 19]] as const) box(a, y + hy, b, y + hy, C.chest)
  if (C.coat === 'tabby' && C.mark) {
    for (const [x, y] of [[13, 6], [13, 7], [15, 6], [16, 6], [15, 7], [16, 7], [18, 6], [18, 7]] as const) put(x, y + hy, C.mark)
    for (const y of [9, 11, 15, 17]) { box(6, y + hy, 7, y + hy, C.mark); box(24, y + hy, 25, y + hy, C.mark) }
  }
  if (C.coat === 'calico' && C.mark && C.mark2) {
    box(8, 6 + hy, 12, 8 + hy, C.mark); box(7, 7 + hy, 7, 10 + hy, C.mark)
    box(20, 6 + hy, 23, 7 + hy, C.mark2); box(24, 7 + hy, 24, 9 + hy, C.mark2)
    box(6, 14 + hy, 8, 17 + hy, C.mark); box(23, 15 + hy, 25, 17 + hy, C.mark2)
  }
  if (C.coat === 'pointed') {
    const mask = mixHex(points[0], fur[0], 0.45)
    for (const [y, a, b] of [[11, 13, 18], [12, 12, 19], [13, 12, 19], [14, 13, 18]] as const) box(a, y + hy, b, y + hy, mask)
  }

  // the outfit over the lower body: overalls with straps, or a suit, shirt and tie
  const cut = (y: number) => BODY.find(([by0]) => by0 === y)
  if (C.outfit === 'overalls') {
    put(11, 14 + hy, cloth[2]); put(11, 15 + hy, cloth[2]); put(20, 14 + hy, cloth[2]); put(20, 15 + hy, cloth[2])
    box(11, 16 + hy, 20, 17 + hy, cloth[0]); box(11, 16 + hy, 20, 16 + hy, cloth[1])
    put(12, 17 + hy, '#F4D35E'); put(19, 17 + hy, '#F4D35E')
    for (let y = 18; y <= 25; y++) {
      const span = cut(y)
      if (!span) continue
      box(span[1], y + hy, span[2], y + hy, cloth[0])
      put(span[1], y + hy, cloth[1]); put(span[2], y + hy, cloth[2])
    }
    box(14, 19 + hy, 17, 20 + hy, cloth[2]); box(14, 19 + hy, 17, 19 + hy, cloth[1])
  } else {
    for (let y = 16; y <= 25; y++) {
      const span = cut(y)
      if (!span) continue
      box(span[1], y + hy, span[2], y + hy, cloth[0])
      put(span[1], y + hy, cloth[1]); put(span[2], y + hy, cloth[2])
    }
    box(13, 16 + hy, 18, 16 + hy, '#FFFFFF'); box(14, 17 + hy, 17, 17 + hy, '#FFFFFF'); box(15, 18 + hy, 16, 18 + hy, '#FFFFFF')
    box(15, 16 + hy, 16, 16 + hy, mixHex(RC, '#000000', 0.25))
    box(15, 17 + hy, 16, 21 + hy, RC)
    put(12, 17 + hy, cloth[1]); put(19, 17 + hy, cloth[1])
  }

  // the face: blush, eyes, nose, mouth
  put(9, 12 + hy, BLUSH); put(22, 12 + hy, BLUSH)
  const eye = (ex: number, left: boolean) => {
    const y = 10 + hy
    if (done) { put(ex - 1, y + 1, EYE); put(ex, y, EYE); put(ex + 1, y, EYE); put(ex + 2, y + 1, EYE); return }
    if (fail) {
      const a = left ? ex : ex + 1, b = left ? ex + 1 : ex
      put(a, y - 1, EYE); put(b, y, EYE); put(a, y + 1, EYE); return
    }
    if (idle || (walk && f === 6)) { box(ex - 1, y + 1, ex + 2, y + 1, EYE); return } // sleepy, or a blink
    const ey = think ? y - 1 : y
    const ex2 = think ? ex + 1 : ex
    box(ex2, ey, ex2 + 1, ey + 1, EYE)
    put(ex2, ey, '#FFFFFF')
  }
  eye(11, true)
  eye(19, false)
  put(15, 12 + hy, NOSE); put(16, 12 + hy, NOSE)
  const mouth: [number, number][] = fail ? [[14, 15], [15, 14], [16, 14], [17, 15]]
    : think ? [[15, 14], [16, 14]]
      : done ? [[14, 13], [17, 13], [14, 14], [17, 14], [15, 15], [16, 15]]
        : [[14, 13], [15, 14], [16, 14], [17, 13]]
  for (const [x, y] of mouth) put(x, y + hy, EYE)
  if (done) box(15, 13 + hy, 16, 14 + hy, NOSE)

  // paws: little nubs with their own outline, so they read against the body
  const paw = (x: number, y: number) => {
    for (const [ox, oy] of [[-1, 0], [-1, 1], [3, 0], [3, 1], [0, 2], [1, 2], [2, 2], [0, -1], [1, -1], [2, -1]] as const) put(x + ox, y + oy, OUT)
    box(x, y, x + 2, y + 1, points[0]); box(x, y, x + 2, y, points[1])
    put(x + 1, y + 1, points[2])
  }
  const sw = walk ? [0, -1, 0, 1][f % 4] ?? 0 : 0
  const held: [number, number] = fail ? [20, 21 + hy] : [20, 19 + hy - sw]

  // the kit, in the screen-right paw
  const [px, py] = held
  if (C.kit === 'marker') {
    box(px + 3, py - 6, px + 4, py + 1, '#F4F6FA')
    box(px + 4, py - 6, px + 4, py + 1, '#C9D1DA')
    box(px + 3, py - 8, px + 4, py - 7, RC)
    box(px + 3, py - 2, px + 4, py - 2, RC)
  } else if (C.kit === 'coffee') {
    box(px + 3, py - 5, px + 7, py + 1, '#FFFFFF')
    box(px + 7, py - 4, px + 7, py + 1, '#D5DAE1')
    box(px + 3, py - 5, px + 7, py - 5, '#6B3E26')
    box(px + 3, py - 2, px + 7, py - 1, RC)
    for (const [x, y] of [[px + 8, py - 4], [px + 9, py - 4], [px + 9, py - 3], [px + 9, py - 2], [px + 8, py - 2]] as const) put(x, y, '#FFFFFF')
    const s = f % 4
    for (const [x, y] of [[px + 4 + (s % 2), py - 7], [px + 5 - (s % 2), py - 8], [px + 4 + (s >> 1), py - 9]] as const) at(over, x, y, '#B4BCC8')
  } else if (C.kit === 'laptop') {
    box(px + 2, py - 4, px + 7, py + 1, '#C9D2DC'); box(px + 7, py - 4, px + 7, py + 1, '#9AA6B4')
    box(px + 3, py - 3, px + 6, py, '#2E3A4E'); put(px + 4, py - 2, '#7CE0A6'); put(px + 5, py - 1, '#7CE0A6')
    box(px + 1, py + 2, px + 7, py + 2, '#9AA6B4')
  } else if (C.kit === 'cable') {
    const CABLE = '#2F7DD1'
    box(px + 1, py - 4, px + 3, py - 2, '#DDE6EE')
    box(px + 1, py - 4, px + 3, py - 4, '#E0B84A')
    put(px + 2, py - 1, CABLE)
    const swing = [0, 0, 1, 1, 0, 0, -1, -1][f] ?? 0
    for (let k = 2; k <= 6; k++) put(px + 4 + (k >= 4 ? swing : 0), py + k, CABLE)
    put(px + 3, py + 2, CABLE)
  } else if (C.kit === 'checklist') {
    box(px + 2, py - 5, px + 7, py + 2, '#B07A45')
    box(px + 3, py - 4, px + 6, py + 1, '#FAFAFA')
    box(px + 4, py - 6, px + 5, py - 5, '#9AA3AD')
    for (const [x, y] of [[px + 3, py - 2], [px + 4, py - 1], [px + 5, py - 2], [px + 6, py - 3]] as const) put(x, y, '#3FA34D')
    box(px + 3, py + 1, px + 6, py + 1, '#B8C2CC')
  } else if (C.kit === 'magnifier') {
    box(px + 3, py - 2, px + 3, py + 1, '#5A4636')
    box(px + 1, py - 8, px + 6, py - 3, '#3B3542')
    box(px + 2, py - 7, px + 5, py - 4, '#BFE3F5'); put(px + 2, py - 7, '#FFFFFF')
    put(px + 1, py - 8, null); put(px + 6, py - 8, null); put(px + 1, py - 3, null); put(px + 6, py - 3, null)
  } else {
    box(px + 2, py - 6, px + 8, py + 1, '#2A2D33')
    box(px + 3, py - 5, px + 7, py, '#F4F6FA')
    put(px + 3, py - 5, '#F4D35E'); put(px + 7, py - 1, '#3AA37A')
    put(px + 3 + (f % 5), py - 2, '#E5508F'); put(px + 3 + ((f + 1) % 5), py - 2, '#E5508F')
  }
  paw(px, py) // the holding paw stays in front of the kit

  // the free paw: on the belly, on the chin when thinking, waving high when cheering
  if (done) {
    box(4, 10 + by, 5, 14 + by, fur[0]); put(4, 10 + by, fur[1])
    paw(3, 8 + by)
  } else if (think) paw(11, 15 + hy)
  else paw(9, fail ? 21 + hy : 19 + hy + sw)

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

  // outline every shape for the sticker look, flatten onto the backdrop, then the thin layer
  return fg.map((row, y) => row.map((c, x) => {
    if (c) return c
    const o = over[y]?.[x]
    if (o) return o
    const near = fg[y - 1]?.[x] || fg[y + 1]?.[x] || row[x - 1] || row[x + 1]
    return near ? OUT : bg[y]?.[x] ?? null
  }))
}

/** An animated SVG of one role and pose, the same layout as the robots' (see robotSvg). */
export function catSvg(role: Role, pose: Pose, backdrop = OFFICE): string {
  return spriteSvg(k => catGrid(role, pose, k), backdrop)
}
