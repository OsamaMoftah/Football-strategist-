import test from "node:test";
import assert from "node:assert/strict";
import { cameraShift, followBall, type GrayFrame } from "../appearance";
import { decodeFootballBalls } from "../postprocess";
import type { BallPoint } from "../types";
const frame = (dx = 0): GrayFrame => {
  const pixels = new Uint8Array(80 * 60).fill(80);
  for (let y = -5; y <= 5; y++)
    for (let x = -5; x <= 5; x++)
      pixels[(30 + y) * 80 + 30 + x + dx] = (((x + 5) * 53 + (y + 5) * 37 + x * y * 7) % 200) + 25;
  return { width: 80, height: 60, pixels };
};
const point: BallPoint = {
  timestamp: 0,
  x: 30 / 80,
  y: 30 / 60,
  width: 0.03,
  height: 0.04,
  confidence: 0.9,
  segment: 1,
  source: "detector",
  cameraX: 0,
  cameraY: 0,
};
test("appearance follow measures a translated patch and labels it as an estimate", () => {
  const next = followBall(frame(), frame(4), point, 1 / 12, { x: 0, y: 0 });
  assert.ok(next);
  assert.equal(next.source, "appearance");
  assert.ok(Math.abs(next.x - 34 / 80) < 0.001);
});
test("featureless grass cannot become an appearance track", () => {
  const plain = { width: 80, height: 60, pixels: new Uint8Array(4800).fill(90) };
  assert.equal(followBall(plain, plain, point, 0.08, { x: 0, y: 0 }), null);
});
test("a large scene histogram change resets motion continuity", () => {
  const a = { width: 80, height: 60, pixels: new Uint8Array(4800).fill(10) },
    b = { ...a, pixels: new Uint8Array(4800).fill(230) };
  assert.equal(cameraShift(a, b).cut, true);
});
test("football decoder accepts both ball labels but rejects a winning background logit", () => {
  const boxes = new Float32Array([
    0.2, 0.3, 0.02, 0.02, 0.5, 0.5, 0.02, 0.02, 0.8, 0.7, 0.02, 0.02,
  ]);
  const logits = new Float32Array([2, -4, -5, -4, 2, -5, 1, 1, 3]);
  const result = decodeFootballBalls(boxes, logits, { x: 0, y: 0, width: 1, height: 1 });
  assert.equal(result.length, 2);
  assert.ok(result.every((d) => d.label === "ball"));
});
