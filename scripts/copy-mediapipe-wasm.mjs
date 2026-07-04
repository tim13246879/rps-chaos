import { cpSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../node_modules/@mediapipe/tasks-vision/wasm", import.meta.url));
const publicDestination = fileURLToPath(new URL("../public/mediapipe/wasm", import.meta.url));
const distRoot = fileURLToPath(new URL("../dist", import.meta.url));
const distDestination = fileURLToPath(new URL("../dist/mediapipe/wasm", import.meta.url));

function copyWasm(destination) {
  mkdirSync(destination, { recursive: true });
  cpSync(source, destination, { recursive: true, force: true });
}

copyWasm(publicDestination);

if (existsSync(distRoot)) {
  copyWasm(distDestination);
}
