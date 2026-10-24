import {
  detectionsAt,
  type AnalysisResult,
  type TrackedDetection,
  type TeamIdentity,
} from "./types";
import { ballAt, resultBallTrack, segmentTrail } from "./ball-motion";
export interface DrawOptions {
  players?: boolean;
  trail?: boolean;
}
export function drawDetections(
  ctx: CanvasRenderingContext2D,
  detections: TrackedDetection[],
  width: number,
  height: number,
  teams: TeamIdentity[] = [],
) {
  const s = Math.max(0.75, width / 1280);
  ctx.save();
  ctx.lineWidth = 1.5 * s;
  for (const d of detections.filter((d) => d.label === "person")) {
    const x = d.x * width,
      y = d.y * height,
      w = d.width * width,
      h = d.height * height,
      k = Math.min(9 * s, w / 3);
    const team = teams.find((team) => team.id === d.teamId);
    const color = team ? `rgb(${team.color.join(",")})` : "#92b5ff";
    ctx.strokeStyle = color;
    ctx.globalAlpha = d.onPitch === false ? 0.35 : 0.85;
    ctx.beginPath();
    for (const [cx, cy, dx, dy] of [
      [x, y, 1, 1],
      [x + w, y, -1, 1],
      [x, y + h, 1, -1],
      [x + w, y + h, -1, -1],
    ]) {
      ctx.moveTo(cx + dx * k, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * k);
    }
    ctx.strokeStyle = "#f8f4e5";
    ctx.lineWidth = 3 * s;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h, Math.max(3, w * 0.25), 2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
export function drawAnalysis(
  ctx: CanvasRenderingContext2D,
  result: AnalysisResult,
  time: number,
  width: number,
  height: number,
  options: DrawOptions = {},
) {
  if (options.players !== false)
    drawDetections(ctx, detectionsAt(result.frames, time, 0.3), width, height, result.teams);
  const track = resultBallTrack(result),
    head = ballAt(track, time),
    s = Math.max(0.75, width / 1280);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const lastCut =
    result.frames.findLast((frame) => frame.sceneCut && frame.timestamp <= time)?.timestamp ??
    -Infinity;
  if (options.trail !== false)
    for (const segment of segmentTrail(
      track.filter((point) => point.timestamp >= lastCut),
      time,
      1.4,
    )) {
      const points = [...segment];
      if (
        head &&
        points.at(-1)?.segment === head.segment &&
        head.timestamp > points.at(-1)!.timestamp
      )
        points.push({
          ...head,
          source: head.source === "interpolated" ? "appearance" : head.source,
        });
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i],
          age = Math.max(0, time - b.timestamp),
          alpha = Math.max(0, 1 - age / 1.4);
        ctx.globalAlpha = alpha * 0.9;
        ctx.lineWidth = (1 + alpha * 3) * s;
        ctx.strokeStyle = "#2563eb";
        ctx.setLineDash(b.source === "appearance" ? [3 * s, 4 * s] : []);
        ctx.beginPath();
        ctx.moveTo(a.x * width, a.y * height);
        ctx.lineTo(b.x * width, b.y * height);
        ctx.stroke();
        if (b.source === "detector") {
          ctx.setLineDash([]);
          ctx.fillStyle = "#c5d6ff";
          ctx.fillRect(b.x * width - 1.5 * s, b.y * height - 1.5 * s, 3 * s, 3 * s);
        }
      }
    }
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  if (head) {
    const x = head.x * width,
      y = head.y * height,
      r = Math.max(5 * s, Math.min(11 * s, head.width * width * 0.7));
    ctx.strokeStyle = "#15233d";
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#ffcf36";
    ctx.lineWidth = 1.7 * s;
    if (head.source === "appearance") ctx.setLineDash([3 * s, 3 * s]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffcf36";
    ctx.beginPath();
    ctx.arc(x, y, 2 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
