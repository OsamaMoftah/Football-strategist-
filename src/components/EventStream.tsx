"use client";

import { formatSampleTime, type SampleEvent } from "@/lib/match-data";

interface EventStreamProps {
  events: SampleEvent[];
  currentTime: number;
  onSelectTime: (time: number) => void;
}

export function EventStream({ events, currentTime, onSelectTime }: EventStreamProps) {
  return (
    <section className="panel view-panel" aria-labelledby="events-title">
      <div className="view-panel__intro">
        <div>
          <h1 id="events-title" className="view-panel__title">
            Sample events
          </h1>
          <p className="view-panel__description">
            Illustrative moments from the bundled sequence. Select a time to move the sample
            playhead.
          </p>
        </div>
        <span className="mini-chip mini-chip--warning">Synthetic sample</span>
      </div>

      {events.length === 0 ? (
        <p className="empty-state">No sample events are available.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Sample time</th>
                <th scope="col">Event</th>
                <th scope="col">Description</th>
                <th scope="col">Threat proxy</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, index) => {
                const active = Math.abs(event.time - currentTime) < 0.75;
                return (
                  <tr
                    key={`${event.time}-${event.type}-${index}`}
                    className={active ? "table-active" : ""}
                  >
                    <td className="numeric">
                      <button
                        type="button"
                        onClick={() => onSelectTime(event.time)}
                        className="event-time-button"
                        aria-label={`Seek to ${formatSampleTime(event.time)}`}
                      >
                        {formatSampleTime(event.time)}
                      </button>
                    </td>
                    <td className="row-title">{event.type}</td>
                    <td>{event.desc}</td>
                    <td className="numeric">
                      {event.xT === undefined ? "—" : `+${event.xT.toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
