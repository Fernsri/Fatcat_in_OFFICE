// Which figure the terminal pane's rows carry for the room the terminal gives
// it. Pure, no `$`.

import { cropCells, MINI } from './robots'
import type { Crop } from './robots'

const TEXT_LINES = 3 // title, status and doing, the bar
const GAP = 1
const TEXT_MIN = 20 // the fewest columns the text beside a figure gets

/** Rows one agent's row takes: its small figure, or its three lines. */
export function rowRows(figure: Crop | null): number {
  return Math.max(figure ? cropCells(figure).rows : 0, TEXT_LINES)
}

/**
 * The small figure (head and shoulders at half size) when the row has room
 * for it and the text beside it; text alone in a pane too narrow for both.
 * Rows that do not fit the pane's height scroll.
 */
export function fitRow(columns: number): Crop | null {
  return columns >= cropCells(MINI).columns + GAP + TEXT_MIN ? MINI : null
}

/** Columns a row's own bar gets beside the figure: the text's width, at most 30. */
export function rowBarColumns(columns: number, figure: Crop | null): number {
  const text = columns - (figure ? cropCells(figure).columns + GAP : 0)
  return Math.max(8, Math.min(30, text))
}
