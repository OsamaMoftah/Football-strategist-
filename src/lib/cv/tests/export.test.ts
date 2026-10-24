import test from "node:test";
import assert from "node:assert/strict";
import { recordingFormat } from "../recording-format";

test("recording extension matches the supported container", () => {
  assert.deepEqual(
    recordingFormat((type) => type === "video/webm;codecs=vp8"),
    { mimeType: "video/webm;codecs=vp8", extension: "webm" },
  );
  assert.deepEqual(
    recordingFormat((type) => type === "video/mp4"),
    { mimeType: "video/mp4", extension: "mp4" },
  );
});
test("export fails clearly when the browser cannot record a supported video format", () => {
  assert.throws(() => recordingFormat(() => false), /support/i);
});
