---
name: devin-handoff
description: Scope a piece of work on RPS Chaos into a well-formed Devin (Cognition's AI software engineer) task and hand it off via the Devin CLI or web session, instead of implementing it directly. Use whenever the user wants to delegate a feature, fix, or task to Devin, asks to "send this to Devin," start a Devin session, or generally wants to offload implementation work rather than have it done here.
---

# Hand a task off to Devin

Today's default for this repo: prefer drafting a well-scoped Devin task over implementing directly, when the work is a self-contained feature/fix. Reserve direct implementation here for things Devin isn't a good fit for (fast one-liners, exploratory planning, reviewing/merging Devin's PRs, anything requiring this conversation's context).

## One-time setup

```bash
curl -fsSL https://cli.devin.ai/install.sh | bash
```

(~2 min.) Before the first session: index this repo and confirm Devin's environment has access to it and the correct branch (`main`, `github.com/tim13246879/rps-chaos`).

## Ask mode vs. Agent mode

- **Ask mode** — lightweight, for exploring the codebase and planning. Use it first for anything not already clearly scoped: "how would you add a new gesture to the classifier," "what's the smallest change to add a win-streak counter." Devin can search the code and propose a plan without touching anything.
- **Agent mode** — full autonomous mode: writes code, runs commands, opens PRs. Trigger it once you (or an Ask-mode session) have a concrete plan, or directly for a task that's already well-scoped.

Default flow: Ask mode to get a plan → confirm it looks right → Agent mode to execute.

## Scoping a good task

Devin's own guidance: pick something with **clear success criteria** and **under ~3 hours** of work. For this repo, good candidates are self-contained and fit the existing pure-function architecture (see `AGENTS.md`) so they're easy to verify:

- Add a new gesture (e.g. lizard/spock) — scoring in `classifier.ts`, counter logic in `moves.ts`, tests in `src/test/`.
- Add a win-streak counter or scoreboard to `PredictionPanel`.
- Add a sound/visual effect on a clean lock.
- Add more edge-case coverage to `src/test/classifier.test.ts` or `round.test.ts`.
- A settings panel exposing `LOCK_CONFIDENCE`/`LOCK_MARGIN` as adjustable values.

Bad candidates: anything requiring a live webcam to iterate on tuning (see `docs/operations.md#tuning-the-gesture-classifier` — that's a fast local feedback loop, not a good Devin task), or anything needing back-and-forth design judgment better suited to this conversation.

## Task prompt template

Paste this into the Devin session (Ask or Agent), filling in the brackets:

```
Repo: tim13246879/rps-chaos (branch: main)
Context: read AGENTS.md first, then docs/architecture.md for the data-flow/state-machine, and
docs/operations.md if the task touches running/tuning/demoing the app.

Goal: [what to build/fix]

Acceptance criteria:
- [specific, checkable outcome]
- npm test passes, including new/updated cases in src/test/
- npm run build passes
- [if it touches vision/game/round.ts: note that camera behavior can only be verified live —
  see docs/operations.md#running-the-app, and use Devin's testing/video recording to show it working]

Keep the change minimal and consistent with the existing style (functional components, pure
functions in vision/ and game/, no unnecessary comments or abstractions — this is a lean
hackathon codebase, see AGENTS.md's Conventions section).
```

Use `@Files` (or `@Repos`) mentions to attach `AGENTS.md`, `docs/architecture.md`, and `docs/operations.md` directly if the session supports it, rather than relying on Devin to find them unprompted.

## Reviewing Devin's work

Don't merge on green tests alone for anything touching `vision/`, `game/round.ts`, or the components — `npm test`/`npm run build` don't prove gesture detection or camera behavior. Ask Devin for its test/video recording of the browser flow, and separately re-verify locally via the `run-rps-chaos` skill / `docs/operations.md#running-the-app` before treating it as done.
