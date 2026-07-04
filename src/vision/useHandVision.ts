import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import type { FrameFeatures, LandmarkPoint, PredictionResult } from "../types";
import { classifySequence } from "./classifier";
import { extractFrameFeatures } from "./landmarks";

const WASM_PATH = "/mediapipe/wasm";
const HAND_MODEL_PATH = "/mediapipe/models/hand_landmarker.task";

export interface VisionSnapshot {
  modelReady: boolean;
  cameraReady: boolean;
  handVisible: boolean;
  fps: number;
  error: string | null;
  features: FrameFeatures | null;
  prediction: PredictionResult;
  calibratedAt: number | null;
}

const EMPTY_PREDICTION: PredictionResult = {
  move: "unknown",
  confidence: 0,
  margin: 0,
  scores: {
    rock: 0,
    paper: 0,
    scissors: 0,
    unknown: 1,
  },
  stableFrames: 0,
};

function drawLandmarks(
  canvas: HTMLCanvasElement,
  result: HandLandmarkerResult,
  videoWidth: number,
  videoHeight: number,
): void {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
    canvas.width = videoWidth;
    canvas.height = videoHeight;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  const landmarks = result.landmarks[0];

  if (!landmarks) {
    return;
  }

  const connections = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [0, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [0, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [0, 13],
    [13, 14],
    [14, 15],
    [15, 16],
    [0, 17],
    [17, 18],
    [18, 19],
    [19, 20],
    [5, 9],
    [9, 13],
    [13, 17],
  ] as const;

  context.lineWidth = Math.max(3, canvas.width * 0.004);
  context.strokeStyle = "rgba(58, 224, 174, 0.88)";
  context.lineCap = "round";

  for (const [start, end] of connections) {
    const a = landmarks[start];
    const b = landmarks[end];
    context.beginPath();
    context.moveTo(a.x * canvas.width, a.y * canvas.height);
    context.lineTo(b.x * canvas.width, b.y * canvas.height);
    context.stroke();
  }

  for (const point of landmarks) {
    context.beginPath();
    context.fillStyle = "rgba(255, 255, 255, 0.96)";
    context.arc(point.x * canvas.width, point.y * canvas.height, Math.max(4, canvas.width * 0.006), 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.fillStyle = "rgba(16, 185, 129, 0.95)";
    context.arc(point.x * canvas.width, point.y * canvas.height, Math.max(2, canvas.width * 0.003), 0, Math.PI * 2);
    context.fill();
  }
}

async function createLandmarker(): Promise<HandLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  return HandLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: HAND_MODEL_PATH,
    },
    runningMode: "VIDEO",
    numHands: 1,
  });
}

function getStartupErrorMessage(error: unknown): string {
  const name =
    typeof DOMException !== "undefined" && error instanceof DOMException ? error.name : "";
  const rawMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const message = rawMessage.toLowerCase();

  if (name === "NotAllowedError" || message.includes("permission")) {
    return "Camera permission was blocked. Allow camera access in your browser and try again.";
  }

  if (name === "NotFoundError" || message.includes("device not found")) {
    return "No camera was found. Connect a webcam and try again.";
  }

  if (
    message.includes("wasm") ||
    message.includes("unexpected token") ||
    message.includes("vision_wasm") ||
    message.includes("mediapipe")
  ) {
    return "Vision setup failed because the MediaPipe runtime was not available. Restart the dev server and try again.";
  }

  return rawMessage || "Camera setup failed. Check browser camera permissions and try again.";
}

export function useHandVision() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastProcessedAtRef = useRef(0);
  const recentFeaturesRef = useRef<FrameFeatures[]>([]);
  const lastFeatureRef = useRef<FrameFeatures | undefined>(undefined);
  const fpsSamplesRef = useRef<number[]>([]);
  const throttleMsRef = useRef(33);
  const [snapshot, setSnapshot] = useState<VisionSnapshot>({
    modelReady: false,
    cameraReady: false,
    handVisible: false,
    fps: 0,
    error: null,
    features: null,
    prediction: EMPTY_PREDICTION,
    calibratedAt: null,
  });

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    setSnapshot((current) => ({ ...current, cameraReady: false, handVisible: false, modelReady: false }));
  }, []);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !landmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      rafRef.current = window.requestAnimationFrame(processFrame);
      return;
    }

    const now = performance.now();

    if (now - lastProcessedAtRef.current < throttleMsRef.current) {
      rafRef.current = window.requestAnimationFrame(processFrame);
      return;
    }

    const previousProcessTime = lastProcessedAtRef.current;
    lastProcessedAtRef.current = now;
    const result = landmarker.detectForVideo(video, now);

    if (canvas) {
      drawLandmarks(canvas, result, video.videoWidth || 1280, video.videoHeight || 720);
    }

    const rawLandmarks = result.landmarks[0] as LandmarkPoint[] | undefined;
    const features = extractFrameFeatures(rawLandmarks, now, lastFeatureRef.current);

    if (!features) {
      recentFeaturesRef.current = [];
      lastFeatureRef.current = undefined;
      setSnapshot((current) => ({
        ...current,
        handVisible: false,
        features: null,
        prediction: EMPTY_PREDICTION,
        fps: current.fps,
      }));
      rafRef.current = window.requestAnimationFrame(processFrame);
      return;
    }

    lastFeatureRef.current = features;
    recentFeaturesRef.current = [...recentFeaturesRef.current.slice(-9), features];
    const prediction = classifySequence(recentFeaturesRef.current);
    const instantaneousFps = previousProcessTime > 0 ? 1000 / Math.max(1, now - previousProcessTime) : 0;
    fpsSamplesRef.current = [...fpsSamplesRef.current.slice(-20), instantaneousFps].filter(Number.isFinite);
    const fps =
      fpsSamplesRef.current.reduce((sum, sample) => sum + sample, 0) /
      Math.max(1, fpsSamplesRef.current.length);

    if (fps > 0 && fps < 15) {
      throttleMsRef.current = 66;
    } else if (fps >= 20) {
      throttleMsRef.current = 33;
    }

    setSnapshot((current) => ({
      ...current,
      handVisible: true,
      features,
      prediction,
      fps,
    }));
    rafRef.current = window.requestAnimationFrame(processFrame);
  }, []);

  const enableCamera = useCallback(async () => {
    try {
      setSnapshot((current) => ({ ...current, error: null }));

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser does not expose camera access.");
      }

      if (!landmarkerRef.current) {
        landmarkerRef.current = await createLandmarker();
        setSnapshot((current) => ({ ...current, modelReady: true }));
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 60 },
        },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        throw new Error("Video element is not ready.");
      }

      video.srcObject = stream;
      await video.play();
      setSnapshot((current) => ({ ...current, cameraReady: true, error: null }));
      rafRef.current = window.requestAnimationFrame(processFrame);
    } catch (error) {
      const message = getStartupErrorMessage(error);
      setSnapshot((current) => ({ ...current, error: message, cameraReady: false }));
    }
  }, [processFrame]);

  const calibrate = useCallback(() => {
    recentFeaturesRef.current = [];
    lastFeatureRef.current = undefined;
    setSnapshot((current) => ({
      ...current,
      calibratedAt: Date.now(),
      prediction: EMPTY_PREDICTION,
    }));
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    snapshot,
    enableCamera,
    stopCamera,
    calibrate,
  };
}
