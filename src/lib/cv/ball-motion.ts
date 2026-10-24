import type { AnalysisResult, BallPoint, Detection } from "./types";

export class BallAssociator {
  private last: BallPoint | null = null;
  private prior: BallPoint | null = null;
  private segment = 0;
  private lastAnchor = -Infinity;
  constructor(
    private width: number,
    private height: number,
  ) {}
  reset() {
    this.last = null;
    this.prior = null;
    this.lastAnchor = -Infinity;
  }
  current() {
    return this.last;
  }
  anchorAge(time: number) {
    return time - this.lastAnchor;
  }
  follow(point: BallPoint) {
    this.prior = this.last;
    this.last = point;
  }
  seed(x: number, y: number, time: number, camera: { x: number; y: number }): BallPoint {
    this.reset();
    this.segment++;
    const point: BallPoint = {
      timestamp: time,
      x,
      y,
      width: 8 / this.width,
      height: 8 / this.height,
      confidence: 1,
      segment: this.segment,
      source: "manual",
      cameraX: camera.x,
      cameraY: camera.y,
    };
    this.lastAnchor = time;
    this.last = point;
    return point;
  }
  observe(
    candidates: Detection[],
    time: number,
    camera: { x: number; y: number },
    sceneCut = false,
  ): BallPoint | null {
    if (
      sceneCut ||
      (this.last && time - this.last.timestamp > 0.55) ||
      time - this.lastAnchor > 0.8
    )
      this.reset();
    const previous = this.last;
    const dt = previous ? Math.max(0.02, time - previous.timestamp) : 0;
    const cameraDx = previous ? camera.x - previous.cameraX : 0,
      cameraDy = previous ? camera.y - previous.cameraY : 0;
    const priorDt = previous && this.prior ? previous.timestamp - this.prior.timestamp : 0;
    const vx =
      priorDt > 0
        ? Math.max(
            -0.8,
            Math.min(
              0.8,
              (previous!.x - this.prior!.x - (previous!.cameraX - this.prior!.cameraX)) / priorDt,
            ),
          )
        : 0;
    const vy =
      priorDt > 0
        ? Math.max(
            -0.8,
            Math.min(
              0.8,
              (previous!.y - this.prior!.y - (previous!.cameraY - this.prior!.cameraY)) / priorDt,
            ),
          )
        : 0;
    const predictedX = previous ? previous.x + cameraDx + vx * dt : 0,
      predictedY = previous ? previous.y + cameraDy + vy * dt : 0;
    let best: Detection | null = null,
      bestScore = -Infinity;
    for (const candidate of candidates) {
      const pixelW = candidate.width * this.width,
        pixelH = candidate.height * this.height;
      const aspect = pixelW / Math.max(1, pixelH);
      if (
        candidate.label !== "ball" ||
        candidate.confidence < 0.23 ||
        pixelW < 1.5 ||
        pixelH < 1.5 ||
        candidate.width > 0.065 ||
        candidate.height > 0.075 ||
        aspect < 0.28 ||
        aspect > 3.8
      )
        continue;
      const x = candidate.x + candidate.width / 2,
        y = candidate.y + candidate.height / 2;
      const distance = previous
        ? Math.hypot(x - predictedX, ((y - predictedY) * this.height) / this.width)
        : 0;
      const gate = Math.min(0.22, 0.035 + dt * 0.75);
      if (previous && distance > gate) continue;
      const score = candidate.confidence - distance * 2.5;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    if (!best) return null;
    if (!previous) this.segment++;
    const point: BallPoint = {
      timestamp: time,
      x: best.x + best.width / 2,
      y: best.y + best.height / 2,
      width: best.width,
      height: best.height,
      confidence: best.confidence,
      segment: this.segment,
      source: "detector",
      cameraX: camera.x,
      cameraY: camera.y,
    };
    this.lastAnchor = time;
    this.follow(point);
    return point;
  }
}

export function ballAt(
  track: BallPoint[],
  time: number,
): (Omit<BallPoint, "source"> & { source: BallPoint["source"] | "interpolated" }) | null {
  if (!track.length) return null;
  let lo = 0,
    hi = track.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (track[mid].timestamp < time) lo = mid + 1;
    else hi = mid;
  }
  const next = track[lo],
    previous = track[Math.max(0, lo - 1)];
  if (
    previous !== next &&
    previous.segment === next.segment &&
    next.timestamp - previous.timestamp <= 0.2 &&
    time >= previous.timestamp &&
    time <= next.timestamp
  ) {
    const amount = (time - previous.timestamp) / (next.timestamp - previous.timestamp);
    return {
      ...previous,
      timestamp: time,
      x: previous.x + (next.x - previous.x) * amount,
      y: previous.y + (next.y - previous.y) * amount,
      cameraX: previous.cameraX + (next.cameraX - previous.cameraX) * amount,
      cameraY: previous.cameraY + (next.cameraY - previous.cameraY) * amount,
      confidence: Math.min(previous.confidence, next.confidence),
      source: amount < 0.001 ? previous.source : amount > 0.999 ? next.source : "interpolated",
    };
  }
  const nearest =
    Math.abs(previous.timestamp - time) <= Math.abs(next.timestamp - time) ? previous : next;
  return Math.abs(nearest.timestamp - time) <= 0.085 ? nearest : null;
}

export function segmentTrail(track: BallPoint[], time: number, seconds = 1.2): BallPoint[][] {
  const segments: BallPoint[][] = [];
  for (const point of track) {
    if (point.timestamp > time || point.timestamp < time - seconds) continue;
    const current = segments.at(-1),
      previous = current?.at(-1);
    if (
      !previous ||
      previous.segment !== point.segment ||
      point.timestamp - previous.timestamp > 0.2
    )
      segments.push([point]);
    else current!.push(point);
  }
  return segments;
}

export function cleanBallTrack(track: BallPoint[]): BallPoint[] {
  let segment = 0,
    previous: BallPoint | undefined;
  track = track.map((point) => {
    if (
      !previous ||
      point.segment !== previous.segment ||
      point.timestamp - previous.timestamp > 0.2
    )
      segment++;
    const original = point;
    point = { ...point, segment };
    previous = original;
    return point;
  });
  const anchors = new Map<number, number>(),
    manual = new Set<number>();
  for (const point of track) {
    if (point.source === "detector")
      anchors.set(point.segment, (anchors.get(point.segment) ?? 0) + 1);
    if (point.source === "manual") manual.add(point.segment);
  }
  return track.filter(
    (point) => manual.has(point.segment) || (anchors.get(point.segment) ?? 0) >= 2,
  );
}

export function resultBallTrack(result: AnalysisResult): BallPoint[] {
  if (result.ballTrack) return result.ballTrack;
  return result.frames.flatMap((frame) => {
    const ball = frame.detections
      .filter((d) => d.label === "ball")
      .sort((a, b) => b.confidence - a.confidence)[0];
    return ball
      ? [
          {
            timestamp: frame.timestamp,
            x: ball.x + ball.width / 2,
            y: ball.y + ball.height / 2,
            width: ball.width,
            height: ball.height,
            confidence: ball.confidence,
            source: "detector" as const,
            segment: ball.trackId,
            cameraX: 0,
            cameraY: 0,
          },
        ]
      : [];
  });
}
