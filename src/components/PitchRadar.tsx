"use client";

import React from "react";

interface PitchRadarProps {
  offsideLineX?: number;
  haalandSpeed?: number;
  pitchDominancePct?: number;
}

export function PitchRadar({
  offsideLineX = 32.4,
  haalandSpeed = 34.8,
  pitchDominancePct = 58.4
}: PitchRadarProps) {
  return (
    <div className="flex flex-col gap-5">
      
      {/* 2D Tactical Pitch Radar Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 text-xs">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <span>2D Tactical Radar</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500 font-normal">105m × 68m Metric Pitch</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400"></span> City</span>
            <span className="flex items-center gap-1 ml-2"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Real</span>
          </div>
        </div>

        {/* Tactical Pitch Canvas */}
        <div className="relative aspect-[4/3] rounded-lg mt-3 overflow-hidden border border-emerald-950/20 bg-[#1A3326] flex items-center justify-center p-2">
          <svg className="w-full h-full" viewBox="0 0 520 340">
            {/* Turf Mowing Stripes */}
            <rect x="0" y="0" width="520" height="340" fill="#1A3326" />
            <rect x="65" y="0" width="65" height="340" fill="#152B20" />
            <rect x="195" y="0" width="65" height="340" fill="#152B20" />
            <rect x="325" y="0" width="65" height="340" fill="#152B20" />
            <rect x="455" y="0" width="65" height="340" fill="#152B20" />

            {/* Pitch Lines */}
            <rect x="20" y="20" width="480" height="300" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" />
            <line x1="260" y1="20" x2="260" y2="320" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" />
            <circle cx="260" cy="170" r="45" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" />
            <circle cx="260" cy="170" r="2.5" fill="#FFFFFF" />

            {/* Boxes */}
            <rect x="20" y="80" width="80" height="180" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" />
            <rect x="420" y="80" width="80" height="180" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" />

            {/* Voronoi Pitch Control Polygon */}
            <polygon
              points="260,20 380,80 340,240 260,320"
              fill="rgba(56, 189, 248, 0.12)"
              stroke="rgba(56, 189, 248, 0.4)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />

            {/* Offside Line */}
            <line x1="390" y1="20" x2="390" y2="320" stroke="#EF4444" strokeWidth="1.8" strokeDasharray="4,4" />
            <text x="390" y="34" fill="#FFFFFF" fontSize="8" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">
              OFFSIDE LINE ({offsideLineX}m)
            </text>

            {/* Pass Trajectory Line */}
            <line x1="250" y1="160" x2="375" y2="105" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />

            {/* Player Dots */}
            {/* De Bruyne */}
            <circle cx="250" cy="160" r="7" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.5" />
            <text x="250" y="163" fill="#000" fontSize="7" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">17</text>

            {/* Haaland */}
            <circle cx="375" cy="105" r="7" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.5" />
            <text x="375" y="108" fill="#000" fontSize="7" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">9</text>
            <text x="375" y="94" fill="#FFFFFF" fontSize="8" fontFamily="Inter" fontWeight="600" textAnchor="middle">
              Haaland {haalandSpeed.toFixed(1)} km/h
            </text>

            {/* Militão */}
            <circle cx="390" cy="125" r="7" fill="#F43F5E" stroke="#FFFFFF" strokeWidth="1.5" />
            <text x="390" y="128" fill="#FFF" fontSize="7" fontFamily="JetBrains Mono" fontWeight="bold" textAnchor="middle">3</text>

            {/* Ball */}
            <circle cx="305" cy="135" r="4.5" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="mt-4 grid grid-cols-3 gap-3 text-xs font-mono tnum">
          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
            <span className="text-[10px] text-gray-500 block uppercase">Pitch Dominance</span>
            <span className="text-base font-semibold text-gray-900 mt-0.5 block">{pitchDominancePct.toFixed(1)}%</span>
            <span className="text-[10px] text-gray-500">Man City attacking half</span>
          </div>

          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
            <span className="text-[10px] text-gray-500 block uppercase">Defensive Height</span>
            <span className="text-base font-semibold text-gray-900 mt-0.5 block">34.2 m</span>
            <span className="text-[10px] text-gray-500">Compactness: 24.8m</span>
          </div>

          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
            <span className="text-[10px] text-gray-500 block uppercase">Threat Value (xT)</span>
            <span className="text-base font-semibold text-emerald-700 mt-0.5 block">+0.48</span>
            <span className="text-[10px] text-emerald-700">Direct goal chance</span>
          </div>
        </div>

      </div>

      {/* Optical Tracking Displacement */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-200">
          <span className="font-semibold text-gray-900">Optical Tracking Displacement</span>
          <span className="text-gray-500 font-mono text-[11px]">Sub-pixel Homography</span>
        </div>

        <div className="space-y-2 text-xs font-mono tnum">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">#9 E. Haaland (Top Sprint)</span>
            <span className="font-semibold text-gray-900">{haalandSpeed.toFixed(1)} km/h</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
            <div className="h-full bg-gray-900 w-[90%] rounded-full"></div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-gray-500">#17 K. De Bruyne (Distance Covered)</span>
            <span className="font-semibold text-gray-900">8.42 km</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
            <div className="h-full bg-gray-400 w-[74%] rounded-full"></div>
          </div>
        </div>
      </div>

    </div>
  );
}
