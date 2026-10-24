"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { PitchRadar } from "./PitchRadar";
import { getInterpolatedFrame, type MatchSample } from "@/lib/match-data";
import { strategyPatterns } from "@/lib/strategy-data";
interface SampleReviewProps {
  sample: MatchSample;
  mode: "review" | "findings";
  selectedStrategies: string[];
  onStrategies: () => void;
  onFindings: () => void;
  onExport: () => void;
}
export function SampleReview({
  sample,
  mode,
  selectedStrategies,
  onStrategies,
  onFindings,
  onExport,
}: SampleReviewProps) {
  const [time, setTime] = useState(9.8);
  const [playing, setPlaying] = useState(false);
  const frame = useMemo(() => getInterpolatedFrame(sample, time), [sample, time]);
  useEffect(() => {
    if (!playing || mode !== "review") return;
    let previous = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now(),
        delta = (now - previous) / 1000;
      previous = now;
      setTime((value) => Math.min(sample.duration_sec, value + delta));
    }, 33);
    return () => window.clearInterval(interval);
  }, [playing, mode, sample.duration_sec]);
  const selected = strategyPatterns.filter((pattern) => selectedStrategies.includes(pattern.id));
  if (mode === "findings")
    return (
      <>
        <div className="wk-heading">
          <h1>
            Build the
            <br />
            review plan.
          </h1>
          <p>Three generated sample events become specific questions to check against footage.</p>
        </div>
        <p className="wk-source">Synthetic coordinate fixture · manual review prompts</p>
        <div className="wk-report">
          <div className="wk-report-head">
            <span>Time</span>
            <span>Sample observation</span>
            <span>Review question</span>
          </div>
          {sample.events.map((event, index) => (
            <article className="wk-report-row" key={event.time}>
              <div className="wk-report-time">{event.time.toFixed(1)}</div>
              <div>
                <h3>{event.type}</h3>
                <p>{event.desc}.</p>
              </div>
              <div>
                <strong className="wk-lens-label">
                  {["Counter-press", "Third-man run", "Wide overload"][index]}
                </strong>
                <p>
                  {
                    [
                      "Did the nearest players close the ball carrier immediately after the recovery?",
                      "Did a supporting runner move beyond the receiver as pressure was drawn in?",
                      "Was a wide option available before the opposing block recovered?",
                    ][index]
                  }
                </p>
              </div>
            </article>
          ))}
        </div>
        <div className="wk-blackboard">
          <div>
            <h2>Review focus</h2>
            {selected.length ? (
              selected.map((pattern) => (
                <div key={pattern.id}>
                  <h3>{pattern.name}</h3>
                  <p>{pattern.cue}</p>
                </div>
              ))
            ) : (
              <p>Choose a tactical pattern to guide your review.</p>
            )}
          </div>
          <button className="wk-text-button" type="button" onClick={onStrategies}>
            Change the tactical focus →
          </button>
        </div>
        <p className="wk-file-note">
          These event labels are generated examples. They are not findings from a video or a
          computer vision model.
        </p>
      </>
    );
  return (
    <>
      <div className="wk-heading">
        <h1>
          Review the
          <br />
          sequence.
        </h1>
        <p>Step through the sample moments and explore a 105 × 68 m pitch drawing.</p>
      </div>
      <p className="wk-source">
        Synthetic coordinate sample · reference photo is unrelated to this tracking data
      </p>
      <div className="wk-sample-workspace">
        <div className="wk-sample-media">
          <div className="wk-pane-label">
            Reference still <span>No linked video</span>
          </div>
          <Image
            src="/images/match-attack.jpg"
            width={1600}
            height={900}
            alt="Football photograph used as a reference, not aligned with the sample coordinates"
            sizes="(max-width: 760px) 100vw, 55vw"
          />
          <p className="wk-reference-note">
            The photograph is a visual reference. All pitch positions and metrics are generated
            sample data.
          </p>
        </div>
        <PitchRadar compact frame={frame} territoryShare={0} spatialThreatGain={0} />
      </div>
      <div className="wk-sample-controls">
        <button
          type="button"
          className="button-primary"
          onClick={() => {
            const atEnd = time >= sample.duration_sec;
            if (atEnd) setTime(0);
            setPlaying((value) => (atEnd ? true : !value));
          }}
        >
          {playing && time < sample.duration_sec ? "Pause sample" : "Play sample"}
        </button>
        <label>
          Sample time{" "}
          <strong>
            {time.toFixed(1)} / {sample.duration_sec.toFixed(1)} s
          </strong>
          <input
            aria-label="Synthetic sample timeline"
            type="range"
            min={0}
            max={sample.duration_sec}
            step={1 / sample.fps}
            value={time}
            onChange={(event) => {
              setPlaying(false);
              setTime(Number(event.target.value));
            }}
          />
        </label>
      </div>
      <div className="wk-moments">
        {sample.events.map((event) => (
          <button
            type="button"
            key={event.time}
            aria-pressed={Math.abs(time - event.time) < 0.15}
            onClick={() => {
              setPlaying(false);
              setTime(event.time);
            }}
          >
            <strong>{event.time.toFixed(1).padStart(4, "0")} s</strong>
            <span>{event.type}</span>
            <small>Synthetic sample event</small>
          </button>
        ))}
      </div>
      <div className="wk-review-links">
        <button className="wk-text-button" type="button" onClick={onFindings}>
          Read the review questions →
        </button>
        <button className="wk-text-button" type="button" onClick={onExport}>
          Export sample data ↗
        </button>
      </div>
    </>
  );
}
