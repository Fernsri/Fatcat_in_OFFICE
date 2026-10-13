import { expect, mock, test } from 'claude-code/testing'

import type { StageRun } from '../types'
import { progressOf } from './progress'
import { startTurn } from './run'
import { buildCards, visibleSig } from './cards'
import { cardRows, fitPane } from './fit'
import { addUsed, cleanTask, describeCall, mcpParts, safeText, usedLine, usedOf } from './activity'
import { BUST, FRAMES, FULL, HEAD, MINI, ROLES, cropCells, poseOf, robotGrid, robotSvg, roleOf } from './robots'
import type { Pose, Role } from './robots'
import { astroGrid } from './astronauts'
import { THEMES, barFrame, barSvg, figureStillSvg, figureSvg, robotCells, stageAgents } from './stage'

const RUN: StageRun = {
  isWorking: true,
  turnStartedAt: 0,
  mainActivity: 'Bash',
  mainTask: 'find the biggest files',
  toolCount: 3,
  agents: [
    { id: 'a1', label: 'find auth', prompt: 'look for auth code', type: 'Explore', status: 'running', activity: 'Grep', startedAt: 0, endedAt: null },
    { id: 'a2', label: 'plan', prompt: 'make a plan', type: 'Plan', status: 'done', activity: 'done', startedAt: 0, endedAt: 1000 },
  ],
  tasks: [],
}

const ALL_ROLES = Object.keys(ROLES) as Role[]
const ALL_POSES: Pose[] = ['walk', 'think', 'done', 'fail', 'idle']

// base64 of n u32 triplets is ceil(n*12/3)*4 characters
const b64Len = (cells: number) => Math.ceil((cells * 12) / 3) * 4

test('every role and pose draws a full 32 x 32 grid on every frame', async () => {
  for (const role of ALL_ROLES) {
    for (const pose of ALL_POSES) {
      for (let f = 0; f < FRAMES; f++) {
        const grid = robotGrid(role, pose, f)
        expect(grid.length).toBe(32)
        expect(grid.every(row => row.length === 32)).toBe(true)
      }
    }
  }
})

test('every space crew role and pose draws a full grid, and its SVG fits the Svg limit', async () => {
  for (const role of ALL_ROLES) {
    for (const pose of ALL_POSES) {
      for (let f = 0; f < FRAMES; f++) {
        const grid = astroGrid(role, pose, f)
        expect(grid.length).toBe(32)
        expect(grid.every(row => row.length === 32)).toBe(true)
      }
      expect(figureSvg('space-crew', role, pose).length).toBeLessThan(131072)
    }
  }
  expect(robotCells('researcher', 'think', 2, BUST, false, 'space-crew').length).toBe(b64Len(BUST.w * (BUST.h >> 1)))
})

test('terminal cells fill exactly the crop, bust and full', async () => {
  expect(robotCells('tester', 'walk', 3, BUST).length).toBe(b64Len(BUST.w * (BUST.h >> 1)))
  expect(robotCells('designer', 'done', 5, FULL, true).length).toBe(b64Len(FULL.w * (FULL.h >> 1)))
  expect(cropCells(HEAD)).toEqual({ columns: 28, rows: 8 })
  expect(cropCells(MINI)).toEqual({ columns: 14, rows: 5 })
  for (const skin of ['robots', 'space-crew'] as const) {
    expect(robotCells('coder', 'think', 1, HEAD, false, skin).length).toBe(b64Len(28 * 8))
    expect(robotCells('coder', 'think', 1, MINI, false, skin).length).toBe(b64Len(14 * 5))
  }
})

test('the desktop SVG of every role and pose fits the Svg element limit', async () => {
  for (const role of ALL_ROLES) {
    for (const pose of ALL_POSES) {
      const svg = robotSvg(role, pose)
      expect(svg.startsWith('<svg')).toBe(true)
      expect(svg.length).toBeLessThan(131072)
    }
  }
})

test('the bar frame is one row in both determinate and indeterminate form', async () => {
  expect(barFrame(0.42, 0.5, 30, THEMES.ocean).length).toBe(b64Len(30))
  expect(barFrame(null, 0.5, 30, THEMES.ocean).length).toBe(b64Len(30))
})

// The characters of a packed bar row: every third u32, little-endian.
function barChars(cells: string): string {
  const bin = atob(cells)
  let out = ''
  for (let i = 0; i < bin.length; i += 12) {
    const code = bin.charCodeAt(i) | (bin.charCodeAt(i + 1) << 8) | (bin.charCodeAt(i + 2) << 16)
    out += String.fromCodePoint(code)
  }
  return out
}

test('the terminal bar is the slim ━ line with a half-cell edge', async () => {
  // 42% of 10 cells is 4.2: four full, no half; 45% is 4.5: four full and a half.
  expect(barChars(barFrame(0.42, 0.5, 10, THEMES.ocean))).toBe('━━━━──────')
  expect(barChars(barFrame(0.45, 0.5, 10, THEMES.ocean))).toBe('━━━━╸─────')
  expect(barChars(barFrame(0, 0.5, 10, THEMES.ocean))).toBe('──────────')
  expect(barChars(barFrame(null, 0.5, 10, THEMES.ocean))).toMatch(/^─*━{3,}─*$/)
})

test('the desktop bar has the sheen and a running shimmer, in the theme colors', async () => {
  const svg = barSvg(0.42, 400, THEMES.sunset)
  expect(svg).toContain('width="400"')
  expect(svg).toContain('<rect width="168" height="6" rx="3"/>')
  expect(svg).toContain('<animate attributeName="x"')
  expect(svg).toContain('opacity="0.18"')
  expect(svg).toContain('stop-color="#f43f5e"')
  expect(svg).toContain('stop-color="#facc15"')
  expect(barSvg(0, 400, THEMES.sunset)).not.toContain('<animate')
})

test('the desktop bar is the same SVG until the percent moves, so the shimmer runs on', async () => {
  expect(barSvg(0.421, 400, THEMES.neon)).toBe(barSvg(0.424, 400, THEMES.neon))
  expect(barSvg(0.43, 400, THEMES.neon)).not.toBe(barSvg(0.42, 400, THEMES.neon))
  expect(barSvg(0.42, 400, THEMES.neon)).not.toBe(barSvg(0.42, 400, THEMES.ocean))
})

test('progress runs 0 to 100%: tasks first, then agents, then tool calls, held under 100% mid-turn', async () => {
  const idle: StageRun = { ...RUN, isWorking: false, agents: [], tasks: [] }
  expect(progressOf(idle)).toBe(1)
  expect(progressOf({ ...idle, isWorking: true, toolCount: 0 })).toBe(0)
  const some = progressOf({ ...idle, isWorking: true, toolCount: 10 })
  expect(some > 0.5 && some < 0.6).toBe(true)
  expect(progressOf({ ...idle, isWorking: true, toolCount: 500 }) <= 0.9).toBe(true)
  // one agent done, one running: (1 + 0.25) / 2
  expect(progressOf({ ...RUN, isWorking: false })).toBe(0.625)
  const tasks: StageRun['tasks'] = [
    { id: '1', title: 'a', status: 'completed' }, { id: '2', title: 'b', status: 'in_progress' },
    { id: '3', title: 'c', status: 'pending' }, { id: '4', title: 'd', status: 'pending' },
  ]
  expect(progressOf({ ...RUN, isWorking: false, tasks })).toBe(0.375)
  const allDone = tasks.map(t => ({ ...t, status: 'completed' as const }))
  expect(progressOf({ ...RUN, isWorking: true, tasks: allDone })).toBe(0.95)
  expect(progressOf({ ...RUN, isWorking: false, tasks: allDone })).toBe(1)
})

test('cards summarize: what an agent does, and the tools, MCP servers and skills it used', async () => {
  expect(describeCall('Read', { file_path: 'C:/Users/me/hooks/progress.ts' })).toBe('Reading progress.ts')
  expect(describeCall('Read', { file_path: String.raw`C:\Users\me\hooks\progress.ts` })).toBe('Reading progress.ts')
  expect(describeCall('Bash', { command: 'npm test\nmore' })).toBe('Running npm test')
  expect(describeCall('Grep', { pattern: 'auth', path: 'src/' })).toBe('Searching for "auth" in src')
  expect(describeCall('Skill', { skill: 'pdf' })).toBe('Using the pdf skill')
  expect(describeCall('mcp__plugin_playwright_playwright__browser_click', {})).toBe('Using playwright: browser click')
  expect(mcpParts('mcp__1a59c906-04da-521d-bda7-7f71b9f9e01c__batch')?.server).toBe('connector')
  let used = addUsed(undefined, usedOf('Read', {}))
  used = addUsed(used, usedOf('Read', {}))
  used = addUsed(used, usedOf('Grep', {}))
  used = addUsed(used, usedOf('mcp__plugin_playwright_playwright__browser_click', {}))
  used = addUsed(used, usedOf('Skill', { skill: 'pdf' }))
  expect(usedLine(used)).toBe('Tools Read ×2, Grep · MCP playwright · Skills pdf')
  expect(usedLine([])).toBe('')
})

test('text from outside the mod cannot carry terminal escapes onto a card', async () => {
  const esc = String.fromCharCode(27)
  expect(safeText(`npm test${esc}[2J${esc}[31mred${esc}]0;title${String.fromCharCode(7)}`)).toBe('npm testred')
  expect(safeText(`a${String.fromCharCode(8)}b‮c`)).toBe('a b c')
  expect(describeCall('Bash', { command: `rm x${esc}[2K` })).toBe('Running rm x')
  expect(describeCall('Skill', { skill: `pdf${esc}[5m` })).toBe('Using the pdf skill')
  expect(cleanTask(`Fix it${esc}[2J`)).toBe('Fix it')
})

test('injected messages never become the request shown on the lead card', async () => {
  expect(cleanTask('<agent-message from="a1"> [Subagent hand-back] report')).toBe(null)
  expect(cleanTask('[SYSTEM NOTIFICATION - NOT USER INPUT] task done')).toBe(null)
  expect(cleanTask('  ')).toBe(null)
  expect(cleanTask('Fix the progress bar please')).toBe('Fix the progress bar please')
  expect(cleanTask('<Button> will not render')).toBe('<Button> will not render')
  expect(cleanTask('Fix the bar <system-reminder>be brief</system-reminder>')).toBe('Fix the bar')
  expect(cleanTask('<task-notification><status>done</status></task-notification>')).toBe(null)
  expect((cleanTask('x'.repeat(400)) ?? '').length).toBe(160)
})

test('running agents get cards first', async () => {
  expect(stageAgents(RUN).map(a => a.id)).toEqual(['a1', 'a2'])
})

test('roles follow the agent type and description; poses follow the activity', async () => {
  expect([
    roleOf('Explore'), roleOf('Plan'), roleOf('general-purpose'), roleOf('general-purpose', 'write unit tests'),
    roleOf('code-reviewer'), roleOf('general-purpose', 'design the settings screen'), roleOf('agent-sdk-verifier-ts'),
  ]).toEqual(['researcher', 'planner', 'coder', 'tester', 'reviewer', 'designer', 'tester'])
  expect([poseOf('Grep'), poseOf('thinking'), poseOf('starting'), poseOf('Grep', 'done'), poseOf('x', 'failed'), poseOf('idle')])
    .toEqual(['walk', 'think', 'think', 'done', 'fail', 'idle'])
})

test('a report coming back keeps every card; only a new request from the person clears finished ones', async () => {
  const kept = startTurn(RUN, '<agent-message from="a2"> [Subagent hand-back] all done </agent-message>', 5_000)
  expect(kept.agents.map(a => a.id)).toEqual(['a1', 'a2'])
  expect(kept.mainTask).toBe(RUN.mainTask)
  expect(kept.turnStartedAt).toBe(RUN.turnStartedAt || 5_000)
  const fresh = startTurn(RUN, 'Now fix the tests', 5_000)
  expect(fresh.agents.map(a => a.id)).toEqual(['a1'])
  expect(fresh.mainTask).toBe('Now fix the tests')
  expect(fresh.toolCount).toBe(0)
})

test('done, failed and idle figures are still pictures; working ones animate', async () => {
  for (const skin of ['robots', 'space-crew'] as const) {
    for (const pose of ['done', 'fail', 'idle'] as const) {
      const still = figureStillSvg(skin, 'coder', pose)
      expect(still.startsWith('<svg')).toBe(true)
      expect(still.includes('<animate')).toBe(false)
    }
    expect(figureSvg(skin, 'coder', 'walk').includes('<animate')).toBe(true)
  }
})

test('a change nobody can see is not a visible change; one they can see is', async () => {
  const base = visibleSig(RUN, 10_000, 0.5, THEMES.neon)
  const stamped = { ...RUN, agents: RUN.agents.map(a => ({ ...a, lastActiveAt: 9_999 })) }
  expect(visibleSig(stamped, 10_000, 0.5, THEMES.neon)).toBe(base)
  const doing = { ...RUN, agents: RUN.agents.map(a => ({ ...a, doing: 'Reading x.ts' })) }
  expect(visibleSig(doing, 10_000, 0.5, THEMES.neon) === base).toBe(false)
  const cards = buildCards(RUN, 10_000, false, THEMES.neon)
  expect(cards.map(c => c.key)).toEqual(['main', 'a1', 'a2'])
  expect(cards.some(c => /\d+s ·/.test(c.status) && c.live)).toBe(false) // no ticking seconds off the terminal
})

const SCROLL = { offset: 0, bodyRows: 30 }

test('a quick gap between tool calls stays Working; only a long quiet gap shows Thinking', async ($, on) => {
  const clock = mock.clock(on, { now: 10_000 })
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'sub-9' }))
  on('tool.call', async () => ({ result: {}, text: 'ok' }))
  await $.agent.spawn({
    prompt: 'find big files', description: 'research big files', subagentType: 'Explore', tool_use_id: 'toolu_9',
    provider: { plugin: 'engine', tier: 'core' }, parentModel: 'claude-opus-5-5', background: false, fork: false,
  })
  await $.tool.call({ tool: 'Grep', pattern: 'size', agentId: 'sub-9' } as never)
  const props = { title: 'Agents Office', isFocused: false, bodyColumns: 80, placement: 'dock' as const, scroll: SCROLL, view: {} }

  let pane = await $.ui.mount({ plugin: 'agent-stage', surface: 'desktop', component: 'Pane', requestId: 'agent-stage', props })
  expect(await pane.find({ type: 'Text', text: /● Working · 1 tool call/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /Searching for "size"/ })).toBeDefined()
  await pane.unmount()

  await clock.advance(3_000)
  pane = await $.ui.mount({ plugin: 'agent-stage', surface: 'desktop', component: 'Pane', requestId: 'agent-stage', props })
  expect(await pane.find({ type: 'Text', text: /◐ Thinking · 1 tool call/ })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /Last: Searching for "size"/ })).toBeDefined()
  await pane.unmount()
})

test('a spawned subagent and the plan show on the pane and the band', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'sub-1' }))
  on('tool.call', async () => ({ result: {}, text: 'ok' }))

  await $.agent.spawn({
    prompt: 'look around', description: 'review the auth change', subagentType: 'general-purpose', tool_use_id: 'toolu_1',
    provider: { plugin: 'engine', tier: 'core' }, parentModel: 'claude-opus-5-5', background: false, fork: false,
  })
  await $.tool.call({ tool: 'TodoWrite', todos: [
    { content: 'one', status: 'completed', activeForm: 'doing one' },
    { content: 'two', status: 'pending', activeForm: 'doing two' },
  ] })

  for (const surface of ['terminal', 'desktop'] as const) {
    const pane = await $.ui.mount({
      plugin: 'agent-stage', surface, component: 'Pane', requestId: 'agent-stage',
      props: { title: 'Agents Office', isFocused: false, bodyColumns: 80, placement: 'dock', scroll: SCROLL, view: {} },
    })
    expect(await pane.find({ type: 'Text', text: /Agents Office/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /Task 1: review the auth change/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /look around/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /Reviewer/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /Team Lead/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /Thinking/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /Tools TodoWrite/ })).toBeDefined()
    await pane.unmount()

    const band = await $.ui.mount({
      plugin: 'agent-stage', surface, component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: true, maxRows: 4, bodyColumns: 100, scroll: SCROLL, view: {} },
    })
    expect(await band.find({ type: 'Text', text: /50%/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /1\/2 tasks/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /1 agent/ })).toBeDefined()
    await band.unmount()
  }
})

test('the terminal pane picks the biggest figure that fits, and keeps a small one rather than none', async () => {
  // header + 3 cards: full figures need 3*19, the bust 3*12, the head 3*10, half size 3*7
  expect(fitPane(3, 80, 100, FULL)).toEqual({ figure: FULL, labelBelow: true })
  expect(fitPane(3, 40, 100, FULL)).toEqual({ figure: BUST, labelBelow: true })
  expect(fitPane(3, 40, 100, BUST)).toEqual({ figure: BUST, labelBelow: true })
  expect(fitPane(3, 31, 100, BUST)).toEqual({ figure: HEAD, labelBelow: false })
  expect(fitPane(4, 37, 100, BUST)).toEqual({ figure: MINI, labelBelow: false })
  expect(fitPane(7, 22, 75, BUST)).toEqual({ figure: MINI, labelBelow: false }) // too many to fit: small figures, and it scrolls
  expect(fitPane(3, 40, 40, BUST)).toEqual({ figure: MINI, labelBelow: false }) // too narrow for a big figure, not a small one
  expect(fitPane(3, 40, 30, BUST)).toEqual({ figure: null, labelBelow: false }) // too narrow for any figure
  for (let rows = 2; rows <= 90; rows++) {
    for (let agents = 1; agents <= 7; agents++) {
      const fit = fitPane(agents, rows, 120, FULL)
      expect(fit.figure).toBeDefined()
      if (fit.figure !== MINI) expect(1 + agents * cardRows(fit.figure) <= rows).toBe(true) // anything bigger fits whole
    }
  }
})

test('a short terminal gets smaller figures, never cards without them', async ($, on) => {
  mock.clock(on, { now: 1_000 })
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'sub-2' }))
  await $.agent.spawn({
    prompt: 'look around', description: 'test the build', subagentType: 'general-purpose', tool_use_id: 'toolu_2',
    provider: { plugin: 'engine', tier: 'core' }, parentModel: 'claude-opus-5-5', background: false, fork: false,
  })
  const mount = (bodyRows: number, bodyColumns = 80) => $.ui.mount({
    plugin: 'agent-stage', surface: 'terminal', component: 'Pane', requestId: 'agent-stage',
    props: { title: 'Agents Office', isFocused: false, bodyColumns, placement: 'dock', scroll: { offset: 0, bodyRows }, view: {} },
  })

  for (const rows of [30, 16, 5]) {
    const pane = await mount(rows)
    expect(await pane.findAll({ type: 'Raster' })).toHaveLength(2)
    expect(await pane.find({ type: 'Text', text: /Tester/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /Task 1: test the build/ })).toBeDefined()
    await pane.unmount()
  }

  const narrow = await mount(30, 30)
  expect(await narrow.findAll({ type: 'Raster' })).toHaveLength(0)
  expect(await narrow.find({ type: 'Text', text: /Tester/ })).toBeDefined()
  await narrow.unmount()
})
