import { resultBallTrack } from "./ball-motion";
import type { AnalysisResult, DetectionFrame, TeamIdentity, TrackedDetection } from "./types";
const colorDistance = (a: number[], b: number[]) => Math.hypot(...a.map((v, i) => v - b[i]));
export interface SequenceInsight {
  time: number;
  end: number;
  kind: "pressure" | "transition" | "movement";
  title: string;
  explanation: string;
  verify: string;
  strategyId?: string;
  support: number;
}
export interface SequenceSummary {
  title: string;
  explanation: string;
  insights: SequenceInsight[];
  control: { teamSeconds: [number, number]; eligibleSeconds: number; unknownSeconds: number };
  ball: {
    points: number;
    anchors: number;
    appearance: number;
    trackedSeconds: number;
    segments: number;
    coverage: number;
  };
  sceneCuts: number;
}
export function estimateTeams(frames: DetectionFrame[]): TeamIdentity[] {
  const observations = frames
    .flatMap((f) => f.detections)
    .filter((d) => d.label === "person" && d.onPitch && d.kit);
  for (const d of frames.flatMap((f) => f.detections)) delete d.teamId;
  if (observations.length < 8) return [];
  const sorted = [...observations].sort(
    (a, b) => a.kit!.reduce((s, v) => s + v, 0) - b.kit!.reduce((s, v) => s + v, 0),
  );
  let centers = [
    sorted[Math.floor(sorted.length * 0.2)].kit!.map(Number),
    sorted[Math.floor(sorted.length * 0.8)].kit!.map(Number),
  ];
  for (let iteration = 0; iteration < 8; iteration++) {
    const groups = [[] as number[][], [] as number[][]];
    for (const d of observations)
      groups[colorDistance(d.kit!, centers[0]) < colorDistance(d.kit!, centers[1]) ? 0 : 1].push(
        d.kit!,
      );
    centers = groups.map((group, i) =>
      group.length
        ? [0, 1, 2].map((c) => group.reduce((s, a) => s + a[c], 0) / group.length)
        : centers[i],
    );
  }
  if (colorDistance(centers[0], centers[1]) < 65) return [];
  const counts = [0, 0];
  for (const d of observations) {
    const a = colorDistance(d.kit!, centers[0]),
      b = colorDistance(d.kit!, centers[1]);
    if (Math.min(a, b) > 95 || Math.abs(a - b) < 25) continue;
    d.teamId = a < b ? 0 : 1;
    counts[d.teamId]++;
  }
  if (Math.min(...counts) < 3) {
    for (const d of observations) delete d.teamId;
    return [];
  }
  return centers.map((color, i) => ({
    id: i as 0 | 1,
    name: `Team ${i === 0 ? "A" : "B"} · ${color.reduce((s, n) => s + n, 0) / 3 < 120 ? "dark" : "light"} kit`,
    color: color.map(Math.round) as [number, number, number],
    samples: counts[i],
  }));
}
function nearbyFrame(frames: DetectionFrame[], time: number): DetectionFrame | undefined {
  let lo = 0,
    hi = frames.length - 1;
  if (!frames.length) return undefined;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (frames[mid].timestamp < time) lo = mid + 1;
    else hi = mid;
  }
  const a = frames[lo],
    b = frames[Math.max(0, lo - 1)];
  return Math.abs(a.timestamp - time) < Math.abs(b.timestamp - time) ? a : b;
}
export function analyzeSequence(result: AnalysisResult): SequenceSummary {
  const track = resultBallTrack(result),
    rate = result.ballSampleRate ?? result.sampleRate,
    step = 1 / rate;
  let trackedSeconds = 0;
  for (let i = 1; i < track.length; i++)
    if (
      track[i].segment === track[i - 1].segment &&
      track[i].timestamp - track[i - 1].timestamp <= 0.21
    )
      trackedSeconds += track[i].timestamp - track[i - 1].timestamp;
  const summary: SequenceSummary = {
    title: "Build the ball trace first",
    explanation:
      "There is not enough continuous ball and team evidence for a tactical interpretation yet. A clearer wide view or a manual ball anchor can help.",
    insights: [],
    control: { teamSeconds: [0, 0], eligibleSeconds: 0, unknownSeconds: result.source.duration },
    ball: {
      points: track.length,
      anchors: track.filter((p) => p.source === "detector").length,
      appearance: track.filter((p) => p.source === "appearance").length,
      trackedSeconds,
      segments: new Set(track.map((p) => p.segment)).size,
      coverage: Math.min(
        100,
        Math.round((trackedSeconds / Math.max(0.001, result.source.duration)) * 100),
      ),
    },
    sceneCuts: result.frames.filter((f) => f.sceneCut).length,
  };
  if (track.length < 6) return summary;
  const samples: Array<{ time: number; team: 0 | 1 | null; nearby: number; segment: number }> = [];
  const aspect = result.source.height / result.source.width;
  for (const ball of track) {
    const frame = nearbyFrame(result.frames, ball.timestamp);
    const players =
      frame && Math.abs(frame.timestamp - ball.timestamp) <= 0.35
        ? frame.detections.filter(
            (d) => d.label === "person" && d.teamId !== undefined && d.onPitch,
          )
        : [];
    const candidates = players
      .map((player) => ({
        player,
        distance: Math.hypot(
          player.x + player.width / 2 - ball.x,
          (player.y + player.height - ball.y) * aspect,
        ),
      }))
      .filter(
        ({ player, distance }) =>
          distance < Math.max(0.018, Math.min(0.065, player.height * aspect * 0.65)) &&
          ball.y >= player.y + player.height * 0.5,
      )
      .sort((a, b) => a.distance - b.distance);
    const nearest = candidates[0],
      ambiguous =
        nearest &&
        candidates[1] &&
        nearest.player.teamId !== candidates[1].player.teamId &&
        candidates[1].distance < nearest.distance * 1.35;
    const team = nearest && !ambiguous ? nearest.player.teamId! : null;
    const nearby =
      team === null
        ? 0
        : players.filter(
            (p) =>
              p.teamId !== team &&
              Math.hypot(p.x + p.width / 2 - ball.x, (p.y + p.height - ball.y) * aspect) < 0.11,
          ).length;
    samples.push({ time: ball.timestamp, team, nearby, segment: ball.segment });
  }
  const runs: Array<{
    start: number;
    end: number;
    team: 0 | 1;
    nearby: number;
    support: number;
    segment: number;
  }> = [];
  for (const sample of samples) {
    if (sample.team === null) continue;
    const run = runs.at(-1);
    if (
      run &&
      run.team === sample.team &&
      run.segment === sample.segment &&
      sample.time - run.end <= 0.2
    ) {
      run.end = sample.time;
      run.support++;
      run.nearby = Math.max(run.nearby, sample.nearby);
    } else
      runs.push({
        start: sample.time,
        end: sample.time,
        team: sample.team,
        nearby: sample.nearby,
        support: 1,
        segment: sample.segment,
      });
  }
  const stable = runs.filter((run) => run.end - run.start >= 0.33 && run.support >= 4);
  for (const run of stable) {
    const duration = run.end - run.start + step;
    summary.control.teamSeconds[run.team] += duration;
  }
  summary.control.eligibleSeconds = summary.control.teamSeconds[0] + summary.control.teamSeconds[1];
  summary.control.unknownSeconds = Math.max(
    0,
    result.source.duration - summary.control.eligibleSeconds,
  );
  let lastPressure = -Infinity;
  for (let i = 0; i < stable.length; i++) {
    const run = stable[i],
      prior = stable[i - 1];
    if (
      prior &&
      prior.team !== run.team &&
      prior.segment === run.segment &&
      run.start - prior.end < 1
    ) {
      summary.insights.push({
        time: run.start,
        end: run.end,
        kind: "transition",
        title: "Possible change of control",
        explanation: `The nearest eligible player to the tracked ball changes from Team ${prior.team === 0 ? "A" : "B"} to Team ${run.team === 0 ? "A" : "B"}, sustained across ${run.support} ball observations.`,
        verify:
          "Confirm the touch and team colors in the footage. Proximity alone does not prove possession.",
        strategyId: run.nearby >= 2 ? "counter-press" : "fast-break",
        support: run.support,
      });
    }
    const pressureSamples = samples.filter(
      (sample) =>
        sample.time >= run.start &&
        sample.time <= run.end &&
        sample.segment === run.segment &&
        sample.nearby >= 2,
    );
    const runPoints = track.filter(
      (p) => p.timestamp >= run.start && p.timestamp <= run.end && p.segment === run.segment,
    );
    const travel = runPoints.reduce(
      (sum, p, index) =>
        index
          ? sum +
            Math.hypot(
              p.x - runPoints[index - 1].x - (p.cameraX - runPoints[index - 1].cameraX),
              (p.y - runPoints[index - 1].y - (p.cameraY - runPoints[index - 1].cameraY)) * aspect,
            )
          : 0,
      0,
    );
    if (
      run.nearby >= 2 &&
      pressureSamples.length * step >= 0.5 &&
      travel > 0.015 &&
      run.end - run.start >= 0.6 &&
      run.start - lastPressure > 2
    ) {
      lastPressure = run.start;
      summary.insights.push({
        time: run.start,
        end: run.end,
        kind: "pressure",
        title: "Pressure around the ball",
        explanation: `Up to ${run.nearby} opposing color-group candidates are close to the ball-associated player across ${pressureSamples.length} ball observations in a ${(run.end - run.start).toFixed(1)}-second moving sequence.`,
        verify:
          "Check whether the players are closing space or only overlapping in the camera view.",
        strategyId: "high-press",
        support: run.support,
      });
    }
  }
  let lastSwitch = -Infinity;
  for (let i = 0; i < track.length; i++) {
    const a = track[i],
      window = track
        .slice(i)
        .filter((p) => p.timestamp <= a.timestamp + 2 && p.segment === a.segment);
    const b = window.at(-1);
    if (
      !b ||
      b.timestamp - a.timestamp < 0.7 ||
      window.filter((p) => p.source === "detector").length < 3
    )
      continue;
    const cameraReliable =
      result.frames.filter(
        (f) => f.timestamp >= a.timestamp && f.timestamp <= b.timestamp && f.camera?.reliable,
      ).length >= 2;
    const delta = b.x - b.cameraX - (a.x - a.cameraX);
    if (cameraReliable && Math.abs(delta) > 0.24 && a.timestamp - lastSwitch > 3) {
      lastSwitch = a.timestamp;
      summary.insights.push({
        time: a.timestamp,
        end: b.timestamp,
        kind: "movement",
        title: "Ball progression",
        explanation: `The ball moves ${Math.round(Math.abs(delta) * 100)}% of the image width after estimated camera translation is removed, supported by ${window.filter((p) => p.source === "detector").length} detector anchors.`,
        verify:
          "Check whether this is a carry, pass or shot. Image direction is not pitch direction; zoom and depth can affect this cue.",
        support: window.length,
      });
    }
  }
  summary.insights.sort((a, b) => a.time - b.time);
  if (summary.insights.length) {
    summary.title = `${summary.insights.length} sequence ${summary.insights.length === 1 ? "cue" : "cues"} to review`;
    summary.explanation =
      "These cues describe sustained ball movement or player proximity. Each includes its timestamp, supporting observations and a specific review question.";
  } else {
    summary.title = "Ball trace available";
    summary.explanation =
      summary.control.eligibleSeconds > 0.5
        ? `${summary.control.eligibleSeconds.toFixed(1)} seconds support a ball-control proximity estimate. No tactical cue clears the evidence gates in this clip.`
        : "The ball trace is available, but there is insufficient sustained team-control evidence to infer a tactical pattern.";
  }
  return summary;
}
export function teamForDetection(
  detection: TrackedDetection,
  teams: TeamIdentity[],
): TeamIdentity | undefined {
  return teams.find((team) => team.id === detection.teamId);
}
