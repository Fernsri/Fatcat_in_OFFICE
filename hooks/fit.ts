// How big the terminal pane draws its figures for the room the terminal gives
// it. Pure, no `$`.

import { BUST, cropCells, FULL, HEAD, MINI } from './robots'
import type { Crop } from './robots'

/**
 * The pane's cards: with a figure when `figure` is set, its role label under
 * it when `labelBelow`, else beside the task.
 */
export type Fit = { figure: Crop | null; labelBelow: boolean }

const HEADER = 1 // the "Agents Office" line
const TEXT_LINES = 4 // task, status, doing, used
const BORDER = 2
const TEXT_MIN = 20 // the fewest columns the text beside a figure gets

/** The big figures carry their role label under them; the small ones beside the task. */
const labelsBelow = (figure: Crop | null) => figure === FULL || figure === BUST

/** Rows one bordered card takes: its figure (and label), or its four lines. */
export function cardRows(figure: Crop | null): number {
  const art = figure ? cropCells(figure).rows + (labelsBelow(figure) ? 1 : 0) : 0
  return BORDER + Math.max(art, TEXT_LINES)
}

/** Columns a card with this figure needs: border, figure, gap, padding, text. */
const cardColumns = (figure: Crop) => BORDER + cropCells(figure).columns + 1 + 2 + TEXT_MIN

/**
 * The biggest figure that shows every card in `rows` x `columns` without
 * scrolling: the chosen size, then the bust, the head, half size. When not even
 * half-size cards fit, they stay and the pane scrolls: a small figure beats
 * none. Only a pane too narrow for any figure gets cards of text alone.
 */
export function fitPane(agents: number, rows: number, columns: number, preferred: Crop): Fit {
  const room = rows - HEADER
  const fit = (figure: Crop | null): Fit => ({ figure, labelBelow: labelsBelow(figure) })
  const figures = (preferred === FULL ? [FULL, BUST, HEAD, MINI] : [preferred, HEAD, MINI]).filter(f => columns >= cardColumns(f))
  for (const figure of figures) {
    if (agents * cardRows(figure) <= room) return fit(figure)
  }
  return fit(figures.at(-1) ?? null)
}
