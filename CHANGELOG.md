# Release notes

Each version of agent-office-cats, newest first (0.6.0 and earlier are
Saharat's agent-stage). Update with
`claude plugin update agent-office-cats@jitapa-mods`, then `/reload-plugins`.

## 0.18.0 (2026-10-15)

**No dark mode after all.**

- The dark paper and ink, the `appearance` setting and following Claude's theme are gone again; the Cat Office keeps its cream paper. The seven rows and the gray Tester stay.

## 0.17.0 (2026-10-15)

**The whole team, day and night.**

- All seven cats are always in the Cat Office, one row each in a fixed order: Team Lead, Planner, Researcher, Coder, Tester, Reviewer, Designer. A cat with no job sleeps (Zzz) in a dimmed row, "Napping · no job yet", and wakes when Claude hands its role a job. Several jobs for one role show the latest with "×2". The summary counts the nappers: `2 working · 1 done · 4 napping`.
- Dark mode: each theme has a dark paper and light ink, so the header, the cats' backdrop and the tracks never glare on a dark screen. New setting `appearance`: `auto` (follow Claude's theme setting, live), `light` or `dark`.
- The Tester is a plain gray cat (the blue-gray cat turned gray).

## 0.16.0 (2026-10-15)

**A thinking cat, and a sharper walker.**

- Thinking has its own look: the cat sits still under a pixel thought bubble whose three dots fill in one by one, in the file's ink. Before, it was the walk.
- The cat walking the progress bar is the orange tabby at half size (about 43 × 40) instead of 32 × 32; the band is 56 px tall to fit it.

## 0.15.0 (2026-10-15)

**The user's own cats.**

- The office cats are now the user's pixel_cats_100x100_true_colors cats: seven round cats, five 100 × 100 takes each, colors reduced to 20 a cat so the drawings stay small enough to show. The file's drawCat is ported as it was: walking at work, blinking in thought, happy (with a blush) when done, surprised ("!") on failure, asleep (Zzz) when idle, a frame every 210 ms.
- On the desktop each row shows its cat at 100 × 100, one pixel for one pixel; the terminal and the walker on the progress bar get it shrunk to 32 × 32.
- The cats wear nothing and hold nothing: no overalls, suit, kit or whiteboard.

## 0.14.0 (2026-10-14)

**Rice-ball cats.**

- The cats are shaped like onigiri: a small round crown, shoulders sloping evenly out to a broad, rounded base, instead of a box. The ears sit on the crown, the tail curls out beside the wider base.
- Coat markings are painted only on fur, so stripes and patches never bump the round outline.
- The little cat walking the progress bar has the same round crown.

## 0.13.0 (2026-10-14)

**A matcha café.**

- The `matcha` theme is now café colors: cream paper (#F7F4E3), three matcha greens (#C9D9A6, #8DAA62, #5F7A3D), chocolate ink (#5B3A24), and a soft coral for errors (#E0705A).
- The Cat Office header is a café sign: graph paper, a scalloped green edge, "CAT OFFICE" in chunky pixel letters, a cup of matcha latte, the summary in a rounded tag, and a heart.
- On the desktop the cats sit on graph paper.
- Kind words: `✓ Purr-fect! All done`, `✗ Oops! Hit an error … Take a sip and try again`, `✗ Oops, error (20 sec)`, `All quiet · nap time`.
- Animated figures leave their empty pixels clear, so what is drawn under them shows through steadily.

## 0.12.0 (2026-10-14)

**Tells you when it is done.**

- A toast when Claude finishes (`✓ All done · 2 min 14 sec · 3 helpers finished`), stops on an error (`✗ Stopped by an error · 45 sec`), or a helper has an error (`✗ Task 2 had an error: test the build`). Stopping it yourself says nothing.
- A desktop notification for the same, once Claude worked at least 30 seconds, so you hear back after looking away.
- Settings: `toasts` (on) and `notifyAfterSeconds` (30; 0 turns notifications off).

## 0.11.0 (2026-10-14)

**The whole pane in the theme.**

- Each theme now has a paper and an ink color. With `matcha` the Cat Office header's wall and the cats' backdrop are cream green (#ECEFD6) and its words forest green (#3D5039).
- The row bars, the stripe beside a working row and the working status take the theme's color instead of the role's; done stays the theme's done color and an error stays red. Role names and the cats' overalls keep their role colors, so you can still tell who is who.

## 0.10.0 (2026-10-14)

**Soft greens.**

- A new theme, `matcha`, and the new default: the progress bar runs from a soft sage (#A0C18C) to a leaf green (#5E9B68) over a deep forest track (#3D5039), in the terminal and on the desktop. The header and the done color take the leaf green.
- `neon`, `ocean`, `sunset` and `mono` are still a setting away.

## 0.9.0 (2026-10-14)

**A cat walks the progress bar.**

- Desktop, with the office cats: the bar above the prompt is taller, and a little orange tabby in a suit walks at its tip toward a fish waiting at the end, blinking now and then.
- After an answer the band stays 2.5 seconds: the bar full, the fish gone, the cat cheering with hearts rising, and "All done!" beside it. Then it goes.
- The terminal bar is unchanged, and so is the desktop bar with the robots or the space crew.

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
