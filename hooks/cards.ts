// What each card shows: title, status, what it is doing, what it used, and its
// figure. Pure, no `$`: the pane draws these, and the hooks compare them to
// decide whether anything on screen changed at all.

import type { StageAgent, StageRun } from '../types'
import { cleanTask, usedLine } from './activity'
import { poseOf, ROLES, roleOf } from './robots'
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
  /** Working right now: its border takes the role color and its figure animates. */
  live: boolean
  status: string
  statusColor: string
  doing: string
  used: string
  robot: { role: Role; pose: Pose }
}

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0')
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const shorten = (text: string, n: number) => (text.length > n ? text.slice(0, n - 1) + '…' : text)
const callsOf = (a: StageAgent) => a.calls ?? (a.used ?? []).reduce((n, u) => n + u.count, 0)

/**
 * The cards, the lead first. `ticking` adds live elapsed seconds to running
 * cards: the terminal redraws them cheaply every second; elsewhere a ticking
 * number would rebuild the drawings each second, so running cards show counts
 * and finished ones their duration.
 */
export function buildCards(r: StageRun, now: number, ticking: boolean, theme: Theme): Card[] {
  const secs = (from: number, to: number | null) => Math.max(0, Math.round(((to ?? now) - from) / 1000))
  const elapsed = (from: number) => (ticking ? ` · ${secs(from, null)}s` : '')
  const mainCalls = r.mainCalls ?? (r.mainUsed ?? []).reduce((n, u) => n + u.count, 0)
  const mainQuiet = isQuiet(r.mainActivity, r.mainActiveAt ?? r.turnStartedAt, now)
  const request = cleanTask(r.mainTask ?? '')

  const lead: Card = {
    key: 'main',
    title: request ?? (r.isWorking ? 'Leading the team' : 'Waiting for your next request'),
    live: r.isWorking,
    status: !r.isWorking
      ? '○ Idle'
      : mainQuiet
        ? `◐ Thinking${elapsed(r.turnStartedAt)} · ${plural(mainCalls, 'tool call')}`
        : `● Working${elapsed(r.turnStartedAt)} · ${plural(mainCalls, 'tool call')}`,
    statusColor: r.isWorking ? ROLES.lead.color : hex(theme.done),
    doing: !r.isWorking
      ? r.mainDoing ? `Last: ${r.mainDoing}` : 'Ready for your next request'
      : mainQuiet
        ? r.mainDoing ? `Last: ${r.mainDoing}` : 'Reading your request'
        : r.mainDoing || 'Working',
    used: usedLine(r.mainUsed) || 'No tools used yet',
    robot: robotOf(r, 'main', now) ?? { role: 'lead', pose: 'idle' },
  }

  const agents = stageAgents(r).map((a): Card => {
    const quiet = isQuiet(a.activity, a.lastActiveAt ?? a.startedAt, now)
    const calls = plural(callsOf(a), 'tool call')
    return {
      key: a.id,
      title: `Task ${r.agents.indexOf(a) + 1}: ${a.label}`,
      live: a.status === 'running',
      status: a.status === 'done'
        ? `✓ Done in ${secs(a.startedAt, a.endedAt)}s · ${calls}`
        : a.status === 'failed'
          ? `✗ Failed after ${secs(a.startedAt, a.endedAt)}s · ${calls}`
          : quiet
            ? `◐ Thinking${elapsed(a.startedAt)} · ${calls}`
            : `● Working${elapsed(a.startedAt)} · ${calls}`,
      statusColor: a.status === 'failed' ? hex(theme.failed) : a.status === 'done' ? hex(theme.done) : ROLES[roleOf(a.type, a.label)].color,
      doing: a.status === 'running' && !quiet
        ? a.doing || 'Working'
        : a.doing ? `Last: ${a.doing}` : `Starting: ${shorten(a.prompt ?? '', 70)}`,
      used: usedLine(a.used) || 'No tools used yet',
      robot: robotOf(r, a.id, now) ?? { role: 'lead', pose: 'idle' },
    }
  })
  return [lead, ...agents]
}

/** The words beside the progress bar: "50% · 1/2 tasks · 2 agents · Grep". */
export function bandLabel(r: StageRun, now: number, p: number, ticking: boolean): string {
  const done = r.tasks.filter(task => task.status === 'completed').length
  const running = r.agents.filter(a => a.status === 'running').length
  return [
    `${Math.round(p * 100)}%`,
    r.tasks.length ? `${done}/${r.tasks.length} tasks` : '',
    r.isWorking && ticking ? `${Math.max(0, Math.round((now - r.turnStartedAt) / 1000))}s` : '',
    running ? `${running} agent${running === 1 ? '' : 's'}` : '',
    r.mainActivity !== 'idle' ? r.mainActivity : '',
  ].filter(Boolean).join(' · ')
}

/**
 * Everything a non-ticking surface shows, as one string. Two runs with the same
 * signature draw the same pane and band, so an update that leaves it unchanged
 * (a timestamp, a hidden count) needs no redraw.
 */
export function visibleSig(r: StageRun, now: number, p: number, theme: Theme): string {
  return JSON.stringify([buildCards(r, now, false, theme), bandLabel(r, now, p, false)])
}
