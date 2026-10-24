"use client";

import Image from "next/image";
import type { AppView } from "./Header";
interface ClipSetupProps {
  onUpload: () => void;
  onSample: () => void;
  onDemo: () => void;
  demoLoading: boolean;
  onView: (view: AppView) => void;
}
export function ClipSetup({ onUpload, onSample, onDemo, demoLoading, onView }: ClipSetupProps) {
  return (
    <section className="wk-setup" aria-labelledby="setup-title">
      <div className="wk-setup-copy">
        <h1 id="setup-title">
          Turn a clip
          <br />
          into a<br />
          review plan.
        </h1>
        <p className="wk-lead">
          Upload a short football clip. Inspect the footage, review key moments and choose a
          tactical focus.
        </p>
        <dl className="wk-facts">
          <div>
            <dt>Clip limit</dt>
            <dd>60 sec</dd>
          </div>
          <div>
            <dt>Processing</dt>
            <dd>On device</dd>
          </div>
        </dl>
        <div className="wk-actions">
          <button className="button-primary wk-blue-button" type="button" onClick={onUpload}>
            Choose a clip ↗
          </button>
          <button
            className="button-secondary"
            type="button"
            onClick={onDemo}
            disabled={demoLoading}
          >
            {demoLoading ? "Loading demo…" : "Try motion demo"}
          </button>
        </div>
        <p className="wk-file-note">MP4 or WebM · up to 200 MB · first model downloads ~63 MB</p>
        <button className="wk-text-button wk-demo-link" type="button" onClick={onSample}>
          Explore the synthetic pitch sample →
        </button>
      </div>
      <div>
        <figure className="wk-hero-visual">
          <Image
            src="/images/match-attack.jpg"
            alt="Footballers contesting a chance in a crowded penalty area"
            width={1600}
            height={900}
            priority
            sizes="(max-width: 760px) 100vw, 48vw"
            className="wk-hero-photo"
          />
          <nav className="wk-codes" aria-label="Explore Football strategist">
            <button type="button" className="wk-code wk-code-blue" onClick={onSample}>
              Review
            </button>
            <button
              type="button"
              className="wk-code wk-code-yellow"
              onClick={() => onView("findings")}
            >
              Findings
            </button>
            <button
              type="button"
              className="wk-code wk-code-red"
              onClick={() => onView("strategies")}
            >
              Strategies
            </button>
          </nav>
        </figure>
        <p className="wk-photo-credit">Football photograph: Waldemar Brandt / Unsplash.</p>
      </div>
    </section>
  );
}
