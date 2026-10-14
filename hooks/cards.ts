// What each row shows: title, status, what it is doing, its own little bar,
// and its figure. Pure, no `$`: the pane draws these, and the hooks compare them to
// decide whether anything on screen changed at all.

import type { StageRun } from '../types'
import { cleanTask } from './activity'
import { poseOf, roleOf } from './robots'
import type { Pose, Role } from './robots'
import { stageAgents } from './stage'
import type { Theme } from './stage'

/** A gap this long with no tool call reads as thinking; shorter gaps between calls stay working. */
export const THINK_MS = 2500

/** Whether an agent (or the lead) is thinking rather than working, given its last activity. */
export function isQuiet(activity: string, since: number, now: number): boolean {
  return activity === 'starting' || (activity === 'thinking' && now - since >= THINK_MS)
}

/** Which figure a card shows and what it is doing; `key` is 'main' or an agent id. */
export function robotOf(run: StageRun, key: string, now: number): { role: Role; pose: Pose } | null {
  if (key === 'main') {
    if (!run.isWorking) return { role: 'lead', pose: 'idle' }
    return { role: 'lead', pose: isQuiet(run.mainActivity, run.mainActiveAt ?? run.turnStartedAt, now) ? 'think' : 'walk' }
  }
  const agent = run.agents.find(a => a.id === key)
  if (!agent) return null
  const pose = poseOf(agent.activity, agent.status)
  const quiet = isQuiet(agent.activity, agent.lastActiveAt ?? agent.startedAt, now)
  return { role: roleOf(agent.type, agent.label), pose: pose === 'think' && !quiet ? 'walk' : pose }
}

export type Card = {
  key: string
  title: string
  /** Working right now: its row takes the role color and its figure animates. */
  live: boolean
  status: string
  statusColor: string
  doing: string
  /** The row's own bar: 0..1, or null while a helper works (nobody knows how far along it is). */
  bar: number | null
  barColor: string
  robot: { role: Role; pose: Pose }
}

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0')
const shorten = (text: string, n: number) => (text.length > n ? text.slice(0, n - 1) + '…' : text)

/**
 * The rows, the lead first. `p` is the whole run's progress, the lead's bar.
 * `ticking` adds live elapsed seconds to running rows: the terminal redraws
 * them cheaply every second; elsewhere a ticking number would rebuild the
 * drawings each second, so running rows show none and finished ones their time.
 */
export function buildCards(r: StageRun, now: number, ticking: boolean, theme: Theme, p: number): Card[] {
  const secs = (from: number, to: number | null) => Math.max(0, Math.round(((to ?? now) - from) / 1000))
  const elapsed = (from: number) => (ticking ? ` · ${secs(from, null)} sec` : '')
  const mainQuiet = isQuiet(r.mainActivity, r.mainActiveAt ?? r.turnStartedAt, now)
  const request = cleanTask(r.mainTask ?? '')
  const done = hex(theme.done)

  const lead: Card = {
    key: 'main',
    title: request ?? (r.isWorking ? 'Leading the team' : 'Waiting for your next request'),
    live: r.isWorking,
    status: !r.isWorking ? '○ Waiting for you' : mainQuiet ? `◐ Thinking${elapsed(r.turnStartedAt)}` : `● Working${elapsed(r.turnStartedAt)}`,
    statusColor: r.isWorking ? hex(theme.main) : done,
    doing: !r.isWorking
      ? r.mainDoing ? `Last: ${r.mainDoing}` : 'Ready for your next request'
      : mainQuiet
        ? r.mainDoing ? `Last: ${r.mainDoing}` : 'Reading your request'
        : r.mainDoing || 'Working',
    bar: p,
    barColor: r.isWorking ? hex(theme.main) : done,
    robot: robotOf(r, 'main', now) ?? { role: 'lead', pose: 'idle' },
  }

  const agents = stageAgents(r).map((a): Card => {
    const quiet = isQuiet(a.activity, a.lastActiveAt ?? a.startedAt, now)
    const color = a.status === 'failed' ? hex(theme.failed) : a.status === 'done' ? done : hex(theme.main)
    return {
      key: a.id,
      title: `Task ${r.agents.indexOf(a) + 1}: ${a.label}`,
      live: a.status === 'running',
      status: a.status === 'done'
        ? `✓ Done (${secs(a.startedAt, a.endedAt)} sec)`
        : a.status === 'failed'
          ? `✗ Oops, error (${secs(a.startedAt, a.endedAt)} sec)`
          : quiet ? `◐ Thinking${elapsed(a.startedAt)}` : `● Working${elapsed(a.startedAt)}`,
      statusColor: color,
      doing: a.status === 'running' && !quiet
        ? a.doing || 'Working'
        : a.doing ? `Last: ${a.doing}` : `Starting: ${shorten(a.prompt ?? '', 70)}`,
      bar: a.status === 'running' ? null : 1,
      barColor: color,
      robot: robotOf(r, a.id, now) ?? { role: 'lead', pose: 'idle' },
    }
  })
  return [lead, ...agents]
}

/** The words under the pane's title: "2 working · 1 done", "1 error". */
export function officeSummary(cards: readonly Card[]): string {
  const working = cards.filter(c => c.live).length
  const done = cards.filter(c => c.key !== 'main' && c.status.startsWith('✓')).length
  const errors = cards.filter(c => c.status.startsWith('✗')).length
  const parts = [working ? `${working} working` : '', done ? `${done} done` : '', errors ? `${errors} error${errors === 1 ? '' : 's'}` : '']
  return parts.filter(Boolean).join(' · ') || 'All quiet · nap time'
}

/** The words beside the progress bar: "50% · 1 of 2 to-dos done · 42 sec · 2 helpers working". */
export function bandLabel(r: StageRun, now: number, p: number, ticking: boolean): string {
  const done = r.tasks.filter(task => task.status === 'completed').length
  const running = r.agents.filter(a => a.status === 'running').length
  return [
    `${Math.round(p * 100)}%`,
    r.tasks.length ? `${done} of ${r.tasks.length} to-dos done` : '',
    r.isWorking && ticking ? `${Math.max(0, Math.round((now - r.turnStartedAt) / 1000))} sec` : '',
    running ? `${running} helper${running === 1 ? '' : 's'} working` : '',
  ].filter(Boolean).join(' · ')
}

/**
 * Everything a non-ticking surface shows, as one string. Two runs with the same
 * signature draw the same pane and band, so an update that leaves it unchanged
 * (a timestamp, a hidden count) needs no redraw.
 */
export function visibleSig(r: StageRun, now: number, p: number, theme: Theme): string {
  return JSON.stringify([buildCards(r, now, false, theme, Math.round(p * 100) / 100), bandLabel(r, now, p, false)])
}
