import type { SequenceSummary } from "./sequence";
import type { BallPoint, ReviewEvent } from "./types";

export interface ReviewMoment {
  id: string;
  time: number;
  end: number;
  title: string;
  observation: string;
  evidence?: string;
  question: string;
  kind: "cue" | "trace" | "event";
  strategyId?: string;
}

/** A cue is a review hypothesis; a trace alone never becomes an invented match event. */
export function buildReviewMoments(
  summary: SequenceSummary,
  track: BallPoint[],
  events: ReviewEvent[] = [],
): ReviewMoment[] {
  const reviewed = events.filter(
    (e) => (e.reviewStatus === "accepted" || e.reviewStatus === "corrected") && e.reviewNote,
  );
  if (reviewed.length)
    return reviewed.map((e) => ({
      id: e.id,
      time: e.time,
      end: e.end,
      title: e.title,
      observation: e.explanation,
      question: e.coachingQuestion ?? "Verify the action against the footage.",
      kind: "event",
      evidence: `${e.source === "vlm" ? "VLM proposal, subsequently reviewed" : "Implementation-agent visual review"}. ${e.reviewNote} Source frames: ${e.evidenceTimes.map((t) => t.toFixed(2) + "s").join(", ")}.`,
    }));
  if (summary.insights.length)
    return summary.insights.map((cue) => ({
      id: `${cue.kind}-${cue.time}`,
      time: cue.time,
      end: cue.end,
      title: cue.title,
      observation:
        cue.kind === "movement"
          ? "The tracked ball moves across the camera view. Follow the nearest player and look at the options available before and after the movement."
          : cue.kind === "pressure"
            ? "Several players are close to the ball. Review the space and time available for the next touch."
            : "Ball proximity shifts between the two kit-color groups. Replay the touch to check whether control actually changes.",
      evidence: cue.explanation,
      question: cue.verify,
      kind: "cue",
      strategyId: cue.strategyId,
    }));
  const segments = new Map<number, BallPoint[]>();
  for (const point of track) {
    const points = segments.get(point.segment) ?? [];
    points.push(point);
    segments.set(point.segment, points);
  }
  return [...segments.entries()].flatMap(([segment, points]) => {
    const anchors = points.filter((point) => point.source === "detector").length;
    if (anchors < 2 || points.at(-1)!.timestamp - points[0].timestamp < 0.15) return [];
    return [
      {
        id: `trace-${segment}`,
        time: points[0].timestamp,
        end: points.at(-1)!.timestamp,
        title: "Follow the ball",
        kind: "trace" as const,
        observation: `The ball forms a separate tracking segment with ${anchors} detector anchors. The line shows its image-space movement; it does not identify a pass or a carry.`,
        question:
          "Watch the touch and the players around it. Does this movement create space, draw pressure or release a teammate?",
      },
    ];
  });
}
