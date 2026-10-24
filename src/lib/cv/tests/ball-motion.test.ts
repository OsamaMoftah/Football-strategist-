import test from "node:test";
import assert from "node:assert/strict";
import { BallAssociator, ballAt, segmentTrail, cleanBallTrack } from "../ball-motion";
import { estimateTeams, analyzeSequence } from "../sequence";
import type { AnalysisResult, BallPoint, Detection, DetectionFrame } from "../types";

const ball = (x: number, confidence = 0.8): Detection => ({
  label: "ball",
  x,
  y: 0.5,
  width: 0.01,
  height: 0.012,
  confidence,
});
const point = (timestamp: number, x: number, segment = 1): BallPoint => ({
  timestamp,
  x,
  y: 0.5,
  width: 0.01,
  height: 0.012,
  confidence: 0.8,
  segment,
  source: "detector",
  cameraX: 0,
  cameraY: 0,
});

test("ball association rejects a stronger remote false positive instead of jumping identity", () => {
  const tracker = new BallAssociator(1920, 1080);
  const first = tracker.observe([ball(0.2)], 0, { x: 0, y: 0 });
  const next = tracker.observe([ball(0.8, 0.99), ball(0.21, 0.65)], 0.25, { x: 0, y: 0 });
  assert.ok(first && next);
  assert.equal(next.segment, first.segment);
  assert.ok(next.x < 0.3);
});
test("shot cuts break ball segments even when a new ball appears nearby", () => {
  const tracker = new BallAssociator(1920, 1080);
  const a = tracker.observe([ball(0.2)], 0, { x: 0, y: 0 });
  const b = tracker.observe([ball(0.21)], 0.25, { x: 0, y: 0 }, true);
  assert.ok(a && b);
  assert.notEqual(a.segment, b.segment);
});
test("ball rendering interpolates only short same-segment observations and never bridges a loss", () => {
  const track = [point(0, 0.2), point(0.1, 0.3), point(0.8, 0.9, 2)];
  const middle = ballAt(track, 0.05);
  assert.ok(middle);
  assert.ok(Math.abs(middle.x - 0.25) < 1e-6);
  assert.equal(middle.source, "interpolated");
  assert.equal(ballAt(track, 0.45), null);
  assert.equal(segmentTrail(track, 0.85, 1.2).length, 2);
});
test("ball geometry rejects a large round logo and a stretched sideline candidate", () => {
  const tracker = new BallAssociator(1920, 1080);
  assert.equal(
    tracker.observe(
      [
        { ...ball(0.2), width: 0.3, height: 0.3 },
        { ...ball(0.3), width: 0.1, height: 0.003 },
      ],
      0,
      { x: 0, y: 0 },
    ),
    null,
  );
});
test("kit clustering ignores off-pitch spectators and separates two distinct kits", () => {
  const detections = Array.from({ length: 10 }, (_, i) => ({
    label: "person" as const,
    confidence: 0.9,
    x: i * 0.05,
    y: 0.4,
    width: 0.03,
    height: 0.1,
    trackId: i,
    onPitch: true,
    kit: (i < 5 ? [230, 230, 235] : [25, 45, 95]) as [number, number, number],
  }));
  const frames: DetectionFrame[] = [
    {
      timestamp: 0,
      detections: [
        ...detections,
        {
          ...detections[0],
          trackId: 100,
          onPitch: false,
          kit: [240, 20, 20] as [number, number, number],
        },
      ],
    },
  ];
  const teams = estimateTeams(frames);
  assert.equal(teams.length, 2);
  assert.notEqual(frames[0].detections[0].teamId, frames[0].detections[6].teamId);
  assert.equal(frames[0].detections.at(-1)?.teamId, undefined);
});
test("sequence analysis with insufficient evidence abstains from tactics and control percentages", () => {
  const result = {
    source: { duration: 2, width: 1920, height: 1080 },
    frames: [],
    sampleRate: 2,
    ballTrack: [],
    teams: [],
  } as unknown as AnalysisResult;
  const summary = analyzeSequence(result);
  assert.equal(summary.control.eligibleSeconds, 0);
  assert.equal(summary.insights.length, 0);
  assert.match(summary.explanation, /not enough|insufficient/i);
});
test("camera-only movement cannot produce a lateral movement tactical cue", () => {
  const track = Array.from({ length: 25 }, (_, i) => ({
    ...point(i / 12, 0.2 + i * 0.012),
    cameraX: i * 0.012,
  }));
  const result = {
    source: { duration: 2, width: 1920, height: 1080 },
    frames: Array.from({ length: 4 }, (_, i) => ({
      timestamp: i / 2,
      detections: [],
      camera: { x: i * 0.072, y: 0, reliable: true },
    })),
    sampleRate: 2,
    ballTrack: track,
    teams: [],
  } as unknown as AnalysisResult;
  assert.ok(!analyzeSequence(result).insights.some((insight) => insight.kind === "movement"));
});

function pressureFixture(moving = true): AnalysisResult {
  const track = Array.from({ length: 24 }, (_, i) => ({
    ...point(i / 12, 0.3 + (moving ? i * 0.002 : 0)),
    y: 0.55,
  }));
  const frames: DetectionFrame[] = Array.from({ length: 4 }, (_, i) => ({
    timestamp: i / 2,
    camera: { x: 0, y: 0, reliable: true },
    detections: [
      {
        label: "person",
        trackId: 1,
        confidence: 0.9,
        x: 0.285 + i * 0.012,
        y: 0.43,
        width: 0.03,
        height: 0.12,
        onPitch: true,
        teamId: 0,
      },
      {
        label: "person",
        trackId: 2,
        confidence: 0.9,
        x: 0.34 + i * 0.012,
        y: 0.43,
        width: 0.03,
        height: 0.12,
        onPitch: true,
        teamId: 1,
      },
      {
        label: "person",
        trackId: 3,
        confidence: 0.9,
        x: 0.37 + i * 0.012,
        y: 0.43,
        width: 0.03,
        height: 0.12,
        onPitch: true,
        teamId: 1,
      },
    ],
  }));
  return {
    source: { duration: 2, width: 1920, height: 1080 },
    frames,
    sampleRate: 2,
    ballSampleRate: 12,
    ballTrack: track,
    teams: [],
  } as unknown as AnalysisResult;
}
test("sustained nearby opponents in a moving sequence produce an evidence-linked pressure cue", () => {
  const summary = analyzeSequence(pressureFixture());
  const cue = summary.insights.find((cue) => cue.kind === "pressure");
  assert.ok(cue);
  assert.ok(cue.support >= 4);
  assert.match(cue.verify, /camera view/);
  assert.ok(summary.control.unknownSeconds >= 0);
});
test("a stationary repeated photograph does not create a pressure tactic", () => {
  const fixture = pressureFixture(false);
  fixture.frames.forEach((frame) =>
    frame.detections.forEach((d, i) => (d.x = [0.285, 0.34, 0.37][i])),
  );
  assert.ok(!analyzeSequence(fixture).insights.some((cue) => cue.kind === "pressure"));
});
test("a cut prevents a false turnover between different team-control runs", () => {
  const fixture = pressureFixture();
  fixture.ballTrack = fixture.ballTrack!.map((p) => ({ ...p, segment: p.timestamp >= 1 ? 2 : 1 }));
  fixture.frames.forEach((frame) => {
    if (frame.timestamp >= 1) frame.detections[0].teamId = 1;
  });
  assert.ok(!analyzeSequence(fixture).insights.some((cue) => cue.kind === "transition"));
});

test("cleaned ball data splits gaps even if an associator reused its segment ID", () => {
  const clean = cleanBallTrack([
    point(0, 0.2),
    point(0.1, 0.21),
    point(0.6, 0.3),
    point(0.7, 0.31),
  ]);
  assert.equal(clean.length, 4);
  assert.notEqual(clean[1].segment, clean[2].segment);
});
