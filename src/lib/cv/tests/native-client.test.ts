import test from "node:test";
import assert from "node:assert/strict";
import { analyzeNative } from "../native-client";
import { forwardNative } from "../native-proxy";
const id = "a".repeat(32);
const clip = new File(["real video bytes"], "clip.mp4", { type: "video/mp4" });
async function result(hash?: string) {
  const digest =
    hash ??
    Buffer.from(await crypto.subtle.digest("SHA-256", await clip.arrayBuffer())).toString("hex");
  return {
    schemaVersion: 1,
    pipelineVersion: 3,
    coordinateSpace: "normalized-image",
    source: { size: clip.size, width: 1280, height: 720, duration: 1 },
    frames: [{ timestamp: 0, detections: [] }],
    processing: { sourceSha256: digest },
  };
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("native upload reports progress and returns only the source-matched result", async () => {
  const calls: string[] = [];
  const progress: string[] = [];
  const measured = await result();
  const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${input}`);
    if (init?.method === "POST") return json({ id, token: "secret" });
    if (init?.method === "PUT") return json({ status: "queued" }, 202);
    if (init?.method === "DELETE") return json({ status: "cancelled" });
    if (String(input).endsWith("/result")) return json(measured);
    return json({ status: "complete", completed: 30, total: 30 });
  };
  const actual = await analyzeNative(clip, {
    signal: new AbortController().signal,
    onProgress: (p) => progress.push(p.message),
    fetcher,
    pollMs: 0,
  });
  assert.equal(actual.processing?.sourceSha256, measured.processing.sourceSha256);
  assert.ok(progress.some((p) => p.includes("30")));
  assert.equal(calls.at(-1), `DELETE /api/native/jobs/${id}`);
});

test("native cancellation deletes the known remote job, even after upload starts", async () => {
  const controller = new AbortController();
  let deleted = false;
  const fetcher = async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") return json({ id, token: "secret" });
    if (init?.method === "PUT") {
      controller.abort();
      throw new DOMException("Cancelled", "AbortError");
    }
    if (init?.method === "DELETE") {
      deleted = true;
      return json({});
    }
    throw new Error("Unexpected request");
  };
  await assert.rejects(
    analyzeNative(clip, { signal: controller.signal, onProgress: () => {}, fetcher, pollMs: 0 }),
    { name: "AbortError" },
  );
  assert.equal(deleted, true);
});

test("mismatched source and failed server jobs cannot become overlay results", async () => {
  for (const failure of ["hash", "engine"]) {
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") return json({ id, token: "secret" });
      if (init?.method === "PUT" || init?.method === "DELETE") return json({});
      if (String(input).endsWith("/result")) return json(await result("wrong"));
      return json(
        failure === "engine"
          ? { status: "failed", error: "Clip too long" }
          : { status: "complete", total: 1, completed: 1 },
      );
    };
    await assert.rejects(
      analyzeNative(clip, {
        signal: new AbortController().signal,
        onProgress: () => {},
        fetcher,
        pollMs: 0,
      }),
      failure === "hash" ? /match/i : /Clip too long/,
    );
  }
});

test("proxy rejects cross-origin mutation and path injection before contacting backend", async () => {
  const cross = new Request("https://demo.test/api/native/jobs", {
    method: "POST",
    headers: { Origin: "https://other.test" },
    body: "{}",
  });
  assert.equal((await forwardNative(cross, ["jobs"], "http://127.0.0.1:8000")).status, 403);
  assert.equal(
    (
      await forwardNative(
        new Request("https://demo.test/api/native/health"),
        ["..", "secrets"],
        "http://127.0.0.1:8000",
      )
    ).status,
    404,
  );
  assert.equal(
    (await forwardNative(new Request("https://demo.test/api/native/health"), ["health"], undefined))
      .status,
    503,
  );
});
