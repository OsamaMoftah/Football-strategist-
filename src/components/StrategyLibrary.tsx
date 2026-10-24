"use client";

import { useState } from "react";
import Image from "next/image";
import { strategyCategories, strategyPatterns, type StrategyCategory } from "@/lib/strategy-data";
interface StrategyLibraryProps {
  mode: "featured" | "library";
  selectedIds: string[];
  onToggleStrategy: (id: string) => void;
  category: "All patterns" | StrategyCategory;
  onCategoryChange: (category: "All patterns" | StrategyCategory) => void;
  onShowAll?: () => void;
  title?: string;
  description?: string;
}
const phases = strategyCategories.filter(
  (category): category is StrategyCategory => category !== "All patterns",
);
const phaseClass = (phase: StrategyCategory) =>
  phase === "In possession"
    ? "wk-phase-blue"
    : phase === "Out of possession"
      ? "wk-phase-red"
      : phase === "Transition"
        ? "wk-phase-yellow"
        : "wk-phase-neutral";
export function StrategyLibrary({
  selectedIds,
  onToggleStrategy,
  category,
  onCategoryChange,
}: StrategyLibraryProps) {
  const [chosenId, setChosenId] = useState("counter-press");
  const activePhase = category === "All patterns" ? "Transition" : category;
  const patterns = strategyPatterns.filter((pattern) => pattern.category === activePhase);
  const chosen = patterns.find((pattern) => pattern.id === chosenId) ?? patterns[0];
  const selected = selectedIds.includes(chosen.id);
  return (
    <section aria-label="Strategy library" className="wk-strategy-library">
      <div className="wk-phase-tabs" role="tablist" aria-label="Phases of play">
        {phases.map((phase) => (
          <button
            type="button"
            role="tab"
            id={`phase-${phase.replaceAll(" ", "-")}`}
            aria-controls="phase-content"
            aria-selected={phase === activePhase}
            key={phase}
            className={`wk-phase-tab ${phaseClass(phase)}`}
            onClick={() => onCategoryChange(phase)}
          >
            {phase === "Out of possession" ? "Defending" : phase}
          </button>
        ))}
      </div>
      <div
        className={`wk-phase-sheet ${phaseClass(activePhase)}`}
        id="phase-content"
        role="tabpanel"
        aria-labelledby={`phase-${activePhase.replaceAll(" ", "-")}`}
      >
        <Image
          className="wk-strategy-photo"
          src={chosen.image}
          alt={chosen.imageAlt}
          width={1600}
          height={900}
          sizes="(max-width: 760px) 100vw, 48vw"
        />
        <div className="wk-strategy-cell">
          <h2>{activePhase === "Out of possession" ? "Defending" : activePhase}</h2>
          <div className="wk-pattern-list">
            {patterns.map((pattern) => (
              <button
                className="wk-pattern"
                type="button"
                key={pattern.id}
                aria-pressed={chosen.id === pattern.id}
                onClick={() => setChosenId(pattern.id)}
              >
                <span>{pattern.name}</span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          <p className="wk-pattern-description">{chosen.description}</p>
          <div className="wk-coaching-cue">
            <strong>Coaching cue</strong>
            <p>{chosen.cue}</p>
          </div>
          <button
            type="button"
            className="wk-add-lens"
            aria-pressed={selected}
            onClick={() => onToggleStrategy(chosen.id)}
          >
            {selected ? "Remove from review focus ✓" : "Use this review lens →"}
          </button>
        </div>
      </div>
      <p className="wk-file-note">
        {strategyPatterns.length} patterns · {selectedIds.length} in review focus · analyst-selected
        lenses require confirmation against footage.
      </p>
    </section>
  );
}
