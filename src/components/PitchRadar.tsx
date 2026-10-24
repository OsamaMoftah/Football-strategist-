"use client";

import type { InterpolatedFrame } from "@/lib/match-data";

interface PitchRadarProps {
  frame: InterpolatedFrame;
  territoryShare: number;
  spatialThreatGain: number;
  compact?: boolean;
}

const pitchX = (x: number) => 20 + (x / 105) * 480;
const pitchY = (y: number) => 20 + (y / 68) * 300;

export function PitchRadar({
  frame,
  territoryShare,
  spatialThreatGain,
  compact = false,
}: PitchRadarProps) {
  const homeRunner = frame.players.find((player) => player.team === "home" && player.num === 9);
  const lineX = pitchX(frame.offside.offside_line_x);
  const margin = `${frame.offside.margin_cm > 0 ? "+" : ""}${frame.offside.margin_cm.toFixed(1)} cm`;

  return (
    <section
      className={`panel pitch-panel ${compact ? "pitch-panel--compact" : ""}`}
      aria-labelledby="radar-title"
    >
      <div className="panel-heading">
        <div>
          <h2 id="radar-title" className="panel-heading__title">
            {compact ? "Player positions" : "Metric pitch"}
          </h2>
          <p className="panel-heading__description">
            {compact
              ? "Synthetic sample · 105 × 68 m"
              : "105 × 68 m · interpolated from the sample sequence"}
          </p>
        </div>
        <div className="panel-heading__aside">
          <div className="team-legend" aria-label="Pitch legend">
            <span className="team-legend__item">
              <i className="legend-mark" />
              Home
            </span>
            <span className="team-legend__item">
              <i className="legend-mark legend-mark--away" />
              Away
            </span>
            <span className="team-legend__item">
              <i className="legend-mark legend-mark--ball" />
              Ball
            </span>
            <span className="team-legend__item">
              <i className="legend-mark legend-mark--line" />
              Line
            </span>
          </div>
        </div>
      </div>

      <div className="pitch-panel__body">
        <div className="pitch-surface">
          <svg
            className="pitch-svg"
            viewBox="0 0 520 340"
            role="img"
            aria-labelledby="pitch-title pitch-desc"
          >
            <title id="pitch-title">Synthetic sample tracking on a metric football pitch</title>
            <desc id="pitch-desc">
              Twenty-two player positions, the ball, and a geometric offside line at{" "}
              {frame.offside.offside_line_x.toFixed(1)} meters.
            </desc>
            <defs>
              <clipPath id="pitch-clip">
                <rect x="20" y="20" width="480" height="300" rx="1" />
              </clipPath>
            </defs>
            <rect x="20" y="20" width="480" height="300" fill="var(--pitch)" />
            <g className="pitch-stripes" clipPath="url(#pitch-clip)">
              {[0, 1, 2, 3, 4].map((stripe) => (
                <rect
                  key={stripe}
                  x={20 + stripe * 96}
                  y="20"
                  width="48"
                  height="300"
                  fill="var(--pitch-stripe)"
                />
              ))}
            </g>
            <g className="pitch-lines">
              <rect x="20" y="20" width="480" height="300" />
              <line x1="260" y1="20" x2="260" y2="320" />
              <circle cx="260" cy="170" r="45" />
              <circle className="pitch-center-mark" cx="260" cy="170" r="2" />
              <rect x="20" y="80" width="80" height="180" />
              <rect x="420" y="80" width="80" height="180" />
              <rect x="20" y="120" width="30" height="100" />
              <rect x="470" y="120" width="30" height="100" />
            </g>

            <line className="offside-line" x1={lineX} y1="20" x2={lineX} y2="320" />
            {frame.players.map((player) => (
              <g
                key={`${player.team}-${player.id}`}
                transform={`translate(${pitchX(player.x)} ${pitchY(player.y)})`}
              >
                <circle
                  className={`pitch-dot ${player.team === "home" ? "pitch-dot--home" : "pitch-dot--away"}`}
                  r="8"
                />
                <text className="pitch-number" y="2.7">
                  {player.num}
                </text>
              </g>
            ))}

            <circle
              className="ball-halo"
              cx={pitchX(frame.ball.x)}
              cy={pitchY(frame.ball.y)}
              r="9"
            />
            <circle
              className="ball-mark"
              cx={pitchX(frame.ball.x)}
              cy={pitchY(frame.ball.y)}
              r="4.5"
            />
          </svg>
        </div>

        {!compact && (
          <div className="pitch-caption">
            <span>Home #9 speed · {homeRunner?.speed_kmh?.toFixed(1) ?? "—"} km/h</span>
            <span className="pitch-caption__value">
              {frame.players.length} players · {frame.timestamp.toFixed(2)} s
            </span>
          </div>
        )}

        {!compact && (
          <div className="metric-strip" aria-label="Derived sample metrics">
            <Metric
              label="Home territory estimate"
              value={`${territoryShare.toFixed(1)}%`}
              note="Nearest-player grid"
            />
            <Metric
              label="Offside margin"
              value={margin}
              note="Geometry only · not a VAR decision"
            />
            <Metric
              label="Threat change"
              value={`+${spatialThreatGain.toFixed(3)}`}
              note="Distance-based proxy · uncalibrated"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="metric-cell">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="metric-note">{note}</p>
    </div>
  );
}
