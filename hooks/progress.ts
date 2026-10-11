import type { StageRun } from '../types'

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/**
 * How far along the current work is, 0..1, for the progress bar and its percent.
 * It uses the best evidence there is:
 *   1. the plan Claude keeps (TaskCreate/TaskUpdate or TodoWrite): done tasks
 *      over all tasks, one in progress counting half;
 *   2. else the subagents: finished ones over all, a running one counting a quarter;
 *   3. else the tool calls made this turn, rising fast and easing toward 90%.
 * While the main loop is mid-turn the bar holds at 95% at most, since the answer
 * is still being written. Between turns it shows the plain share done, so
 * subagents still running in the background keep it below 100% until they finish.
 */
export function progressOf(run: StageRun): number {
  let p: number
  if (run.tasks.length) {
    const score = run.tasks.reduce((s, t) => s + (t.status === 'completed' ? 1 : t.status === 'in_progress' ? 0.5 : 0), 0)
    p = score / run.tasks.length
  } else if (run.agents.length) {
    const finished = run.agents.filter(a => a.status !== 'running').length
    const running = run.agents.length - finished
    p = (finished + 0.25 * running) / run.agents.length
  } else {
    if (!run.isWorking) return 1
    p = 0.9 * (1 - Math.exp(-run.toolCount / 10))
  }
  return clamp01(run.isWorking ? Math.min(0.95, p) : p)
}
