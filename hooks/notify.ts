// What to tell the person when work ends: a toast in the app, and a desktop
// notification when they have likely looked away. Kind words, even for an
// error: the cats are on your side. Pure, no `$`.

import type { StageRun } from '../types'

/** What a turn ending says: a toast, a desktop notification, either, both or neither. */
export type Alert = { toast?: string; notify?: string }

export type AlertOptions = {
  /** Show toasts at all. */
  toasts: boolean
  /** Notify the desktop only for turns at least this long; 0 never. */
  notifyAfterSec: number
}

/** How a turn ended, as `turn.complete` says. */
type Ending = 'answer' | 'aborted' | 'refusal' | 'error'

/** A duration in plain words: "45 sec", "2 min 14 sec". */
export function duration(ms: number): string {
  const total = Math.max(1, Math.round(ms / 1000))
  const min = Math.floor(total / 60)
  const sec = total % 60
  if (!min) return `${sec} sec`
  return sec ? `${min} min ${sec} sec` : `${min} min`
}

/**
 * The lead's turn ended. An answer or an error is worth a toast, and a
 * desktop notification once it took long enough that the person may have
 * looked away; stopping it yourself or a refusal says nothing.
 */
export function turnAlert(run: StageRun, reason: Ending, durationMs: number, options: AlertOptions): Alert {
  if (reason !== 'answer' && reason !== 'error') return {}
  const took = duration(durationMs)
  const helpers = run.agents.filter(a => a.status === 'done').length
  const word = reason === 'answer' ? 'Purr-fect! All done' : 'Oops! Hit an error'
  const cheer = reason === 'answer' ? '' : '. Take a sip and try again'
  const alert: Alert = {}
  if (options.toasts) {
    const finished = reason === 'answer' && helpers ? ` · ${helpers} helper${helpers === 1 ? '' : 's'} finished` : ''
    alert.toast = `${reason === 'answer' ? '✓' : '✗'} ${word} · ${took}${finished}${cheer}`
  }
  if (options.notifyAfterSec > 0 && durationMs >= options.notifyAfterSec * 1000) alert.notify = `${word} (${took})${cheer}`
  return alert
}

/** A helper's turn ended: only an error is worth a toast; finishing shows on its row. */
export function helperAlert(run: StageRun, agentId: string, reason: Ending, options: AlertOptions): Alert {
  if (reason !== 'error' || !options.toasts) return {}
  const at = run.agents.findIndex(a => a.id === agentId)
  const agent = run.agents[at]
  if (!agent) return {}
  return { toast: `✗ Oops! Task ${at + 1} hit an error: ${agent.label}` }
}
