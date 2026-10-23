"use client";

import React from "react";

interface TelemetryBarProps {
  clockTime: string;
  ballSpeedKmh: number;
  homographyErrorPx: number;
  offsideMarginCm: number;
}

export function TelemetryBar({
  clockTime,
  ballSpeedKmh,
  homographyErrorPx,
  offsideMarginCm
}: TelemetryBarProps) {
  const isOnside = offsideMarginCm >= 0;

  return (
    <div className="h-10 bg-white border-b border-gray-200 px-5 flex items-center justify-between text-xs font-mono text-gray-500 shrink-0 tnum">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
          <span className="font-medium text-gray-900">Tracking Active (22/22)</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <span>Match:</span>
          <span className="font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
            Man City 2–1 Real Madrid
          </span>
          <span className="text-gray-300">·</span>
          <span>{clockTime}</span>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-6">
        <div>
          Ball Speed: <span className="font-medium text-gray-900">{ballSpeedKmh.toFixed(1)} km/h</span>
        </div>
        <div className="text-gray-300">·</div>
        <div>
          Homography Reprojection: <span className="font-medium text-emerald-700">{homographyErrorPx.toFixed(1)} px</span>
        </div>
        <div className="text-gray-300">·</div>
        <div>
          VAR Margin:{" "}
          <span className={`font-medium ${isOnside ? "text-emerald-700" : "text-rose-600"}`}>
            {isOnside ? `+${offsideMarginCm.toFixed(1)} cm (Onside)` : `${offsideMarginCm.toFixed(1)} cm (Offside)`}
          </span>
        </div>
      </div>
    </div>
  );
}
