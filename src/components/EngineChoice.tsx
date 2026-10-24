"use client";
import { useId } from "react";
import type { AnalysisEngine, NativeHealth } from "@/lib/cv/native-client";

export function EngineChoice({
  engine,
  onChange,
  health,
  disabled = false,
}: {
  engine: AnalysisEngine;
  onChange: (engine: AnalysisEngine) => void;
  health: NativeHealth | null;
  disabled?: boolean;
}) {
  const group = useId();
  return (
    <fieldset className="film-engine-choice" disabled={disabled}>
      <legend>Processing engine</legend>
      <div>
        <label>
          <input
            type="radio"
            name={group}
            value="browser"
            checked={engine === "browser"}
            onChange={() => onChange("browser")}
          />{" "}
          On this device
        </label>
        <label>
          <input
            type="radio"
            name={group}
            value="native"
            checked={engine === "native"}
            disabled={!health?.available}
            onChange={() => onChange("native")}
          />{" "}
          Native CPU server
        </label>
      </div>
      <p>
        {engine === "native"
          ? "Your clip is uploaded to this host. Source footage is deleted when processing ends; temporary results expire within one hour. Up to 30 seconds / 100 MB / 1080p. The shared CPU may take several minutes."
          : "Browser processing keeps the clip on your device. Up to 60 seconds / 200 MB."}
      </p>
      {!health?.available && (
        <small>
          Native uploads run in the Docker edition.{" "}
          <a
            href="https://huggingface.co/spaces/sammoftah/Football-strategist"
            target="_blank"
            rel="noreferrer"
          >
            Open the native-upload edition ↗
          </a>
        </small>
      )}
    </fieldset>
  );
}
