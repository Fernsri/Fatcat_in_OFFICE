export type AgentStatus = 'running' | 'done' | 'failed'

/** What a card lists as used: a tool, an MCP server, or a skill, with a count. */
export type UsedKind = 'tool' | 'mcp' | 'skill'
export type Used = { name: string; kind: UsedKind; count: number }

export type StageAgent = {
  id: string
  label: string
  /** The task the subagent was given, cut to a few hundred characters. */
  prompt: string
  type: string
  status: AgentStatus
  activity: string
  /** The last thing it did, in a few words: "Reading progress.ts". */
  doing?: string
  used?: Used[]
  /** Every tool call it made; `used` keeps the 16 most used names only. */
  calls?: number
  /** When it last started or finished a tool call; a gap after it reads as thinking. */
  lastActiveAt?: number
  startedAt: number
  endedAt: number | null
}

export type StageTask = {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed'
}

export type StageRun = {
  isWorking: boolean
  turnStartedAt: number
  mainActivity: string
  /** What the person asked for in the current turn, cut short. */
  mainTask: string
  mainDoing?: string
  mainUsed?: Used[]
  /** The lead's own tool calls for the current request (toolCount counts subagents' too). */
  mainCalls?: number
  /** When the lead last started or finished a tool call. */
  mainActiveAt?: number
  toolCount: number
  agents: StageAgent[]
  tasks: StageTask[]
}

declare module 'claude-code' {
  interface PluginState {
    'agent-office-cats': { run: StageRun }
  }
}
