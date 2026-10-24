import type { Detection, Region } from "./types";

export function intersectionOverUnion(a: Region, b: Region) {
  const intersection =
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return intersection / Math.max(1e-9, a.width * a.height + b.width * b.height - intersection);
}

export function suppressOverlaps(detections: Detection[], threshold = 0.45): Detection[] {
  const kept: Detection[] = [];
  for (const detection of [...detections].sort((a, b) => b.confidence - a.confidence)) {
    if (
      !kept.some(
        (other) =>
          other.label === detection.label && intersectionOverUnion(other, detection) > threshold,
      )
    )
      kept.push(detection);
  }
  return kept;
}

/** RF-DETR uses COCO category IDs (person=1, sports ball=37), sigmoid logits, cx/cy/w/h boxes. */
export function decodeDetections(
  boxes: Float32Array,
  logits: Float32Array,
  region: Region,
): Detection[] {
  const detections: Detection[] = [];
  for (let query = 0; query < boxes.length / 4; query++) {
    let category = 0,
      best = -Infinity;
    for (let c = 0; c < 91; c++) {
      const score = logits[query * 91 + c];
      if (score > best) {
        best = score;
        category = c;
      }
    }
    if (category !== 1 && category !== 37) continue;
    const confidence = 1 / (1 + Math.exp(-best));
    if (confidence < (category === 1 ? 0.4 : 0.25)) continue;
    const [cx, cy, w, h] = boxes.subarray(query * 4, query * 4 + 4);
    if (![cx, cy, w, h, confidence].every(Number.isFinite) || w <= 0 || h <= 0) continue;
    const x = Math.max(0, Math.min(1, region.x + (cx - w / 2) * region.width));
    const y = Math.max(0, Math.min(1, region.y + (cy - h / 2) * region.height));
    const right = Math.max(0, Math.min(1, region.x + (cx + w / 2) * region.width));
    const bottom = Math.max(0, Math.min(1, region.y + (cy + h / 2) * region.height));
    if (right <= x || bottom <= y) continue;
    detections.push({
      label: category === 1 ? "person" : "ball",
      confidence,
      x,
      y,
      width: right - x,
      height: bottom - y,
    });
  }
  return detections;
}

/** Football checkpoint has two synonymous foreground classes and a background logit. */
export function decodeFootballBalls(
  boxes: Float32Array,
  logits: Float32Array,
  region: Region,
): Detection[] {
  const detections: Detection[] = [];
  for (let i = 0; i < boxes.length / 4; i++) {
    const score = Math.max(logits[i * 3], logits[i * 3 + 1]);
    if (logits[i * 3 + 2] > score) continue;
    const confidence = 1 / (1 + Math.exp(-score));
    if (confidence < 0.23) continue;
    const [cx, cy, w, h] = boxes.subarray(i * 4, i * 4 + 4);
    if (![cx, cy, w, h].every(Number.isFinite) || w <= 0 || h <= 0) continue;
    const x = Math.max(0, region.x + (cx - w / 2) * region.width),
      y = Math.max(0, region.y + (cy - h / 2) * region.height);
    const right = Math.min(1, region.x + (cx + w / 2) * region.width),
      bottom = Math.min(1, region.y + (cy + h / 2) * region.height);
    if (right > x && bottom > y)
      detections.push({ label: "ball", confidence, x, y, width: right - x, height: bottom - y });
  }
  return suppressOverlaps(detections, 0.3);
}
