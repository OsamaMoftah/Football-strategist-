"use client";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { analyzeSequence } from "@/lib/cv/sequence";
import { ballAt, resultBallTrack } from "@/lib/cv/ball-motion";
import { formatFindingTime } from "@/lib/cv/findings";
import type { AnalysisResult } from "@/lib/cv/types";
function BallLens({
  videoRef,
  result,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  result: AnalysisResult | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const track = useMemo(() => (result ? resultBallTrack(result) : []), [result]);
  useEffect(() => {
    let request = 0;
    const draw = () => {
      const video = videoRef.current,
        canvas = canvasRef.current,
        ctx = canvas?.getContext("2d");
      if (ctx && canvas) {
        ctx.fillStyle = "#151a23";
        ctx.fillRect(0, 0, 256, 256);
        const ball = video ? ballAt(track, video.currentTime) : null;
        if (ball && video && video.readyState >= 2) {
          const side = Math.min(
            video.videoWidth,
            video.videoHeight,
            Math.max(48, ball.width * video.videoWidth * 14),
          );
          const x = Math.max(
              0,
              Math.min(video.videoWidth - side, ball.x * video.videoWidth - side / 2),
            ),
            y = Math.max(
              0,
              Math.min(video.videoHeight - side, ball.y * video.videoHeight - side / 2),
            );
          ctx.drawImage(video, x, y, side, side, 0, 0, 256, 256);
          const bx = ((ball.x * video.videoWidth - x) / side) * 256,
            by = ((ball.y * video.videoHeight - y) / side) * 256;
          ctx.strokeStyle = "#ffcf36";
          ctx.lineWidth = 2;
          ctx.strokeRect(bx - 18, by - 18, 36, 36);
        } else {
          ctx.fillStyle = "#d9d2bf";
          ctx.font = "16px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("BALL UNRESOLVED", 128, 132);
        }
      }
      request = requestAnimationFrame(draw);
    };
    request = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(request);
  }, [track, videoRef]);
  return (
    <figure className="sequence-lens">
      <canvas
        ref={canvasRef}
        width={256}
        height={256}
        role="img"
        aria-label="Magnified source video around the current ball observation"
      />
      <figcaption>Live crop</figcaption>
    </figure>
  );
}
export function SequencePanel({
  result,
  time,
  onSeek,
  onStrategy,
  videoRef,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  result: AnalysisResult | null;
  time: number;
  onSeek: (time: number) => void;
  onStrategy: (id: string) => void;
}) {
  const [tab, setTab] = useState<"readout" | "ball" | "teams">("readout");
  const [selectedCue, setSelectedCue] = useState(0);
  const summary = useMemo(() => (result ? analyzeSequence(result) : null), [result]);
  const track = useMemo(() => (result ? resultBallTrack(result) : []), [result]);
  const ball = ballAt(track, time),
    segments = [...new Set(track.map((p) => p.segment))];
  const cue = summary?.insights[Math.min(selectedCue, Math.max(0, summary.insights.length - 1))];
  const state = ball
    ? ball.source === "detector"
      ? "Ball detected"
      : ball.source === "manual"
        ? "Manual anchor"
        : ball.source === "interpolated"
          ? "Between observations"
          : "Appearance estimate"
    : "Ball unresolved";
  const mapHeight = result ? (320 * result.source.height) / result.source.width : 180;
  const tabs = [
    ["readout", "Readout"],
    ["ball", "Ball trace"],
    ["teams", "Teams"],
  ] as const;
  return (
    <aside className="workspace-side sequence-panel" aria-label="Sequence intelligence">
      <header className="sequence-header">
        <div>
          <span className="wk-eyebrow">CLIP INTELLIGENCE</span>
          <h2>Sequence notes</h2>
        </div>
        <span className="sequence-clock">{formatFindingTime(time)}</span>
      </header>
      <div className="sequence-tabs" role="tablist" aria-label="Analysis detail">
        {tabs.map(([id, label], i) => (
          <button
            id={`sequence-tab-${id}`}
            key={id}
            role="tab"
            aria-selected={tab === id}
            aria-controls={`sequence-content-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                const next = (i + (event.key === "ArrowRight" ? 1 : 2)) % 3;
                setTab(tabs[next][0]);
                (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="sequence-body"
        role="tabpanel"
        id={`sequence-content-${tab}`}
        aria-labelledby={`sequence-tab-${tab}`}
      >
        <div className="sequence-observation">
          <BallLens videoRef={videoRef} result={result} />
          <div>
            <span className={`sequence-state ${ball ? "sequence-live" : ""}`}>
              <i />
              {state}
            </span>
            <p>
              {ball
                ? ball.source === "detector"
                  ? `Model score ${Math.round(ball.confidence * 100)}% · visual check required`
                  : ball.source === "manual"
                    ? "Analyst-provided position"
                    : ball.source === "interpolated"
                      ? "Short-gap interpolation · ≤0.2 s"
                      : "Local pixel match · not a detector anchor"
                : "No marker is drawn during a lost-ball gap."}
            </p>
            <span className="sequence-small">
              {summary
                ? `${summary.ball.trackedSeconds.toFixed(1)} s traced / ${result!.source.duration.toFixed(1)} s clip`
                : "Waiting for analysis"}
            </span>
          </div>
        </div>
        {tab === "readout" && (
          <section className="sequence-reading">
            <div className="sequence-section-label">
              <h3>What the clip suggests</h3>
              <span>
                {summary?.insights.length ?? 0} {summary?.insights.length === 1 ? "cue" : "cues"}
              </span>
            </div>
            {cue ? (
              <>
                <button
                  className="sequence-timestamp"
                  onClick={() => onSeek(cue.time)}
                  aria-label={`Review ${cue.title} at ${formatFindingTime(cue.time)}`}
                >
                  {formatFindingTime(cue.time)} — {formatFindingTime(cue.end)}{" "}
                  <span>VIEW MOMENT ↗</span>
                </button>
                <h4>{cue.title}</h4>
                <p>{cue.explanation}</p>
                <div className="sequence-question">
                  <span>COACHING QUESTION</span>
                  <p>{cue.verify}</p>
                </div>
                {cue.strategyId && (
                  <button className="wk-text-button" onClick={() => onStrategy(cue.strategyId!)}>
                    Explore the strategy lens →
                  </button>
                )}
                {summary!.insights.length > 1 && (
                  <div className="sequence-pagination">
                    <button
                      disabled={selectedCue === 0}
                      onClick={() => setSelectedCue((i) => i - 1)}
                      aria-label="Previous sequence cue"
                    >
                      ←
                    </button>
                    <span>
                      {selectedCue + 1} / {summary!.insights.length}
                    </span>
                    <button
                      disabled={selectedCue >= summary!.insights.length - 1}
                      onClick={() => setSelectedCue((i) => i + 1)}
                      aria-label="Next sequence cue"
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="sequence-abstain">
                <h4>More evidence needed.</h4>
                <p>{summary?.explanation ?? "Analyze a clip to build timestamped observations."}</p>
                <p>Try a clear ball anchor or select a tactical lens for your own review.</p>
              </div>
            )}
            <p className="sequence-footnote">
              A review cue, not a confirmed tactical classification.
            </p>
          </section>
        )}
        {tab === "ball" && (
          <section className="sequence-trace-detail">
            <div className="sequence-section-label">
              <h3>Movement across the clip</h3>
              <span>IMAGE SPACE</span>
            </div>
            <svg
              viewBox={`0 0 320 ${mapHeight}`}
              className="sequence-map"
              role="img"
              aria-label="Full-clip ball trajectory at the source image aspect ratio"
            >
              <path
                d={`M0 ${mapHeight / 3}H320M0 ${(mapHeight * 2) / 3}H320M80 0V${mapHeight}M160 0V${mapHeight}M240 0V${mapHeight}`}
                stroke="currentColor"
                opacity=".12"
              />
              {segments.map((segment) => (
                <polyline
                  key={segment}
                  points={track
                    .filter((p) => p.segment === segment)
                    .map((p) => `${p.x * 320},${p.y * mapHeight}`)
                    .join(" ")}
                  fill="none"
                  stroke="var(--color-blue)"
                  strokeWidth="2"
                />
              ))}
              {ball && (
                <circle
                  cx={ball.x * 320}
                  cy={ball.y * mapHeight}
                  r="5"
                  fill="var(--color-amber)"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              )}
            </svg>
            <p className="sequence-caption">
              Full clip · blue path / yellow current ball. Unresolved gaps stay open.
            </p>
            <dl className="sequence-metrics">
              <div>
                <dt>Detector anchors</dt>
                <dd>{summary?.ball.anchors ?? "—"}</dd>
              </div>
              <div>
                <dt>Pixel estimates</dt>
                <dd>{summary?.ball.appearance ?? "—"}</dd>
              </div>
              <div>
                <dt>Segments</dt>
                <dd>{summary?.ball.segments ?? "—"}</dd>
              </div>
            </dl>
            <p className="sequence-footnote">
              Coordinates follow the source camera. This is not a calibrated pitch map.
            </p>
          </section>
        )}
        {tab === "teams" && (
          <section className="sequence-control">
            <div className="sequence-section-label">
              <h3>Ball proximity</h3>
              <span>ESTIMATE</span>
            </div>
            {result?.teams?.length === 2 && summary && summary.control.eligibleSeconds > 0.1 ? (
              <>
                <div
                  className="sequence-control-bar"
                  aria-label="Time with a sustained ball-proximity association"
                >
                  {result.teams.map((team) => (
                    <span
                      key={team.id}
                      style={{
                        width: `${(summary.control.teamSeconds[team.id] / result.source.duration) * 100}%`,
                        background: `rgb(${team.color.join(",")})`,
                      }}
                    />
                  ))}
                </div>
                {result.teams.map((team) => (
                  <div className="sequence-team" key={team.id}>
                    <span>
                      <i style={{ background: `rgb(${team.color.join(",")})` }} />
                      {team.name}
                    </span>
                    <strong>{summary.control.teamSeconds[team.id].toFixed(1)} s</strong>
                  </div>
                ))}
                <div className="sequence-team">
                  <span>Unresolved</span>
                  <strong>{summary.control.unknownSeconds.toFixed(1)} s</strong>
                </div>
                <div className="sequence-question">
                  <span>HOW TO READ THIS</span>
                  <p>
                    Kit-color groups with sustained ball proximity. The unresolved time is kept
                    visible; these values are not possession percentages.
                  </p>
                </div>
              </>
            ) : (
              <div className="sequence-abstain">
                <h4>Control stays unassigned.</h4>
                <p>
                  There is insufficient sustained ball-to-player evidence. Distinct kit colors and
                  an uninterrupted wide view help.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
      <details className="sequence-limits">
        <summary>Method & limitations</summary>
        <p>
          Football-specific detector anchors + local appearance matching. Cuts reset continuity;
          estimates and manual anchors retain their provenance. Kit colors can include officials. No
          calibrated speed, offside, xT or formation is inferred.
        </p>
        <a href="/models/football-ball/NOTICE.txt">Model provenance & license ↗</a>
      </details>
    </aside>
  );
}
