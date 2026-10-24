export type SampleTeam = "home" | "away";

export interface SamplePlayer {
  id: number;
  name: string;
  num: number;
  team: SampleTeam;
  x: number;
  y: number;
  speed_kmh?: number;
}

export interface SampleBall {
  x: number;
  y: number;
  speed_kmh: number;
  height_m?: number;
}

export interface SampleOffside {
  is_offside: boolean;
  margin_cm: number;
  offside_line_x: number;
  second_last_defender_id?: number | null;
  attacker_id?: number | null;
}

export interface ImageDetection {
  id: number;
  team: SampleTeam;
  label: string;
  /** Normalized top-left corner and size in the source video frame. */
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}

export interface SampleFrame {
  frame_idx: number;
  timestamp: number;
  ball: SampleBall;
  offside: SampleOffside;
  home_players: SamplePlayer[];
  away_players: SamplePlayer[];
  /** Populated only when detections are calibrated to a specific source video. */
  image_detections?: ImageDetection[];
  /** Normalized source-frame ball center, when video-aligned tracking exists. */
  image_ball?: { x: number; y: number };
}

export interface SampleEvent {
  time: number;
  type: string;
  desc: string;
  xT?: number;
}

export interface MatchSample {
  match: string;
  stadium?: string;
  pitch_size_m: [number, number];
  fps: number;
  duration_sec: number;
  data_status?: "synthetic" | "measured";
  video_alignment?: {
    video_name: string;
    calibrated: boolean;
  } | null;
  events: SampleEvent[];
  frames: SampleFrame[];
}

export interface InterpolatedFrame {
  timestamp: number;
  ball: SampleBall;
  offside: SampleOffside;
  players: SamplePlayer[];
  image_detections?: ImageDetection[];
  image_ball?: { x: number; y: number };
}

const lerp = (a: number, b: number, amount: number) => a + (b - a) * amount;

export function getInterpolatedFrame(sample: MatchSample, timeSec: number): InterpolatedFrame {
  const frames = sample.frames;
  if (frames.length === 0) {
    throw new Error("The sample tracking file contains no frames.");
  }

  const time = Math.min(Math.max(timeSec, 0), sample.duration_sec);
  let low = 0;
  let high = frames.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (frames[middle].timestamp < time) low = middle + 1;
    else high = middle;
  }

  const nextIndex = low;
  const previousIndex = Math.max(0, nextIndex - 1);
  const previous = frames[previousIndex];
  const next = frames[nextIndex];
  const span = next.timestamp - previous.timestamp;
  const amount = span > 0 ? Math.min(1, Math.max(0, (time - previous.timestamp) / span)) : 0;
  const nextPlayers = new Map(
    [...next.home_players, ...next.away_players].map((player) => [
      `${player.team}-${player.id}`,
      player,
    ]),
  );
  const players = [...previous.home_players, ...previous.away_players].map((player) => {
    const target = nextPlayers.get(`${player.team}-${player.id}`) ?? player;
    return {
      ...player,
      x: lerp(player.x, target.x, amount),
      y: lerp(player.y, target.y, amount),
      speed_kmh:
        player.speed_kmh === undefined && target.speed_kmh === undefined
          ? undefined
          : lerp(player.speed_kmh ?? 0, target.speed_kmh ?? player.speed_kmh ?? 0, amount),
    };
  });

  return {
    timestamp: time,
    ball: {
      ...previous.ball,
      x: lerp(previous.ball.x, next.ball.x, amount),
      y: lerp(previous.ball.y, next.ball.y, amount),
      speed_kmh: lerp(previous.ball.speed_kmh, next.ball.speed_kmh, amount),
      height_m: lerp(previous.ball.height_m ?? 0, next.ball.height_m ?? 0, amount),
    },
    offside: {
      ...previous.offside,
      margin_cm: lerp(previous.offside.margin_cm, next.offside.margin_cm, amount),
      offside_line_x: lerp(previous.offside.offside_line_x, next.offside.offside_line_x, amount),
      is_offside: lerp(previous.offside.margin_cm, next.offside.margin_cm, amount) < -0.1,
    },
    players,
    image_detections: amount < 0.5 ? previous.image_detections : next.image_detections,
    image_ball: interpolateImagePoint(previous.image_ball, next.image_ball, amount),
  };
}

function interpolateImagePoint(
  previous: { x: number; y: number } | undefined,
  next: { x: number; y: number } | undefined,
  amount: number,
) {
  if (!previous || !next) return amount < 0.5 ? previous : next;
  return { x: lerp(previous.x, next.x, amount), y: lerp(previous.y, next.y, amount) };
}

export function getSampleIndex(sample: MatchSample, timeSec: number): number {
  const time = Math.min(Math.max(timeSec, 0), sample.duration_sec);
  let low = 0;
  let high = sample.frames.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (sample.frames[middle].timestamp < time) low = middle + 1;
    else high = middle;
  }
  return low;
}

export function computeTerritoryShare(
  players: SamplePlayer[],
  homeTeam: SampleTeam = "home",
): number {
  const home = players.filter((player) => player.team === homeTeam);
  const away = players.filter((player) => player.team !== homeTeam);
  if (home.length === 0 || away.length === 0) return 50;

  let homeCells = 0;
  const xSamples = 18;
  const ySamples = 12;
  for (let yi = 0; yi < ySamples; yi += 1) {
    for (let xi = 0; xi < xSamples; xi += 1) {
      const x = (xi / (xSamples - 1)) * 105;
      const y = (yi / (ySamples - 1)) * 68;
      const nearest = (team: SamplePlayer[]) =>
        Math.min(...team.map((p) => (p.x - x) ** 2 + (p.y - y) ** 2));
      if (nearest(home) < nearest(away)) homeCells += 1;
    }
  }
  return (homeCells / (xSamples * ySamples)) * 100;
}

export function computeSpatialThreatGain(start: SampleBall, end: SampleBall): number {
  const threat = (ball: SampleBall) => {
    const distance = Math.hypot(105 - ball.x, 34 - ball.y);
    const progress = Math.max(0, 1 - distance / 105);
    const centrality = 1 - (Math.abs(ball.y - 34) / 34) * 0.3;
    return progress ** 2.2 * centrality * 0.75;
  };
  return Math.max(0, threat(end) - threat(start));
}

export function formatSampleTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const wholeSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  const centiseconds = Math.floor((seconds % 1) * 100)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${wholeSeconds}.${centiseconds}`;
}
