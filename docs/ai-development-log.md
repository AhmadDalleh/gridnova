# AI Development Log — GridNova

Required by the brief (§4.3): ≥ 3 meaningful AI prompt iterations (goal, prompt/approach, original output issue, refinement, independent verification) and ≥ 1 real technical or design weakness in an AI suggestion that I found and corrected. Written by me (Ahmad); Claude Code may draft facts, I write the entries.

## Prompt strategy
- I wrote the specs first (storyboard, simulator model, architecture, requirement IDs); Claude Code builds one slice at a time from them.
- Plan → approve → build → verify from the built file:// page with network blocked → explain-back.
- The simulator model has reference values computed independently; tests must match them.
- I review choreography by watching it, not only by reading code.

## Version history
- v1 (legacy/): first version — single compressed HTML/CSS/JS, CSS-only motion, never browser-tested. Kept for reference.
- v2: modular rebuild (this repository).

---

## Iteration template (copy per entry)

### #N — <title> (slice, date)
- **Goal:**
- **Prompt / approach:**
- **Original output issue:**
- **My refinement:**
- **Independent verification:** (test name, screenshot, what I checked by hand)
- **AI weakness found?** (yes/no — what, how I found it, how I corrected it)
