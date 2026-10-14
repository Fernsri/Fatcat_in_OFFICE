// The robots: a 32 × 32 pixel-art sprite per role and pose. Pure, no `$`.
// One grid feeds both surfaces: half-block Raster cells in the terminal (two
// pixels per cell) and an animated SVG of crisp squares on the desktop.

import type { StageAgent } from '../types'

export type Role = 'lead' | 'planner' | 'coder' | 'tester' | 'reviewer' | 'researcher' | 'designer'
export type Pose = 'walk' | 'think' | 'done' | 'fail' | 'idle'
type Gear = 'headset' | 'cap' | 'beanie' | 'goggles' | 'monocle' | 'glasses' | 'beret'
type Prop = 'tablet' | 'clipboard' | 'laptop' | 'flask' | 'stamp' | 'magnifier' | 'brush'

export const ROLES: Record<Role, { label: string; color: string; gear: Gear; prop: Prop }> = {
  lead: { label: 'Team Lead', color: '#2BA4E0', gear: 'headset', prop: 'tablet' },
  planner: { label: 'Planner', color: '#8E6BD6', gear: 'cap', prop: 'clipboard' },
  coder: { label: 'Coder', color: '#D9443A', gear: 'beanie', prop: 'laptop' },
  tester: { label: 'Tester', color: '#F28C28', gear: 'goggles', prop: 'flask' },
  reviewer: { label: 'Reviewer', color: '#14A3A3', gear: 'monocle', prop: 'stamp' },
  researcher: { label: 'Researcher', color: '#3AA37A', gear: 'glasses', prop: 'magnifier' },
  designer: { label: 'Designer', color: '#E5508F', gear: 'beret', prop: 'brush' },
}

export const SIZE = 32
export const FRAMES = 8
export const FRAME_MS = 180
export const BACKDROP = '#E6DFD6'

/** A subagent's role, read off its type first and its description second. */
export function roleOf(type: string, label = ''): Role {
  if (type === 'Explore') return 'researcher'
  if (type === 'Plan') return 'planner'
  for (const text of [type, label]) {
    if (/test|qa\b|verif/i.test(text)) return 'tester'
    if (/review|audit|critic/i.test(text)) return 'reviewer'
    if (/design|\bui\b|\bux\b|figma|style/i.test(text)) return 'designer'
    if (/plan|architect/i.test(text)) return 'planner'
    if (/research|explore|search|investigat|guide|docs?\b/i.test(text)) return 'researcher'
  }
  return 'coder'
}

/** What the robot does, read off the agent's status and current activity. */
export function poseOf(activity: string, status?: StageAgent['status']): Pose {
  if (status === 'done') return 'done'
  if (status === 'failed') return 'fail'
  if (activity === 'idle') return 'idle'
  if (activity === 'thinking' || activity === 'starting') return 'think'
  return 'walk'
}

const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as const
export function mixHex(a: string, b: string, t: number): string {
  const A = hex(a)
  const B = hex(b)
  return '#' + A.map((v, i) => Math.round(v + ((B[i] ?? v) - v) * t).toString(16).padStart(2, '0')).join('')
}

const SH = '#EEF1F5', SHL = '#FFFFFF', SHD = '#BFC8D4'
const J = '#8A939C', JD = '#67707A', SC = '#151A22', OUT = '#2B303B'

/**
 * One frame as rows of colors: `null` is backdrop (left to the surface), every
 * other cell a `#rrggbb`. Frames loop every FRAMES; poses are drawn at frame % 8.
 */
export function robotGrid(role: Role, pose: Pose, frame: number): (string | null)[][] {
  const R = ROLES[role]
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
  // a rounded part, lit from the top left
  const part = (x0: number, y0: number, x1: number, y1: number, base: string, light: string, dark: string, r = 1) => {
    box(x0, y0, x1, y1, base)
    box(x0 + 1, y0, x1 - 1, y0, light)
    box(x0, y0 + 1, x0, y1 - 1, light)
    box(x1, y0 + 1, x1, y1 - 1, dark)
    box(x0 + 1, y1, x1 - 1, y1, dark)
    if (r === 0) return
    put(x0, y0, null); put(x1, y0, null); put(x0, y1, null); put(x1, y1, null)
    if (r === 2) {
      put(x0 + 1, y0, null); put(x0, y0 + 1, null); put(x1 - 1, y0, null); put(x1, y0 + 1, null)
      put(x0 + 1, y1, null); put(x0, y1 - 1, null); put(x1 - 1, y1, null); put(x1, y1 - 1, null)
      put(x0 + 1, y0 + 1, light); put(x1 - 1, y0 + 1, light); put(x1 - 1, y1 - 1, dark)
    }
  }

  const RC = R.color, RL = mixHex(RC, '#FFFFFF', 0.45), RD = mixHex(RC, '#000000', 0.3)
  const walk = pose === 'walk', think = pose === 'think', done = pose === 'done', fail = pose === 'fail', idle = pose === 'idle'
  let by = 0
  if (walk) by = f % 2
  if (done) by = [0, -1, -2, -2, -2, -1, 0, 0][f] ?? 0
  const hy = by + (fail ? 1 : 0)
  const lift = done ? by : 0
  const legL = walk && f % 4 === 1 ? -1 : 0
  const legR = walk && f % 4 === 3 ? -1 : 0
  const hasHat = R.gear === 'cap' || R.gear === 'beanie' || R.gear === 'beret'

  // ground shadow and grass
  const sh = done ? -by : 0
  for (let x = 9 + sh; x <= 22 - sh; x++) putBg(x, 29, '#D2C8BB')
  for (let x = 11 + sh; x <= 20 - sh; x++) putBg(x, 28, '#D9D0C4')
  for (const [x, y, c] of [[6, 28, '#5E9A40'], [6, 27, '#7DB85A'], [7, 28, '#7DB85A'], [5, 28, '#7DB85A'],
    [25, 28, '#5E9A40'], [25, 27, '#7DB85A'], [26, 28, '#7DB85A'], [24, 28, '#7DB85A']] as const) putBg(x, y, c)

  // legs and feet
  for (const [lx, up] of [[12, legL], [18, legR]] as const) {
    box(lx, 24 + by, lx + 1, 26 + lift + up, J)
    box(lx + 1, 24 + by, lx + 1, 26 + lift + up, JD)
    part(lx - 1, 27 + lift + up, lx + 2, 28 + lift + up, RC, RL, RD)
  }

  // torso, chest panel and its light
  part(11, 17 + by, 20, 24 + by, SH, SHL, SHD)
  part(13, 19 + by, 18, 22 + by, RC, RL, RD)
  put(14, 20 + by, (walk && f % 4 < 2) || done ? '#FFFFFF' : RL)
  box(15, 16 + hy, 16, 16 + hy, J)

  // arms: the screen-left one is free, the screen-right one holds the prop
  const hand = (x: number, y: number) => { box(x, y, x + 1, y + 1, SH); put(x, y, SHL); put(x + 1, y + 1, SHD) }
  const arm = (left: boolean, hx: number, hyy: number, up: boolean) => {
    const sx = left ? 9 : 21
    part(sx, 17 + by, sx + 1, 18 + by, RC, RL, RD, 0)
    if (up) {
      box(left ? sx - 1 : sx + 1, 13 + by, left ? sx : sx + 2, 16 + by, J)
      box(left ? sx : sx + 2, 13 + by, left ? sx : sx + 2, 16 + by, JD)
    } else {
      box(sx, 19 + by, sx + 1, hyy - 1, J)
      box(sx + 1, 19 + by, sx + 1, hyy - 1, JD)
    }
    hand(hx, hyy)
  }
  const sw = walk ? [0, -1, 0, 1][f % 4] ?? 0 : 0
  let free: [number, number] = [9, 22 + by + sw]
  let held: [number, number] = [21, 22 + by - sw]
  if (think) free = [11, 15 + hy]
  if (done) { free = [6, 11 + by]; held = [24, 11 + by] }
  if (fail) { free = [9, 23 + by]; held = [21, 23 + by] }
  if (think) {
    part(9, 17 + by, 10, 18 + by, RC, RL, RD, 0)
    box(10, 16 + hy, 11, 17 + by, J)
    hand(free[0], free[1])
  } else arm(true, free[0], free[1], done)
  arm(false, held[0], held[1], done)

  // head, ears and the screen
  part(8, 5 + hy, 23, 15 + hy, SH, SHL, SHD, 2)
  part(6, 9 + hy, 7, 11 + hy, RC, RL, RD, 0)
  part(24, 9 + hy, 25, 11 + hy, RC, RL, RD, 0)
  box(10, 7 + hy, 21, 13 + hy, SC)
  box(11, 7 + hy, 20, 7 + hy, '#222A36')
  put(10, 7 + hy, SH); put(21, 7 + hy, SH); put(10, 13 + hy, SH); put(21, 13 + hy, SH)

  // the face: glowing eyes and mouth in the role color
  const EYE = fail ? '#FF6B5E' : RC
  const EYEL = fail ? '#FFB3AC' : RL
  const glow = mixHex(SC, EYE, 0.16)
  const eyes: [number, number, string][] = []
  const eye = (ex: number) => {
    if (fail) { for (const [dx, dy] of [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]] as const) eyes.push([ex - 1 + dx, 9 + hy + dy, EYE]); return }
    if (done) { for (const [dx, dy] of [[-1, 1], [0, 0], [1, 0], [2, 1]] as const) eyes.push([ex + dx, 9 + hy + dy, EYE]); return }
    if ((walk || idle) && f === 6) { eyes.push([ex, 11 + hy, EYE], [ex + 1, 11 + hy, EYE]); return }
    const top = think ? 8 : 9
    for (let k = 0; k < (think ? 2 : 3); k++) eyes.push([ex, top + hy + k, EYE], [ex + 1, top + hy + k, EYE])
    eyes.push([ex, top + hy, EYEL])
  }
  eye(12)
  eye(18)
  for (const [x, y] of eyes) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const gx = x + dx, gy = y + dy
      if (gx >= 11 && gx <= 20 && gy >= 8 + hy && gy <= 13 + hy && fg[gy]?.[gx] === SC) put(gx, gy, glow)
    }
  }
  for (const [x, y, c] of eyes) put(x, y, c)
  const mouth = fail ? [[14, 13], [15, 12], [16, 12], [17, 13]]
    : done ? [[13, 12], [14, 13], [15, 13], [16, 13], [17, 13], [18, 12]]
    : think ? [[15, 12], [16, 12]]
    : [[14, 12], [15, 13], [16, 13], [17, 12]]
  for (const [x, y] of mouth) put(x ?? 0, (y ?? 0) + hy, EYE)

  // antenna (hats replace it), then the role's gear
  if (!hasHat) {
    put(16, 3 + hy, J); put(16, 4 + hy, JD)
    box(15, 1 + hy, 17, 2 + hy, walk && f % 4 >= 2 ? RL : RC)
    put(15, 1 + hy, '#FFFFFF')
  }
  if (R.gear === 'headset') {
    const D = '#2B2B2B'
    box(10, 3 + hy, 21, 3 + hy, D); put(9, 4 + hy, D); put(22, 4 + hy, D)
    box(5, 8 + hy, 7, 12 + hy, D); box(24, 8 + hy, 26, 12 + hy, D)
    put(6, 9 + hy, RC); put(25, 9 + hy, RC)
    put(8, 13 + hy, D); put(9, 14 + hy, D); put(10, 14 + hy, RC)
  }
  if (R.gear === 'cap') {
    const P = RD, PL = RC, PD = mixHex(RC, '#000000', 0.5)
    box(11, 3 + hy, 20, 3 + hy, P); box(9, 4 + hy, 22, 6 + hy, P)
    box(11, 3 + hy, 13, 3 + hy, PL); box(9, 4 + hy, 11, 5 + hy, PL); box(22, 4 + hy, 22, 6 + hy, PD)
    box(5, 7 + hy, 22, 7 + hy, PD)
    box(15, 2 + hy, 16, 2 + hy, PL)
  }
  if (R.gear === 'beanie') {
    box(12, 2 + hy, 19, 2 + hy, RC); box(10, 3 + hy, 21, 3 + hy, RC); box(9, 4 + hy, 22, 5 + hy, RC)
    for (let kx = 10; kx <= 21; kx += 2) box(kx, 3 + hy, kx, 5 + hy, RD)
    box(8, 6 + hy, 23, 7 + hy, RD); box(9, 6 + hy, 22, 6 + hy, RC)
    box(15, 0 + hy, 16, 1 + hy, RL); put(15, 0 + hy, '#FFFFFF')
  }
  if (R.gear === 'beret') {
    box(13, 3 + hy, 21, 3 + hy, RC); box(9, 4 + hy, 23, 4 + hy, RC); box(9, 5 + hy, 22, 5 + hy, RD)
    box(13, 3 + hy, 16, 3 + hy, RL); box(9, 4 + hy, 12, 4 + hy, RL)
    put(17, 2 + hy, RD)
  }
  if (R.gear === 'goggles') {
    box(8, 5 + hy, 23, 5 + hy, RD)
    for (const gx of [11, 18]) {
      box(gx - 1, 4 + hy, gx + 3, 6 + hy, RC)
      box(gx, 5 + hy, gx + 2, 5 + hy, '#BFE3F5'); put(gx, 5 + hy, '#FFFFFF')
    }
  }
  if (R.gear === 'glasses') {
    const G = '#B8C2CC'
    for (const [a, b] of [[11, 14], [17, 20]] as const) {
      box(a, 8 + hy, b, 8 + hy, G); box(a, 12 + hy, b, 12 + hy, G)
      box(a, 8 + hy, a, 12 + hy, G); box(b, 8 + hy, b, 12 + hy, G)
    }
    box(15, 9 + hy, 16, 9 + hy, G)
  }
  if (R.gear === 'monocle') {
    const G = '#E0B84A'
    box(17, 8 + hy, 20, 8 + hy, G); box(17, 12 + hy, 20, 12 + hy, G)
    box(17, 8 + hy, 17, 12 + hy, G); box(20, 8 + hy, 20, 12 + hy, G)
    put(20, 13 + hy, G); put(21, 14 + hy, G); put(22, 15 + hy, G)
  }

  // the prop, in the screen-right hand
  const [px, py] = held
  if (R.prop === 'tablet') {
    box(px + 2, py - 3, px + 5, py + 2, '#222222')
    box(px + 3, py - 2, px + 4, py + 1, RC); put(px + 3, py - 2, RL)
  } else if (R.prop === 'laptop') {
    box(px + 2, py - 3, px + 4, py + 3, '#C9D2DC'); box(px + 4, py - 3, px + 4, py + 3, '#9AA6B4')
    box(px + 2, py - 3, px + 3, py - 3, '#E6ECF2'); put(px + 3, py, RC)
  } else if (R.prop === 'clipboard') {
    box(px + 2, py - 4, px + 6, py + 3, '#9A6A3E')
    box(px + 3, py - 3, px + 5, py + 2, '#FAFAFA')
    for (const ly of [py - 2, py, py + 2]) box(px + 3, ly, px + 5, ly, '#B8C2CC')
    box(px + 3, py - 5, px + 5, py - 4, '#9AA3AD')
  } else if (R.prop === 'magnifier') {
    box(px + 2, py - 2, px + 2, py + 1, '#2B2B2B')
    box(px + 1, py - 8, px + 5, py - 4, '#2B2B2B')
    box(px + 2, py - 7, px + 4, py - 5, '#BFE3F5'); put(px + 2, py - 7, '#FFFFFF')
    put(px + 1, py - 8, null); put(px + 5, py - 8, null); put(px + 1, py - 4, null); put(px + 5, py - 4, null)
  } else if (R.prop === 'flask') {
    const L = '#7DD35A'
    box(px + 3, py - 6, px + 4, py - 3, '#DDEBF2'); box(px + 2, py - 7, px + 5, py - 7, '#9AA6B4')
    box(px + 2, py - 2, px + 5, py + 2, '#DDEBF2'); box(px + 1, py, px + 6, py + 2, '#DDEBF2')
    box(px + 2, py, px + 5, py + 2, L); box(px + 2, py, px + 3, py, mixHex(L, '#FFFFFF', 0.5))
    put(px + 3 + (f % 2), py - 1 - (f % 3), mixHex(L, '#FFFFFF', 0.3))
  } else if (R.prop === 'stamp') {
    box(px + 2, py - 6, px + 4, py - 5, '#7A4A2C'); put(px + 3, py - 4, '#7A4A2C')
    box(px + 1, py - 3, px + 5, py - 2, RC); box(px + 1, py - 3, px + 5, py - 3, RL)
    box(px + 1, py - 1, px + 5, py - 1, '#E5534B')
  } else {
    box(px + 1, py - 4, px + 1, py + 3, '#F4D35E'); put(px + 1, py + 3, '#C9A63A')
    box(px + 1, py - 6, px + 1, py - 5, '#9AA3AD')
    box(px, py - 8, px + 2, py - 7, RC); put(px + 1, py - 9, RD); put(px, py - 8, RL)
  }
  hand(px, py) // the holding hand stays in front of the prop

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

  // outline every shape for the sticker look, then flatten onto the backdrop
  return fg.map((row, y) => row.map((c, x) => {
    if (c) return c
    const near = fg[y - 1]?.[x] || fg[y + 1]?.[x] || row[x - 1] || row[x + 1]
    return near ? OUT : bg[y]?.[x] ?? null
  }))
}

/**
 * The part of a sprite drawn, in sprite pixels: the whole figure, head and
 * bubble only, and so on. `half` draws it at half size, each 2 x 2 pixels one.
 */
export type Crop = { x: number; y: number; w: number; h: number; half?: boolean }
export const FULL: Crop = { x: 0, y: 0, w: 32, h: 32 }
export const BUST: Crop = { x: 4, y: 0, w: 28, h: 18 }
/** For a short terminal: the head alone, then head and shoulders at half size. */
export const HEAD: Crop = { x: 4, y: 0, w: 28, h: 16 }
export const MINI: Crop = { x: 4, y: 0, w: 28, h: 20, half: true }

/** The terminal cells a crop takes, two pixel rows per cell. */
export const cropCells = (c: Crop) => ({ columns: c.half ? c.w >> 1 : c.w, rows: (c.half ? c.h >> 1 : c.h) >> 1 })

/**
 * A sprite at half size: each 2 x 2 block becomes its most common colour, an
 * empty pixel losing a tie, so thin outlines and eyes survive the shrink.
 */
export function halfGrid(grid: (string | null)[][]): (string | null)[][] {
  const out: (string | null)[][] = []
  for (let y = 0; y < grid.length; y += 2) {
    const row: (string | null)[] = []
    for (let x = 0; x < (grid[y]?.length ?? 0); x += 2) {
      const votes = new Map<string | null, number>()
      for (const c of [grid[y]?.[x], grid[y]?.[x + 1], grid[y + 1]?.[x], grid[y + 1]?.[x + 1]]) {
        const k = c ?? null
        votes.set(k, (votes.get(k) ?? 0) + (k ? 1 : 0.9))
      }
      let best: string | null = null
      let most = -1
      for (const [k, n] of votes) if (n > most) [best, most] = [k, n]
      row.push(best)
    }
    out.push(row)
  }
  return out
}

/**
 * An animated SVG of one role and pose: a static backdrop plus FRAMES groups,
 * each shown in turn by SMIL, so the surface plays the loop without redraws.
 * Squares are merged into one path per color per frame to stay small.
 */
export function robotSvg(role: Role, pose: Pose, backdrop = BACKDROP): string {
  return spriteSvg(k => robotGrid(role, pose, k), backdrop)
}

/** The animated SVG of any skin's sprite, given its frame at each step of the loop. */
export function spriteSvg(gridAt: (frame: number) => (string | null)[][], backdrop: string): string {
  const frames = Array.from({ length: FRAMES }, (_, k) => gridAt(k))
  const paths = (grid: (string | null)[][], keep: (c: string) => boolean) => {
    const byColor = new Map<string, string>()
    grid.forEach((row, y) => {
      let x = 0
      while (x < SIZE) {
        const c = row[x]
        let end = x + 1
        while (end < SIZE && row[end] === c) end++
        if (c && keep(c)) byColor.set(c, (byColor.get(c) ?? '') + `M${x} ${y}h${end - x}v1h${x - end}z`)
        x = end
      }
    })
    return [...byColor].map(([c, d]) => `<path fill="${c}" d="${d}"/>`).join('')
  }
  // pixels identical in every frame are drawn once, under the frames
  const first = frames[0] ?? []
  const still = first.map((row, y) => row.map((c, x) => (frames.every(g => g[y]?.[x] === c) ? c : null)))
  const moving = frames.map(g => g.map((row, y) => row.map((c, x) => (still[y]?.[x] === c ? null : c))))
  const dur = (FRAMES * FRAME_MS) / 1000
  const groups = moving.map((g, k) => {
    const values = Array.from({ length: FRAMES }, (_, i) => (i === k ? 'visible' : 'hidden')).join(';')
    return `<g visibility="${k === 0 ? 'visible' : 'hidden'}"><animate attributeName="visibility" values="${values}" dur="${dur}s" calcMode="discrete" repeatCount="indefinite"/>${paths(g, () => true)}</g>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="crispEdges">`
    + `<rect width="${SIZE}" height="${SIZE}" fill="${backdrop}"/>${paths(still, () => true)}${groups.join('')}</svg>`
}
