"""Apply explicit track exclusions and visual-review notes without altering raw inference.

python -m pipeline.review_analysis RAW_JSON REVIEW_JSON --output REVIEWED_JSON
"""

import argparse
from copy import deepcopy
import json
import math
from pathlib import Path
from .offline.events import EVENT_TYPES


def review_analysis(raw, review):
    if raw["processing"]["sourceSha256"] != review.get("sourceSha256"):
        raise ValueError("Review source hash mismatch")
    result = deepcopy(raw)
    rejected = review.get("rejectedSegments", [])
    known = {p["segment"] for p in raw["ballTrack"]}
    if any(
        r.get("segment") not in known or not str(r.get("note", "")).strip()
        for r in rejected
    ):
        raise ValueError("Track exclusion needs a known segment and evidence note")
    rejected_ids = {r["segment"] for r in rejected}
    result["ballTrack"] = [
        p for p in raw["ballTrack"] if p["segment"] not in rejected_ids
    ]
    result["trackReview"] = dict(
        reviewer=review.get("reviewer", "Unspecified reviewer"),
        rejectedSegments=rejected,
        removedPoints=len(raw["ballTrack"]) - len(result["ballTrack"]),
    )
    events = review.get("events", [])
    for event in events:
        if (
            event.get("source") != "visual-review"
            or event.get("reviewStatus") != "accepted"
            or not event.get("reviewNote")
        ):
            raise ValueError(
                "Visual-review events require explicit provenance and evidence note"
            )
        if (
            event.get("type") not in EVENT_TYPES
            or not all(math.isfinite(event[k]) for k in ["time", "end"])
            or not 0 <= event["time"] < event["end"] <= raw["source"]["duration"]
        ):
            raise ValueError("Invalid visual-review event")
        evidence = event.get("evidenceTimes", [])
        if len(set(evidence)) < 2 or any(
            not math.isfinite(t) or t < event["time"] - 0.5 or t > event["end"] + 0.5
            for t in evidence
        ):
            raise ValueError("Event needs supporting source-frame times")
        if not event.get("title") or not event.get("explanation"):
            raise ValueError("Event needs a title and explanation")
    result["events"] = deepcopy(events)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("raw", type=Path)
    parser.add_argument("review", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = review_analysis(
        json.loads(args.raw.read_text()), json.loads(args.review.read_text())
    )
    temporary = args.output.with_suffix(".partial.json")
    temporary.write_text(json.dumps(result, separators=(",", ":")))
    temporary.replace(args.output)
