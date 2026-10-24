import type { BallPoint, TrackedDetection } from "./types";
export interface GrayFrame {
  width: number;
  height: number;
  pixels: Uint8Array;
}
export function grayFrame(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  targetWidth = width,
): GrayFrame {
  const w = Math.min(width, targetWidth),
    h = Math.max(1, Math.round((height * w) / width)),
    pixels = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (Math.floor((y * height) / h) * width + Math.floor((x * width) / w)) * 4;
      pixels[y * w + x] = Math.round(rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114);
    }
  return { width: w, height: h, pixels };
}
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;
export function cameraShift(
  previous: GrayFrame,
  current: GrayFrame,
): { x: number; y: number; reliable: boolean; cut: boolean } {
  if (previous.width !== current.width || previous.height !== current.height)
    return { x: 0, y: 0, reliable: false, cut: true };
  const w = current.width,
    h = current.height;
  const histA = new Array<number>(16).fill(0),
    histB = new Array<number>(16).fill(0);
  for (let i = 0; i < current.pixels.length; i += 3) {
    histA[previous.pixels[i] >> 4]++;
    histB[current.pixels[i] >> 4]++;
  }
  const count = current.pixels.length / 3,
    difference = histA.reduce((s, n, i) => s + Math.abs(n - histB[i]), 0) / count;
  if (difference > 0.7) return { x: 0, y: 0, reliable: false, cut: true };
  const matches: Array<{ x: number; y: number; error: number }> = [];
  for (let cy = 12; cy < h - 10; cy += Math.max(12, Math.floor(h / 4)))
    for (let cx = 12; cx < w - 10; cx += Math.max(16, Math.floor(w / 7))) {
      let mean = 0,
        variance = 0;
      for (let y = -2; y <= 2; y++)
        for (let x = -2; x <= 2; x++) {
          const v = previous.pixels[(cy + y) * w + cx + x];
          mean += v;
          variance += v * v;
        }
      if (variance / 25 - (mean / 25) ** 2 < 80) continue;
      let best = Infinity,
        bx = 0,
        by = 0;
      for (let dy = -5; dy <= 5; dy++)
        for (let dx = -5; dx <= 5; dx++) {
          let error = 0;
          for (let y = -2; y <= 2; y++)
            for (let x = -2; x <= 2; x++)
              error += Math.abs(
                previous.pixels[(cy + y) * w + cx + x] -
                  current.pixels[(cy + y + dy) * w + cx + x + dx],
              );
          if (error < best) {
            best = error;
            bx = dx;
            by = dy;
          }
        }
      if (best / 25 < 22) matches.push({ x: bx, y: by, error: best / 25 });
    }
  if (matches.length < 4) return { x: 0, y: 0, reliable: false, cut: false };
  const mx = median(matches.map((m) => m.x)),
    my = median(matches.map((m) => m.y));
  const inliers = matches.filter((m) => Math.hypot(m.x - mx, m.y - my) <= 1.5);
  return {
    x: mx / w,
    y: my / h,
    reliable: inliers.length >= 4 && inliers.length / matches.length > 0.55,
    cut: false,
  };
}

/** Normalized correlation is an appearance measurement, not a detector observation. */
export function followBall(
  previous: GrayFrame,
  current: GrayFrame,
  point: BallPoint,
  time: number,
  camera: { x: number; y: number },
  velocity = { x: 0, y: 0 },
): BallPoint | null {
  const w = current.width,
    h = current.height,
    r = 5;
  const px = Math.round(point.x * w),
    py = Math.round(point.y * h);
  if (px < r || py < r || px >= w - r || py >= h - r) return null;
  const template: number[] = [];
  let mean = 0,
    variance = 0;
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      const v = previous.pixels[(py + y) * w + px + x];
      template.push(v);
      mean += v;
      variance += v * v;
    }
  const n = template.length;
  mean /= n;
  const energy = variance - n * mean * mean;
  if (energy / n < 28) return null;
  const dt = Math.max(0, time - point.timestamp),
    dx = (camera.x - point.cameraX) * w,
    dy = (camera.y - point.cameraY) * h;
  const cx = Math.round(px + dx + velocity.x * dt * w),
    cy = Math.round(py + dy + velocity.y * dt * h);
  const radius = Math.min(42, Math.max(12, Math.round(10 + dt * w * 0.24)));
  let best = -1,
    bx = 0,
    by = 0;
  const scores: Array<{ x: number; y: number; score: number }> = [];
  for (let y = Math.max(r, cy - radius); y < Math.min(h - r, cy + radius); y++)
    for (let x = Math.max(r, cx - radius); x < Math.min(w - r, cx + radius); x++) {
      let sum = 0,
        sumSq = 0,
        cross = 0,
        k = 0;
      for (let yy = -r; yy <= r; yy++)
        for (let xx = -r; xx <= r; xx++) {
          const v = current.pixels[(y + yy) * w + x + xx];
          sum += v;
          sumSq += v * v;
          cross += template[k++] * v;
        }
      const norm = Math.sqrt(Math.max(1, energy * (sumSq - (sum * sum) / n)));
      const score = (cross - mean * sum) / norm;
      scores.push({ x, y, score });
      if (score > best) {
        best = score;
        bx = x;
        by = y;
      }
    }
  const second = scores.reduce(
    (s, v) => (Math.hypot(v.x - bx, v.y - by) > 4 ? Math.max(s, v.score) : s),
    -1,
  );
  if (best < 0.8 || best - second < 0.025) return null;
  return {
    ...point,
    timestamp: time,
    x: bx / w,
    y: by / h,
    confidence: Math.min(point.confidence, best) * 0.98,
    source: "appearance",
    cameraX: camera.x,
    cameraY: camera.y,
  };
}

const green = (r: number, g: number, b: number) => g > r * 1.12 && g > b * 1.1 && g > 45;
export function annotateAppearance(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  detections: TrackedDetection[],
): number {
  let greens = 0,
    total = 0;
  for (let i = 0; i < rgba.length; i += 80) {
    if (green(rgba[i], rgba[i + 1], rgba[i + 2])) greens++;
    total++;
  }
  const pitchCoverage = greens / Math.max(1, total);
  for (const detection of detections) {
    if (detection.label !== "person") continue;
    const cx = (detection.x + detection.width / 2) * width,
      foot = (detection.y + detection.height) * height;
    let grass = 0,
      samples = 0;
    for (let dy = 1; dy <= 7; dy += 2)
      for (let dx = -7; dx <= 7; dx += 3) {
        const x = Math.round(cx + dx),
          y = Math.round(foot + dy);
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const i = (y * width + x) * 4;
        if (green(rgba[i], rgba[i + 1], rgba[i + 2])) grass++;
        samples++;
      }
    detection.onPitch = pitchCoverage > 0.12 && grass / Math.max(1, samples) > 0.25;
    if (!detection.onPitch) continue;
    const bins = new Map<string, { n: number; r: number; g: number; b: number }>();
    for (let fy = 0.18; fy < 0.52; fy += 0.05)
      for (let fx = 0.25; fx < 0.76; fx += 0.08) {
        const x = Math.min(
            width - 1,
            Math.max(0, Math.floor((detection.x + detection.width * fx) * width)),
          ),
          y = Math.min(
            height - 1,
            Math.max(0, Math.floor((detection.y + detection.height * fy) * height)),
          ),
          i = (y * width + x) * 4;
        const r = rgba[i],
          g = rgba[i + 1],
          b = rgba[i + 2];
        if (green(r, g, b)) continue;
        const key = `${r >> 5},${g >> 5},${b >> 5}`,
          bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
        bin.n++;
        bin.r += r;
        bin.g += g;
        bin.b += b;
        bins.set(key, bin);
      }
    const dominant = [...bins.values()].sort((a, b) => b.n - a.n)[0];
    if (dominant && dominant.n >= 3)
      detection.kit = [
        Math.round(dominant.r / dominant.n),
        Math.round(dominant.g / dominant.n),
        Math.round(dominant.b / dominant.n),
      ];
  }
  return pitchCoverage;
}
export function ballHasPitchContext(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): boolean {
  let greens = 0,
    n = 0;
  for (let dy = -12; dy <= 12; dy += 4)
    for (let dx = -12; dx <= 12; dx += 4) {
      const px = Math.round(x * width + dx),
        py = Math.round(y * height + dy);
      if (px < 0 || py < 0 || px >= width || py >= height) continue;
      const i = (py * width + px) * 4;
      if (green(rgba[i], rgba[i + 1], rgba[i + 2])) greens++;
      n++;
    }
  return greens / Math.max(1, n) > 0.2;
}
