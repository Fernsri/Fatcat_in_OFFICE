import { expect, mock, test } from 'claude-code/testing'

import type { StageRun } from '../types'
import { duration, helperAlert, turnAlert } from './notify'

const RUN: StageRun = {
  isWorking: false,
  turnStartedAt: 0,
  mainActivity: 'idle',
  mainTask: 'make it purr',
  toolCount: 3,
  agents: [
    { id: 'a1', label: 'plan the rows', prompt: 'plan', type: 'Plan', status: 'done', activity: 'done', startedAt: 0, endedAt: 1000 },
    { id: 'a2', label: 'test the build', prompt: 'test', type: 'general-purpose', status: 'failed', activity: 'failed', startedAt: 0, endedAt: 1000 },
    { id: 'a3', label: 'review it', prompt: 'review', type: 'code-reviewer', status: 'done', activity: 'done', startedAt: 0, endedAt: 1000 },
  ],
  tasks: [],
}
const ON = { toasts: true, notifyAfterSec: 30 }

test('durations read as plain minutes and seconds', async () => {
  expect(duration(400)).toBe('1 sec')
  expect(duration(45_000)).toBe('45 sec')
  expect(duration(60_000)).toBe('1 min')
  expect(duration(134_000)).toBe('2 min 14 sec')
})

test('an answer: a toast always, a desktop notification only after a long wait', async () => {
  expect(turnAlert(RUN, 'answer', 134_000, ON)).toEqual({
    toast: '✓ All done · 2 min 14 sec · 2 helpers finished',
    notify: 'All done (2 min 14 sec)',
  })
  expect(turnAlert({ ...RUN, agents: [] }, 'answer', 12_000, ON)).toEqual({ toast: '✓ All done · 12 sec' })
  expect(turnAlert(RUN, 'answer', 134_000, { toasts: false, notifyAfterSec: 0 })).toEqual({})
})

test('an error says so; stopping it yourself or a refusal says nothing', async () => {
  expect(turnAlert(RUN, 'error', 45_000, ON)).toEqual({ toast: '✗ Stopped by an error · 45 sec', notify: 'Stopped by an error (45 sec)' })
  expect(turnAlert(RUN, 'aborted', 45_000, ON)).toEqual({})
  expect(turnAlert(RUN, 'refusal', 45_000, ON)).toEqual({})
})

test('a helper with an error gets a toast; a helper that finishes gets none', async () => {
  expect(helperAlert(RUN, 'a2', 'error', ON)).toEqual({ toast: '✗ Task 2 had an error: test the build' })
  expect(helperAlert(RUN, 'a1', 'answer', ON)).toEqual({})
  expect(helperAlert(RUN, 'a2', 'error', { toasts: false, notifyAfterSec: 30 })).toEqual({})
  expect(helperAlert(RUN, 'nobody', 'error', ON)).toEqual({})
})

test('a long answer toasts and notifies through the engine', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  const toasts: string[] = []
  const notes: string[] = []
  on('turn.start', async (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', async () => ({ text: '' }))
  on('ui.toast', async (_, e) => { toasts.push(e.text); return { value: undefined } as never })
  on('ui.notify', async (_, e) => { notes.push(e.text); return { value: { isSent: true, channel: 'terminal_bell' } } as never })
  await $.turn.start({ text: 'make it purr', turnId: 't1' })
  await $.turn.complete({ answer: 'done', durationMs: 45_000, isAborted: false, turnId: 't1', reason: 'answer' })
  expect(toasts).toEqual(['✓ All done · 45 sec'])
  expect(notes).toEqual(['All done (45 sec)'])
})
