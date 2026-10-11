// How events change the run. Pure, no `$`, so the tests can call them directly.

import type { StageRun } from '../types'
import { cleanTask } from './activity'

/**
 * A turn starts. When the person sent a request, the old finished cards are
 * cleared and the lead starts fresh. A subagent's hand-back or a notification
 * also starts a turn, but the same work goes on: every card, the clock and the
 * counts stay, so nothing vanishes from the pane as reports come back.
 */
export function startTurn(r: StageRun, text: string, now: number): StageRun {
  const request = cleanTask(text)
  if (!request) {
    return { ...r, isWorking: true, mainActivity: 'thinking', mainActiveAt: now, turnStartedAt: r.turnStartedAt || now }
  }
  return {
    ...r,
    isWorking: true,
    turnStartedAt: now,
    mainActivity: 'thinking',
    mainActiveAt: now,
    mainTask: request,
    mainDoing: '',
    mainUsed: [],
    mainCalls: 0,
    toolCount: 0,
    agents: r.agents.filter(a => a.status === 'running'),
  }
}
