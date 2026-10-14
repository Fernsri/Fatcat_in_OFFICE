# agent-office-cats: the Agents Office, with office cats

A fork of [Saharat's agent-stage](https://github.com/Saharatjj/agent-stage) that
adds a third skin, chubby office cats, and makes it the default.

![The office cats: seven roles in five poses](docs/office-cats.png)

A Claude Code mod that shows what Claude and its subagents are doing while they
work: a card per agent with an animated pixel figure for its role, and a 0 to
100% progress bar above the prompt. Works in the terminal and in the desktop
app's Code tab.

## What you see

- **A card per agent.** The lead (Main) first, then up to six subagents, running ones first. Each card shows:
  - the task (for Main, your request)
  - the status: `● Working`, `◐ Thinking`, `✓ Done in 34s`, `✗ Failed after 20s` or `○ Idle`, with its tool-call count
  - what it is doing right now, in a few words: "Reading progress.ts", "Running npm test"
  - the tools, MCP servers and skills it used: `Tools Read ×3, Grep · MCP playwright · Skills pdf`
- **A figure per role**, chosen from the subagent's type and description:

  | Role | Office cats (default) | Space crew | Robots |
  | --- | --- | --- | --- |
  | Team Lead (Main) | orange tabby in a suit, marker, whiteboard | Commander, gold visor | headset, tablet |
  | Planner | blue-grey cat, coffee mug | Navigator, glass bubble helmet | cap, clipboard |
  | Coder | golden cat, laptop | Engineer, scan-slit helmet | beanie, laptop |
  | Tester | calico cat, LAN cable | Test pilot, orange suit | goggles, flask |
  | Reviewer | siamese cat, checklist | Inspector, porthole helmet | monocle, stamp |
  | Researcher | pink tabby, magnifying glass | Astronomer, fur-hooded parka | glasses, magnifying glass |
  | Designer | white cat, iPad | Star artist, paint-splat suit | beret, paintbrush |

  The cats wear overalls in their role's color.

  Figures walk while working, think after a quiet spell, cheer when done and slump on failure.
- **Sized to the terminal.** The figures shrink to fit every card on screen: your chosen size, then the bust, the head only, then half size. With more agents than that fits, the cards keep their small figures and the pane scrolls.
- **A progress bar** above the prompt: done tasks over all tasks when Claude keeps a plan, else finished subagents over all, else an estimate from tool calls. It only moves forward during a turn and holds at 95% until the turn is done.

## Install

In a terminal Claude Code session:

```
/plugin install agent-office-cats --marketplace Fernsri/agent-office-cats
```

Answer `y` to add the marketplace, then choose the user scope. Installed at the
user scope, it also loads in the desktop app's Code tab. Open the pane any time
with `/office`. It is named apart from agent-stage, so both can be installed;
enable one at a time, or you get two progress bars.

## Settings

Set them with `/plugin configure agent-office-cats@jitapa-mods` in a terminal session.

| Setting | Values | Default |
| --- | --- | --- |
| `skin` | `office-cats`, `space-crew`, `robots` | `office-cats` |
| `robotSize` | `bust` (head and bubble, 28 × 9 cells), `full` (32 × 16 cells); terminal only | `bust` |
| `backdrop` | `skin` (the figures' own), `terminal` (your terminal's background) | `skin` |
| `theme` | `neon`, `ocean`, `sunset`, `mono` (header and bar colors) | `neon` |
| `fps` | 4 to 30, how often the terminal repaints | `12` |
| `autoOpenPane` | open the pane when a session starts | `true` |

## Update

```
claude plugin update agent-office-cats@jitapa-mods
```

then `/reload-plugins` in any open session.

What changed in each version: [CHANGELOG.md](CHANGELOG.md).

## Develop

The hooks live in `hooks/`: `register.tsx` wires the events and draws the
pane and band; `cards.ts`, `run.ts`, `activity.ts` and `progress.ts` hold the
logic; `cats.ts`, `robots.ts` and `astronauts.ts` draw the figures, and
`stage.ts` holds the table of skins, so a new skin is one more entry there.

```
claude plugin validate .
claude plugin test .
```
