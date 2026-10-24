import test from "node:test";
import assert from "node:assert/strict";
import { decodeDetections, suppressOverlaps } from "../postprocess";
import { Tracker } from "../tracker";
import { detectionsAt, validateClip } from "../types";

const person = (x = 0.2) => ({
  label: "person" as const,
  confidence: 0.9,
  x,
  y: 0.3,
  width: 0.05,
  height: 0.1,
});

test("model boxes map from tile coordinates to the source image and stay bounded", () => {
  const logits = new Float32Array(91).fill(-20);
  logits[1] = 3;
  const detections = decodeDetections(new Float32Array([0.5, 0.5, 0.4, 0.2]), logits, {
    x: 0.5,
    y: 0,
    width: 0.5,
    height: 0.5,
  });
  assert.equal(detections.length, 1);
  assert.ok(Math.abs(detections[0].x - 0.65) < 1e-6);
  assert.ok(Math.abs(detections[0].y - 0.2) < 1e-6);
  assert.ok(Math.abs(detections[0].width - 0.2) < 1e-6);
  assert.equal(
    decodeDetections(new Float32Array([0.5, 0.5, 0.1, 0.1]), new Float32Array(91).fill(-20), {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    }).length,
    0,
  );
});

test("overlapping tiles do not double-count the same person; different classes survive", () => {
  const detections = suppressOverlaps([
    person(),
    { ...person(0.201), confidence: 0.8 },
    { ...person(), label: "ball" as const },
  ]);
  assert.equal(detections.length, 2);
  assert.equal(detections[0].confidence, 0.9);
});

test("track IDs follow nearby detections, are one-to-one and expire after a gap", () => {
  const tracker = new Tracker();
  const initial = tracker.update([person(0.2), person(0.5)], 0);
  const moved = tracker.update([person(0.205), person(0.505)], 0.333);
  assert.deepEqual(
    moved.map((d) => d.trackId),
    initial.map((d) => d.trackId),
  );
  assert.equal(new Set(moved.map((d) => d.trackId)).size, 2);
  const afterCut = tracker.update([person(0.205)], 2);
  assert.notEqual(afterCut[0].trackId, initial[0].trackId);
  assert.deepEqual(tracker.update([], 2.333), []);
});

test("seeking uses measured timestamps and never stretches detections into missing footage", () => {
  const frames = [
    { timestamp: 0, detections: [{ ...person(), trackId: 1 }] },
    { timestamp: 1 / 3, detections: [] },
  ];
  assert.equal(detectionsAt(frames, 0.05).length, 1);
  assert.equal(detectionsAt(frames, 0.3).length, 0);
  assert.equal(detectionsAt(frames, 3).length, 0);
});

test("invalid, oversized and excessively long clips fail before inference", () => {
  assert.throws(
    () => validateClip({ duration: NaN, width: 1920, height: 1080, size: 1 }),
    /decode/i,
  );
  assert.throws(() => validateClip({ duration: 61, width: 1920, height: 1080, size: 1 }), /60/);
  assert.throws(
    () => validateClip({ duration: 15, width: 1920, height: 1080, size: 201 * 1024 * 1024 }),
    /200/,
  );
  assert.doesNotThrow(() =>
    validateClip({ duration: 15, width: 1920, height: 1080, size: 12_000_000 }),
  );
});
