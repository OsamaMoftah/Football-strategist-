"use client";

import { useMemo } from "react";
import type { DetectionFrame } from "@/lib/cv/types";

interface DetectionTimelineProps {
  frames: DetectionFrame[];
  time: number;
  duration: number;
  sampleRate: number;
  onSeek: (time: number) => void;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}`;
}

export function DetectionTimeline({
  frames,
  time,
  duration,
  sampleRate,
  onSeek,
}: DetectionTimelineProps) {
  const samples = useMemo(
    () =>
      frames.map((frame) => ({
        timestamp: frame.timestamp,
        people: frame.detections.filter((detection) => detection.label === "person").length,
        balls: frame.detections.filter((detection) => detection.label === "ball").length,
      })),
    [frames],
  );
  const maxPeople = Math.max(1, ...samples.map((sample) => sample.people));
  const maxBalls = Math.max(1, ...samples.map((sample) => sample.balls));
  const activeIndex = samples.reduce(
    (nearest, sample, index) =>
      Math.abs(sample.timestamp - time) < Math.abs(samples[nearest]?.timestamp - time)
        ? index
        : nearest,
    0,
  );
  const cursor = duration > 0 ? Math.min(100, Math.max(0, (time / duration) * 100)) : 0;

  return (
    <section className="panel cv-timeline-panel" aria-labelledby="detection-timeline-title">
      <div className="panel-heading">
        <div>
          <h2 id="detection-timeline-title" className="panel-heading__title">
            Detection activity
          </h2>
          <p className="panel-heading__description">
            Measured samples · {sampleRate} frames per second · select a mark to inspect
          </p>
        </div>
      </div>
      <div className="cv-timeline-body">
        <div className="cv-timeline-chart">
          <div className="cv-timeline-series" aria-hidden="true">
            <span>
              <i className="cv-legend-person" />
              People
            </span>
            <span>
              <i className="cv-legend-ball" />
              Ball
            </span>
          </div>
          <div className="cv-timeline-scroll">
            <div
              className="cv-timeline-track"
              style={{
                gridTemplateColumns: `repeat(${samples.length}, minmax(6px, 1fr))`,
                minWidth: `max(100%, ${samples.length * 8}px)`,
              }}
              role="group"
              aria-label="Detection samples across the clip"
            >
              {samples.map((sample, index) => {
                const isActive =
                  index === activeIndex &&
                  Math.abs(sample.timestamp - time) <= Math.max(0.2, 0.5 / sampleRate);
                const peopleLabel = `${sample.people} person ${sample.people === 1 ? "candidate" : "candidates"}`;
                const ballLabel = `${sample.balls} ball ${sample.balls === 1 ? "candidate" : "candidates"}`;
                return (
                  <button
                    key={sample.timestamp}
                    type="button"
                    className="cv-timeline-sample"
                    aria-current={isActive ? "time" : undefined}
                    aria-label={`${sample.timestamp.toFixed(2)} seconds: ${peopleLabel}, ${ballLabel}. Seek to this sample.`}
                    title={`${sample.timestamp.toFixed(2)} s · ${peopleLabel} · ${ballLabel}`}
                    onClick={() => onSeek(sample.timestamp)}
                  >
                    <span className="cv-timeline-lane cv-timeline-lane--people">
                      <i
                        style={{
                          height: sample.people
                            ? `${Math.max(7, (sample.people / maxPeople) * 100)}%`
                            : "0%",
                        }}
                      />
                    </span>
                    <span className="cv-timeline-lane cv-timeline-lane--ball">
                      <i
                        style={{
                          height: sample.balls
                            ? `${Math.max(7, (sample.balls / maxBalls) * 100)}%`
                            : "0%",
                        }}
                      />
                    </span>
                  </button>
                );
              })}
              <span
                className="cv-timeline-cursor"
                style={{ left: `${cursor}%` }}
                aria-hidden="true"
              />
            </div>
            <div
              className="cv-timeline-axis cv-timeline-axis--time"
              style={{ minWidth: `max(100%, ${samples.length * 8}px)` }}
              aria-hidden="true"
            >
              <span>{formatTime(0)}</span>
              <span>{formatTime(duration / 2)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
