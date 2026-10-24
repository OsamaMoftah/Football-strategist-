"""Render measured tracking JSON onto its matching source clip (silent H.264 MP4)."""

import argparse
import bisect
import hashlib
import json
import math
from pathlib import Path
import subprocess
import cv2


def render(video, analysis, output, credit=""):
    result = json.loads(analysis.read_text())
    with video.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if result.get("processing", {}).get("sourceSha256") != digest:
        raise ValueError("Analysis source hash does not match this video")
    capture = cv2.VideoCapture(str(video))
    fps = capture.get(cv2.CAP_PROP_FPS)
    width, height = result["source"]["width"], result["source"]["height"]
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(output.stem + ".partial.mp4")
    process = subprocess.Popen(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "bgr24",
            "-s",
            f"{width}x{height}",
            "-r",
            str(fps),
            "-i",
            "pipe:0",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(temporary),
        ],
        stdin=subprocess.PIPE,
    )
    frames = result["frames"]
    times = [f["timestamp"] for f in frames]
    track = result.get("ballTrack", [])
    ball_times = [p["timestamp"] for p in track]
    events = [
        e
        for e in result.get("events", [])
        if e["reviewStatus"] in ["accepted", "corrected"] and e.get("reviewNote")
    ]
    index = 0
    try:
        while True:
            ok, image = capture.read()
            if not ok:
                break
            t = index / fps
            index += 1
            fi = max(0, min(len(frames) - 1, bisect.bisect_right(times, t) - 1))
            frame = frames[fi]
            if abs(frame["timestamp"] - t) < 1.5 / result["sampleRate"]:
                for d in frame["detections"]:
                    if d["label"] != "person" or d.get("onPitch") is False:
                        continue
                    x, y, w, h = [
                        round(d[k] * n)
                        for k, n in [
                            ("x", width),
                            ("y", height),
                            ("width", width),
                            ("height", height),
                        ]
                    ]
                    color = (255, 185, 110)
                    cv2.ellipse(
                        image,
                        (x + w // 2, y + h),
                        (max(4, w // 3), 3),
                        0,
                        0,
                        360,
                        (245, 245, 245),
                        3,
                        cv2.LINE_AA,
                    )
                    cv2.ellipse(
                        image,
                        (x + w // 2, y + h),
                        (max(4, w // 3), 3),
                        0,
                        0,
                        360,
                        color,
                        1,
                        cv2.LINE_AA,
                    )
            bi = bisect.bisect_left(ball_times, t)
            nearby = track[max(0, bi - 1) : bi + 1]
            head = (
                min(nearby, key=lambda p: abs(p["timestamp"] - t)) if nearby else None
            )
            if head and abs(head["timestamp"] - t) <= 1.5 / fps:
                history = [
                    p
                    for p in track
                    if t - 0.65 <= p["timestamp"] <= t
                    and p["segment"] == head["segment"]
                ]
                for a, b in zip(history, history[1:]):
                    if b["timestamp"] - a["timestamp"] > 0.2:
                        continue
                    alpha = max(0, 1 - (t - b["timestamp"]) / 0.65)

                    def xy(point):
                        return (
                            round(
                                (point["x"] + head["cameraX"] - point["cameraX"])
                                * width
                            ),
                            round(
                                (point["y"] + head["cameraY"] - point["cameraY"])
                                * height
                            ),
                        )

                    layer = image.copy()
                    if b["source"] == "appearance":
                        start, end = xy(a), xy(b)
                        steps = max(1, math.ceil(math.dist(start, end) / 6))
                        for step in range(0, steps, 2):
                            amount = step / steps
                            cv2.circle(
                                layer,
                                (
                                    round(start[0] + (end[0] - start[0]) * amount),
                                    round(start[1] + (end[1] - start[1]) * amount),
                                ),
                                2,
                                (235, 99, 37),
                                -1,
                                cv2.LINE_AA,
                            )
                    else:
                        cv2.line(
                            layer,
                            xy(a),
                            xy(b),
                            (235, 99, 37),
                            max(1, round(alpha * 4)),
                            cv2.LINE_AA,
                        )
                    cv2.addWeighted(layer, alpha, image, 1 - alpha, 0, image)
                point = (round(head["x"] * width), round(head["y"] * height))
                cv2.circle(image, point, 10, (35, 25, 15), 4, cv2.LINE_AA)
                cv2.circle(image, point, 10, (54, 207, 255), 2, cv2.LINE_AA)
            active = next(
                (e for e in events if e["time"] <= round(t, 3) < e["end"]), None
            )
            cv2.rectangle(image, (20, 18), (680, 82), (245, 245, 240), -1)
            cv2.putText(
                image,
                f"FOOTBALL STRATEGIST    {t:05.2f}s",
                (34, 43),
                0,
                0.6,
                (42, 32, 25),
                1,
                cv2.LINE_AA,
            )
            cv2.putText(
                image,
                active["title"]
                if active
                else "Measured tracks / unresolved gaps retained",
                (34, 67),
                0,
                0.53,
                (155, 75, 25),
                1,
                cv2.LINE_AA,
            )
            if credit:
                cv2.rectangle(
                    image, (0, height - 30), (width, height), (25, 25, 25), -1
                )
                cv2.putText(
                    image,
                    credit,
                    (14, height - 10),
                    0,
                    0.45,
                    (240, 240, 240),
                    1,
                    cv2.LINE_AA,
                )
            process.stdin.write(image.tobytes())
        process.stdin.close()
        if process.wait() != 0:
            raise RuntimeError("FFmpeg export failed")
        if index == 0:
            raise ValueError("No video frames decoded")
        temporary.replace(output)
        return dict(frames=index, fps=fps, path=str(output))
    finally:
        capture.release()
        if process.poll() is None:
            process.terminate()
            process.wait()
        temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("analysis", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--credit", default="")
    args = parser.parse_args()
    print(json.dumps(render(args.video, args.analysis, args.output, args.credit)))
