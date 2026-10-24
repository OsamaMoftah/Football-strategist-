/// <reference lib="webworker" />
import * as ort from "onnxruntime-web/wasm";
import { decodeDetections, decodeFootballBalls, suppressOverlaps } from "./postprocess";
import type { Region } from "./types";
const sessions: Partial<Record<"people" | "ball", ort.InferenceSession>> = {};
const worker = self as unknown as DedicatedWorkerGlobalScope;
worker.onmessage = async (
  event: MessageEvent<{
    id: number;
    type: "load" | "detect";
    target?: "people" | "ball";
    tiles?: Array<{ pixels: ArrayBuffer; region: Region }>;
  }>,
) => {
  const { id, type, tiles, target = "people" } = event.data;
  try {
    if (type === "load") {
      if (!sessions[target]) {
        ort.env.wasm.numThreads = 1;
        ort.env.wasm.wasmPaths = new URL("/ort/", worker.location.origin).href;
        const path =
          target === "ball"
            ? "/models/football-ball/model.onnx"
            : "/models/rfdetr-nano/model_quantized.onnx";
        const response = await fetch(path, { cache: "force-cache" });
        if (!response.ok)
          throw new Error(
            `${target === "ball" ? "Football ball" : "Person"} detector download failed (${response.status}).`,
          );
        sessions[target] = await ort.InferenceSession.create(await response.arrayBuffer(), {
          executionProviders: ["wasm"],
          graphOptimizationLevel: "all",
        });
      }
      worker.postMessage({ id, result: true });
      return;
    }
    const session = sessions[target];
    if (!session || !tiles) throw new Error("Detector is not initialized.");
    const detections = [];
    for (const tile of tiles) {
      const rgba = new Uint8ClampedArray(tile.pixels),
        size = 384 * 384,
        rgb = new Float32Array(size * 3);
      for (let c = 0; c < 3; c++)
        for (let p = 0; p < size; p++) {
          // The bundled COCO preprocessor explicitly sets do_normalize=false.
          // Only the separately exported football model uses ImageNet normalization.
          const value = rgba[p * 4 + c] / 255;
          rgb[c * size + p] =
            target === "ball"
              ? (value - [0.485, 0.456, 0.406][c]) / [0.229, 0.224, 0.225][c]
              : value;
        }
      const input = new ort.Tensor("float32", rgb, [1, 3, 384, 384]);
      const output = await session.run({ [target === "ball" ? "input" : "pixel_values"]: input });
      try {
        if (target === "ball")
          detections.push(
            ...decodeFootballBalls(
              output.dets.data as Float32Array,
              output.labels.data as Float32Array,
              tile.region,
            ),
          );
        else
          detections.push(
            ...decodeDetections(
              output.pred_boxes.data as Float32Array,
              output.logits.data as Float32Array,
              tile.region,
            ),
          );
      } finally {
        input.dispose();
        for (const tensor of Object.values(output)) tensor.dispose();
      }
    }
    worker.postMessage({
      id,
      result: suppressOverlaps(detections, target === "ball" ? 0.3 : 0.45),
    });
  } catch (error) {
    worker.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
