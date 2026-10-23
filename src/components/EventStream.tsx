"use client";

import React from "react";

export function EventStream() {
  const events = [
    { time: "71:42", player: "#16 Rodri", team: "City", type: "Turnover Win", zone: "Middle Third (52m, 34m)", xT: "+0.08", outcome: "Success" },
    { time: "72:05", player: "#17 De Bruyne", team: "City", type: "Progressive Carry", zone: "Zone 14 (64m, 38m)", xT: "+0.18", outcome: "Success" },
    { time: "72:14", player: "#17 De Bruyne", team: "City", type: "Line-Breaking Pass", zone: "Penalty Box Entry", xT: "+0.42", outcome: "Key Pass" },
    { time: "72:14", player: "#9 Haaland", team: "City", type: "VAR Offside Check", zone: "Defensive Line (32.4m)", xT: "—", outcome: "Onside (+24.2cm)" },
    { time: "72:15", player: "#9 Haaland", team: "City", type: "Shot on Target", zone: "Central 18-Yard Box", xT: "+0.38", outcome: "Goal" },
    { time: "72:40", player: "#8 Kroos", team: "Real", type: "Restart Circulation", zone: "Defensive Third", xT: "+0.02", outcome: "Success" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 text-xs">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">Match Event Stream & Spatial Logs</h2>
          <p className="text-gray-500 text-xs mt-0.5">Automated detection of ball circulation, line-breaking passes, and VAR checks.</p>
        </div>
        <div className="text-gray-500 font-mono text-[11px]">Optical Tagging Active</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono tnum">
          <thead className="text-gray-500 border-b border-gray-200">
            <tr>
              <th className="pb-2 font-medium">Time</th>
              <th className="pb-2 font-medium">Player</th>
              <th className="pb-2 font-medium">Team</th>
              <th className="pb-2 font-medium">Action</th>
              <th className="pb-2 font-medium">Metric Pitch Zone</th>
              <th className="pb-2 font-medium">Threat (xT)</th>
              <th className="pb-2 font-medium">Verification Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-gray-900">
            {events.map((ev, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50">
                <td className="py-2.5 font-medium">{ev.time}</td>
                <td className="py-2.5 font-semibold text-gray-900">{ev.player}</td>
                <td className="py-2.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ev.team === "City" ? "bg-sky-50 text-sky-700 border border-sky-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                    {ev.team}
                  </span>
                </td>
                <td className="py-2.5 text-gray-700">{ev.type}</td>
                <td className="py-2.5 text-gray-500">{ev.zone}</td>
                <td className="py-2.5 font-bold text-emerald-700">{ev.xT}</td>
                <td className="py-2.5">
                  <span className="text-emerald-700 font-semibold">{ev.outcome}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
