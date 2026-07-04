# Rock Paper Scissor Chaos

A browser-based rock-paper-scissors "oracle": it watches your webcam during a 3-2-1-SHOOT countdown, predicts which gesture you're about to throw *before you finish revealing it*, and shows you the counter move that beats it. No trained model, no server — hand tracking is MediaPipe Tasks Vision running fully client-side, and gesture recognition is a hand-tuned heuristic scorer over finger-extension features.

Built for **Agents of Chaos**, a one-day hackathon in Vancouver: the chaos here is a game whose entire premise is "make an unpredictable choice" being read and countered before you've committed to it. Rock-paper-scissors only stays fair as long as no one can see your hand coming — this breaks that assumption on purpose, live, in front of you.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`, load the model + camera, calibrate, and start a round. See [`docs/operations.md`](docs/operations.md) for the full walkthrough, tuning notes, and a pre-demo checklist.

## Checks

```bash
npm test
npm run build
```

## Notes

- Webcam access runs locally in the browser through `getUserMedia`; no video ever leaves the machine.
- Hand landmarks come from MediaPipe Tasks Vision, self-hosted (no CDN dependency, works offline after install).
- Gesture recognition is rule-based scoring over finger-extension/angle features, not a trained custom model — see [`docs/architecture.md`](docs/architecture.md) for how a frame becomes a prediction.

## For agents / contributors

See [`AGENTS.md`](AGENTS.md) for architecture, conventions, and verification guidance, and [`docs/`](docs/) for a deeper data-flow walkthrough and operational runbooks (running, tuning detection, demo prep).
