"use client";

import React from "react";

export function BenchmarksTable() {
  const benchmarks = [
    {
      stage: "Ball Tracking",
      architecture: "WASB Temporal Heatmaps + Kalman Gate",
      accuracy: "92.4% Recall",
      source: "78 broadcast clips (1080p 50fps)",
      failureMode: "Crowded 6-yard box scuffles"
    },
    {
      stage: "Player Detection",
      architecture: "YOLO11x-Seg + ByteTrack",
      accuracy: "96.8% Persistence",
      source: "Corner kick & counter-attack passages",
      failureMode: "Celebration huddles after goals"
    },
    {
      stage: "Pitch Homography",
      architecture: "18-Keypoint Sub-pixel Line Fit",
      accuracy: "1.2 px Error",
      source: "FIFA 105m×68m standard markings",
      failureMode: "Fewer than 4 visible pitch lines"
    },
    {
      stage: "VAR Offside Margin",
      architecture: "Epipolar projection to defender boot",
      accuracy: "±4.2 cm Error",
      source: "Official broadcast VAR freeze-frames",
      failureMode: "Defender boot occluded by attacker"
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 text-xs">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">Empirical Ground-Truth Benchmarks</h2>
          <p className="text-gray-500 text-xs mt-0.5">Tested against broadcast freeze-frames and manual annotations.</p>
        </div>
        <div className="text-gray-500 font-mono text-[11px]">142 match clips tested</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono tnum">
          <thead className="text-gray-500 border-b border-gray-200">
            <tr>
              <th className="pb-2 font-medium">Stage</th>
              <th className="pb-2 font-medium">Architecture</th>
              <th className="pb-2 font-medium">Accuracy</th>
              <th className="pb-2 font-medium">Validation Source</th>
              <th className="pb-2 font-medium">Known Failure Mode</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-gray-900">
            {benchmarks.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50">
                <td className="py-2.5 font-medium">{row.stage}</td>
                <td className="py-2.5 text-gray-500">{row.architecture}</td>
                <td className="py-2.5 text-emerald-700 font-semibold">{row.accuracy}</td>
                <td className="py-2.5 text-gray-500">{row.source}</td>
                <td className="py-2.5 text-gray-400">{row.failureMode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
