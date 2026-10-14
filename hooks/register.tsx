import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { StageAgent, StageRun, StageTask } from '../types'
import { addUsed, describeCall, safeText, usedOf } from './activity'
import { bandLabel, buildCards, officeSummary, robotOf, visibleSig } from './cards'
import { fitRow, rowBarColumns } from './fit'
import { helperAlert, turnAlert } from './notify'
import type { AlertOptions } from './notify'
import { progressOf } from './progress'
import { cropCells, FRAME_MS, FRAMES, ROLES } from './robots'
import type { Crop, Pose } from './robots'
import { startTurn } from './run'
import { bandCatSvg, bannerSvg, barFrame, barSvg, barTheme, figureName, figureStillSvg, figureSvg, mix, robotCells, rowBarSvg, skinNamed, themeNamed, THEMES } from './stage'
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
let theme: Theme = THEMES.matcha
let fps = 12
let frameMs = 83
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
// terminal rows whose figures and bars are painted per frame: the figures' size,
// and each row's bar (the lead's follows the run's progress)
let pane: { keys: string[]; crop: Crop | null; bars: { key: string; p: number | null; color: string }[]; barColumns: number } | null = null
let band: { requestId: string; columns: number } | null = null // the terminal bar, painted per frame
let peak = { turn: -1, p: 0 } // the highest progress shown this turn
let alerts: AlertOptions = { toasts: true, notifyAfterSec: 30 }
let cheerUntil = 0 // after an answer, the desktop band's cat cheers until then

/** How long the cat cheers after an answer, before the band goes. */
const CHEER_MS = 2500

/** The cats' backdrop: the theme's paper; the other skins keep their own. */
function catPaper(): string | undefined {
  return skin === 'office-cats' ? hex(theme.paper) : undefined
}

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
    for (const key of pane?.crop ? pane.keys : []) {
      const who = robotOf(snap, key, nowMs)
      if (!who || !pane?.crop) continue
      const cells = robotCells(who.role, who.pose, frame, pane.crop, transparent, skin, catPaper())
      void $.ui.blit({ requestId: PANE, key: `bot-${key}`, cells }).then(r => {
        if (r.deny) pane = null // closed or redrawn: the next render re-seats it
      })
    }
  }
  for (const bar of pane?.bars ?? []) {
    if (!pane) break
    const p = bar.key === 'main' ? shownProgress(snap) : bar.p
    const cells = barFrame(p, t, pane.barColumns, barTheme(theme, bar.color))
    void $.ui.blit({ requestId: PANE, key: `bar-${bar.key}`, cells }).then(r => {
      if (r.deny) pane = null
    })
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
  transparent = options.backdrop === 'terminal'
  skin = skinNamed(String(options.skin))
  const after = Number(options.notifyAfterSeconds ?? 30)
  alerts = { toasts: options.toasts !== false, notifyAfterSec: Number.isFinite(after) ? Math.max(0, after) : 30 }
  timer = null // a reload drops the old environment's timers
  lastFrame = -1
  snapLive = false

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'office', description: 'Open the Cat Office: Claude and its helpers at work' })
    snap = await read($, runAtom)
    snapLive = true
    nowMs = await $.clock.now()
    if (options.autoOpenPane !== false) void $.ui.open({ id: PANE, title: 'Cat Office' })
    if (isLive(snap)) ensureLoop($)
    return next(e)
  })

  on('command.run', { command: 'office' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Cat Office' })
    return { text: 'Cat Office opened.' }
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
    const alert = e.agentId ? helperAlert(snap, e.agentId, e.reason, alerts) : turnAlert(snap, e.reason, e.durationMs, alerts)
    if (e.agentId) {
      const status = e.reason === 'answer' ? 'done' : 'failed'
      setAgent($, e.agentId, a => ({ ...a, status, activity: status, endedAt: now }))
    } else {
      if (e.reason === 'answer') cheerUntil = now + CHEER_MS
      setRun($, r => ({ ...r, isWorking: false, mainActivity: 'idle' }))
    }
    if (alert.toast) $.ui.toast(alert.toast)
    if (alert.notify) void $.ui.notify(alert.notify, { title: 'Cat Office' }).catch(() => {}) // a hook's deny or a failed write: the toast said it
    return next(e)
  })

  // ── the Cat Office pane: a header, then one thin row per agent ──────────────
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const stored = await read($, runAtom) // read to be redrawn when $.state is written
    const r = snapLive ? snap : stored
    const now = await $.clock.now()
    nowMs = now
    lastRedrawAt = now
    const p = shownProgress(r)
    drawnSig = visibleSig(r, now, p, theme)
    const cards = buildCards(r, now, e.surface === 'terminal', theme, p)
    const summary = officeSummary(cards)
    const paper = catPaper()
    const lines = paper ? hex(mix(theme.paper, theme.barTo, 0.18)) : undefined // the cats sit on graph paper

    if (e.surface === 'terminal') {
      // Each row: the small figure, then the title, the status and what it is
      // doing, and the row's own bar; text alone when the pane is too narrow.
      const { Box, Text, Raster } = $.ui.resolve(e)
      const frame = frameAt(t)
      const figure = fitRow(e.props.bodyColumns)
      const art = figure ? cropCells(figure) : null
      const barColumns = rowBarColumns(e.props.bodyColumns, figure)
      pane = { keys: cards.map(c => c.key), crop: figure, bars: cards.map(c => ({ key: c.key, p: c.bar, color: c.barColor })), barColumns }
      if (isLive(r)) ensureLoop($)
      return (
        <Box flexDirection="column">
          <Box flexDirection="row" gap={1}>
            <Box flexShrink={0}><Text bold color={hex(theme.main)}>Cat Office</Text></Box>
            <Text dimColor wrap="truncate-end">{summary}</Text>
          </Box>
          {cards.map(card => {
            const role = ROLES[card.robot.role]
            return (
              <Box key={card.key} flexDirection="row" gap={1} marginTop={1}>
                {figure && art ? (
                  <Box flexShrink={0}>
                    <Raster
                      key={`bot-${card.key}`}
                      columns={art.columns}
                      rows={art.rows}
                      cells={robotCells(card.robot.role, card.robot.pose, frame, figure, transparent, skin, paper)}
                    />
                  </Box>
                ) : null}
                <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
                  <Box flexDirection="row" gap={1}>
                    <Box flexShrink={0}><Text bold color={role.color}>{role.label}</Text></Box>
                    <Box flexGrow={1} flexShrink={1} minWidth={0}><Text dimColor={card.key.startsWith('role:')} wrap="truncate-end">{card.title}</Text></Box>
                  </Box>
                  <Box flexDirection="row" gap={1}>
                    <Box flexShrink={0}><Text color={card.statusColor}>{card.status}</Text></Box>
                    <Box flexGrow={1} flexShrink={1} minWidth={0}><Text dimColor wrap="truncate-end">{card.doing}</Text></Box>
                  </Box>
                  <Raster key={`bar-${card.key}`} columns={barColumns} rows={1} cells={barFrame(card.bar, t, barColumns, barTheme(theme, card.barColor))} />
                </Box>
              </Box>
            )
          })}
        </Box>
      )
    }

    // Desktop, editor and phone draw SVG: the pixel-office header, then the
    // rows. A working figure and a working helper's bar animate by themselves;
    // a done, failed or idle figure is a still picture, which a redraw leaves
    // in place, so near the end of a run almost nothing can flash.
    const { Box, Text, Svg } = $.ui.resolve(e)
    const width = clamp(e.props.bodyColumns * 8, 240, 720)
    return (
      <Box flexDirection="column" gap={1}>
        <Svg source={bannerSvg(width, summary, theme)} alt={`Cat Office: ${summary}`} width={width} height={56} />
        {cards.map(card => {
          const role = ROLES[card.robot.role]
          const moving = card.live && animated(card.robot.pose)
          return (
            <Box key={card.key} flexDirection="row" alignItems="center" gap={1}>
              <Svg
                source={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 100" width="4" height="100"><rect width="4" height="100" rx="2" fill="${card.live ? hex(theme.main) : '#CFC8C2'}"/></svg>`}
                alt={card.live ? 'at work' : 'resting'}
                width={4}
                height={100}
              />
              <Svg
                source={moving ? figureSvg(skin, card.robot.role, card.robot.pose, paper, lines) : figureStillSvg(skin, card.robot.role, card.robot.pose, paper, lines)}
                alt={`${figureName(skin, card.robot.role)}, ${POSE_WORDS[card.robot.pose]}`}
                width={100}
                height={100}
                isInteractive={moving}
              />
              <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
                <Box flexDirection="row" gap={1}>
                  <Box flexShrink={0}><Text bold color={role.color}>{role.label}</Text></Box>
                  <Box flexGrow={1} flexShrink={1} minWidth={0}><Text dimColor={card.key.startsWith('role:')} wrap="truncate-end">{card.title}</Text></Box>
                </Box>
                <Box flexDirection="row" gap={1}>
                  <Box flexShrink={0}><Text color={card.statusColor}>{card.status}</Text></Box>
                  <Box flexGrow={1} flexShrink={1} minWidth={0}><Text dimColor wrap="truncate-end">{card.doing}</Text></Box>
                </Box>
              </Box>
              <Box flexShrink={0}>
                <Svg
                  source={rowBarSvg(card.bar === null ? null : Math.round(card.bar * 100) / 100, 90, card.barColor, hex(mix(theme.paper, theme.ink, 0.07)))}
                  alt={card.bar === null ? 'working' : `${Math.round(card.bar * 100)}%`}
                  width={90}
                  height={8}
                  isInteractive={card.bar === null}
                />
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
    const now = await $.clock.now()
    // Just after an answer the office cats' desktop band stays a moment: the cat cheers where the fish was.
    const cheering = skin === 'office-cats' && e.surface !== 'terminal' && now < cheerUntil
    if (!e.props.isWorking && !isLive(r) && !cheering) {
      band = null
      return next(e)
    }

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
    const label = cheering && !isLive(r) ? 'Purr-fect! All done' : bandLabel(r, now, p, false)
    // Fill the row beside the label: the desktop app lays out about 8px per cell.
    const width = clamp((e.props.bodyColumns - label.length - 3) * 8, 120, 720)
    return (
      <Box flexDirection="row" alignItems="center" gap={1}>
        {skin === 'office-cats'
          ? <Svg source={bandCatSvg(p, width, theme, cheering && !isLive(r))} alt={label} width={width} height={56} isInteractive />
          : <Svg source={barSvg(p, width, theme)} alt={label} width={width} height={6} isInteractive />}
        <Text dimColor>{label}</Text>
      </Box>
    )
  })
}
