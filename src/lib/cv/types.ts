export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Detection extends Region {
  label: "person" | "ball";
  confidence: number;
}
export interface TrackedDetection extends Detection {
  trackId: number;
  kit?: [number, number, number];
  teamId?: 0 | 1;
  onPitch?: boolean;
}
export interface DetectionFrame {
  timestamp: number;
  detections: TrackedDetection[];
  camera?: { x: number; y: number; reliable: boolean };
  sceneCut?: boolean;
}
export interface BallPoint {
  timestamp: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  segment: number;
  source: "detector" | "appearance" | "manual";
  cameraX: number;
  cameraY: number;
}
export interface BallSeed {
  timestamp: number;
  x: number;
  y: number;
}
export interface TeamIdentity {
  id: 0 | 1;
  name: string;
  color: [number, number, number];
  samples: number;
}
export interface AnalysisResult {
  schemaVersion: 1;
  source: {
    name: string;
    size: number;
    lastModified: number;
    width: number;
    height: number;
    duration: number;
  };
  model: "RF-DETR Nano · COCO · int8";
  coordinateSpace: "normalized-image";
  sampleRate: number;
  elapsedMs: number;
  frames: DetectionFrame[];
  summary: {
    personTrackSegments: number;
    framesWithPeople: number;
    framesWithBall: number;
    totalDetections: number;
  };
  pipelineVersion?: 2;
  ballModel?: string;
  ballTrack?: BallPoint[];
  ballSampleRate?: number;
  teams?: TeamIdentity[];
  analysisWarnings?: string[];
}
export interface AnalysisProgress {
  phase: "loading" | "analyzing" | "tracking";
  completed: number;
  total: number;
  message: string;
}

export function validateClip(clip: {
  duration: number;
  width: number;
  height: number;
  size: number;
}) {
  if (!Number.isFinite(clip.duration) || clip.duration <= 0 || clip.width <= 0 || clip.height <= 0)
    throw new Error("The browser could not decode this clip. Use an H.264 MP4 or WebM.");
  if (clip.duration > 60)
    throw new Error("Choose a clip of 60 seconds or less for this browser demo.");
  if (clip.size > 200 * 1024 * 1024) throw new Error("Choose a file smaller than 200 MB.");
}

/** Nearest measured sample only; never fill gaps or repeat stale tracks. */
export function detectionsAt(
  frames: DetectionFrame[],
  time: number,
  tolerance = 0.2,
): TrackedDetection[] {
  if (!frames.length || !Number.isFinite(time)) return [];
  let lo = 0,
    hi = frames.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (frames[mid].timestamp < time) lo = mid + 1;
    else hi = mid;
  }
  const previous = frames[Math.max(0, lo - 1)],
    next = frames[lo];
  const nearest =
    Math.abs(previous.timestamp - time) < Math.abs(next.timestamp - time) ? previous : next;
  return Math.abs(nearest.timestamp - time) <= tolerance ? nearest.detections : [];
}

export const aborted = () => new DOMException("Analysis cancelled.", "AbortError");
export function checkAbort(signal: AbortSignal) {
  if (signal.aborted) throw aborted();
}
