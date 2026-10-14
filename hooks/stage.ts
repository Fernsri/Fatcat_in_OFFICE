// The pure drawing half of agent-stage: no `$`, no state. These functions turn
// a robot frame or a progress value into Raster cells, so the hooks module
// only decides *when* to paint and the tests can call them directly.

import type { StageAgent, StageRun } from '../types'
import { astroGrid, astroSvg, LOOKS, SPACE } from './astronauts'
import { catGrid, catSvg, CATS, OFFICE } from './cats'
import { BACKDROP, cropCells, FRAME_MS, FRAMES, halfGrid, ROLES, robotGrid, robotSvg } from './robots'
import type { Crop, Pose, Role } from './robots'

/** The looks a figure can have: the office cats, the pixel robots or the space crew. */
export type Skin = 'office-cats' | 'robots' | 'space-crew'

type Grid = (string | null)[][]

/** Everything a skin draws with: its frames, its animated SVG, its backdrop and its figures' names. */
const SKINS: Record<Skin, { grid: (role: Role, pose: Pose, frame: number) => Grid; svg: (role: Role, pose: Pose, backdrop?: string) => string; backdrop: string; name: (role: Role) => string }> = {
  'office-cats': { grid: catGrid, svg: catSvg, backdrop: OFFICE, name: role => `${ROLES[role].label}, the ${CATS[role].kind}` },
  robots: { grid: robotGrid, svg: robotSvg, backdrop: BACKDROP, name: role => `${ROLES[role].label} robot` },
  'space-crew': { grid: astroGrid, svg: astroSvg, backdrop: SPACE, name: role => `${ROLES[role].label}, the ${LOOKS[role].kind.toLowerCase()}` },
}

/** The skin a config value names; the office cats unless it names another. */
export function skinNamed(name: string): Skin {
  return name === 'robots' || name === 'space-crew' ? name : 'office-cats'
}

/** What a role's figure is called in a skin, for alt text: "Coder robot", "Engineer". */
export function figureName(skin: Skin, role: Role): string {
  return SKINS[skin].name(role)
}

/**
 * One role and pose as a self-animating SVG, for the desktop and other remote
 * surfaces; `backdrop` replaces the skin's own, and `paperLines`, a color,
 * rules it like graph paper.
 */
export function figureSvg(skin: Skin, role: Role, pose: Pose, backdrop?: string, paperLines?: string): string {
  return ruled(SKINS[skin].svg(role, pose, backdrop), paperLines)
}

/** A 32 × 32 figure SVG with graph-paper lines over its backdrop, under the figure; as it was without a color. */
function ruled(svg: string, lines?: string): string {
  if (!lines) return svg
  let d = ''
  for (let k = 4; k < 32; k += 4) d += `M${k} 0V32M0 ${k}H32`
  const at = svg.indexOf('/>', svg.indexOf('<rect')) + 2
  return svg.slice(0, at) + `<path d="${d}" stroke="${lines}" stroke-width="0.6" fill="none"/>` + svg.slice(at)
}

/**
 * One role and pose as a still picture: a single frame, no animation. Drawn as
 * a plain image, it stays put when the pane redraws, where an animated drawing
 * restarts; used for figures that are done, failed or idle.
 */
export function figureStillSvg(skin: Skin, role: Role, pose: Pose, backdrop = SKINS[skin].backdrop, paperLines?: string): string {
  return ruled(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges"><rect width="32" height="32" fill="${backdrop}"/>${gridPaths(SKINS[skin].grid(role, pose, 0))}</svg>`, paperLines)
}

/** A sprite grid as SVG paths, one per color, each run of a row one rectangle; empty cells left out. */
function gridPaths(grid: Grid): string {
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

export type Theme = {
  /** The header and the lead's accents. */
  main: number
  done: number
  failed: number
  barFrom: number
  barTo: number
  barEmpty: number
  /** The light surface: the pane header's wall, the cats' backdrop, the row bars' track. */
  paper: number
  /** Lines and words drawn on the paper. */
  ink: number
}

export const THEMES = {
  neon: { main: 0x8b5cf6, done: 0x5ba53c, failed: 0xe5534b, barFrom: 0x8b5cf6, barTo: 0x22d3ee, barEmpty: 0x3f3f46, paper: 0xfbf3ee, ink: 0x2a2238 },
  ocean: { main: 0x0ea5e9, done: 0x5ba53c, failed: 0xe5534b, barFrom: 0x0369a1, barTo: 0x2dd4bf, barEmpty: 0x334155, paper: 0xfbf3ee, ink: 0x2a2238 },
  sunset: { main: 0xdc2626, done: 0x5ba53c, failed: 0xe5534b, barFrom: 0xf43f5e, barTo: 0xfacc15, barEmpty: 0x44403c, paper: 0xfbf3ee, ink: 0x2a2238 },
  matcha: { main: 0x8daa62, done: 0x8daa62, failed: 0xe0705a, barFrom: 0xc9d9a6, barTo: 0x8daa62, barEmpty: 0x5f7a3d, paper: 0xf7f4e3, ink: 0x5b3a24 },
  mono: { main: 0x9ca3af, done: 0xa3a3a3, failed: 0xd4d4d4, barFrom: 0x737373, barTo: 0xfafafa, barEmpty: 0x2e2e2e, paper: 0xf2f2f2, ink: 0x2e2e2e },
} satisfies Record<string, Theme>

/** The theme a config value names, matcha when it names none. */
export function themeNamed(name: string): Theme {
  return (THEMES as Record<string, Theme>)[name] ?? THEMES.matcha
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
 * (an office wall for the cats, beige for the robots, deep space for the crew).
 */
export function robotCells(role: Role, pose: Pose, frame: number, crop: Crop, transparent = false, skin: Skin = 'robots', backdrop = SKINS[skin].backdrop): string {
  const full = SKINS[skin].grid(role, pose, frame)
  const grid = crop.half ? halfGrid(full) : full
  const s = crop.half ? 2 : 1
  const back = transparent ? NONE : parseInt(backdrop.slice(1), 16)
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

/** A theme whose bar is one color: a row's bar in the terminal, in its role's color. */
export function barTheme(theme: Theme, color: string): Theme {
  const c = parseInt(color.slice(1), 16)
  return { ...theme, barFrom: c, barTo: mix(c, 0xffffff, 0.35) }
}

/**
 * A row's own little bar on the desktop: a rounded track, filled to `p` in the
 * row's color, or, for `p === null` (a helper at work, nobody knows how far
 * along), a short segment sliding back and forth.
 */
export function rowBarSvg(p: number | null, width: number, color: string, track = '#ECE6E0'): string {
  const H = 8
  const groove = `<rect width="${width}" height="${H}" rx="${H / 2}" fill="${track}"/>`
  const body = p === null
    ? `<rect width="${Math.round(width / 3)}" height="${H}" rx="${H / 2}" fill="${color}">`
      + `<animate attributeName="x" values="0;${width - Math.round(width / 3)};0" dur="1.6s" repeatCount="indefinite"/></rect>`
    : `<rect width="${Math.round(Math.max(0, Math.min(1, p)) * width)}" height="${H}" rx="${H / 2}" fill="${color}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}">${groove}${body}</svg>`
}

/** A chunky 5 × 7 pixel face for the header's title, the letters it needs. */
const PIXEL_FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
}

/** `text` in the pixel face as SVG rects, each pixel `scale` px, with a soft shadow down and right. */
function pixelText(text: string, x: number, y: number, scale: number, color: string, shadow: string): string {
  let pen = x
  let face = ''
  let under = ''
  for (const ch of text) {
    const glyph = PIXEL_FONT[ch] ?? PIXEL_FONT[' '] ?? []
    glyph.forEach((row, gy) => [...row].forEach((on, gx) => {
      if (on !== '#') return
      const px = pen + gx * scale, py = y + gy * scale
      face += `<rect x="${px}" y="${py}" width="${scale}" height="${scale}"/>`
      under += `<rect x="${px + scale / 2}" y="${py + scale / 2}" width="${scale}" height="${scale}"/>`
    }))
    pen += ((glyph[0]?.length ?? 3) + 1) * scale
  }
  return `<g fill="${shadow}">${under}</g><g fill="${color}">${face}</g>`
}

/** Columns of the pixel face `text` takes, at scale 1. */
const pixelWidth = (text: string) => [...text].reduce((w, ch) => w + (PIXEL_FONT[ch]?.[0]?.length ?? 3) + 1, 0)

/** A cup of matcha latte, a heart in its foam. */
const CUP = [
  'GGGGGGGG..',
  'GGGHGHGG..',
  'WGGGHGGGHH',
  'WWWWWWWW.H',
  'WWWWWWWWHH',
  '.WWWWWW...',
  '..WWWW....',
]

/**
 * The pane's header on the desktop, a little matcha-café sign: graph paper,
 * a scalloped green edge on top, "CAT OFFICE" in chunky pixel letters in the
 * theme's ink, a cup of matcha, and the summary in a rounded tag.
 */
export function bannerSvg(width: number, summary: string, theme: Theme): string {
  const H = 64
  const hx = (n: number) => '#' + n.toString(16).padStart(6, '0')
  const paper = hx(theme.paper), ink = hx(theme.ink)
  const light = hx(theme.barFrom), leaf = hx(theme.barTo)
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const lines = hx(mix(theme.paper, theme.barTo, 0.16))
  let grid = ''
  for (let x = 8; x < width; x += 8) grid += `M${x} 0V${H}`
  for (let y = 8; y < H; y += 8) grid += `M0 ${y}H${width}`
  let scallops = ''
  for (let x = 0; x < width + 12; x += 12) scallops += `<circle cx="${x + 6}" cy="4" r="6"/>`

  const scale = width >= 330 ? 3 : 2
  const titleX = 60
  const titleY = 14
  const tagY = titleY + 7 * scale + 6
  const tagW = Math.min(width - titleX - 8, Math.round(summary.length * 6.6) + 20)
  const cup = gridPaths(pixelArt(CUP, { G: leaf, H: '#FFFFFF', W: '#FFFFFF' }, ink))
  const steam = `<g fill="${hx(mix(theme.paper, theme.ink, 0.25))}"><rect x="23" y="12" width="3" height="3"/><rect x="26" y="9" width="3" height="3"/><rect x="32" y="12" width="3" height="3"/><rect x="35" y="9" width="3" height="3"/></g>`
  const heart = width >= titleX + pixelWidth('CAT OFFICE') * scale + 40
    ? `<g transform="translate(${width - 26} ${titleY + 2}) scale(2)">${gridPaths(pixelArt(HEART, { X: '#F27B93' }, ink))}</g>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" shape-rendering="crispEdges">`
    + `<title>Cat Office: ${esc(summary)}</title>`
    + `<rect width="${width}" height="${H}" fill="${paper}"/>`
    + `<path d="${grid}" stroke="${lines}" stroke-width="1" fill="none"/>`
    + `<rect width="${width}" height="4" fill="${leaf}"/><g fill="${leaf}">${scallops}</g>`
    + `<rect y="${H - 4}" width="${width}" height="4" fill="${leaf}"/>`
    + steam + `<g transform="translate(14 16) scale(3)">${cup}</g>`
    + pixelText('CAT OFFICE', titleX, titleY, scale, ink, light)
    + `<rect x="${titleX}" y="${tagY}" width="${tagW}" height="18" rx="9" fill="${paper}" stroke="${leaf}" stroke-width="2" shape-rendering="auto"/>`
    + `<text x="${titleX + 10}" y="${tagY + 13}" font-family="system-ui, 'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="${ink}" shape-rendering="auto">${esc(summary)}</text>`
    + heart
    + '</svg>'
}

// ── the desktop band for the office cats: the lead cat walking the bar ────────

/** A mackerel facing left, waiting at the end of the bar. */
const FISH = [
  '....BBBB......',
  '..BBBBBBBB..TT',
  '.BEBBBBBBBBTT.',
  'BBBBBBBBBBBT..',
  '.LLLLLLLLLLTT.',
  '..LLLLLLLL..TT',
  '....LLLL......',
]
const BOUNCE = [0, 1, 2, 2, 2, 1, 0, 0]
const HEART = ['.X.X.', 'XXXXX', '.XXX.', '..X..']
const SPRITE_INK = '#2A2238'

/** Rows of characters as a sprite grid in `colors`, outlined in `outline` for the sticker look. */
function pixelArt(rows: readonly string[], colors: Record<string, string>, outline = SPRITE_INK): Grid {
  const h = rows.length + 2
  const w = (rows[0]?.length ?? 0) + 2
  const fill = (x: number, y: number) => colors[rows[y - 1]?.[x - 1] ?? '.'] ?? null
  return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => {
    const c = fill(x, y)
    if (c) return c
    return fill(x - 1, y) || fill(x + 1, y) || fill(x, y - 1) || fill(x, y + 1) ? outline : null
  }))
}

/** The lead cat in small: the orange tabby's head over its suit collar and tie. */
const WALKER = [
  '.O.........O.',
  '.OO.......OO.',
  '.OPO.....OPO.',
  'OOOOOROROOOOO',
  'OOOOOOOOOOOOO',
  'OOWEOOOOOWEOO',
  'OOEEOOOOOEEOO',
  'OKOOOONOOOOKO',
  'OOOOOMOMOOOOO',
  '.OOOOCCCOOOO.',
  '..SSSWTWSSS..',
]
const WALKER_COLORS: Record<string, string> = {
  O: '#F7A03C', R: '#C9651B', P: '#F27B93', W: '#FFFFFF', E: SPRITE_INK, K: '#FF9FB2',
  N: '#F27B93', M: SPRITE_INK, C: '#FFE3BF', S: '#2C3E66', T: '#2BA4E0',
}

/** One frame of the walker: a blink now and then while walking; ^ ^ eyes and an open mouth when cheering. */
function walkerFrame(cheer: boolean, frame: number): Grid {
  const rows = [...WALKER]
  if (cheer) {
    rows[5] = 'OOOEOOOOOEOOO'
    rows[6] = 'OOEOEOOOEOEOO'
    rows[8] = 'OOOOOMPMOOOOO'
  } else if (frame % FRAMES === 6) {
    rows[5] = 'OOOOOOOOOOOOO'
  }
  return pixelArt(rows, WALKER_COLORS)
}

/**
 * The progress band on the desktop with the office cats: the bar in the
 * theme's gradient, the lead cat walking at its tip, and a fish waiting at the
 * end. `celebrate` is the moment after an answer: the bar full, the cat
 * cheering where the fish was, hearts rising. 40 px tall.
 *
 * Like barSvg, the source depends only on the whole percent, the width and the
 * theme, so redraws at the same percent leave the animation running.
 */
export function bandCatSvg(p: number, width: number, theme: Theme, celebrate = false): string {
  const c = (n: number) => '#' + n.toString(16).padStart(6, '0')
  const H = 40, BAR = 8, BAR_Y = 27, CAT_Y = 2, S = 2
  const percent = celebrate ? 100 : Math.round(Math.max(0, Math.min(1, p)) * 100)
  const fishW = 16 * S
  const trackW = width - fishW - 6
  const filled = Math.round((trackW * percent) / 100)
  const catW = ((WALKER[0]?.length ?? 0) + 2) * S
  const catX = celebrate ? width - catW - 4 : Math.max(0, Math.min(trackW - catW, filled - catW / 2))
  const u = `bc${percent}w${width}${c(theme.barFrom).slice(1)}${c(theme.barTo).slice(1)}${celebrate ? 'c' : ''}`

  const dur = (FRAMES * FRAME_MS) / 1000
  const cat = Array.from({ length: FRAMES }, (_, k) => {
    const values = Array.from({ length: FRAMES }, (_, i) => (i === k ? 'visible' : 'hidden')).join(';')
    return `<g visibility="${k === 0 ? 'visible' : 'hidden'}" transform="translate(${catX} ${CAT_Y + (celebrate ? -(BOUNCE[k] ?? 0) : (k >> 1) % 2)}) scale(${S})">`
      + `<animate attributeName="visibility" values="${values}" dur="${dur}s" calcMode="discrete" repeatCount="indefinite"/>`
      + `${gridPaths(walkerFrame(celebrate, k))}</g>`
  }).join('')

  const fish = celebrate
    ? ''
    : `<g transform="translate(${width - fishW} ${BAR_Y + BAR / 2 - 9}) scale(${S})">${gridPaths(pixelArt(FISH, { B: '#7FA9D6', L: '#D3E6F6', E: SPRITE_INK, T: '#5C8CC4' }))}</g>`
  const hearts = celebrate
    ? [0, 0.4, 0.8].map((begin, i) => {
      const x = catX - 6 + i * 12
      return `<g opacity="0"><animateTransform attributeName="transform" type="translate" values="${x} 14;${x} 0" dur="1.2s" begin="${begin}s" repeatCount="indefinite"/>`
        + `<animate attributeName="opacity" values="1;0" dur="1.2s" begin="${begin}s" repeatCount="indefinite"/>`
        + `<g transform="scale(${S})">${gridPaths(pixelArt(HEART, { X: '#F27B93' }))}</g></g>`
    }).join('')
    : ''

  const fill = filled > 0
    ? `<clipPath id="${u}-clip"><rect y="${BAR_Y}" width="${filled}" height="${BAR}" rx="${BAR / 2}"/></clipPath>`
      + `<g clip-path="url(#${u}-clip)">`
      + `<rect y="${BAR_Y}" width="${trackW}" height="${BAR}" fill="url(#${u}-fill)"/>`
      + `<rect y="${BAR_Y}" width="${trackW}" height="${BAR / 2}" fill="#ffffff" opacity="0.18"/>`
      + `<rect x="-36" y="${BAR_Y}" width="36" height="${BAR}" fill="url(#${u}-shimmer)">`
      + `<animate attributeName="x" from="-36" to="${filled}" dur="2.4s" repeatCount="indefinite"/></rect></g>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}">`
    + '<defs>'
    + `<linearGradient id="${u}-fill" x1="0" x2="1"><stop offset="0" stop-color="${c(theme.barFrom)}"/><stop offset="1" stop-color="${c(theme.barTo)}"/></linearGradient>`
    + `<linearGradient id="${u}-shimmer" x1="0" x2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>`
    + '</defs>'
    + `<rect y="${BAR_Y}" width="${trackW}" height="${BAR}" rx="${BAR / 2}" fill="${c(theme.barEmpty)}" fill-opacity="0.35"/>`
    + fill + fish
    + `<g shape-rendering="crispEdges">${cat}${hearts}</g>`
    + '</svg>'
}
