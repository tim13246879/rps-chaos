# RPS Oracle

A browser-based rock paper scissors machine that uses webcam hand tracking to predict a player's gesture during the reveal window and display the winning counter move.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`, enable the camera, calibrate if needed, and start a round.

## Checks

```bash
npm test
npm run build
```

## Notes

- Webcam access runs locally in the browser through `getUserMedia`.
- Hand landmarks come from MediaPipe Tasks Vision.
- The first version uses rule-based gesture scoring instead of a trained custom model.
