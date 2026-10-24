import { intersectionOverUnion } from "./postprocess";
import type { Detection, TrackedDetection } from "./types";

/** Greedy spatial association; IDs describe visible tracks, not player identities. */
export class Tracker {
  private nextId = 1;
  private tracks: Array<TrackedDetection & { seen: number }> = [];
  reset() {
    this.tracks = [];
  }
  update(detections: Detection[], timestamp: number): TrackedDetection[] {
    this.tracks = this.tracks.filter(
      (track) => timestamp - track.seen <= 0.7 && timestamp >= track.seen,
    );
    const used = new Set<number>();
    const result = detections.map((detection) => {
      let best: (typeof this.tracks)[number] | undefined,
        bestScore = -Infinity;
      for (const track of this.tracks) {
        if (used.has(track.trackId) || track.label !== detection.label) continue;
        const overlap = intersectionOverUnion(track, detection);
        const distance = Math.hypot(
          track.x + track.width / 2 - detection.x - detection.width / 2,
          track.y + track.height / 2 - detection.y - detection.height / 2,
        );
        const gate = Math.max(0.015, Math.min(0.055, detection.height * 0.4));
        if (overlap < 0.08 && distance > gate) continue;
        const score = overlap - distance * 2;
        if (score > bestScore) {
          best = track;
          bestScore = score;
        }
      }
      const trackId = best?.trackId ?? this.nextId++;
      used.add(trackId);
      return { ...detection, trackId };
    });
    this.tracks = [
      ...this.tracks.filter((t) => !used.has(t.trackId)),
      ...result.map((d) => ({ ...d, seen: timestamp })),
    ];
    return result;
  }
}
