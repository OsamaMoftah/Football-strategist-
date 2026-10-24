"""Evaluate source-pixel ball labels without treating missing or ambiguous labels as hits."""

import argparse
import json
import math
from pathlib import Path


def evaluate(result, labels, tolerance=12):
    if labels["sourceSha256"] != result["processing"]["sourceSha256"]:
        raise ValueError("Label source hash mismatch")
    width, height = result["source"]["width"], result["source"]["height"]
    measurements = []
    for label in labels["frames"]:
        if label["visibility"] != "visible":
            measurements.append(dict(frame=label["frame"], status="excluded-ambiguous"))
            continue
        time = label["frame"] / result["processing"]["sourceFps"]
        point = min(
            result["ballTrack"], key=lambda p: abs(p["timestamp"] - time), default=None
        )
        if (
            not point
            or abs(point["timestamp"] - time) > 0.5 / result["processing"]["sourceFps"]
        ):
            measurements.append(dict(frame=label["frame"], status="missed"))
            continue
        error = math.hypot(
            point["x"] * width - label["x"], point["y"] * height - label["y"]
        )
        measurements.append(
            dict(
                frame=label["frame"],
                status="within-tolerance"
                if error <= tolerance
                else "outside-tolerance",
                errorPixels=round(error, 2),
            )
        )
    return dict(
        tolerancePixels=tolerance,
        labelMethod=labels["method"],
        measurements=measurements,
        visible=sum(label["visibility"] == "visible" for label in labels["frames"]),
        localized=sum(m["status"] == "within-tolerance" for m in measurements),
        missed=sum(m["status"] == "missed" for m in measurements),
        outsideTolerance=sum(m["status"] == "outside-tolerance" for m in measurements),
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("analysis", type=Path)
    parser.add_argument("labels", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = evaluate(
        json.loads(args.analysis.read_text()), json.loads(args.labels.read_text())
    )
    args.output.write_text(json.dumps(result, indent=2))
    print(json.dumps(result))
