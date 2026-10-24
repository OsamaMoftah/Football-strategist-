"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Film, Upload } from "lucide-react";
import Image from "next/image";
import type { InterpolatedFrame } from "@/lib/match-data";

interface VideoStageProps {
  videoSrc: string | null;
  videoName: string | null;
  isVideoAligned: boolean;
  frame: InterpolatedFrame;
  imageBallTrail: Array<{ x: number; y: number }>;
  onUploadClick: () => void;
}

export function VideoStage({
  videoSrc,
  videoName,
  isVideoAligned,
  frame,
  imageBallTrail,
  onUploadClick,
}: VideoStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(frame);
  const imageBallTrailRef = useRef(imageBallTrail);
  const alignedRef = useRef(isVideoAligned);
  const drawRef = useRef<() => void>(() => undefined);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const videoFailed = Boolean(videoSrc && failedSource === videoSrc);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const video = videoRef.current;
      const bounds = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const pixelWidth = Math.max(1, Math.round(bounds.width * dpr));
      const pixelHeight = Math.max(1, Math.round(bounds.height * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, bounds.width, bounds.height);

      const latestFrame = frameRef.current;
      const hasImageTracks =
        alignedRef.current && (latestFrame.image_detections?.length || latestFrame.image_ball);
      if (!video || video.videoWidth === 0 || video.videoHeight === 0 || !hasImageTracks) return;

      const styles = getComputedStyle(document.documentElement);
      const homeColor = styles.getPropertyValue("--home").trim();
      const awayColor = styles.getPropertyValue("--away").trim();
      const ballColor = styles.getPropertyValue("--ball").trim();
      const scale = Math.min(bounds.width / video.videoWidth, bounds.height / video.videoHeight);
      const imageWidth = video.videoWidth * scale;
      const imageHeight = video.videoHeight * scale;
      const offsetX = (bounds.width - imageWidth) / 2;
      const offsetY = (bounds.height - imageHeight) / 2;
      const project = (x: number, y: number) => ({
        x: offsetX + x * imageWidth,
        y: offsetY + y * imageHeight,
      });

      const latestTrail = imageBallTrailRef.current;
      if (latestTrail.length > 1) {
        ctx.beginPath();
        latestTrail.forEach((point, index) => {
          const projected = project(point.x, point.y);
          if (index === 0) ctx.moveTo(projected.x, projected.y);
          else ctx.lineTo(projected.x, projected.y);
        });
        ctx.strokeStyle = ballColor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      }

      for (const detection of latestFrame.image_detections ?? []) {
        const topLeft = project(detection.x, detection.y);
        const width = detection.width * imageWidth;
        const height = detection.height * imageHeight;
        const color = detection.team === "home" ? homeColor : awayColor;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(topLeft.x, topLeft.y, width, height);
        ctx.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
        const labelWidth = ctx.measureText(detection.label).width + 12;
        ctx.fillStyle = color;
        ctx.fillRect(topLeft.x, Math.max(0, topLeft.y - 20), labelWidth, 18);
        ctx.fillStyle = "white";
        ctx.fillText(detection.label, topLeft.x + 6, Math.max(12, topLeft.y - 7));
      }

      if (latestFrame.image_ball) {
        const ball = project(latestFrame.image_ball.x, latestFrame.image_ball.y);
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.strokeStyle = ballColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    drawRef.current = draw;
    const observer = new ResizeObserver(draw);
    const videoElement = videoRef.current;
    observer.observe(canvas);
    draw();
    videoElement?.addEventListener("loadedmetadata", draw);
    return () => {
      observer.disconnect();
      videoElement?.removeEventListener("loadedmetadata", draw);
      drawRef.current = () => undefined;
    };
  }, [videoSrc]);

  useEffect(() => {
    frameRef.current = frame;
    imageBallTrailRef.current = imageBallTrail;
    alignedRef.current = isVideoAligned;
    drawRef.current();
  }, [frame, imageBallTrail, isVideoAligned]);

  const hasImageTracks = Boolean(
    isVideoAligned && (frame.image_detections?.length || frame.image_ball),
  );

  return (
    <section className="panel video-review" aria-label="Video review">
      <div className="panel-heading">
        <div>
          <h2 className="panel-heading__title">Video review</h2>
          <p className="panel-heading__description" title={videoName ?? undefined}>
            {videoName ?? "Add footage to begin"}
          </p>
        </div>
        <span className={`mini-chip ${hasImageTracks ? "mini-chip--good" : "mini-chip--warning"}`}>
          {hasImageTracks ? "Frame-linked" : "Uncalibrated"}
        </span>
      </div>

      <div className="video-panel__body">
        <div className="video-viewport">
          {videoSrc && !videoFailed ? (
            <video
              ref={videoRef}
              src={videoSrc}
              className="h-full w-full object-contain"
              controls
              playsInline
              preload="metadata"
              onError={() => setFailedSource(videoSrc)}
            />
          ) : (
            <div
              className={`video-placeholder video-placeholder--photo ${videoFailed ? "video-failure" : ""}`}
            >
              <Image
                src="/images/match-attack.jpg"
                alt="A live football match with an attacking team moving toward the penalty area."
                fill
                sizes="(max-width: 780px) 100vw, 62vw"
                className="video-placeholder__photo"
                priority
                loading="eager"
              />
              <div className="video-placeholder__shade">
                <span className="video-photo-label">
                  <Film size={12} aria-hidden="true" />{" "}
                  {videoFailed ? "Clip unavailable" : "Reference photo · not match footage"}
                </span>
                <div className="video-placeholder__copy">
                  <h3 className="video-placeholder__title">
                    {videoFailed ? "Choose another clip" : "Start with a match clip"}
                  </h3>
                  <p className="video-placeholder__text">
                    {videoFailed
                      ? "This file could not be played. Choose another MP4 or WebM file."
                      : "Open an MP4 or WebM to detect people and ball candidates in this browser. Pitch measurements need clip-specific calibration."}
                  </p>
                  <button
                    type="button"
                    onClick={onUploadClick}
                    className="button-secondary button-secondary-dark"
                  >
                    <Upload size={13} aria-hidden="true" />
                    Open a match video
                  </button>
                </div>
              </div>
            </div>
          )}

          {videoSrc && !videoFailed && (
            <>
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute inset-0 h-full w-full"
                aria-hidden="true"
              />
              {!hasImageTracks && (
                <div className="video-overlay-note">Local preview · no matching detections</div>
              )}
            </>
          )}
        </div>
        <p className="video-note">
          <AlertCircle size={13} aria-hidden="true" />
          {hasImageTracks
            ? "Frame-linked detections use this clip's calibration."
            : "Demo photo only. Local clip previews are not aligned to the synthetic sample tracking data."}
        </p>
      </div>
    </section>
  );
}
