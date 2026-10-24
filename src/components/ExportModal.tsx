"use client";

import { useEffect, type ReactNode } from "react";
import { Download, FileJson, FileSpreadsheet, X } from "lucide-react";
import type { MatchSample } from "@/lib/match-data";

interface ExportModalProps {
  isOpen: boolean;
  sample: MatchSample | null;
  onClose: () => void;
}

const csvCell = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};

function downloadFile(filename: string, contentType: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: contentType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportModal({ isOpen, sample, onClose }: ExportModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const downloadJSON = () => {
    if (!sample) return;
    downloadFile(
      "football-strategist-synthetic-tracking-sample.json",
      "application/json",
      JSON.stringify(sample, null, 2),
    );
  };

  const downloadPositionsCSV = () => {
    if (!sample) return;
    const rows: Array<Array<string | number | undefined>> = [
      [
        "time_sec",
        "frame_idx",
        "record_type",
        "id",
        "team",
        "label",
        "x_m",
        "y_m",
        "speed_kmh",
        "offside_margin_cm",
      ],
    ];
    for (const frame of sample.frames) {
      for (const player of [...frame.home_players, ...frame.away_players]) {
        rows.push([
          frame.timestamp,
          frame.frame_idx,
          "player",
          player.id,
          player.team,
          player.name,
          player.x,
          player.y,
          player.speed_kmh,
          frame.offside.margin_cm,
        ]);
      }
      rows.push([
        frame.timestamp,
        frame.frame_idx,
        "ball",
        "",
        "",
        "Ball",
        frame.ball.x,
        frame.ball.y,
        frame.ball.speed_kmh,
        frame.offside.margin_cm,
      ]);
    }
    downloadFile(
      "football-strategist-synthetic-positions.csv",
      "text/csv;charset=utf-8",
      rows.map((row) => row.map(csvCell).join(",")).join("\n"),
    );
  };

  const downloadEventsCSV = () => {
    if (!sample) return;
    const rows: Array<Array<string | number | undefined>> = [
      ["time_sec", "event_type", "description", "spatial_threat_proxy"],
      ...sample.events.map((event) => [event.time, event.type, event.desc, event.xT]),
    ];
    downloadFile(
      "football-strategist-synthetic-events.csv",
      "text/csv;charset=utf-8",
      rows.map((row) => row.map(csvCell).join(",")).join("\n"),
    );
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        className="export-dialog"
      >
        <div className="export-dialog__head">
          <div>
            <h2 id="export-title" className="export-dialog__title">
              Export sample data
            </h2>
            <p className="export-dialog__description">
              Files retain the synthetic-data label and source metadata.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export dialog"
            className="icon-button"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="export-actions">
          <ExportAction
            icon={<FileJson size={16} aria-hidden="true" />}
            title="Tracking timeline (JSON)"
            description="Frame-by-frame sample data and metadata"
            onClick={downloadJSON}
            disabled={!sample}
          />
          <ExportAction
            icon={<FileSpreadsheet size={16} aria-hidden="true" />}
            title="Player and ball positions (CSV)"
            description="Metric coordinates for every sample frame"
            onClick={downloadPositionsCSV}
            disabled={!sample}
          />
          <ExportAction
            icon={<Download size={16} aria-hidden="true" />}
            title="Sample events (CSV)"
            description="Event times and spatial threat proxies"
            onClick={downloadEventsCSV}
            disabled={!sample}
          />
        </div>
        <button type="button" onClick={onClose} className="button-primary export-dialog__done">
          Done
        </button>
      </section>
    </div>
  );
}

function ExportAction({
  icon,
  title,
  description,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="export-action">
      <span className="export-action__content">
        <span className="export-action__icon">{icon}</span>
        <span>
          <span className="export-action__title">{title}</span>
          <span className="export-action__description">{description}</span>
        </span>
      </span>
      <Download size={14} aria-hidden="true" />
    </button>
  );
}
