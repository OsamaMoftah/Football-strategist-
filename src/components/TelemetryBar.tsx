"use client";

interface TelemetryBarProps {
  clockTime: string;
  ballSpeedKmh: number;
  offsideMarginCm: number;
  playerCount: number;
  videoCalibrated: boolean;
}

export function TelemetryBar({
  clockTime,
  ballSpeedKmh,
  offsideMarginCm,
  playerCount,
  videoCalibrated,
}: TelemetryBarProps) {
  const isOnside = offsideMarginCm >= 0;

  return (
    <section aria-label="Current sample telemetry" className="telemetry-bar">
      <div className="telemetry-bar__inner">
        <div className="telemetry-origin">
          <span className="status-chip">
            <i className="status-chip__dot" />
            Synthetic sample · {playerCount} players
          </span>
          <span className="sample-clock">{clockTime}</span>
        </div>

        <dl className="telemetry-stat">
          <dt>Ball speed</dt>
          <dd>
            {ballSpeedKmh.toFixed(1)} <small>km/h</small>
          </dd>
        </dl>
        <dl className="telemetry-stat">
          <dt>Offside geometry</dt>
          <dd className={isOnside ? "is-positive" : "is-negative"}>
            {offsideMarginCm > 0 ? "+" : ""}
            {offsideMarginCm.toFixed(1)} <small>cm</small>
          </dd>
        </dl>
        <dl className="telemetry-stat">
          <dt>Video alignment</dt>
          <dd className={videoCalibrated ? "is-positive" : "is-unavailable"}>
            {videoCalibrated ? "Calibrated" : "Not available"}
          </dd>
        </dl>
      </div>
    </section>
  );
}
