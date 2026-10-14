# Release notes

Each version of agent-office-cats, newest first (0.6.0 and earlier are
Saharat's agent-stage). Update with
`claude plugin update agent-office-cats@jitapa-mods`, then `/reload-plugins`.

## 0.8.0 (2026-10-14)

**The Cat Office: a compact layout and plain words.**

- The pane is the Cat Office: on the desktop a little pixel-office header (windows, a clock, a plant) with a summary, `2 working · 1 done`; in the terminal the same as one line.
- One thin row per agent instead of a card: a small cat, the role and task, the status and what it is doing, and the row's own little bar. The lead's bar is the whole run's progress; a helper at work gets a sliding bar, since nobody knows how far along it is; a finished one a full green bar, a failed one a full red bar.
- Plain words: `✓ Done (34 sec)`, `✗ Error (20 sec)`, `○ Waiting for you`; beside the progress bar `1 of 2 to-dos done · 2 helpers working`. The tool counts and the list of tools used are gone from the rows.
- The `robotSize` setting is gone: the rows always use the small figure.

## 0.7.0 (2026-10-14)

**The office cats, a fork of agent-stage.**

- A third skin, `office-cats`, and the new default: chubby, brightly colored pixel cats, one per role. The lead is an orange tabby in a suit at a whiteboard; the others wear overalls in the role color and hold their kit: a coffee mug, a laptop, a LAN cable, a checklist, a magnifying glass, an iPad.
- The same five poses as the other skins: walking, thinking with a paw on the chin, jumping for joy, ears flat on failure, dozing when idle.
- Renamed to agent-office-cats in the jitapa-mods marketplace, with the command `/office`, so it installs beside agent-stage.
- The skins are one table in `stage.ts`.

## 0.6.0 (2026-10-13)

**The progress bar gets the usage meter's look and animation.**

- Desktop: the bar now animates, with a glossy sheen, a shimmer sweeping across the fill, and a rounded track, in your theme's colors (neon, ocean, sunset or mono).
- Desktop: the bar stretches to fill the row beside its label instead of a fixed 240px.
- Desktop: the bar is redrawn only when the percent changes, so the shimmer runs smoothly between updates.
- Terminal: a slim ━ line with a half-cell edge, matching the usage meter, still in your theme's gradient with its sweeping shimmer.

## 0.5.4 (2026-10-12)

**The terminal pane is sized to the terminal.**

- Figures shrink until every card fits on screen: your chosen size, then the bust, then the head only, then half size.
- With more agents than half-size cards can fit, the cards keep their small figures and the pane scrolls. Figures never give way to text, except in a pane too narrow for any figure (under about 39 columns).
- With the small figures (head only, half size), the role name sits beside the task, so each card is one row shorter.
- Half-size figures keep their outlines, visors and eyes: each 2 × 2 block of pixels takes its most common colour.

## 0.5.1 (2026-10-12)

**Safer text and fewer redraws.**

- Commands, file names, prompts, agent names, and tool and skill names are cleaned before they're drawn: escape sequences, control characters and text-direction overrides are removed.
- When the animation stops, the pane redraws once instead of twice.
- The README now explains installing from GitHub: `/plugin install agent-stage --marketplace Saharatjj/agent-stage`.

## 0.5.0 (2026-10-12)

**First release: the Agents Office.**

- A card per agent, the lead (Main) first, then up to six subagents with running ones first. Each card shows the task, the status, what the agent is doing now, and the tools, MCP servers and skills it has used.
- An animated pixel figure for each of seven roles: Team Lead, Planner, Coder, Tester, Reviewer, Researcher, Designer. There are two skins: space crew (the default) and robots.
- Figures walk while working, think after a quiet spell, cheer when done and slump on failure. Finished figures are still pictures.
- A 0 to 100% progress bar above the prompt. It only moves forward during a turn.
- Works in the terminal and in the desktop app's Code tab.
- Settings: `skin`, `robotSize`, `backdrop`, `theme`, `fps`, `autoOpenPane`.
