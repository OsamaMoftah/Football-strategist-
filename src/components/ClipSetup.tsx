"use client";
import { EngineChoice } from "./EngineChoice";
import type { AnalysisEngine, NativeHealth } from "@/lib/cv/native-client";
import { nativeDemo } from "@/lib/cv/demo";
import { useEffect, useRef } from "react";
import type { AppView } from "./Header";
interface ClipSetupProps {
  engine: AnalysisEngine;
  onEngineChange: (engine: AnalysisEngine) => void;
  nativeHealth: NativeHealth | null;
  onUpload: () => void;
  onSample: () => void;
  onDemo: () => void;
  demoLoading: boolean;
  onView: (view: AppView) => void;
}
export function ClipSetup({
  onUpload,
  onSample,
  onDemo,
  demoLoading,
  engine,
  onEngineChange,
  nativeHealth,
}: ClipSetupProps) {
  const preview = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      void preview.current?.play().catch(() => {});
  }, []);
  return (
    <section className="film-setup" aria-labelledby="setup-title">
      <div className="film-setup-copy">
        <span className="film-kicker">FOOTBALL STRATEGIST</span>
        <h1 id="setup-title">See the play.</h1>
        <p>Follow the ball. Replay the key moments. See what to look for in your next review.</p>
        <EngineChoice engine={engine} onChange={onEngineChange} health={nativeHealth} />
        <div className="wk-actions">
          <button className="button-primary wk-blue-button" onClick={onDemo} disabled={demoLoading}>
            {demoLoading ? "Opening…" : "Open annotated demo ↗"}
          </button>
          <button className="button-secondary" onClick={onUpload}>
            Upload a clip
          </button>
        </div>
        <p className="wk-file-note">MP4 / WebM · choose the engine before uploading</p>
      </div>
      <figure className="film-demo-preview">
        <video
          ref={preview}
          src={nativeDemo.annotated}
          controls
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="Real annotated football demo preview"
        />
        <figcaption>
          <span>20-second native CV output. Open the demo to inspect it.</span>
          <a href={nativeDemo.source}>NaBUru38 · CC BY-SA 4.0 ↗</a>
        </figcaption>
      </figure>
      <button className="film-text-action film-synthetic-link" onClick={onSample}>
        Explore the separate synthetic pitch sample →
      </button>
    </section>
  );
}
