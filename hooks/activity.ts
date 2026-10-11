// Short summaries of what an agent is doing, for the cards. Pure, no `$`.

import type { Used, UsedKind } from '../types'

const MAX_USED = 16

const base = (p: unknown) => (typeof p === 'string' ? p.split(/[\\/]/).filter(Boolean).pop() ?? p : '')
const cut = (text: unknown, n: number) => {
  const s = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
const words = (name: string) => name.replace(/[_-]+/g, ' ').trim()

/** An MCP tool's server and tool, read off its wire name `mcp__<server>__<tool>`. */
export function mcpParts(tool: string): { server: string; name: string } | null {
  const m = /^mcp__(.+?)__(.+)$/.exec(tool)
  if (!m) return null
  let server = m[1] ?? ''
  // plugin servers read plugin_<plugin>_<server>; a claude.ai connector is an id
  server = server.replace(/^plugin_/, '')
  const halves = server.split('_')
  if (halves.length === 2 && halves[0] === halves[1]) server = halves[0] ?? server
  if (/^[0-9a-f]{8}-/.test(server)) server = 'connector'
  return { server: words(server), name: words(m[2] ?? '') }
}

/** What one tool call counts as on a card: a tool, an MCP server, or a skill. */
export function usedOf(tool: string, input: Record<string, unknown>): { name: string; kind: UsedKind } {
  if (tool === 'Skill' && typeof input.skill === 'string') return { name: input.skill, kind: 'skill' }
  const mcp = mcpParts(tool)
  if (mcp) return { name: mcp.server, kind: 'mcp' }
  return { name: tool, kind: 'tool' }
}

/** The list with one more use of `item`, most used first, at most MAX_USED names. */
export function addUsed(list: readonly Used[] | undefined, item: { name: string; kind: UsedKind }): Used[] {
  const next = [...(list ?? [])]
  const at = next.findIndex(u => u.name === item.name && u.kind === item.kind)
  if (at >= 0) {
    const cur = next[at]
    if (cur) next[at] = { ...cur, count: cur.count + 1 }
  } else next.push({ ...item, count: 1 })
  return next.sort((a, b) => b.count - a.count).slice(0, MAX_USED)
}

/** One line: "Tools Read ×3, Grep · MCP playwright · Skills pdf". */
export function usedLine(list: readonly Used[] | undefined): string {
  const groups: [UsedKind, string][] = [['tool', 'Tools'], ['mcp', 'MCP'], ['skill', 'Skills']]
  return groups
    .map(([kind, label]) => {
      const names = (list ?? []).filter(u => u.kind === kind).map(u => (u.count > 1 ? `${u.name} ×${u.count}` : u.name))
      return names.length ? `${label} ${names.join(', ')}` : ''
    })
    .filter(Boolean)
    .join(' · ')
}

/** What a tool call is doing, in a few words: "Reading progress.ts", "Running npm test". */
export function describeCall(tool: string, input: Record<string, unknown>): string {
  switch (tool) {
    case 'Read': return `Reading ${base(input.file_path)}`
    case 'Edit':
    case 'MultiEdit': return `Editing ${base(input.file_path)}`
    case 'Write': return `Writing ${base(input.file_path)}`
    case 'NotebookEdit': return `Editing ${base(input.notebook_path)}`
    case 'Grep': return `Searching for "${cut(input.pattern, 30)}"${input.path ? ` in ${base(input.path)}` : ''}`
    case 'Glob': return `Finding files ${cut(input.pattern, 40)}`
    case 'Bash':
    case 'PowerShell': return `Running ${cut(String(input.command ?? '').split('\n')[0], 50)}`
    case 'WebFetch': {
      const url = typeof input.url === 'string' ? input.url : ''
      return `Fetching ${url.replace(/^https?:\/\//, '').split('/')[0] ?? url}`
    }
    case 'WebSearch': return `Searching the web for "${cut(input.query, 40)}"`
    case 'Skill': return `Using the ${String(input.skill ?? '')} skill`
    case 'Agent':
    case 'Task': return `Delegating: ${cut(input.description, 50)}`
    case 'TodoWrite':
    case 'TaskUpdate': return 'Updating the plan'
    case 'TaskCreate': return `Planning: ${cut(input.subject, 50)}`
  }
  const mcp = mcpParts(tool)
  if (mcp) return `Using ${mcp.server}: ${mcp.name}`
  return `Using ${tool}`
}

const INJECTED = 'agent-message|task-notification|system-reminder|command-name|command-message|command-args|local-command-stdout'
const INJECTED_BLOCK = new RegExp(`<(${INJECTED})\\b[^>]*>[\\s\\S]*?</\\1\\s*>`, 'g')
const INJECTED_OPEN = new RegExp(`^<(${INJECTED})\\b`)

/**
 * The person's request with anything the harness put around it taken out, or
 * null when nothing of theirs is left: a subagent's hand-back, a task
 * notification, a reminder on its own. A request that merely starts with "<"
 * (say "<Button> won't render") is theirs and stays.
 */
export function cleanTask(text: string): string | null {
  const s = text.replace(INJECTED_BLOCK, ' ').trim()
  if (!s) return null
  if (INJECTED_OPEN.test(s)) return null // an injected block that never closed
  if (/^\[(SYSTEM NOTIFICATION|Subagent hand-back)/i.test(s)) return null
  return cut(s, 160)
}
