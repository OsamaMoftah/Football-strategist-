import { DetectorClient } from "./client";
import { BallAssociator, cleanBallTrack } from "./ball-motion";
import {
  annotateAppearance,
  ballHasPitchContext,
  cameraShift,
  followBall,
  grayFrame,
  type GrayFrame,
} from "./appearance";
import { estimateTeams } from "./sequence";
import { Tracker } from "./tracker";
import {
  aborted,
  checkAbort,
  validateClip,
  type AnalysisProgress,
  type AnalysisResult,
  type DetectionFrame,
  type Region,
  type Detection,
  type BallPoint,
  type BallSeed,
} from "./types";

export function waitForMedia(
  video: HTMLVideoElement,
  event: string,
  signal: AbortSignal,
  action: () => void,
) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener(event, done);
      video.removeEventListener("error", failed);
      signal.removeEventListener("abort", cancel);
    };
    const done = () => {
      cleanup();
      resolve();
    };
    const failed = () => {
      cleanup();
      reject(new Error("This browser could not decode the video. Try an H.264 MP4 or WebM."));
    };
    const cancel = () => {
      cleanup();
      reject(aborted());
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Video decoding timed out. Try a shorter H.264 MP4."));
    }, 30_000);
    video.addEventListener(event, done, { once: true });
    video.addEventListener("error", failed, { once: true });
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
    else action();
  });
}

export async function loadVideo(src: string, signal: AbortSignal) {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    await waitForMedia(video, "loadeddata", signal, () => {
      video.src = src;
      video.load();
    });
    return video;
  } catch (error) {
    video.removeAttribute("src");
    video.load();
    throw error;
  }
}
export async function seekVideo(video: HTMLVideoElement, time: number, signal: AbortSignal) {
  checkAbort(signal);
  if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) return;
  await waitForMedia(video, "seeked", signal, () => {
    video.currentTime = time;
  });
}

const regions: Region[] = [
  { x: 0, y: 0, width: 1, height: 1 },
  { x: 0, y: 0, width: 0.55, height: 0.55 },
  { x: 0.45, y: 0, width: 0.55, height: 0.55 },
  { x: 0, y: 0.45, width: 0.55, height: 0.55 },
  { x: 0.45, y: 0.45, width: 0.55, height: 0.55 },
];

export async function analyzeClip(
  file: File,
  options: {
    signal: AbortSignal;
    onProgress: (progress: AnalysisProgress) => void;
    ballSeed?: BallSeed;
    existing?: AnalysisResult;
  },
): Promise<AnalysisResult> {
  const { signal, onProgress, ballSeed, existing } = options;
  const src = URL.createObjectURL(file);
  let video: HTMLVideoElement | undefined, client: DetectorClient | undefined;
  const start = performance.now();
  try {
    onProgress({ phase: "loading", completed: 0, total: 1, message: "Reading video…" });
    video = await loadVideo(src, signal);
    validateClip({
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      size: file.size,
    });
    client = new DetectorClient(signal);
    if (!existing) {
      onProgress({
        phase: "loading",
        completed: 0,
        total: 1,
        message: "Loading player detector (29 MB)…",
      });
      await client.load("people");
    }
    onProgress({
      phase: "loading",
      completed: 0,
      total: 1,
      message: "Loading football-specific ball detector (34 MB)…",
    });
    await client.load("ball");
    checkAbort(signal);
    const sampleRate = 2,
      ballSampleRate = 12,
      total = Math.ceil(video.duration * ballSampleRate),
      tracker = new Tracker();
    const frames: DetectionFrame[] = existing
      ? existing.frames.map((f) => ({ ...f, detections: f.detections.map((d) => ({ ...d })) }))
      : [];
    const ballTrack: BallPoint[] = [];
    const tileCanvas = document.createElement("canvas");
    tileCanvas.width = 384;
    tileCanvas.height = 384;
    const tileCtx = tileCanvas.getContext("2d", { willReadFrequently: true });
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(960, video.videoWidth);
    canvas.height = Math.round((video.videoHeight * canvas.width) / video.videoWidth);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || !tileCtx) throw new Error("Canvas is unavailable in this browser.");
    const associator = new BallAssociator(video.videoWidth, video.videoHeight);
    let previousGray: GrayFrame | undefined,
      previousSmall: GrayFrame | undefined,
      previousTime = -1,
      camera = { x: 0, y: 0 },
      seedUsed = false,
      pendingCut = false;
    const tiles = (cropRegions: Region[]) =>
      cropRegions.map((region) => {
        tileCtx.drawImage(
          video!,
          region.x * video!.videoWidth,
          region.y * video!.videoHeight,
          region.width * video!.videoWidth,
          region.height * video!.videoHeight,
          0,
          0,
          384,
          384,
        );
        return { pixels: tileCtx.getImageData(0, 0, 384, 384).data.buffer as ArrayBuffer, region };
      });
    for (let i = 0; i < total; i++) {
      checkAbort(signal);
      const timestamp = i / ballSampleRate;
      await seekVideo(video, timestamp, signal);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const gray = grayFrame(rgba, canvas.width, canvas.height),
        small = grayFrame(rgba, canvas.width, canvas.height, 160);
      const motion = previousSmall
        ? cameraShift(previousSmall, small)
        : { x: 0, y: 0, reliable: false, cut: false };
      if (motion.cut) {
        associator.reset();
        tracker.reset();
        camera = { x: 0, y: 0 };
        pendingCut = true;
      } else if (motion.reliable) {
        camera = { x: camera.x + motion.x, y: camera.y + motion.y };
      }
      const last = associator.current();
      let followed: BallPoint | null = null;
      if (
        last &&
        previousGray &&
        Math.abs(last.timestamp - previousTime) < 0.02 &&
        associator.anchorAge(timestamp) < 0.5 &&
        !motion.cut
      ) {
        const prior = ballTrack.at(-2),
          dt = prior ? last.timestamp - prior.timestamp : 0;
        const velocity =
          prior && dt > 0 && prior.segment === last.segment
            ? {
                x: Math.max(
                  -0.8,
                  Math.min(0.8, (last.x - prior.x - (last.cameraX - prior.cameraX)) / dt),
                ),
                y: Math.max(
                  -0.8,
                  Math.min(0.8, (last.y - prior.y - (last.cameraY - prior.cameraY)) / dt),
                ),
              }
            : { x: 0, y: 0 };
        followed = followBall(previousGray, gray, last, timestamp, camera, velocity);
      }
      let people: Detection[] = [];
      if (!existing && i % 6 === 0)
        people = (await client.detect(tiles(regions), "people")).filter(
          (d) => d.label === "person",
        );
      let ballCandidates: Detection[] = [];
      let point: BallPoint | null = null;
      if (
        ballSeed &&
        !seedUsed &&
        i === Math.min(total - 1, Math.round(ballSeed.timestamp * ballSampleRate))
      ) {
        point = associator.seed(ballSeed.x, ballSeed.y, timestamp, camera);
        seedUsed = true;
      } else if ((last && (i % 3 === 0 || !followed)) || (!last && i % 6 === 0)) {
        const center = followed ?? last;
        let searchRegions = regions;
        if (center && associator.anchorAge(timestamp) < 0.6) {
          const side = Math.min(
            video.videoWidth * 0.4,
            Math.max(160, video.videoWidth * 0.22, center.width * video.videoWidth * 20),
          );
          const rw = Math.min(1, side / video.videoWidth),
            rh = Math.min(1, side / video.videoHeight);
          const crop = {
            x: Math.max(0, Math.min(1 - rw, center.x - rw / 2)),
            y: Math.max(0, Math.min(1 - rh, center.y - rh / 2)),
            width: rw,
            height: rh,
          };
          searchRegions = i % 12 === 0 ? [crop, regions[0]] : [crop];
        }
        ballCandidates = await client.detect(tiles(searchRegions), "ball");
        const eligible = last
          ? ballCandidates
          : ballCandidates.filter((d) =>
              ballHasPitchContext(
                rgba,
                canvas.width,
                canvas.height,
                d.x + d.width / 2,
                d.y + d.height / 2,
              ),
            );
        point = associator.observe(eligible, timestamp, camera, motion.cut);
      }
      if (!point && followed && associator.anchorAge(timestamp) < 0.5) {
        point = followed;
        associator.follow(point);
      }
      if (point) ballTrack.push(point);
      if (!existing && i % 6 === 0) {
        const detections = tracker.update([...people, ...ballCandidates], timestamp);
        annotateAppearance(rgba, canvas.width, canvas.height, detections);
        frames.push({
          timestamp,
          detections,
          camera: { ...camera, reliable: motion.reliable },
          sceneCut: pendingCut,
        });
        pendingCut = false;
      }
      previousGray = gray;
      previousSmall = small;
      previousTime = timestamp;
      onProgress({
        phase: "tracking",
        completed: i + 1,
        total,
        message: `Building ball trace · ${i + 1}/${total} motion samples · ${timestamp.toFixed(1)} / ${video.duration.toFixed(1)} s`,
      });
    }
    const teams = estimateTeams(frames),
      cleaned = cleanBallTrack(ballTrack);
    const people = new Set(
      frames.flatMap((f) => f.detections.filter((d) => d.label === "person").map((d) => d.trackId)),
    );
    const warnings: string[] = [];
    if (!teams.length)
      warnings.push(
        "Two reliable kit-color groups could not be separated. Team-control and pressure cues are withheld.",
      );
    if (cleaned.length < ballSampleRate * 0.5)
      warnings.push(
        "The ball did not form a reliable continuous track. Try a clearer view or add a manual ball anchor.",
      );
    return {
      schemaVersion: 1,
      pipelineVersion: 2,
      source: {
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      },
      model: "RF-DETR Nano · COCO · int8",
      ballModel: "Futheros football RF-DETR Nano · int8",
      coordinateSpace: "normalized-image",
      sampleRate: existing?.sampleRate ?? sampleRate,
      ballSampleRate,
      ballTrack: cleaned,
      teams,
      analysisWarnings: warnings,
      elapsedMs: performance.now() - start,
      frames,
      summary: {
        personTrackSegments: people.size,
        framesWithPeople: frames.filter((f) => f.detections.some((d) => d.label === "person"))
          .length,
        framesWithBall: frames.filter((f) => f.detections.some((d) => d.label === "ball")).length,
        totalDetections: frames.reduce((n, f) => n + f.detections.length, 0),
      },
    };
  } finally {
    client?.dispose();
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    URL.revokeObjectURL(src);
  }
}
