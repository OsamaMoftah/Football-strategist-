"use client";
import { formatFindingTime, summarizeFindings } from "@/lib/cv/findings";
import { analyzeSequence } from "@/lib/cv/sequence";
import { strategyPatterns } from "@/lib/strategy-data";
import type { AnalysisResult } from "@/lib/cv/types";
interface AnalysisFindingsProps {
  result: AnalysisResult;
  selectedIds: string[];
  onToggleStrategy: (id: string) => void;
  onBrowseStrategies: () => void;
  onSeek: (time: number) => void;
}
export function AnalysisFindings({
  result,
  selectedIds,
  onToggleStrategy,
  onBrowseStrategies,
  onSeek,
}: AnalysisFindingsProps) {
  const findings = summarizeFindings(result);
  const sequence = analyzeSequence(result);
  const selected = strategyPatterns.filter((pattern) => selectedIds.includes(pattern.id));
  const checkpoints = [
    findings.peakPeople
      ? {
          time: findings.peakPeople.timestamp,
          title: "Most person candidates",
          observation: `${findings.peakPeople.count} candidates in one sampled frame.`,
          question:
            "Which detections are players, and which are officials or people outside the pitch?",
        }
      : null,
    findings.strongestBall
      ? {
          time: findings.strongestBall.timestamp,
          title: "Strongest ball candidate",
          observation: `${Math.round(findings.strongestBall.confidence * 100)}% model score. This score is not calibrated accuracy.`,
          question: "Is the candidate the ball? Check its location and the surrounding frames.",
        }
      : null,
    findings.longestBallRun
      ? {
          time: findings.longestBallRun.start,
          title: "Consecutive ball samples",
          observation: `${formatFindingTime(findings.longestBallRun.start)}–${formatFindingTime(findings.longestBallRun.end)} across ${findings.longestBallRun.sampleCount} samples.`,
          question:
            "Does the candidate remain on the ball through the sequence, or switch to another object?",
        }
      : null,
  ].filter((item) => item !== null);
  return (
    <section aria-label="Measured findings">
      <p className="wk-source">
        {result.source.name} · {result.frames.length} measured samples · {result.sampleRate}{" "}
        samples/second
      </p>
      <div className="wk-blackboard">
        <div>
          <span className="wk-eyebrow">SEQUENCE INTERPRETATION</span>
          <h2>{sequence.title}</h2>
          <p>{sequence.explanation}</p>
          <p>
            {sequence.ball.trackedSeconds.toFixed(1)} seconds traced · {sequence.ball.anchors}{" "}
            detector anchors · {sequence.ball.segments} segments
          </p>
        </div>
      </div>
      {sequence.insights.map((cue) => (
        <article className="wk-report-row" key={`${cue.kind}-${cue.time}`}>
          <div className="wk-report-time">
            <button onClick={() => onSeek(cue.time)}>{formatFindingTime(cue.time)} ↗</button>
          </div>
          <div>
            <h3>{cue.title}</h3>
            <p>{cue.explanation}</p>
          </div>
          <div>
            <p>
              <b>Verify:</b> {cue.verify}
            </p>
            {cue.strategyId && (
              <button
                className="wk-text-button"
                onClick={() => {
                  if (!selectedIds.includes(cue.strategyId!)) onToggleStrategy(cue.strategyId!);
                  onBrowseStrategies();
                }}
              >
                Explore the strategy →
              </button>
            )}
          </div>
        </article>
      ))}
      <div className="wk-readout-summary">
        <p>
          Person candidates appeared in{" "}
          <strong>
            {result.summary.framesWithPeople}/{result.frames.length} samples
          </strong>
          , averaging {findings.averagePersonCandidates.toFixed(1)} per sample.
        </p>
        <p>
          Sports-ball candidates appeared in{" "}
          <strong>
            {result.summary.framesWithBall}/{result.frames.length} samples
          </strong>
          . Detector observations need visual confirmation.
        </p>
      </div>
      {checkpoints.length > 0 ? (
        <div className="wk-report">
          <div className="wk-report-head">
            <span>Time</span>
            <span>Measured observation</span>
            <span>Review question</span>
          </div>
          {checkpoints.map((checkpoint) => (
            <article className="wk-report-row" key={checkpoint.title}>
              <div className="wk-report-time">
                <button
                  type="button"
                  onClick={() => onSeek(checkpoint.time)}
                  aria-label={`Review ${checkpoint.title} at ${formatFindingTime(checkpoint.time)}`}
                >
                  {formatFindingTime(checkpoint.time)}
                </button>
              </div>
              <div>
                <h3>{checkpoint.title}</h3>
                <p>{checkpoint.observation}</p>
              </div>
              <div>
                <p>{checkpoint.question}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="wk-empty">
          <h2>No confident detections</h2>
          <p>Try a clearer, closer clip with fewer camera cuts.</p>
        </div>
      )}
      <div className="wk-blackboard">
        <div>
          <h2>Your review focus</h2>
          {selected.length ? (
            selected.map((pattern) => (
              <div className="wk-focus-entry" key={pattern.id}>
                <h3>{pattern.name}</h3>
                <p>{pattern.cue}</p>
                <button
                  className="wk-text-button"
                  type="button"
                  onClick={() => onToggleStrategy(pattern.id)}
                >
                  Remove lens
                </button>
              </div>
            ))
          ) : (
            <p>Choose a tactical pattern to guide your review.</p>
          )}
        </div>
        <button className="wk-text-button" type="button" onClick={onBrowseStrategies}>
          Choose a tactical lens →
        </button>
      </div>
      <p className="wk-file-note">
        Tactical lenses are analyst-selected prompts. Color groups and ball proximity support
        tentative sequence cues; they do not confirm team identity, possession or strategy. Speed,
        offside, territory, and xT require pitch calibration and are unavailable for this clip.
      </p>
    </section>
  );
}
