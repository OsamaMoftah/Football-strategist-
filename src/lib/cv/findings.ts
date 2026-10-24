import { analyzeSequence } from "./sequence";
import type { AnalysisResult } from "./types";
import type { StrategyPattern } from "@/lib/strategy-data";

export interface ClipFindings {
  peopleCoveragePercent: number;
  ballCoveragePercent: number;
  averagePersonCandidates: number;
  peakPeople: { timestamp: number; count: number } | null;
  strongestBall: { timestamp: number; confidence: number } | null;
  longestBallRun: { start: number; end: number; sampleCount: number } | null;
}

export function formatFindingTime(seconds: number) {
  const tenths = Math.max(0, Math.round(seconds * 10));
  const minutes = Math.floor(tenths / 600);
  const remainder = ((tenths % 600) / 10).toFixed(1).padStart(4, "0");
  return `${minutes}:${remainder}`;
}

export function summarizeFindings(result: AnalysisResult): ClipFindings {
  const frames = result.frames;
  const personCounts = frames.map((frame) => ({
    timestamp: frame.timestamp,
    count: frame.detections.filter((detection) => detection.label === "person").length,
  }));
  const peakPeople = personCounts.reduce<ClipFindings["peakPeople"]>(
    (peak, sample) => (!peak || sample.count > peak.count ? sample : peak),
    null,
  );
  const strongestBall = frames.reduce<ClipFindings["strongestBall"]>((strongest, frame) => {
    const candidate = frame.detections
      .filter((detection) => detection.label === "ball")
      .sort((a, b) => b.confidence - a.confidence)[0];
    return candidate && (!strongest || candidate.confidence > strongest.confidence)
      ? { timestamp: frame.timestamp, confidence: candidate.confidence }
      : strongest;
  }, null);

  let longestBallRun: ClipFindings["longestBallRun"] = null;
  let runStart: number | null = null;
  let runEnd = 0;
  let runCount = 0;
  const maxSampleGap = 1.5 / result.sampleRate;
  const finishRun = () => {
    if (runStart === null) return;
    const candidate = {
      start: runStart,
      end: Math.min(result.source.duration, runEnd + 1 / result.sampleRate),
      sampleCount: runCount,
    };
    if (!longestBallRun || candidate.sampleCount > longestBallRun.sampleCount)
      longestBallRun = candidate;
    runStart = null;
    runCount = 0;
  };

  for (const frame of frames) {
    const hasBall = frame.detections.some((detection) => detection.label === "ball");
    if (!hasBall) {
      finishRun();
      continue;
    }
    if (runStart !== null && frame.timestamp - runEnd > maxSampleGap) finishRun();
    if (runStart === null) runStart = frame.timestamp;
    runEnd = frame.timestamp;
    runCount += 1;
  }
  finishRun();

  const totalFrames = Math.max(1, frames.length);
  return {
    peopleCoveragePercent: Math.round((result.summary.framesWithPeople / totalFrames) * 100),
    ballCoveragePercent: Math.round((result.summary.framesWithBall / totalFrames) * 100),
    averagePersonCandidates:
      personCounts.reduce((total, sample) => total + sample.count, 0) / totalFrames,
    peakPeople: peakPeople && peakPeople.count > 0 ? peakPeople : null,
    strongestBall,
    longestBallRun,
  };
}

export function buildFindingsReport(
  result: AnalysisResult,
  findings: ClipFindings,
  selectedPatterns: StrategyPattern[],
) {
  const sequence = analyzeSequence(result);
  const lines = [
    `# Football strategist clip review: ${result.source.name}`,
    "",
    `Duration: ${result.source.duration.toFixed(1)} seconds · ${result.frames.length} measured samples at ${result.sampleRate} samples per second.`,
    "",
    "## Observed detections",
    `- Person candidates appeared in ${result.summary.framesWithPeople}/${result.frames.length} samples (${findings.peopleCoveragePercent}%). The average was ${findings.averagePersonCandidates.toFixed(1)} candidates per sample.`,
    findings.peakPeople
      ? `- The busiest sample contained ${findings.peakPeople.count} person candidates at ${formatFindingTime(findings.peakPeople.timestamp)}.`
      : "- No person candidates passed the detector threshold.",
    findings.strongestBall
      ? `- Sports-ball candidates appeared in ${result.summary.framesWithBall}/${result.frames.length} samples (${findings.ballCoveragePercent}%). The strongest model score was ${Math.round(findings.strongestBall.confidence * 100)}% at ${formatFindingTime(findings.strongestBall.timestamp)}.`
      : "- No sports-ball candidates passed the detector threshold.",
    findings.longestBallRun
      ? `- The longest consecutive sampled run with a ball candidate spans ${formatFindingTime(findings.longestBallRun.start)}–${formatFindingTime(findings.longestBallRun.end)} (${findings.longestBallRun.sampleCount} samples).`
      : "",
    "",
    "## Sequence interpretation",
    sequence.title,
    sequence.explanation,
    `Ball continuity: ${sequence.ball.trackedSeconds.toFixed(1)} s; ${sequence.ball.anchors} detector anchors; ${sequence.ball.appearance} appearance estimates; ${sequence.ball.segments} separate segments.`,
    ...sequence.insights.flatMap((cue) => [
      `### ${formatFindingTime(cue.time)}–${formatFindingTime(cue.end)}: ${cue.title}`,
      cue.explanation,
      `Verify: ${cue.verify}`,
      cue.strategyId
        ? `Suggested review lens: ${cue.strategyId}`
        : "Movement cue; no strategy is automatically classified.",
    ]),
    "",
    ...(result.events?.length
      ? [
          "## Reviewed source observations",
          ...result.events
            .filter((e) => e.reviewStatus === "accepted" || e.reviewStatus === "corrected")
            .flatMap((e) => [
              `### ${formatFindingTime(e.time)}–${formatFindingTime(e.end)}: ${e.title}`,
              e.explanation,
              `Review question: ${e.coachingQuestion ?? "Verify against the footage."}`,
              `Source: ${e.source}. ${e.reviewNote ?? ""}`,
              `Evidence frames: ${e.evidenceTimes.join(", ")} seconds.`,
            ]),
        ]
      : []),
    ...(result.processing
      ? [
          "## Native processing provenance",
          `Engine: ${result.processing.engine}; source SHA-256: ${result.processing.sourceSha256}; ${result.processing.framesProcessed} source frames.`,
          "The included case uses implementation-agent visual-review notes. The local Qwen3-VL runs returned no supported events; these notes are not model-generated tactical conclusions.",
        ]
      : []),
    "## Strategy review",
    selectedPatterns.length
      ? `Analyst-selected lens: ${selectedPatterns.map((pattern) => pattern.name).join(", ")}.`
      : "No strategy lens selected. Choose a pattern to review against the timestamped evidence.",
    ...selectedPatterns.map(
      (pattern) => `- ${pattern.name}: ${pattern.description} Coaching cue: ${pattern.cue}`,
    ),
    "",
    "These are image-space model observations. They do not confirm possession, team identity, a tactical pattern, or pitch position. Verify the candidate moments against the source video.",
    "",
    "## Limits",
    "Person candidates may include players, officials, substitutes, and spectators. Tactical cues are heuristic review prompts with explicit evidence gates, not confirmed strategy. Pitch calibration is absent, so speed, offside, territory, and xT are not computed from this clip.",
  ];
  return (
    lines
      .filter((line, index) => line !== "" || lines[index - 1] !== "")
      .join("\n")
      .trim() + "\n"
  );
}
