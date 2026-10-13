// The pure drawing half of agent-stage: no `$`, no state. These functions turn
// a robot frame or a progress value into Raster cells, so the hooks module
// only decides *when* to paint and the tests can call them directly.

import type { StageAgent, StageRun } from '../types'
import { astroGrid, astroSvg, LOOKS, SPACE } from './astronauts'
import { BACKDROP, cropCells, halfGrid, ROLES, robotGrid, robotSvg } from './robots'
import type { Crop, Pose, Role } from './robots'

/** The two looks a figure can have: the pixel robots or the space crew. */
export type Skin = 'robots' | 'space-crew'

/** The skin a config value names; the space crew unless it names the robots. */
export function skinNamed(name: string): Skin {
  return name === 'robots' ? 'robots' : 'space-crew'
}

/** What a role's figure is called in a skin, for alt text: "Coder robot", "Engineer". */
export function figureName(skin: Skin, role: Role): string {
  return skin === 'space-crew' ? `${ROLES[role].label}, the ${LOOKS[role].kind.toLowerCase()}` : `${ROLES[role].label} robot`
}

/** One role and pose as a self-animating SVG, for the desktop and other remote surfaces. */
export function figureSvg(skin: Skin, role: Role, pose: Pose): string {
  return skin === 'space-crew' ? astroSvg(role, pose) : robotSvg(role, pose)
}

/**
 * One role and pose as a still picture: a single frame, no animation. Drawn as
 * a plain image, it stays put when the pane redraws, where an animated drawing
 * restarts; used for figures that are done, failed or idle.
 */
export function figureStillSvg(skin: Skin, role: Role, pose: Pose): string {
  const grid = skin === 'space-crew' ? astroGrid(role, pose, 0) : robotGrid(role, pose, 0)
  const backdrop = skin === 'space-crew' ? SPACE : BACKDROP
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
  const paths = [...byColor].map(([c, d]) => `<path fill="${c}" d="${d}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges"><rect width="32" height="32" fill="${backdrop}"/>${paths}</svg>`
}

export type Theme = {
  /** The header and the lead's accents. */
  main: number
  done: number
  failed: number
  barFrom: number
  barTo: number
  barEmpty: number
}

export const THEMES = {
  neon: { main: 0x8b5cf6, done: 0x5ba53c, failed: 0xe5534b, barFrom: 0x8b5cf6, barTo: 0x22d3ee, barEmpty: 0x3f3f46 },
  ocean: { main: 0x0ea5e9, done: 0x5ba53c, failed: 0xe5534b, barFrom: 0x0369a1, barTo: 0x2dd4bf, barEmpty: 0x334155 },
  sunset: { main: 0xdc2626, done: 0x5ba53c, failed: 0xe5534b, barFrom: 0xf43f5e, barTo: 0xfacc15, barEmpty: 0x44403c },
  mono: { main: 0x9ca3af, done: 0xa3a3a3, failed: 0xd4d4d4, barFrom: 0x737373, barTo: 0xfafafa, barEmpty: 0x2e2e2e },
} satisfies Record<string, Theme>

/** The theme a config value names, neon when it names none. */
export function themeNamed(name: string): Theme {
  return (THEMES as Record<string, Theme>)[name] ?? THEMES.neon
}

/** Which agents get a card: running ones first, then the most recent, at most 6. */
export function stageAgents(run: StageRun): StageAgent[] {
  const running = run.agents.filter(a => a.status === 'running')
  const rest = run.agents.filter(a => a.status !== 'running').slice(-Math.max(0, 6 - running.length))
  return [...running, ...rest].slice(0, 6)
}

/** The terminal's own color: an empty pixel. */
const NONE = 0x01000000

const clamp8 = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

export function mix(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t))
  const ch = (s: number) => clamp8(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k)
  return (ch(16) << 16) | (ch(8) << 8) | ch(0)
}

const frac = (n: number) => n - Math.floor(n)

// ── cells → base64 (no reliance on Uint8Array.prototype.toBase64) ──────────────

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function toBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out += B64.charAt((n >> 18) & 63) + B64.charAt((n >> 12) & 63)
    out += i + 1 < bytes.length ? B64.charAt((n >> 6) & 63) : '='
    out += i + 2 < bytes.length ? B64.charAt(n & 63) : '='
  }
  return out
}

/** Packs `[glyph, fg, bg]` triplets as RasterProps.cells wants them. */
function pack(words: Uint32Array): string {
  const bytes = new Uint8Array(words.length * 4)
  for (let i = 0; i < words.length; i++) {
    const w = words[i] ?? 0
    bytes[i * 4] = w & 255
    bytes[i * 4 + 1] = (w >>> 8) & 255
    bytes[i * 4 + 2] = (w >>> 16) & 255
    bytes[i * 4 + 3] = (w >>> 24) & 255
  }
  return toBase64(bytes)
}

// ── robots in the terminal: two pixel rows per cell, ▀ top in fg, bottom in bg ──

const toNum = (c: string | null, backdrop: number) => (c ? parseInt(c.slice(1), 16) : backdrop)

/**
 * One figure frame as Raster cells over `crop` (its height must be even).
 * `transparent` leaves the backdrop to the terminal instead of the skin's own
 * (beige for the robots, deep space for the crew).
 */
export function robotCells(role: Role, pose: Pose, frame: number, crop: Crop, transparent = false, skin: Skin = 'robots'): string {
  const full = skin === 'space-crew' ? astroGrid(role, pose, frame) : robotGrid(role, pose, frame)
  const grid = crop.half ? halfGrid(full) : full
  const s = crop.half ? 2 : 1
  const back = transparent ? NONE : parseInt((skin === 'space-crew' ? SPACE : BACKDROP).slice(1), 16)
  const { columns, rows } = cropCells(crop)
  const x0 = crop.x / s
  const y0 = crop.y / s
  const words = new Uint32Array(columns * rows * 3)
  for (let r = 0; r < rows; r++) {
    for (let x = 0; x < columns; x++) {
      const top = toNum(grid[y0 + r * 2]?.[x0 + x] ?? null, back)
      const bot = toNum(grid[y0 + r * 2 + 1]?.[x0 + x] ?? null, back)
      const i = (r * columns + x) * 3
      if (top === NONE && bot === NONE) words.set([0x20, NONE, NONE], i)
      else if (bot === NONE) words.set([0x2580, top, NONE], i)
      else if (top === NONE) words.set([0x2584, bot, NONE], i)
      else words.set([0x2580, top, bot], i)
    }
  }
  return pack(words)
}

// ── the progress bar ───────────────────────────────────────────────────────────

const FILL = 0x2501 // ━
const HALF = 0x2578 // ╸, the left half of a ━
const EMPTY = 0x2500 // ─

/**
 * One row of `columns` cells, the slim bar the usage meter draws: `p` in 0..1
 * fills a ━ line in the theme's gradient with a half-cell edge and a shimmer
 * sweeping across it; `p === null` is the indeterminate form, a glowing
 * segment bouncing end to end.
 */
export function barFrame(p: number | null, t: number, columns: number, theme: Theme): string {
  const W = Math.max(1, columns)
  const words = new Uint32Array(W * 3)
  const sweep = frac(t * 0.5) * (W + 12) - 6
  const glowAt = (x: number) => Math.exp(-((x - sweep) ** 2) / 6) * 0.55

  if (p === null) {
    const seg = Math.max(3, Math.round(W / 5))
    const start = (Math.sin(t * 2.2) * 0.5 + 0.5) * (W - seg)
    for (let x = 0; x < W; x++) {
      const inSeg = x >= start && x < start + seg
      const k = inSeg ? 1 - Math.abs((x - start) / seg - 0.5) * 1.2 : 0
      const fg = inSeg ? mix(mix(theme.barFrom, theme.barTo, (x - start) / seg), 0xffffff, k * 0.3) : theme.barEmpty
      words.set([inSeg ? FILL : EMPTY, fg, NONE], x * 3)
    }
    return pack(words)
  }

  const filled = Math.max(0, Math.min(1, p)) * W
  const full = Math.floor(filled)
  const rem = filled - full
  for (let x = 0; x < W; x++) {
    const grad = mix(theme.barFrom, theme.barTo, W > 1 ? x / (W - 1) : 1)
    const lit = mix(grad, 0xffffff, glowAt(x))
    if (x < full) words.set([FILL, lit, NONE], x * 3)
    else if (x === full && rem >= 0.5) words.set([HALF, lit, NONE], x * 3)
    else words.set([EMPTY, theme.barEmpty, NONE], x * 3)
  }
  return pack(words)
}

/**
 * A desktop progress bar, the usage meter's: a rounded track, the theme's
 * gradient with a glossy sheen, and a shimmer sweeping across the fill. Drawn
 * in an interactive frame so the shimmer runs.
 *
 * The source depends only on the whole percent, the width and the theme, so a
 * redraw at the same percent hands the surface the same SVG and the shimmer
 * runs on undisturbed; it restarts only when the bar grows.
 */
export function barSvg(p: number, width: number, theme: Theme): string {
  const c = (n: number) => '#' + n.toString(16).padStart(6, '0')
  const H = 6
  const percent = Math.round(Math.max(0, Math.min(1, p)) * 100)
  const filled = Math.round((width * percent) / 100)
  // Ids unique to the drawing, so two bars on one page never share a clip.
  const u = `as${percent}w${width}${c(theme.barFrom).slice(1)}${c(theme.barTo).slice(1)}`

  const fill =
    filled > 0
      ? `<clipPath id="${u}-clip"><rect width="${filled}" height="${H}" rx="${H / 2}"/></clipPath>` +
        `<g clip-path="url(#${u}-clip)">` +
        `<rect width="${width}" height="${H}" fill="url(#${u}-fill)"/>` +
        `<rect width="${width}" height="${H / 2}" fill="#ffffff" opacity="0.18"/>` +
        `<rect x="-36" width="36" height="${H}" fill="url(#${u}-shimmer)">` +
        `<animate attributeName="x" from="-36" to="${filled}" dur="2.4s" repeatCount="indefinite"/></rect>` +
        '</g>'
      : ''

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}">` +
    '<defs>' +
    `<linearGradient id="${u}-fill" x1="0" x2="1"><stop offset="0" stop-color="${c(theme.barFrom)}"/><stop offset="1" stop-color="${c(theme.barTo)}"/></linearGradient>` +
    `<linearGradient id="${u}-shimmer" x1="0" x2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>` +
    '</defs>' +
    `<rect width="${width}" height="${H}" rx="${H / 2}" fill="${c(theme.barEmpty)}" fill-opacity="0.35"/>` +
    fill +
    '</svg>'
  )
}
