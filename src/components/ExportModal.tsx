"use client";

import React from "react";
import { Download, FileJson, FileSpreadsheet, Film, X } from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  if (!isOpen) return null;

  const handleDownload = (filename: string, contentType: string, data: string) => {
    const blob = new Blob([data], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    // Fetch or generate coordinates sample
    fetch("/data/match_sample.json")
      .then((res) => res.text())
      .then((text) => handleDownload("pitchpulse_tracking_coordinates.json", "application/json", text))
      .catch(() => {
        handleDownload(
          "pitchpulse_tracking_sample.json",
          "application/json",
          JSON.stringify({ match: "Man City vs Real Madrid", fps: 30, tracking: "22 players + ball" }, null, 2)
        );
      });
  };

  const downloadCSV = () => {
    const csvContent =
      "timestamp_sec,event_type,player_name,team,pitch_x,pitch_y,xT_gain,offside_margin_cm\n" +
      "04.20,Turnover,Rodri,City,52.0,34.0,0.08,NA\n" +
      "09.80,Key Pass,De Bruyne,City,64.0,38.0,0.42,NA\n" +
      "14.28,Through-Ball,Haaland,City,74.2,34.0,0.38,24.2\n" +
      "14.50,Shot on Target,Haaland,City,78.2,34.0,0.48,18.4\n";
    handleDownload("pitchpulse_tactical_events.csv", "text/csv", csvContent);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl max-w-sm w-full p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 text-sm">Export Match Analysis</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-xs text-gray-500">Choose data format for scouting reports, tactical analysis, or client handoff:</p>

        <div className="space-y-2 text-xs font-mono">
          <button
            onClick={downloadJSON}
            className="w-full p-2.5 rounded-lg border border-gray-200 hover:border-gray-400 text-left flex justify-between items-center bg-gray-50 hover:bg-white transition"
          >
            <div className="flex items-center gap-2.5">
              <FileJson className="w-4 h-4 text-sky-600" />
              <div>
                <div className="font-medium text-gray-900">Tracking Coordinates (JSON)</div>
                <div className="text-[10px] text-gray-500">22 players + ball 2D coordinates</div>
              </div>
            </div>
            <span className="text-gray-400">JSON</span>
          </button>

          <button
            onClick={downloadCSV}
            className="w-full p-2.5 rounded-lg border border-gray-200 hover:border-gray-400 text-left flex justify-between items-center bg-gray-50 hover:bg-white transition"
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="font-medium text-gray-900">Tactical Event Stream (CSV)</div>
                <div className="text-[10px] text-gray-500">Passes, shots, xT, offside checks</div>
              </div>
            </div>
            <span className="text-gray-400">CSV</span>
          </button>

          <button
            onClick={() => alert("Annotated MP4 export triggered. Processing video frames...")}
            className="w-full p-2.5 rounded-lg border border-gray-200 hover:border-gray-400 text-left flex justify-between items-center bg-gray-50 hover:bg-white transition"
          >
            <div className="flex items-center gap-2.5">
              <Film className="w-4 h-4 text-amber-600" />
              <div>
                <div className="font-medium text-gray-900">Annotated Broadcast MP4</div>
                <div className="text-[10px] text-gray-500">Rendered with tracking overlays</div>
              </div>
            </div>
            <span className="text-gray-400">MP4</span>
          </button>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full h-8 bg-gray-950 hover:bg-black text-white text-xs font-medium rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
