import test from "node:test";
import assert from "node:assert/strict";
import { buildReviewMoments } from "../review-moments";
import type { SequenceSummary } from "../sequence";
import type { BallPoint } from "../types";
const summary = (insights: SequenceSummary["insights"] = []) => ({ insights }) as SequenceSummary;
const point = (timestamp: number, source: BallPoint["source"] = "detector"): BallPoint => ({
  timestamp,
  x: 0.3,
  y: 0.5,
  width: 0.01,
  height: 0.01,
  confidence: 0.8,
  segment: 1,
  source,
  cameraX: 0,
  cameraY: 0,
});
test("review moments retain the real cue timestamp and review question", () => {
  const moments = buildReviewMoments(
    summary([
      {
        time: 1.25,
        end: 2.5,
        kind: "pressure",
        title: "Pressure around the ball",
        explanation: "Two nearby opponents.",
        verify: "Check closing movement.",
        support: 6,
        strategyId: "high-press",
      },
    ]),
    [],
  );
  assert.equal(moments[0].time, 1.25);
  assert.equal(moments[0].question, "Check closing movement.");
  assert.equal(moments[0].kind, "cue");
});
test("a ball segment is a tracking observation rather than an invented football event", () => {
  const moments = buildReviewMoments(summary(), [point(0.5), point(0.75), point(1, "appearance")]);
  assert.equal(moments.length, 1);
  assert.equal(moments[0].kind, "trace");
  assert.equal(moments[0].time, 0.5);
  assert.match(moments[0].title, /ball/i);
  assert.doesNotMatch(moments[0].title, /goal|pass|turnover/i);
});
test("an unresolved ball produces no fake moment and a single weak anchor is withheld", () => {
  assert.deepEqual(buildReviewMoments(summary(), []), []);
  assert.deepEqual(buildReviewMoments(summary(), [point(0)]), []);
});

test("only reviewed events become explanations, and their provenance remains visible", () => {
  const base = {
    id: "e1",
    time: 6,
    end: 9,
    type: "pass",
    title: "Delivery into the area",
    explanation: "The ball travels toward the penalty area.",
    coachingQuestion: "Who contests the second ball?",
    evidenceTimes: [6, 9],
    source: "visual-review" as const,
    reviewNote: "Implementation-agent visual review of source frames.",
  };
  assert.equal(
    buildReviewMoments(summary(), [], [{ ...base, reviewStatus: "proposed" }]).length,
    0,
  );
  const moments = buildReviewMoments(summary(), [], [{ ...base, reviewStatus: "accepted" }]);
  assert.equal(moments[0].kind, "event");
  assert.match(moments[0].evidence!, /visual review/);
});
