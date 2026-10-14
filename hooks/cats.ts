// The office cats: a third skin for the same roles and poses as the robots.
// The cats are the user's own pixel_cats_100x100_true_colors.html: seven cats,
// five 100 × 100 takes each (catSprites.ts), and its drawCat ported as it was:
// which take each pose shows frame by frame, the Zzz, the blush, the "!".
// The desktop draws them whole; the terminal and every 32 × 32 path get them
// shrunk.

import { SPRITES } from './catSprites'
import type { Pose, Role } from './robots'

/** The cream paper behind the cats. */
export const OFFICE = '#F9F1E9'

/** The full drawing's size. */
export const CAT_SIZE = 100

/** What each role's cat is, for alt text: "Planner, the blue-grey cat". */
export const CATS: Record<Role, { kind: string }> = {
  lead: { kind: 'orange tabby' },
  planner: { kind: 'blue-grey cat' },
  researcher: { kind: 'cream white cat' },
  tester: { kind: 'gray cat' },
  coder: { kind: 'golden cat' },
  reviewer: { kind: 'siamese cat' },
  designer: { kind: 'pink-and-white cat' },
}

/** The file's pose for each of the stage's, plus a thinking pose of our own: walking at work, a thought bubble in thought, happy when done, surprised on failure, asleep when idle. */
const FILE_POSE: Record<Pose, string> = { walk: 'walk', think: 'think', done: 'happy', fail: 'surprise', idle: 'sleep' }

/** The file's drawCat, as the user wrote it, onto a grid instead of a canvas; `f` is 0..3. */
function drawCat(role: Role, pose: string, f: number): (string | null)[][] {
  const N = CAT_SIZE
  const g: (string | null)[][] = Array.from({ length: N }, () => new Array<string | null>(N).fill(null))
  const fillRect = (x: number, y: number, w: number, h: number, color: string) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { const row = g[yy]; if (row && xx >= 0 && xx < N) row[xx] = color }
  }
  const i = f & 3
  const poseFrame = ({ walk: [0, 1, 2, 3], blink: [0, 1, 2, 3], think: [0, 0, 0, 0], happy: [2, 0, 4, 0], surprise: [0, 2, 0, 4], sleep: [1, 3, 1, 3] } as Record<string, number[]>)[pose] ?? [0, 1, 2, 3]
  const { palette, takes } = SPRITES[role]
  const rows = takes[poseFrame[i] ?? 0] ?? []
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = palette[row[x]!]; if (c) fillRect(x, y, 1, 1, c) } })
  if (pose === 'sleep') {
    const j = [0, -2, 0, 2][i] ?? 0
    // Pixel Z marks within canvas bounds.
    fillRect(81 + j, 9, 9, 2, '#28335e'); fillRect(87 + j, 11, 3, 3, '#28335e'); fillRect(81 + j, 14, 9, 2, '#28335e')
    fillRect(75 + j, 19, 6, 2, '#28335e'); fillRect(79 + j, 21, 2, 2, '#28335e'); fillRect(75 + j, 23, 6, 2, '#28335e')
  }
  if (pose === 'think') {
    // ours, in the file's ink: two little bubbles rising to a cloud, its dots filling in one by one
    const INK = '#273158', PAPER = '#ffffff'
    const blob = (x: number, y: number, w: number, h: number) => { fillRect(x + 1, y, w - 2, h, INK); fillRect(x, y + 1, w, h - 2, INK); fillRect(x + 1, y + 1, w - 2, h - 2, PAPER) }
    blob(70, 26, 4, 4)
    blob(74, 19, 6, 6)
    blob(76, 3, 21, 13)
    for (let d = 0; d < 3; d++) fillRect(80 + d * 5, 8, 3, 3, d <= i - 1 || i === 0 && d < 0 ? INK : '#c9cfe0')
  }
  if (pose === 'happy' && (i === 1 || i === 3)) { fillRect(21, 49, 4, 3, '#e77899'); fillRect(68, 49, 4, 3, '#e77899') }
  if (pose === 'surprise' && (i === 1 || i === 3)) { fillRect(79, 8, 4, 13, '#273158'); fillRect(79, 24, 4, 4, '#273158') }
  return g
}

/** The file's frame for a stage frame: its four frames in a loop. */
const fileFrame = (frame: number) => ((frame % 4) + 4) % 4

/** One frame at full size, 100 × 100, for the desktop. */
export function catGridFull(role: Role, pose: Pose, frame: number): (string | null)[][] {
  return drawCat(role, FILE_POSE[pose], fileFrame(frame))
}

/** The part of the 100 × 100 drawing the 32 × 32 version keeps: the cat, its tail and the Zzz. */
const KEEP = { x: 4, y: 4, size: 92 }

/**
 * One frame at 32 × 32, like robotGrid, for the terminal and every 32 × 32
 * path: each cell takes the most common color of its patch of the full
 * drawing, an empty pixel losing a tie, so outlines and eyes survive.
 */
export function catGrid(role: Role, pose: Pose, frame: number): (string | null)[][] {
  const full = catGridFull(role, pose, frame)
  const s = KEEP.size / 32
  return Array.from({ length: 32 }, (_, ty) => Array.from({ length: 32 }, (_, tx) => {
    const votes = new Map<string | null, number>()
    for (let y = Math.floor(KEEP.y + ty * s); y < KEEP.y + (ty + 1) * s; y++) {
      for (let x = Math.floor(KEEP.x + tx * s); x < KEEP.x + (tx + 1) * s; x++) {
        const c = full[y]?.[x] ?? null
        votes.set(c, (votes.get(c) ?? 0) + (c ? 1 : 0.9))
      }
    }
    let best: string | null = null
    let most = -1
    for (const [c, n] of votes) if (n > most) [best, most] = [c, n]
    return best
  }))
}

/** A grid as SVG paths, one per color, each run of a row one rectangle. */
function paths(grid: (string | null)[][]): string {
  const byColor = new Map<string, string>()
  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const c = row[x]
      let end = x + 1
      while (end < row.length && row[end] === c) end++
      if (c) byColor.set(c, (byColor.get(c) ?? '') + `M${x} ${y}h${end - x}v1h${x - end}z`)
      x = end
    }
  })
  return [...byColor].map(([c, d]) => `<path fill="${c}" d="${d}"/>`).join('')
}

/** The file's speed: a frame every 210 ms. */
const FRAME_SEC = 0.21

/**
 * An animated SVG of one role and pose at full size: the file's four frames,
 * the pixels they share drawn once underneath, each frame's own on top.
 */
export function catSvg(role: Role, pose: Pose, backdrop = OFFICE): string {
  const N = CAT_SIZE
  const frames = [0, 1, 2, 3].map(f => catGridFull(role, pose, f))
  const first = frames[0] ?? []
  const still = first.map((row, y) => row.map((c, x) => (frames.every(g => g[y]?.[x] === c) ? c : null)))
  const moving = frames.map(g => g.map((row, y) => row.map((c, x) => (still[y]?.[x] === c ? null : c))))
  const groups = moving.map((g, k) => {
    const values = [0, 1, 2, 3].map(i => (i === k ? 'visible' : 'hidden')).join(';')
    return `<g visibility="${k === 0 ? 'visible' : 'hidden'}"><animate attributeName="visibility" values="${values}" dur="${4 * FRAME_SEC}s" calcMode="discrete" repeatCount="indefinite"/>${paths(g)}</g>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges">`
    + `<rect width="${N}" height="${N}" fill="${backdrop}"/>${paths(still)}${groups.join('')}</svg>`
}
