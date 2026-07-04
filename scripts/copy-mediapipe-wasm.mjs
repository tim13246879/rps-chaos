import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../node_modules/@mediapipe/tasks-vision/wasm", import.meta.url));
const destination = fileURLToPath(new URL("../public/mediapipe/wasm", import.meta.url));

cpSync(source, destination, { recursive: true });
