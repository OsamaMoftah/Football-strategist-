export type StrategyCategory = "In possession" | "Out of possession" | "Transition" | "Set pieces";

export interface StrategyPattern {
  id: string;
  name: string;
  category: StrategyCategory;
  description: string;
  cue: string;
  image: string;
  imageAlt: string;
}

export const strategyCategories: Array<"All patterns" | StrategyCategory> = [
  "All patterns",
  "In possession",
  "Out of possession",
  "Transition",
  "Set pieces",
];

export const strategyPatterns: StrategyPattern[] = [
  {
    id: "counter-press",
    name: "Counter-press",
    category: "Transition",
    description:
      "Collapse around the ball immediately after a turnover to stop the first forward pass.",
    cue: "Nearest three players close; the rest protect the central lane.",
    image: "/images/training-press.jpg",
    imageAlt: "Players regrouping on a football training pitch.",
  },
  {
    id: "high-press",
    name: "High press",
    category: "Out of possession",
    description:
      "Use a forward pass or poor first touch as the trigger to press the build-up line.",
    cue: "Curve the run to screen the pivot and force play wide.",
    image: "/images/match-attack.jpg",
    imageAlt: "A live match with both teams set around the penalty area.",
  },
  {
    id: "wide-overload",
    name: "Wide overload",
    category: "In possession",
    description: "Create a local two-versus-one with a winger, fullback and supporting midfielder.",
    cue: "The far-side winger holds width as the ball-side triangle combines.",
    image: "/images/match-attack.jpg",
    imageAlt: "A team advancing through the wide channel during a match.",
  },
  {
    id: "third-man-run",
    name: "Third-man run",
    category: "In possession",
    description: "Use a bounce pass to release a runner beyond the line of pressure.",
    cue: "A receiver sets the ball first time; the third player attacks the space.",
    image: "/images/match-shape.jpg",
    imageAlt: "Players arranged around the goal during a live football match.",
  },
  {
    id: "switch-of-play",
    name: "Switch of play",
    category: "In possession",
    description:
      "Move the defensive block across the pitch, then attack the space on the far side.",
    cue: "Look for the far-side player free before the opponent can shift.",
    image: "/images/match-attack.jpg",
    imageAlt: "A broad view of a football match with space across the pitch.",
  },
  {
    id: "mid-block-trap",
    name: "Mid-block trap",
    category: "Out of possession",
    description:
      "Keep a compact shape, invite a pass into a chosen lane and close the receiver together.",
    cue: "The nearest midfielder jumps while the back line squeezes forward.",
    image: "/images/match-shape.jpg",
    imageAlt: "A team holding a defensive shape in front of goal.",
  },
  {
    id: "fast-break",
    name: "Fast break",
    category: "Transition",
    description: "Attack before the opponent restores its defensive shape after winning the ball.",
    cue: "First look forward; supporting runs split the central and wide lanes.",
    image: "/images/match-attack.jpg",
    imageAlt: "An attacking phase developing in a football match.",
  },
  {
    id: "short-corner",
    name: "Short-corner rotation",
    category: "Set pieces",
    description: "Use a short option to pull a marker away and open a delivery or cut-back lane.",
    cue: "One player pins the near zone while a second attacks the space behind.",
    image: "/images/set-piece.jpg",
    imageAlt: "Footballers preparing a set-piece drill on a training pitch.",
  },
];
