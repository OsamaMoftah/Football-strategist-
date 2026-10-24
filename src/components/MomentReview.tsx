"use client";
import { useMemo, useState } from "react";
import { analyzeSequence } from "@/lib/cv/sequence";
import { resultBallTrack } from "@/lib/cv/ball-motion";
import { buildReviewMoments } from "@/lib/cv/review-moments";
import { formatFindingTime } from "@/lib/cv/findings";
import type { AnalysisResult } from "@/lib/cv/types";

export function MomentReview({
  result,
  time,
  onSeek,
  onWatch,
  onStrategy,
  onFindings,
}: {
  result: AnalysisResult;
  time: number;
  onSeek: (time: number) => void;
  onWatch: (time: number) => void;
  onStrategy: (id: string) => void;
  onFindings?: () => void;
}) {
  const moments = useMemo(
    () => buildReviewMoments(analyzeSequence(result), resultBallTrack(result)),
    [result],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const moment =
    moments.find((m) => m.id === selected) ??
    moments.find((m) => time >= m.time && time <= m.end) ??
    moments[0];
  return (
    <section className="film-moments" aria-label="Key moments and explanation">
      <div className="film-section-heading">
        <h2>Moments worth watching</h2>
        <span>
          {moments.length} {moments.length === 1 ? "moment" : "moments"}
        </span>
      </div>
      {moment ? (
        <>
          <div className="film-moment-strip" role="group" aria-label="Choose a video moment">
            {moments.map((item, index) => (
              <button
                key={item.id}
                className="film-moment"
                aria-pressed={moment.id === item.id}
                onClick={() => {
                  setSelected(item.id);
                  onSeek(item.time);
                }}
              >
                <span className="film-moment-index">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <time>
                    {formatFindingTime(item.time)} — {formatFindingTime(item.end)}
                  </time>
                  <strong>{item.title}</strong>
                </span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          <article className="film-explanation">
            <div>
              <span className="film-kicker">
                {moment.kind === "cue" ? "THE READ" : "TRACKING OBSERVATION"}
              </span>
              <h3>{moment.title}</h3>
              <p>{moment.observation}</p>
              <button className="film-text-action" onClick={() => onWatch(moment.time)}>
                Watch this moment ↗
              </button>
            </div>
            <div className="film-coaching">
              <span className="film-kicker">WHAT TO LOOK FOR</span>
              <p>{moment.question}</p>
              {moment.strategyId && (
                <button className="film-text-action" onClick={() => onStrategy(moment.strategyId!)}>
                  Explore the strategy →
                </button>
              )}
              <small>A review prompt. Confirm it against the footage.</small>
            </div>
            {moment.evidence && (
              <details className="film-moment-evidence">
                <summary>Why this moment?</summary>
                <p>{moment.evidence}</p>
              </details>
            )}
          </article>
        </>
      ) : (
        <div className="film-no-moments">
          <h3>Watch first. Then refine.</h3>
          <p>
            The clip does not yet contain enough continuous ball evidence to pick a useful moment.
            Try a clearer view or add a ball anchor in Analysis options.
          </p>
        </div>
      )}
      <button className="film-text-action film-full-report" onClick={onFindings}>
        Open the full findings →
      </button>
    </section>
  );
}
