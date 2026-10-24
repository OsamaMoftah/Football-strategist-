import { aborted, checkAbort, type AnalysisProgress, type AnalysisResult } from "./types";

export interface NativeHealth {
  available: boolean;
  maxBytes: number;
  maxSeconds: number;
  retentionSeconds: number;
}
export type AnalysisEngine = "browser" | "native";
interface NativeOptions {
  signal: AbortSignal;
  onProgress: (progress: AnalysisProgress) => void;
  fetcher?: typeof fetch;
  pollMs?: number;
  base?: string;
}
async function responseJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Native service unavailable. Try again or choose browser processing.",
    );
  return data;
}
function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const done = () => {
      signal.removeEventListener("abort", cancel);
      resolve();
    };
    const timer = setTimeout(done, ms);
    const cancel = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      reject(aborted());
    };
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
  });
}

/** Tokens stay in memory. A separate reservation makes upload cancellation addressable. */
export async function analyzeNative(file: File, options: NativeOptions): Promise<AnalysisResult> {
  const { signal, onProgress, fetcher = fetch, pollMs = 1500, base = "/api/native" } = options;
  let job: { id: string; token: string } | undefined;
  try {
    checkAbort(signal);
    if (file.size > 100 * 1024 * 1024)
      throw new Error("Native analysis accepts files up to 100 MB.");
    onProgress({
      phase: "loading",
      completed: 0,
      total: 1,
      message: "Preparing a private server job…",
    });
    const reservation = await responseJson(
      await fetcher(`${base}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name }),
        signal,
      }),
    );
    if (!/^[a-f0-9]{32}$/.test(reservation.id) || typeof reservation.token !== "string")
      throw new Error("The server returned an invalid job receipt.");
    job = reservation;
    checkAbort(signal);
    const headers = { Authorization: `Bearer ${job!.token}` };
    onProgress({
      phase: "loading",
      completed: 0,
      total: 1,
      message: "Uploading clip to this server…",
    });
    await responseJson(
      await fetcher(`${base}/jobs/${job!.id}`, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": file.type === "video/webm" ? "video/webm" : "video/mp4",
        },
        body: file,
        signal,
      }),
    );
    const deadline = Date.now() + 45 * 60_000;
    while (Date.now() < deadline) {
      checkAbort(signal);
      const state = await responseJson(
        await fetcher(`${base}/jobs/${job!.id}`, { headers, signal, cache: "no-store" }),
      );
      onProgress({
        phase: "analyzing",
        completed: state.completed ?? 0,
        total: state.total || 1,
        message:
          state.status === "queued"
            ? "Waiting for the shared CPU engine…"
            : `Native engine · ${state.completed ?? 0} / ${state.total || "…"} source frames`,
      });
      if (state.status === "failed") throw new Error(state.error || "Native analysis failed.");
      if (state.status === "cancelled") throw aborted();
      if (state.status === "complete") {
        const measured = (await responseJson(
          await fetcher(`${base}/jobs/${job!.id}/result`, { headers, signal, cache: "no-store" }),
        )) as AnalysisResult;
        onProgress({
          phase: "loading",
          completed: 0,
          total: 1,
          message: "Checking that these tracks match your clip…",
        });
        const bytes = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
        const hash = Array.from(new Uint8Array(bytes), (v) => v.toString(16).padStart(2, "0")).join(
          "",
        );
        checkAbort(signal);
        if (
          measured.schemaVersion !== 1 ||
          measured.pipelineVersion !== 3 ||
          measured.coordinateSpace !== "normalized-image" ||
          !Array.isArray(measured.frames) ||
          measured.source?.size !== file.size ||
          measured.processing?.sourceSha256 !== hash
        )
          throw new Error("The native result does not match this source clip.");
        return {
          ...measured,
          source: { ...measured.source, name: file.name, lastModified: file.lastModified },
        };
      }
      await pause(pollMs, signal);
    }
    throw new Error("Native analysis timed out. Try a shorter clip.");
  } finally {
    if (job)
      await fetcher(`${base}/jobs/${job.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${job.token}` },
        signal: AbortSignal.timeout(10_000),
        keepalive: true,
      }).catch(() => {});
  }
}
