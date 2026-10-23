"use client";

import React from "react";
import { Upload, Download } from "lucide-react";

interface HeaderProps {
  currentView: "studio" | "events" | "benchmarks";
  onViewChange: (view: "studio" | "events" | "benchmarks") => void;
  onUploadClick: () => void;
  onExportClick: () => void;
}

export function Header({
  currentView,
  onViewChange,
  onUploadClick,
  onExportClick
}: HeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 px-5 flex items-center justify-between shrink-0 select-none sticky top-0 z-40">
      
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gray-950 flex items-center justify-center text-white font-bold text-xs">
          P
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-950 tracking-tight">PitchPulse</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-500 font-medium text-xs">Tactical Match Intelligence</span>
        </div>
      </div>

      {/* Center Segmented View Control */}
      <div className="hidden md:flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs font-medium">
        <button
          onClick={() => onViewChange("studio")}
          className={`px-3 py-1 rounded-md transition ${
            currentView === "studio"
              ? "bg-white shadow-sm font-semibold text-gray-950"
              : "text-gray-500 hover:text-gray-950"
          }`}
        >
          Tactical Studio
        </button>
        <button
          onClick={() => onViewChange("events")}
          className={`px-3 py-1 rounded-md transition ${
            currentView === "events"
              ? "bg-white shadow-sm font-semibold text-gray-950"
              : "text-gray-500 hover:text-gray-950"
          }`}
        >
          Event Stream
        </button>
        <button
          onClick={() => onViewChange("benchmarks")}
          className={`px-3 py-1 rounded-md transition ${
            currentView === "benchmarks"
              ? "bg-white shadow-sm font-semibold text-gray-950"
              : "text-gray-500 hover:text-gray-950"
          }`}
        >
          Model Benchmarks
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onUploadClick}
          className="h-8 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 text-xs font-medium transition flex items-center gap-1.5 shadow-xs"
        >
          <Upload className="w-3.5 h-3.5 text-gray-500" />
          <span>Upload MP4</span>
        </button>

        <button
          onClick={onExportClick}
          className="h-8 px-3 rounded-lg bg-gray-950 hover:bg-black text-white text-xs font-medium transition flex items-center gap-1.5 shadow-xs"
        >
          <Download className="w-3.5 h-3.5 text-gray-300" />
          <span>Export Analytics</span>
        </button>
      </div>
    </header>
  );
}
