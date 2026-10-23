"use client";

import React, { useState, useRef } from "react";
import { Header } from "@/components/Header";
import { TelemetryBar } from "@/components/TelemetryBar";
import { VideoStage } from "@/components/VideoStage";
import { PitchRadar } from "@/components/PitchRadar";
import { EventStream } from "@/components/EventStream";
import { BenchmarksTable } from "@/components/BenchmarksTable";
import { ExportModal } from "@/components/ExportModal";

export default function Home() {
  const [currentView, setCurrentView] = useState<"studio" | "events" | "benchmarks">("studio");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [videoSrc, setVideoSrc] = useState(
    "https://upload.wikimedia.org/wikipedia/commons/6/69/Goal_by_Rafael_Leao.webm"
  );
  
  // Real-time telemetry state
  const [ballSpeed, setBallSpeed] = useState(88.4);
  const [offsideMargin, setOffsideMargin] = useState(24.2);
  const [currentTimeSec, setCurrentTimeSec] = useState(14.28);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoSrc(URL.createObjectURL(file));
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8F9FA] text-gray-900 font-sans">
      
      {/* Hidden File Input for Custom MP4 Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Global Navigation Bar */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        onUploadClick={() => fileInputRef.current?.click()}
        onExportClick={() => setIsExportOpen(true)}
      />

      {/* Real-time Telemetry Strip */}
      <TelemetryBar
        clockTime="72:14.28"
        ballSpeedKmh={ballSpeed}
        homographyErrorPx={1.2}
        offsideMarginCm={offsideMargin}
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 p-5 max-w-[1600px] w-full mx-auto space-y-5">
        
        {currentView === "studio" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Video Stage with CV Overlays (7 cols) */}
            <div className="lg:col-span-7">
              <VideoStage
                videoSrc={videoSrc}
                onSpeedUpdate={setBallSpeed}
                onOffsideUpdate={setOffsideMargin}
                onTimeUpdate={setCurrentTimeSec}
              />
            </div>

            {/* Right: 2D Tactical Pitch Radar & Telemetry (5 cols) */}
            <div className="lg:col-span-5">
              <PitchRadar
                offsideLineX={32.4}
                haalandSpeed={34.8}
                pitchDominancePct={58.4}
              />
            </div>
          </div>
        )}

        {currentView === "events" && <EventStream />}

        {currentView === "benchmarks" && <BenchmarksTable />}

        {/* Bottom Benchmarks on studio view for credibility */}
        {currentView === "studio" && (
          <div className="pt-2">
            <BenchmarksTable />
          </div>
        )}

      </main>

      {/* Export Deliverables Modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />

      {/* Clean Studio Footer */}
      <footer className="border-t border-gray-200 bg-white py-4 px-5 text-xs text-gray-400 font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <strong className="text-gray-700">PitchPulse</strong> — Tactical Computer Vision & Optical Tracking.
        </div>
        <div>
          Zero Server Video Storage · Client-Side Inference Ready
        </div>
      </footer>

    </div>
  );
}
