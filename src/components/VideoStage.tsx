"use client";

import React, { useRef, useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";

interface VideoStageProps {
  onSpeedUpdate: (speed: number) => void;
  onOffsideUpdate: (margin: number) => void;
  onTimeUpdate: (timeSec: number) => void;
  videoSrc: string;
}

export function VideoStage({
  onSpeedUpdate,
  onOffsideUpdate,
  onTimeUpdate,
  videoSrc
}: VideoStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showTracer, setShowTracer] = useState(true);
  const [showVar, setShowVar] = useState(true);
  const [currentTime, setCurrentTime] = useState(14.28);
  const [duration, setDuration] = useState(34.0);
  const [ballSpeed, setBallSpeed] = useState(88.4);

  // Animation frame loop
  useEffect(() => {
    let animId: number;
    let clock = 0;
    const trail: Array<{ x: number; y: number }> = [];

    const render = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Ensure canvas matches viewport
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      clock += 0.016;
      const progress = (Math.sin(clock * 1.4) + 1) / 2;

      // Realistic Ball trajectory on screen
      const ballX = (0.24 + progress * 0.48) * w;
      const ballY = (0.64 - Math.sin(progress * Math.PI) * 0.26) * h;
      const spd = 78 + Math.sin(progress * Math.PI) * 24;
      setBallSpeed(spd);
      onSpeedUpdate(spd);

      // 1. Tracer line
      if (showTracer) {
        trail.push({ x: ballX, y: ballY });
        if (trail.length > 20) trail.shift();

        if (trail.length > 2) {
          ctx.beginPath();
          ctx.moveTo(trail[0].x, trail[0].y);
          for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(trail[i].x, trail[i].y);
          }
          ctx.strokeStyle = "#F59E0B";
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.stroke();
        }
      }

      // Ball point
      ctx.beginPath();
      ctx.arc(ballX, ballY, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 2. Player Bounding Boxes
      if (showBoxes) {
        drawBox(ctx, w * 0.22, h * 0.58, 54, 110, "#38BDF8", "#17 De Bruyne", "31.2 km/h");
        drawBox(ctx, w * (0.64 + progress * 0.04), h * 0.48, 58, 122, "#38BDF8", "#9 Haaland", "34.8 km/h");
        drawBox(ctx, w * 0.70, h * 0.46, 56, 118, "#F43F5E", "#3 Militão", "30.1 km/h");
      }

      // 3. VAR Perspective Line
      if (showVar) {
        const lineX = w * 0.70;
        ctx.beginPath();
        ctx.moveTo(lineX + 5, h * 0.36);
        ctx.lineTo(lineX - 40, h * 0.94);
        ctx.strokeStyle = "#EF4444";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        onOffsideUpdate(24.2);
      }

      // Sync video time
      if (video && video.duration) {
        setCurrentTime(video.currentTime);
        setDuration(video.duration);
        onTimeUpdate(video.currentTime);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [showBoxes, showTracer, showVar, onSpeedUpdate, onOffsideUpdate, onTimeUpdate]);

  const drawBox = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    label: string,
    speed: string
  ) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = color;
    ctx.fillRect(x, y - 18, width + 30, 18);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText(label, x + 4, y - 6);

    ctx.fillStyle = "rgba(17, 24, 39, 0.85)";
    ctx.fillRect(x, y + height + 2, width, 14);
    ctx.fillStyle = "#E5E7EB";
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText(speed, x + 4, y + height + 12);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const cycleRate = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextRate = playbackRate === 1.0 ? 0.5 : 1.0;
    video.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  };

  const scrubPercent = duration > 0 ? (currentTime / duration) * 100 : 40;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs flex flex-col overflow-hidden">
      
      {/* Viewport Top Header */}
      <div className="h-11 px-4 border-b border-gray-200 flex items-center justify-between bg-white text-xs select-none">
        <div className="flex items-center gap-2 text-gray-500 font-medium">
          <span className="text-gray-900 font-semibold">Broadcast Camera 01</span>
          <span>·</span>
          <span>1080p 50fps</span>
        </div>

        <div className="flex items-center gap-1.5 font-medium text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-gray-500 hover:text-gray-900 px-2 py-1 rounded">
            <input
              type="checkbox"
              checked={showBoxes}
              onChange={(e) => setShowBoxes(e.target.checked)}
              className="rounded border-gray-300 text-gray-900 focus:ring-0"
            />
            <span>Boxes</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-gray-500 hover:text-gray-900 px-2 py-1 rounded">
            <input
              type="checkbox"
              checked={showTracer}
              onChange={(e) => setShowTracer(e.target.checked)}
              className="rounded border-gray-300 text-gray-900 focus:ring-0"
            />
            <span>Tracer</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-gray-500 hover:text-gray-900 px-2 py-1 rounded">
            <input
              type="checkbox"
              checked={showVar}
              onChange={(e) => setShowVar(e.target.checked)}
              className="rounded border-gray-300 text-gray-900 focus:ring-0"
            />
            <span>VAR Line</span>
          </label>
        </div>
      </div>

      {/* Main Video Stage */}
      <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* HUD Info Badges */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-lg px-2.5 py-1.5 border border-gray-200 text-xs font-mono shadow-xs space-y-0.5">
          <div className="text-[11px] font-semibold text-gray-900 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span>VAR Epipolar: Onside (+24.2 cm)</span>
          </div>
          <div className="text-[10px] text-gray-500">Militão (32.4m) vs Haaland (32.1m)</div>
        </div>

        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur rounded-lg px-2.5 py-1.5 border border-gray-200 text-xs font-mono shadow-xs text-right">
          <div className="text-[10px] text-gray-500">Ball Speed</div>
          <div className="text-xs font-semibold text-gray-900 tnum">{ballSpeed.toFixed(1)} km/h</div>
        </div>
      </div>

      {/* Transport Bar */}
      <div className="p-3 bg-white border-t border-gray-200 flex items-center gap-3 select-none">
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 flex items-center justify-center text-xs transition"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <div
            className="relative h-2 bg-gray-100 rounded-full cursor-pointer border border-gray-200 overflow-hidden"
            onClick={handleScrub}
          >
            <div
              className="absolute left-0 top-0 bottom-0 bg-gray-900 rounded-full transition-all"
              style={{ width: `${scrubPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 tnum">
            <span>00:{currentTime.toFixed(0).padStart(2, "0")}.28</span>
            <span className="text-gray-900 font-medium">Through-Ball Event (#17 De Bruyne → #9 Haaland)</span>
            <span>00:34.00</span>
          </div>
        </div>

        <button
          onClick={cycleRate}
          className="px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 text-xs font-mono font-medium"
        >
          {playbackRate}x
        </button>
      </div>

    </div>
  );
}
