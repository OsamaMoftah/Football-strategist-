"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileJson, FileText, ScanLine, X } from "lucide-react";
import { analyzeClip } from "@/lib/cv/video";
import { drawAnalysis } from "@/lib/cv/draw";
import { exportAnnotated } from "@/lib/cv/export";
import { type AnalysisProgress, type AnalysisResult } from "@/lib/cv/types";
import { DetectionTimeline } from "@/components/DetectionTimeline";
import { buildFindingsReport, summarizeFindings } from "@/lib/cv/findings";
import { SequencePanel } from "@/components/SequencePanel";
import { strategyPatterns } from "@/lib/strategy-data";

interface ClipAnalysisProps {
  file: File;
  src: string;
  result: AnalysisResult | null;
  onResult: (result: AnalysisResult) => void;
  exportOpen: boolean;
  onExportClose: () => void;
  selectedStrategies: string[];
  onToggleStrategy: (strategyId: string) => void;
  onBrowseStrategies: () => void;
  active?: boolean;
  seekRequest?: { time: number; nonce: number } | null;
  onBusyChange?: (busy: boolean) => void;
  onFindings?: () => void;
}

function saveUrl(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function ClipAnalysis({
  file,
  src,
  result,
  onResult,
  exportOpen,
  onExportClose,
  selectedStrategies,
  onToggleStrategy,
  onBrowseStrategies,
  active = true,
  seekRequest,
  onBusyChange,
  onFindings,
}: ClipAnalysisProps) {
  const videoRef = useRef<HTMLVideoElement>(null),
    canvasRef = useRef<HTMLCanvasElement>(null);
  const analysisRef = useRef<AbortController | null>(null),
    exportRef = useRef<AbortController | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [download, setDownload] = useState<{ url: string; name: string } | null>(null);
  const [time, setTime] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showPlayers, setShowPlayers] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [anchoring, setAnchoring] = useState(false);
  const busy = progress !== null,
    exporting = exportProgress !== null;
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  useEffect(() => {
    if (!active) videoRef.current?.pause();
  }, [active]);
  useEffect(() => {
    if (seekRequest && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = seekRequest.time;
      setTime(seekRequest.time);
    }
  }, [seekRequest]);
  useEffect(() => {
    if (!exportOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[aria-labelledby="clip-export-title"]');
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>("button:not(:disabled),a[href],input") ?? [],
      );
    focusable()[0]?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") onExportClose();
      if (event.key === "Tab") {
        const items = focusable(),
          first = items[0],
          last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("keydown", keyboard);
      previous?.focus();
    };
  }, [exportOpen, onExportClose]);
  const trackingJsonHref = useMemo(
    () =>
      result
        ? "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result))
        : undefined,
    [result],
  );
  const findingsReportHref = useMemo(() => {
    if (!result) return undefined;
    const selectedPatterns = strategyPatterns.filter((pattern) =>
      selectedStrategies.includes(pattern.id),
    );
    return (
      "data:text/markdown;charset=utf-8," +
      encodeURIComponent(buildFindingsReport(result, summarizeFindings(result), selectedPatterns))
    );
  }, [result, selectedStrategies]);

  const runAnalysis = useCallback(async () => {
    if (analysisRef.current && !analysisRef.current.signal.aborted) return;
    const controller = new AbortController();
    analysisRef.current = controller;
    setError(null);
    videoRef.current?.pause();
    try {
      const measured = await analyzeClip(file, {
        signal: controller.signal,
        onProgress: setProgress,
      });
      if (!controller.signal.aborted) {
        onResult(measured);
        if (videoRef.current) videoRef.current.currentTime = 0;
        setTime(0);
      }
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : "Analysis failed. Try another clip.");
    } finally {
      if (analysisRef.current === controller) {
        analysisRef.current = null;
        setProgress(null);
      }
    }
  }, [file, onResult]);

  const initialResult = useRef(result);
  useEffect(() => {
    const kickoff = window.setTimeout(() => {
      if (!initialResult.current) void runAnalysis();
    }, 0);
    return () => {
      window.clearTimeout(kickoff);
      analysisRef.current?.abort();
      exportRef.current?.abort();
    };
  }, [runAnalysis]);
  useEffect(
    () => () => {
      if (download) URL.revokeObjectURL(download.url);
    },
    [download],
  );

  // Every draw is based on the media element's own time, including native scrubbing.
  useEffect(() => {
    const video = videoRef.current,
      canvas = canvasRef.current;
    if (!video || !canvas) return;
    let request = 0;
    const draw = () => {
      const bounds = canvas.getBoundingClientRect(),
        dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(bounds.width * dpr)),
        height = Math.max(1, Math.round(bounds.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, bounds.width, bounds.height);
        if (result && showOverlay && video.videoWidth) {
          const ratio = Math.min(
              bounds.width / video.videoWidth,
              bounds.height / video.videoHeight,
            ),
            w = video.videoWidth * ratio,
            h = video.videoHeight * ratio;
          ctx.save();
          ctx.translate((bounds.width - w) / 2, (bounds.height - h) / 2);
          drawAnalysis(ctx, result, video.currentTime, w, h, {
            players: showPlayers,
            trail: showTrail,
          });
          ctx.restore();
        }
      }
      request = requestAnimationFrame(draw);
    };
    request = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(request);
  }, [result, showOverlay, showPlayers, showTrail]);

  const cancelAnalysis = () => {
    analysisRef.current?.abort();
  };
  const exportVideo = async () => {
    if (!result || exportRef.current) return;
    const controller = new AbortController();
    exportRef.current = controller;
    setExportError(null);
    setExportProgress(0);
    videoRef.current?.pause();
    try {
      const recording = await exportAnnotated(src, result, {
        signal: controller.signal,
        onProgress: setExportProgress,
        drawOptions: { players: showPlayers, trail: showTrail },
      });
      if (controller.signal.aborted) return;
      const name = `${file.name.replace(/\.[^.]+$/, "")}-football-strategist.${recording.extension}`;
      const url = URL.createObjectURL(recording.blob);
      setDownload({ url, name });
      saveUrl(url, name);
    } catch (cause) {
      if (!controller.signal.aborted)
        setExportError(cause instanceof Error ? cause.message : "Video export failed.");
    } finally {
      if (exportRef.current === controller) {
        exportRef.current = null;
        setExportProgress(null);
      }
    }
  };
  const seekToSample = (timestamp: number) => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = timestamp;
      video.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTime(timestamp);
  };
  const exportActions = (
    <>
      <button
        className="button-primary"
        type="button"
        disabled={!result || busy || exporting}
        onClick={() => void exportVideo()}
      >
        <Download size={14} />
        Download annotated video
      </button>
      <a
        className="button-secondary"
        href={busy || exporting ? undefined : trackingJsonHref}
        aria-disabled={!result || busy || exporting}
        tabIndex={!result || busy || exporting ? -1 : undefined}
        download={file.name.replace(/\.[^.]+$/, "") + "-tracking.json"}
      >
        <FileJson size={14} />
        Tracking JSON
      </a>
      <a
        className="button-secondary"
        href={busy || exporting ? undefined : findingsReportHref}
        aria-disabled={!result || busy || exporting}
        tabIndex={!result || busy || exporting ? -1 : undefined}
        download={file.name.replace(/\.[^.]+$/, "") + "-findings.md"}
      >
        <FileText size={14} />
        Findings report
      </a>
      {exporting && (
        <>
          <p className="cv-hint" role="status">
            Recording {Math.round((exportProgress ?? 0) * 100)}% · Keep this tab visible.
          </p>
          <button
            className="button-secondary"
            type="button"
            onClick={() => exportRef.current?.abort()}
          >
            Cancel export
          </button>
        </>
      )}
      {download && !exporting && (
        <a className="text-link" href={download.url} download={download.name}>
          Save last video again
        </a>
      )}
      {exportError && (
        <p className="cv-error" role="alert">
          {exportError}
        </p>
      )}
    </>
  );

  return (
    <>
      <section className="wk-heading wk-review-heading">
        <h1>Review the sequence.</h1>
        <p>
          Follow the ball. Read the pressure. Turn timestamped evidence into a tactical review. Your
          video stays on your device.
        </p>
      </section>
      <p className="wk-source">
        {file.name} · RF-DETR Nano ·{" "}
        {busy
          ? "analysis running"
          : result
            ? `${result.frames.length} measured samples`
            : "local clip"}
      </p>
      <div className="cv-layout">
        <div className="workspace-main">
          <section className="panel" aria-label="Real clip analysis">
            <div className="panel-heading">
              <div>
                <h2 className="panel-heading__title">Video analysis</h2>
                <p className="panel-heading__description">{file.name}</p>
              </div>
              <span className={`mini-chip ${result ? "mini-chip--good" : "mini-chip--neutral"}`}>
                {busy ? "Analyzing" : result ? "Ball & player analysis" : "Clip loaded"}
              </span>
            </div>
            <div className="video-panel__body">
              <div
                className={`video-viewport cv-viewport ${anchoring ? "cv-viewport--anchor" : ""}`}
                onClick={(event) => {
                  if (!anchoring || !result || busy) return;
                  const video = videoRef.current;
                  if (!video) return;
                  const bounds = event.currentTarget.getBoundingClientRect(),
                    ratio = Math.min(
                      bounds.width / video.videoWidth,
                      bounds.height / video.videoHeight,
                    ),
                    w = video.videoWidth * ratio,
                    h = video.videoHeight * ratio;
                  const x = (event.clientX - bounds.left - (bounds.width - w) / 2) / w,
                    y = (event.clientY - bounds.top - (bounds.height - h) / 2) / h;
                  if (x < 0 || x > 1 || y < 0 || y > 1) return;
                  const timestamp = video.currentTime,
                    controller = new AbortController();
                  analysisRef.current = controller;
                  setAnchoring(false);
                  setError(null);
                  void analyzeClip(file, {
                    signal: controller.signal,
                    onProgress: setProgress,
                    existing: result,
                    ballSeed: { timestamp, x, y },
                  })
                    .then((measured) => {
                      if (!controller.signal.aborted) onResult(measured);
                    })
                    .catch((cause) => {
                      if (!controller.signal.aborted)
                        setError(cause instanceof Error ? cause.message : "Ball refinement failed");
                    })
                    .finally(() => {
                      if (analysisRef.current === controller) {
                        analysisRef.current = null;
                        setProgress(null);
                      }
                    });
                }}
              >
                <video
                  ref={videoRef}
                  src={src}
                  controls
                  playsInline
                  preload="auto"
                  aria-label="Uploaded match video"
                  onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
                  onSeeked={(event) => setTime(event.currentTarget.currentTime)}
                  onError={() =>
                    setError(
                      "This browser could not play the selected file. Choose an H.264 MP4 or WebM.",
                    )
                  }
                />
                <canvas ref={canvasRef} className="cv-overlay" aria-hidden="true" />
              </div>
              <div className="cv-review-toolbar">
                <div className="cv-layer-controls" aria-label="Video overlay layers">
                  <span>LAYERS</span>
                  <label>
                    <input
                      type="checkbox"
                      checked={showOverlay}
                      onChange={(e) => setShowOverlay(e.target.checked)}
                    />
                    Overlay
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={showPlayers}
                      onChange={(e) => setShowPlayers(e.target.checked)}
                    />
                    Players
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={showTrail}
                      onChange={(e) => setShowTrail(e.target.checked)}
                    />
                    Trail
                  </label>
                </div>
                <div className="cv-engine-actions">
                  <button
                    className="cv-tool-button"
                    type="button"
                    onClick={() => void runAnalysis()}
                    disabled={busy || exporting}
                  >
                    <ScanLine size={14} />
                    {busy ? "Analyzing…" : result ? "Analyze again" : "Analyze clip"}
                  </button>
                  {busy ? (
                    <button className="cv-tool-button" onClick={cancelAnalysis}>
                      Cancel
                    </button>
                  ) : (
                    result && (
                      <button
                        className="cv-tool-button"
                        disabled={exporting}
                        onClick={() => {
                          videoRef.current?.pause();
                          setAnchoring(!anchoring);
                        }}
                      >
                        {anchoring ? "Cancel anchor" : "Correct ball"}
                      </button>
                    )
                  )}
                </div>
              </div>
              {result && (
                <div className="cv-precision-scrub">
                  <button
                    onClick={() =>
                      seekToSample(
                        Math.max(0, time - 1 / (result.ballSampleRate ?? result.sampleRate)),
                      )
                    }
                    aria-label="Previous motion sample"
                  >
                    ←
                  </button>
                  <span>{time.toFixed(2)}</span>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, result.source.duration - 0.01)}
                    step="0.01"
                    value={Math.min(time, result.source.duration - 0.01)}
                    aria-label="Seek analysis video"
                    onChange={(e) => {
                      const timestamp = Number(e.target.value);
                      videoRef.current?.pause();
                      if (videoRef.current) videoRef.current.currentTime = timestamp;
                      setTime(timestamp);
                    }}
                  />
                  <span>{result.source.duration.toFixed(2)} s</span>
                  <button
                    onClick={() =>
                      seekToSample(
                        Math.min(
                          result.source.duration - 0.01,
                          time + 1 / (result.ballSampleRate ?? result.sampleRate),
                        ),
                      )
                    }
                    aria-label="Next motion sample"
                  >
                    →
                  </button>
                </div>
              )}
              {anchoring && (
                <p className="cv-anchor-note" role="status">
                  Pause at a clear ball, then click its center in the video. This adds a manual
                  anchor and reruns ball tracking.
                </p>
              )}
              {progress && (
                <div className="cv-progress" role="status">
                  <progress
                    max={progress.total}
                    value={progress.phase === "loading" ? undefined : progress.completed}
                    aria-label={progress.message}
                  />
                  <p>{progress.message}</p>
                </div>
              )}
              {error && (
                <p className="cv-error" role="alert">
                  {error}
                </p>
              )}
              {!busy && !result && !error && (
                <p className="cv-hint">
                  Analysis is paused. Choose Analyze clip to start or retry.
                </p>
              )}
              {result && (
                <p className="cv-hint">
                  Blue trace / yellow ball · dashed strokes are pixel estimates ·{" "}
                  {result.ballSampleRate ?? result.sampleRate} Hz motion sampling.
                </p>
              )}
            </div>
          </section>
          {result && (
            <DetectionTimeline
              frames={result.frames}
              time={time}
              duration={result.source.duration}
              sampleRate={result.sampleRate}
              onSeek={seekToSample}
            />
          )}
          {result && (
            <div className="wk-review-links">
              <button className="wk-text-button" type="button" onClick={onFindings}>
                Read the measured findings →
              </button>
              <button className="wk-text-button" type="button" onClick={onBrowseStrategies}>
                Choose a tactical lens →
              </button>
            </div>
          )}
        </div>
        <SequencePanel
          videoRef={videoRef}
          result={result}
          time={time}
          onSeek={seekToSample}
          onStrategy={(id) => {
            if (!selectedStrategies.includes(id)) onToggleStrategy(id);
            onBrowseStrategies();
          }}
        />
      </div>
      <div className="cv-review-bottom">
        {" "}
        {result && (
          <section className="panel" aria-label="Measured analysis summary">
            <div className="cv-stats">
              <div>
                <span>Analyzed frames</span>
                <strong>{result.frames.length}</strong>
              </div>
              <div>
                <span>Person track segments</span>
                <strong>{result.summary.personTrackSegments}</strong>
              </div>
              <div>
                <span>Frames with people</span>
                <strong>
                  {Math.round((result.summary.framesWithPeople / result.frames.length) * 100)}%
                </strong>
              </div>
              <div>
                <span>Frames with ball candidates</span>
                <strong>
                  {Math.round((result.summary.framesWithBall / result.frames.length) * 100)}%
                </strong>
              </div>
            </div>
            <p className="cv-hint cv-panel-note">
              Processed in {(result.elapsedMs / 1000).toFixed(1)} s. Frame coverage means a
              candidate was present, not measured accuracy. Ball: {result.summary.framesWithBall}/
              {result.frames.length} frames. Track IDs describe short visual segments, not player
              identities.{" "}
              {result.summary.totalDetections === 0
                ? "No confident detections were found. Try a closer, clearer clip."
                : ""}
            </p>
          </section>
        )}
        <section id="clip-export" className="panel">
          <div className="panel-heading">
            <div>
              <h2 className="panel-heading__title">Export this analysis</h2>
              <p className="panel-heading__description">
                {result
                  ? "Source footage with synchronized boxes, IDs, and ball candidates"
                  : "Available when analysis finishes"}
              </p>
            </div>
          </div>
          <div className="cv-export-actions">
            {exportActions}
            <p className="cv-hint">
              Video export is silent and records at playback speed, up to 1080p. Chrome/Edge usually
              save WebM; the extension matches the browser’s supported format.
            </p>
          </div>
        </section>
      </div>
      {exportOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onExportClose();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="clip-export-title"
            className="export-dialog"
          >
            <div className="export-dialog__head">
              <div>
                <h2 id="clip-export-title" className="export-dialog__title">
                  Export clip analysis
                </h2>
                <p className="export-dialog__description">
                  {result ? file.name : "Analyze the clip before exporting."}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close export dialog"
                onClick={onExportClose}
              >
                <X size={16} />
              </button>
            </div>
            <div className="cv-export-actions">{exportActions}</div>
          </section>
        </div>
      )}
    </>
  );
}

export function MeasuredFrames({ result }: { result: AnalysisResult | null }) {
  return (
    <section className="panel view-panel">
      <div className="view-panel__intro">
        <div>
          <h1 className="view-panel__title">Measured detection frames</h1>
          <p className="view-panel__description">
            {result
              ? "Actual model observations. Tactical cues are shown separately from raw model observations."
              : "Analyze your clip first to inspect its detections."}
          </p>
        </div>
      </div>
      {result && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Video time</th>
                <th>Person detections</th>
                <th>Ball candidates</th>
                <th>Short-term track IDs</th>
              </tr>
            </thead>
            <tbody>
              {result.frames.map((frame) => (
                <tr key={frame.timestamp}>
                  <td className="numeric">{frame.timestamp.toFixed(2)} s</td>
                  <td>{frame.detections.filter((d) => d.label === "person").length}</td>
                  <td>{frame.detections.filter((d) => d.label === "ball").length}</td>
                  <td>
                    {frame.detections
                      .map((d) => `${d.label === "person" ? "P" : "B"}${d.trackId}`)
                      .join(", ") || "No confident detections"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
