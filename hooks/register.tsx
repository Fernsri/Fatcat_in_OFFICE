import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { StageAgent, StageRun, StageTask } from '../types'
import { addUsed, describeCall, safeText, usedOf } from './activity'
import { bandLabel, buildCards, robotOf, visibleSig } from './cards'
import { fitPane } from './fit'
import { progressOf } from './progress'
import { BUST, cropCells, FRAME_MS, FRAMES, FULL, ROLES } from './robots'
import type { Crop, Pose } from './robots'
import { startTurn } from './run'
import { barFrame, barSvg, figureName, figureStillSvg, figureSvg, robotCells, skinNamed, themeNamed, THEMES } from './stage'
import type { Skin, Theme } from './stage'

const PANE = 'agent-office-cats'
const EMPTY: StageRun = {
  isWorking: false,
  turnStartedAt: 0,
  mainActivity: 'idle',
  mainTask: '',
  toolCount: 0,
  agents: [],
  tasks: [],
}
const runAtom = atom({ plugin: 'agent-office-cats', key: 'run' } as const, EMPTY)

/** The pane redraws at most this often, however many updates arrive. */
const REDRAW_MS = 1500

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0')
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const isLive = (r: StageRun) => r.isWorking || r.agents.some(a => a.status === 'running')
const frameAt = (seconds: number) => Math.floor((seconds * 1000) / FRAME_MS) % FRAMES
const animated = (pose: Pose) => pose === 'walk' || pose === 'think'
const POSE_WORDS: Record<Pose, string> = { walk: 'at work', think: 'thinking', done: 'cheering, done', fail: 'stopped by an error', idle: 'waiting' }

// Module state. `snap` is the live run: every event updates it at once. The
// copy in $.state (which survives a hot reload, and whose writes redraw the
// pane and the band) is brought up to date at most every REDRAW_MS, and only
// when something on screen would change, so a burst of updates is one redraw.
let theme: Theme = THEMES.neon
let fps = 12
let frameMs = 83
let crop: Crop = BUST
let transparent = false
let skin: Skin = 'robots'
let snap: StageRun = EMPTY
let snapLive = false // `snap` is newer than $.state (loaded, or updated since)
let dirty = false // `snap` changed since $.state was written
let t = 0
let nowMs = 0 // the clock as last read, moved on by the loop between events
let lastRedrawAt = -Infinity
let drawnSig = '' // what the pane and band last showed
let lastFrame = -1
let timer: { cancel: () => void } | null = null
let pane: { keys: string[]; crop: Crop } | null = null // terminal cards whose figures are painted per frame, and their size
let band: { requestId: string; columns: number } | null = null // the terminal bar, painted per frame
let peak = { turn: -1, p: 0 } // the highest progress shown this turn

/** Progress as the bar shows it: never lower than it already showed this turn. */
function shownProgress(run: StageRun): number {
  const p = progressOf(run)
  if (!run.isWorking) return p
  if (peak.turn !== run.turnStartedAt) peak = { turn: run.turnStartedAt, p: 0 }
  peak.p = Math.max(peak.p, p)
  return peak.p
}

function setRun($: EngineInterface, fn: (r: StageRun) => StageRun) {
  snap = fn(snap)
  snapLive = true
  dirty = true
  ensureLoop($)
}

function setAgent($: EngineInterface, id: string, fn: (a: StageAgent) => StageAgent) {
  setRun($, r => ({ ...r, agents: r.agents.map(a => (a.id === id ? fn(a) : a)) }))
}

/**
 * Brings the screen up to date, at most every REDRAW_MS: writes `snap` to
 * $.state when it changed (the write redraws the readers), else redraws only
 * if what is shown has changed by itself (a figure starting to think).
 * `force` writes now, as the loop stops, so nothing is left unsaved.
 * Says whether it redrew.
 */
function refresh($: EngineInterface, force = false): boolean {
  if (!force && nowMs - lastRedrawAt < REDRAW_MS) return false
  const sig = visibleSig(snap, nowMs, shownProgress(snap), theme)
  if (dirty && (force || sig !== drawnSig)) {
    dirty = false
    lastRedrawAt = nowMs
    drawnSig = sig
    const run = snap
    void update($, runAtom, () => run)
    return true
  }
  if (sig !== drawnSig) {
    lastRedrawAt = nowMs
    drawnSig = sig
    $.ui.invalidate('ui.render')
    return true
  }
  return false
}

function paint($: EngineInterface) {
  const frame = frameAt(t)
  if (frame !== lastFrame) {
    lastFrame = frame
    for (const key of pane?.keys ?? []) {
      const who = robotOf(snap, key, nowMs)
      if (!who || !pane) continue
      const cells = robotCells(who.role, who.pose, frame, pane.crop, transparent, skin)
      void $.ui.blit({ requestId: PANE, key: `bot-${key}`, cells }).then(r => {
        if (r.deny) pane = null // closed or redrawn: the next render re-seats it
      })
    }
  }
  if (band) {
    const cells = barFrame(shownProgress(snap), t, band.columns, theme)
    void $.ui.blit({ requestId: band.requestId, key: 'bar', cells }).then(r => {
      if (r.deny) band = null
    })
  }
}

// Runs only while something is live, then saves and redraws once and stops.
function ensureLoop($: EngineInterface) {
  if (timer) return
  let ticks = 0
  let idleTicks = 0
  timer = $.clock.every(frameMs, () => {
    t += frameMs / 1000
    nowMs += frameMs
    ticks += 1
    paint($)
    refresh($)
    // the terminal ticks elapsed seconds; its redraws are cheap and never flash
    if ((pane || band) && ticks % fps === 0) $.ui.invalidate('ui.render')
    idleTicks = isLive(snap) ? 0 : idleTicks + 1
    if (idleTicks > fps * 3) {
      timer?.cancel()
      timer = null
      if (!refresh($, true)) $.ui.invalidate('ui.render') // one last redraw, never two
    }
  })
}

export const register: Register = (on, options) => {
  theme = themeNamed(String(options.theme))
  fps = clamp(Number(options.fps) || 12, 4, 30)
  frameMs = Math.round(1000 / fps)
  crop = options.robotSize === 'full' ? FULL : BUST
  transparent = options.backdrop === 'terminal'
  skin = skinNamed(String(options.skin))
  timer = null // a reload drops the old environment's timers
  lastFrame = -1
  snapLive = false

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'office', description: 'Open the Agents Office: Main and its subagents at work' })
    snap = await read($, runAtom)
    snapLive = true
    nowMs = await $.clock.now()
    if (options.autoOpenPane !== false) void $.ui.open({ id: PANE, title: 'Agents Office' })
    if (isLive(snap)) ensureLoop($)
    return next(e)
  })

  on('command.run', { command: 'office' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Agents Office' })
    return { text: 'Agents Office opened.' }
  })

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      snap = EMPTY
      dirty = false
      await update($, runAtom, () => EMPTY)
    }
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    const now = await $.clock.now()
    nowMs = now
    setRun($, r => startTurn(r, e.text, now))
    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (started.agentId) {
      const now = await $.clock.now()
      nowMs = now
      const agent: StageAgent = {
        id: started.agentId,
        label: safeText(e.description || e.subagentType).slice(0, 120),
        prompt: safeText(e.prompt).slice(0, 400),
        type: safeText(e.subagentType).slice(0, 80),
        status: 'running',
        activity: 'starting',
        startedAt: now,
        lastActiveAt: now,
        endedAt: null,
      }
      setRun($, r => ({ ...r, agents: [...r.agents, agent].slice(-24) }))
    }
    return started
  }).catch(($, e, next) => next(e)) // never refuse a spawn over a drawing

  on('tool.call', async ($, e, next) => {
    const who = e.agentId
    const input = e as unknown as Record<string, unknown>
    const used = usedOf(e.tool, input)
    const doing = describeCall(e.tool, input)
    const at = await $.clock.now()
    nowMs = at
    setRun($, r => ({
      ...r,
      toolCount: r.toolCount + 1,
      mainActivity: who ? r.mainActivity : e.tool,
      mainDoing: who ? r.mainDoing : doing,
      mainUsed: who ? r.mainUsed : addUsed(r.mainUsed, used),
      mainCalls: who ? r.mainCalls : (r.mainCalls ?? 0) + 1,
      mainActiveAt: who ? r.mainActiveAt : at,
      agents: who
        ? r.agents.map(a => (a.id === who ? { ...a, activity: e.tool, doing, used: addUsed(a.used, used), calls: (a.calls ?? 0) + 1, lastActiveAt: at } : a))
        : r.agents,
    }))
    if (e.tool === 'TodoWrite') {
      const tasks: StageTask[] = e.todos.map((todo, i) => ({ id: `todo-${i}`, title: todo.content, status: todo.status }))
      setRun($, r => ({ ...r, tasks }))
    }

    const ran = await next(e)

    if (e.tool === 'TaskCreate' && !ran.deny && !ran.isError) {
      const id = (ran.result as { task?: { id?: string } } | undefined)?.task?.id
      if (id) setRun($, r => ({ ...r, tasks: [...r.tasks, { id, title: e.subject, status: 'pending' }] }))
    }
    if (e.tool === 'TaskUpdate' && e.status && !ran.deny && !ran.isError) {
      const status = e.status
      setRun($, r => ({
        ...r,
        tasks:
          status === 'deleted'
            ? r.tasks.filter(task => task.id !== e.taskId)
            : r.tasks.map(task => (task.id === e.taskId ? { ...task, status } : task)),
      }))
    }
    const after = await $.clock.now()
    nowMs = after
    if (who) setAgent($, who, a => (a.status === 'running' ? { ...a, activity: 'thinking', lastActiveAt: after } : a))
    else setRun($, r => ({ ...r, mainActivity: r.isWorking ? 'thinking' : r.mainActivity, mainActiveAt: after }))

    return ran
  }).catch(($, e, next) => next(e)) // a display mod never blocks a tool

  on('turn.complete', async ($, e, next) => {
    const now = await $.clock.now()
    nowMs = now
    if (e.agentId) {
      const status = e.reason === 'answer' ? 'done' : 'failed'
      setAgent($, e.agentId, a => ({ ...a, status, activity: status, endedAt: now }))
    } else {
      setRun($, r => ({ ...r, isWorking: false, mainActivity: 'idle' }))
    }
    return next(e)
  })

  // ── the Agents Office pane: one card per agent, each with its figure ────────
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const stored = await read($, runAtom) // read to be redrawn when $.state is written
    const r = snapLive ? snap : stored
    const now = await $.clock.now()
    nowMs = now
    lastRedrawAt = now
    drawnSig = visibleSig(r, now, shownProgress(r), theme)
    const cards = buildCards(r, now, e.surface === 'terminal', theme)

    if (e.surface === 'terminal') {
      // Figures sized to the room the terminal gives the pane: the biggest
      // that fits every card, down to half size; past that the pane scrolls.
      const { Box, Text, Raster } = $.ui.resolve(e)
      const frame = frameAt(t)
      const fit = fitPane(cards.length, e.props.scroll.bodyRows, e.props.bodyColumns, crop)
      const figure = fit.figure
      const art = figure ? cropCells(figure) : null
      pane = figure ? { keys: cards.map(c => c.key), crop: figure } : null
      if (isLive(r)) ensureLoop($)
      return (
        <Box flexDirection="column">
          <Text bold color={hex(theme.main)} wrap="truncate-end">Agents Office</Text>
          {cards.map(card => {
            const role = ROLES[card.robot.role]
            return (
              <Box key={card.key} flexDirection="row" borderStyle="round" borderColor={card.live ? role.color : undefined} gap={1}>
                {figure && art ? (
                  <Box flexDirection="column" alignItems="center" flexShrink={0}>
                    <Raster
                      key={`bot-${card.key}`}
                      columns={art.columns}
                      rows={art.rows}
                      cells={robotCells(card.robot.role, card.robot.pose, frame, figure, transparent, skin)}
                    />
                    {fit.labelBelow ? <Text bold color={role.color} wrap="truncate-end">{role.label}</Text> : null}
                  </Box>
                ) : null}
                <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0} paddingX={1}>
                  {fit.labelBelow ? (
                    <Text bold wrap="truncate-end">{card.title}</Text>
                  ) : (
                    <Box flexDirection="row" gap={1}>
                      <Box flexShrink={0}><Text bold color={role.color}>{role.label}</Text></Box>
                      <Box flexGrow={1} flexShrink={1} minWidth={0}><Text bold wrap="truncate-end">{card.title}</Text></Box>
                    </Box>
                  )}
                  <Text color={card.statusColor} wrap="truncate-end">{card.status}</Text>
                  <Text wrap="truncate-end">{card.doing}</Text>
                  <Text dimColor wrap="truncate-end">{card.used}</Text>
                </Box>
              </Box>
            )
          })}
        </Box>
      )
    }

    // Desktop, editor and phone draw SVG. A working figure is a self-animating
    // drawing; a done, failed or idle one is a still picture, which a redraw
    // leaves in place, so near the end of a run almost nothing can flash.
    const { Box, Text, Svg } = $.ui.resolve(e)
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold color={hex(theme.main)}>Agents Office</Text>
        {cards.map(card => {
          const role = ROLES[card.robot.role]
          const moving = card.live && animated(card.robot.pose)
          return (
            <Box key={card.key} flexDirection="row" borderStyle="round" borderColor={card.live ? role.color : undefined} gap={2} paddingX={1} paddingY={1}>
              <Box flexDirection="column" alignItems="center" flexShrink={0}>
                <Svg
                  source={moving ? figureSvg(skin, card.robot.role, card.robot.pose) : figureStillSvg(skin, card.robot.role, card.robot.pose)}
                  alt={`${figureName(skin, card.robot.role)}, ${POSE_WORDS[card.robot.pose]}`}
                  width={96}
                  height={96}
                  isInteractive={moving}
                />
                <Text bold color={role.color} wrap="truncate-end">{role.label}</Text>
              </Box>
              <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
                <Text bold wrap="truncate-end">{card.title}</Text>
                <Text color={card.statusColor} wrap="truncate-end">{card.status}</Text>
                <Text wrap="truncate-end">{card.doing}</Text>
                <Text dimColor wrap="truncate-end">{card.used}</Text>
              </Box>
            </Box>
          )
        })}
      </Box>
    )
  })

  // ── the progress band above the prompt ──────────────────────────────────────
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const stored = await read($, runAtom)
    const r = snapLive ? snap : stored
    if (!e.props.isWorking && !isLive(r)) {
      band = null
      return next(e)
    }

    const now = await $.clock.now()
    const p = shownProgress(r)

    if (e.surface === 'terminal') {
      const { Box, Text, Raster } = $.ui.resolve(e)
      const label = ' ' + bandLabel(r, now, p, true)
      const columns = clamp(e.props.bodyColumns - label.length - 1, 8, 48)
      band = { requestId: e.requestId, columns }
      ensureLoop($)
      return (
        <Box flexDirection="row">
          <Raster key="bar" columns={columns} rows={1} cells={barFrame(p, t, columns, theme)} />
          <Text dimColor wrap="truncate">{label}</Text>
        </Box>
      )
    }

    const { Box, Text, Svg } = $.ui.resolve(e)
    const label = bandLabel(r, now, p, false)
    // Fill the row beside the label: the desktop app lays out about 8px per cell.
    const width = clamp((e.props.bodyColumns - label.length - 3) * 8, 120, 720)
    return (
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Svg source={barSvg(p, width, theme)} alt={label} width={width} height={6} isInteractive />
        <Text dimColor>{label}</Text>
      </Box>
    )
  })
}
