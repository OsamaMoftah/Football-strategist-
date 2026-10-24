import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const assets = new Map([
  [
    "public/models/rfdetr-nano/model_quantized.onnx",
    "2981aa0a57781c0f1a5be171c3fded504c38fe8611326bc5e3d0f8a2e9a57085",
  ],
  [
    "public/models/football-ball/model.onnx",
    "e20ef0b13504eae4eab770bfcc7593110ca279914f186aeb2ae6df9b4729a9ae",
  ],
  [
    "public/demo/leao-goal.webm",
    "4847f5647696567c48a13b39b6621419ddf69fc5ed75110e82778f52eb8d6df5",
  ],
]);
for (const [path, expected] of assets) {
  const actual = createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
  if (actual !== expected) throw new Error(`Asset integrity mismatch: ${path}`);
  console.log(`Verified ${path}`);
}
const result = JSON.parse(await readFile("public/demo/leao-analysis.json", "utf8"));
if (result.pipelineVersion !== 2 || !result.ballTrack?.length) {
  throw new Error("The included demo requires genuine version-2 ball observations.");
}

const personPreprocessor = JSON.parse(
  await readFile("public/models/rfdetr-nano/preprocessor_config.json", "utf8"),
);
if (personPreprocessor.do_normalize !== false || personPreprocessor.size?.width !== 384) {
  throw new Error(
    "Person-model preprocessing changed; update the worker and validate parity before shipping.",
  );
}
