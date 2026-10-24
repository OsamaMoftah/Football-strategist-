"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Header, type AppView } from "@/components/Header";
import { ClipSetup } from "@/components/ClipSetup";
import { SampleReview } from "@/components/SampleReview";
import { ClipAnalysis } from "@/components/ClipAnalysis";
import { AnalysisFindings } from "@/components/AnalysisFindings";
import { StrategyLibrary } from "@/components/StrategyLibrary";
import { ExportModal } from "@/components/ExportModal";
import { BenchmarksTable } from "@/components/BenchmarksTable";
import { strategyPatterns, type StrategyCategory } from "@/lib/strategy-data";
import type { MatchSample } from "@/lib/match-data";
import { nativeDemo } from "@/lib/cv/demo";
import type { AnalysisResult } from "@/lib/cv/types";

export default function Home() {
  const [view, setView] = useState<AppView>("setup");
  const [source, setSource] = useState<{ file: File; src: string; demo: boolean } | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const demoController = useRef<AbortController | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [sample, setSample] = useState<MatchSample | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sampleMode, setSampleMode] = useState(true);
  const [busy, setBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [category, setCategory] = useState<"All patterns" | StrategyCategory>("Transition");
  const [seekRequest, setSeekRequest] = useState<{ time: number; nonce: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/match_sample.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("The sample could not be loaded. Please reload.");
        return response.json() as Promise<MatchSample>;
      })
      .then((data) => {
        if (!Array.isArray(data.frames) || !data.frames.length)
          throw new Error("The sample has no tracking frames.");
        setSample(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setSampleError(error instanceof Error ? error.message : "Sample unavailable.");
      });
    return () => controller.abort();
  }, []);
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      demoController.current?.abort();
    },
    [],
  );
  const toggleStrategy = useCallback(
    (id: string) =>
      setSelectedStrategies((ids) =>
        ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
      ),
    [],
  );
  const closeExport = useCallback(() => setExportOpen(false), []);
  const realClip = source !== null && !sampleMode;
  const setClip = (file: File, demo = false, measured: AnalysisResult | null = null) => {
    const src = URL.createObjectURL(file);
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = src;
    setSource({ file, src, demo });
    setResult(measured);
    setBusy(false);
    setSampleMode(false);
    setView("analysis");
    setExportOpen(false);
    setUploadError(null);
    setSeekRequest(null);
  };
  const upload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    demoController.current?.abort();
    setDemoLoading(false);
    if (file.size > 200 * 1024 * 1024) {
      setUploadError("Choose a clip smaller than 200 MB.");
      return;
    }
    setClip(file);
  };
  const openDetectorDemo = async () => {
    demoController.current?.abort();
    const controller = new AbortController();
    demoController.current = controller;
    setDemoLoading(true);
    setUploadError(null);
    try {
      const response = await fetch(nativeDemo.video, { signal: controller.signal });
      if (!response.ok) throw new Error("The detector demo could not load. Please retry.");
      const blob = await response.blob();
      const saved = await fetch(nativeDemo.analysis, { signal: controller.signal })
        .then((r) => (r.ok ? (r.json() as Promise<AnalysisResult>) : null))
        .catch(() => null);
      if (!controller.signal.aborted)
        setClip(new File([blob], nativeDemo.filename, { type: "video/mp4" }), true, saved);
    } catch (error) {
      if (!controller.signal.aborted)
        setUploadError(error instanceof Error ? error.message : "Demo unavailable.");
    } finally {
      if (demoController.current === controller) {
        demoController.current = null;
        setDemoLoading(false);
      }
    }
  };
  const seek = (time: number) => {
    setSeekRequest({ time, nonce: Date.now() });
    setView("analysis");
  };
  return (
    <div className="werkstatt">
      <a href="#main" className="wk-skip">
        Skip to content
      </a>
      <input
        className="sr-only"
        ref={fileInput}
        type="file"
        accept="video/mp4,video/webm"
        aria-label="Choose an MP4 or WebM clip to analyze"
        onChange={upload}
      />
      <Header
        currentView={view}
        onViewChange={setView}
        onUploadClick={() => fileInput.current?.click()}
        busy={busy}
      />
      <main id="main" className="wk-main">
        {uploadError && (
          <p className="cv-error" role="alert">
            {uploadError}
          </p>
        )}
        {view === "setup" && (
          <ClipSetup
            onUpload={() => fileInput.current?.click()}
            onSample={() => {
              setSampleMode(true);
              setView("analysis");
            }}
            onDemo={() => void openDetectorDemo()}
            demoLoading={demoLoading}
            onView={setView}
          />
        )}
        {source && (
          <div hidden={view !== "analysis" || sampleMode}>
            <ClipAnalysis
              key={source.src}
              file={source.file}
              mediaCredit={source.demo ? nativeDemo.exportCredit : undefined}
              src={source.src}
              result={result}
              onResult={setResult}
              exportOpen={exportOpen && !sampleMode}
              onExportClose={closeExport}
              selectedStrategies={selectedStrategies}
              onToggleStrategy={toggleStrategy}
              onBrowseStrategies={() => {
                setCategory("All patterns");
                setView("strategies");
              }}
              active={view === "analysis" && !sampleMode}
              seekRequest={seekRequest}
              onBusyChange={setBusy}
              onFindings={() => setView("findings")}
            />
            {source.demo && (
              <p className="wk-demo-credit">
                Native-engine case · <a href={nativeDemo.source}>{nativeDemo.credit}</a>. First 20
                seconds, silent. Tracks come from Python inference; coaching notes are
                implementation-agent visual reviews. The VLM returned no supported events.
                <a href={nativeDemo.annotated} download>
                  {" "}
                  Download annotated MP4 ↗
                </a>
              </p>
            )}
          </div>
        )}
        {(view === "analysis" || view === "findings") && !realClip && (
          <>
            {source && (
              <button
                className="wk-text-button wk-return-clip"
                type="button"
                onClick={() => setSampleMode(false)}
              >
                Return to {source.file.name} →
              </button>
            )}
            {sample ? (
              <SampleReview
                sample={sample}
                mode={view === "findings" ? "findings" : "review"}
                selectedStrategies={selectedStrategies}
                onStrategies={() => setView("strategies")}
                onFindings={() => setView("findings")}
                onExport={() => setExportOpen(true)}
              />
            ) : (
              <p role="status">{sampleError ?? "Loading the tracking sample…"}</p>
            )}
          </>
        )}
        {view === "findings" && realClip && (
          <>
            <div className="wk-heading">
              <h1>
                Build the
                <br />
                review plan.
              </h1>
              <p>
                Start with the measured observations, then verify your tactical focus against the
                footage.
              </p>
            </div>
            {result ? (
              <AnalysisFindings
                result={result}
                selectedIds={selectedStrategies}
                onToggleStrategy={toggleStrategy}
                onBrowseStrategies={() => {
                  setCategory("All patterns");
                  setView("strategies");
                }}
                onSeek={seek}
              />
            ) : (
              <div className="wk-empty">
                <h2>{busy ? "Analysis in progress" : "No measured findings yet"}</h2>
                <p>
                  {busy
                    ? "Your clip is processing in the browser. You can return to Review to see progress or cancel."
                    : "Start or retry analysis from the Review screen."}
                </p>
                <button
                  className="button-primary"
                  type="button"
                  onClick={() => setView("analysis")}
                >
                  Return to review →
                </button>
              </div>
            )}
          </>
        )}
        {view === "strategies" && (
          <>
            <div className="wk-heading">
              <h1>
                Choose a<br />
                tactical lens.
              </h1>
              <p>
                Each phase keeps its color. Select a pattern and carry its coaching cue into your
                clip review.
              </p>
            </div>
            <StrategyLibrary
              mode="library"
              selectedIds={selectedStrategies}
              onToggleStrategy={toggleStrategy}
              category={category}
              onCategoryChange={setCategory}
            />
            <div className="wk-review-links">
              <button className="wk-text-button" type="button" onClick={() => setView("findings")}>
                See your review plan ({selectedStrategies.length}) →
              </button>
              <span className="wk-file-note">
                {strategyPatterns.length} patterns · manual review lenses
              </span>
            </div>
          </>
        )}
        {view === "pipeline" && <BenchmarksTable />}
        <footer className="wk-footer">
          <span>
            {realClip
              ? `${source.file.name} · ${busy ? "analysis running locally" : result ? `${result.frames.length} measured samples` : "local clip"}`
              : "Football strategist · football video review"}
          </span>
          <div>
            {realClip && result && (
              <button
                type="button"
                onClick={() => {
                  setView("analysis");
                  setExportOpen(true);
                }}
              >
                Export analysis ↗
              </button>
            )}
            <button type="button" onClick={() => setView("pipeline")}>
              Method & limits
            </button>
            {view !== "setup" && (
              <button type="button" onClick={() => setView("setup")}>
                Add another clip ↗
              </button>
            )}
          </div>
        </footer>
      </main>
      <ExportModal isOpen={exportOpen && !realClip} sample={sample} onClose={closeExport} />
    </div>
  );
}
