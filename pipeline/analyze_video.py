"""Run native CV and export a browser-compatible measured result.

python -m pipeline.analyze_video VIDEO --output DIRECTORY [--corrections anchors.json]
"""

import argparse
import hashlib
import json
import math
from pathlib import Path
import time
import cv2
from .offline.detector import (
    Detector,
    ball_regions,
    roi,
    pitch_context,
    annotate_kits,
    group_teams,
)
from .offline.tracking import BallTracker, PlayerTracker, validate_camera, follow_patch


def sha256(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def analyze(
    source, output, model_root, corrections=None, seconds=None, player_stride=3
):
    output.mkdir(parents=True, exist_ok=True)
    capture = cv2.VideoCapture(str(source))
    if not capture.isOpened():
        raise ValueError("Video cannot be decoded")
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if not math.isfinite(fps) or fps <= 0 or width <= 0 or height <= 0:
        raise ValueError("Invalid media metadata")
    count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    limit = min(count, round(seconds * fps)) if seconds else count
    if limit <= 0:
        raise ValueError("Video has no frames")
    for anchor in corrections or []:
        if not all(
            math.isfinite(float(anchor[k])) for k in ["timestamp", "x", "y"]
        ) or not (
            0 <= anchor["timestamp"] < limit / fps
            and 0 <= anchor["x"] <= 1
            and 0 <= anchor["y"] <= 1
        ):
            raise ValueError("Invalid manual anchor")
    detector = Detector(model_root)
    ball = BallTracker(width, height)
    people = PlayerTracker(height / width)
    anchors = {round(a["timestamp"] * fps): (a["x"], a["y"]) for a in corrections or []}
    frames = []
    track = []
    motion_frames = []
    previous = None
    camera = [0.0, 0.0]
    player_camera = [0.0, 0.0]
    pending_cut = False
    regions = ball_regions(width, height)
    person_regions = [
        (0, 0, 1, 1),
        (0, 0, 0.55, 0.55),
        (0.45, 0, 0.55, 0.55),
        (0, 0.45, 0.55, 0.55),
        (0.45, 0.45, 0.55, 0.55),
    ]
    start = time.perf_counter()
    try:
        for index in range(limit):
            ok, image = capture.read()
            if not ok:
                break
            timestamp = index / fps
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            motion = (
                validate_camera(previous, gray)
                if previous is not None
                else dict(x=0.0, y=0.0, scale=1.0, reliable=False, cut=False, inliers=0)
            )
            if motion["cut"]:
                ball.reset()
                people.reset()
                camera = [0.0, 0.0]
                player_camera = [0.0, 0.0]
                pending_cut = True
            else:
                camera = [camera[0] + motion["x"], camera[1] + motion["y"]]
            motion_frames.append(dict(timestamp=timestamp, **motion))
            last = ball.last
            search = (
                regions
                if index % 3 == 0 or last is None
                else [roi(last, width, height)]
            )
            candidates = (
                detector.detect(image, search, "ball") if last or index % 3 == 0 else []
            )
            if last is None:
                candidates = [
                    d
                    for d in candidates
                    if pitch_context(
                        image, d["x"] + d["width"] / 2, d["y"] + d["height"] / 2
                    )
                ]
            appearance = (
                follow_patch(
                    previous, gray, last, timestamp, ball.prediction(timestamp, camera)
                )
                if previous is not None and last and not motion["cut"]
                else None
            )
            point = ball.update(
                candidates,
                timestamp,
                camera=tuple(camera),
                cut=motion["cut"],
                manual=anchors.get(index),
                appearance=appearance,
            )
            if point:
                track.append(point)
            if index % player_stride == 0:
                detections = detector.detect(image, person_regions, "people")
                annotate_kits(image, detections)
                detections = people.update(
                    detections,
                    timestamp,
                    shift=(camera[0] - player_camera[0], camera[1] - player_camera[1]),
                )
                player_camera = list(camera)
                for j, d in enumerate(candidates):
                    detections.append({**d, "trackId": 1000000 + index * 100 + j})
                frames.append(
                    dict(
                        timestamp=timestamp,
                        detections=detections,
                        camera=dict(
                            x=camera[0], y=camera[1], reliable=motion["reliable"]
                        ),
                        sceneCut=pending_cut,
                    )
                )
                pending_cut = False
            previous = gray
            if index % 30 == 0:
                print(
                    json.dumps(
                        dict(
                            frame=index,
                            total=limit,
                            seconds=round(timestamp, 2),
                            ballPoints=len(track),
                            elapsed=round(time.perf_counter() - start, 1),
                        )
                    ),
                    flush=True,
                )
        if previous is None:
            raise ValueError("No video frames decoded")
        teams = group_teams(frames)
        valid = {
            segment
            for segment in {p["segment"] for p in track}
            if sum(p["source"] == "detector" for p in track if p["segment"] == segment)
            >= 3
            or any(p["source"] == "manual" for p in track if p["segment"] == segment)
        }
        track = [p for p in track if p["segment"] in valid]
        result = dict(
            schemaVersion=1,
            pipelineVersion=3,
            source=dict(
                name=source.name,
                size=source.stat().st_size,
                lastModified=int(source.stat().st_mtime * 1000),
                width=width,
                height=height,
                duration=min(limit, index + 1) / fps,
            ),
            model="RF-DETR Nano · COCO · int8",
            ballModel="Futheros football RF-DETR Nano · int8",
            coordinateSpace="normalized-image",
            sampleRate=fps / player_stride,
            ballSampleRate=fps,
            elapsedMs=(time.perf_counter() - start) * 1000,
            frames=frames,
            ballTrack=track,
            teams=teams,
            analysisWarnings=[
                "Image-space tracks, not calibrated pitch coordinates. Camera compensation is approximate. Team colors are not confirmed identities."
            ],
            summary=dict(
                personTrackSegments=len(
                    {
                        d["trackId"]
                        for f in frames
                        for d in f["detections"]
                        if d["label"] == "person"
                    }
                ),
                framesWithPeople=sum(
                    any(d["label"] == "person" for d in f["detections"]) for f in frames
                ),
                framesWithBall=sum(
                    any(d["label"] == "ball" for d in f["detections"]) for f in frames
                ),
                totalDetections=sum(len(f["detections"]) for f in frames),
            ),
            processing=dict(
                engine="python-onnx-opencv",
                sourceSha256=sha256(source),
                sourceFps=fps,
                framesProcessed=index + 1,
                playerStride=player_stride,
                modelHashes={
                    str(path.relative_to(model_root)): sha256(path)
                    for path in [
                        model_root / "football-ball/model.onnx",
                        model_root / "rfdetr-nano/model_quantized.onnx",
                    ]
                },
            ),
        )
        (output / "analysis.partial.json").write_text(
            json.dumps(result, separators=(",", ":"))
        )
        (output / "analysis.partial.json").replace(output / "analysis.json")
        (output / "camera.json").write_text(
            json.dumps(motion_frames, separators=(",", ":"))
        )
        print(
            json.dumps(
                dict(
                    done=True,
                    frames=result["processing"]["framesProcessed"],
                    ballPoints=len(track),
                    elapsed=result["elapsedMs"] / 1000,
                )
            ),
            flush=True,
        )
        return result
    finally:
        capture.release()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--models",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "public/models",
    )
    parser.add_argument("--corrections", type=Path)
    parser.add_argument("--seconds", type=float)
    parser.add_argument("--player-stride", type=int, default=3)
    args = parser.parse_args()
    if args.player_stride < 1:
        parser.error("player stride must be positive")
    corrections = json.loads(args.corrections.read_text()) if args.corrections else None
    analyze(
        args.video,
        args.output,
        args.models,
        corrections,
        args.seconds,
        args.player_stride,
    )
