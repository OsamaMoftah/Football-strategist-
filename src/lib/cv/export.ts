import { drawAnalysis, type DrawOptions } from "./draw";
import { recordingFormat } from "./recording-format";
import { aborted, checkAbort, type AnalysisResult } from "./types";
import { loadVideo } from "./video";

/** Records rendered source frames and the same overlays used in the viewer. Silent by design. */
export async function exportAnnotated(
  src: string,
  result: AnalysisResult,
  options: {
    signal: AbortSignal;
    onProgress: (fraction: number) => void;
    drawOptions?: DrawOptions;
    mediaCredit?: string;
  },
) {
  const { signal, onProgress } = options;
  if (typeof MediaRecorder === "undefined")
    throw new Error("This browser does not support video export. Try Chrome or Edge.");
  const format = recordingFormat((type) => MediaRecorder.isTypeSupported(type));
  const video = await loadVideo(src, signal);
  let stream: MediaStream | undefined;
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1920 / result.source.width);
    canvas.width = Math.round((result.source.width * scale) / 2) * 2;
    canvas.height = Math.round((result.source.height * scale) / 2) * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx || !canvas.captureStream) throw new Error("Canvas video recording is unavailable.");
    stream = canvas.captureStream(25);
    const recorder = new MediaRecorder(stream, {
      mimeType: format.mimeType,
      videoBitsPerSecond: 6_000_000,
    });
    const chunks: BlobPart[] = [];
    await new Promise<void>((resolve, reject) => {
      let request = 0,
        settled = false;
      const draw = () => {
        if (settled) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        drawAnalysis(
          ctx,
          result,
          video.currentTime,
          canvas.width,
          canvas.height,
          options.drawOptions,
        );
        const size = Math.max(9, canvas.width / 110);
        const lines = [
          `Football strategist · ${result.ballSampleRate ?? result.sampleRate} Hz · ${video.currentTime.toFixed(2)} s`,
          "Dashed trace = pixel estimate · image-space coordinates",
          ...(options.mediaCredit ? options.mediaCredit.split("\n") : []),
        ];
        const lineHeight = size * 1.4,
          footerHeight = lines.length * lineHeight + size;
        ctx.font = `${size}px ui-sans-serif, sans-serif`;
        ctx.fillStyle = "rgba(8,18,35,.88)";
        ctx.fillRect(0, canvas.height - footerHeight, canvas.width, footerHeight);
        ctx.fillStyle = "#fff";
        lines.forEach((line, index) =>
          ctx.fillText(
            line,
            size,
            canvas.height - footerHeight + size + lineHeight * (index + 0.5),
            canvas.width - size * 2,
          ),
        );
        onProgress(Math.min(1, video.currentTime / result.source.duration));
        request = window.requestAnimationFrame(draw);
      };
      const cleanup = () => {
        cancelAnimationFrame(request);
        signal.removeEventListener("abort", cancel);
        video.removeEventListener("ended", ended);
        document.removeEventListener("visibilitychange", visibility);
      };
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        video.pause();
        if (recorder.state !== "inactive") recorder.stop();
        reject(error);
      };
      const cancel = () => fail(aborted());
      const visibility = () => {
        if (document.hidden)
          fail(
            new Error(
              "Export stopped because this tab was hidden. Keep the tab visible and retry.",
            ),
          );
      };
      const ended = () => {
        cancelAnimationFrame(request);
        if (recorder.state !== "inactive") recorder.stop();
      };
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => fail(new Error("The browser could not record the annotated clip."));
      recorder.onstop = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };
      signal.addEventListener("abort", cancel, { once: true });
      video.addEventListener("ended", ended, { once: true });
      document.addEventListener("visibilitychange", visibility);
      try {
        checkAbort(signal);
        draw();
        recorder.start(250);
        void video
          .play()
          .catch((error) => fail(error instanceof Error ? error : new Error(String(error))));
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)));
      }
    });
    checkAbort(signal);
    const blob = new Blob(chunks, { type: format.mimeType });
    if (!blob.size) throw new Error("No video frames were recorded.");
    return { blob, extension: format.extension };
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    stream?.getTracks().forEach((track) => track.stop());
  }
}
