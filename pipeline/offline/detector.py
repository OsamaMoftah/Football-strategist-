"""Native ONNX inference, model-specific preprocessing and full-resolution crops."""

from pathlib import Path
import cv2
import numpy as np
import onnxruntime as ort
from .tracking import iou


class Detector:
    def __init__(self, model_root):
        options = ort.SessionOptions()
        options.intra_op_num_threads = 2
        root = Path(model_root)
        self.people = ort.InferenceSession(
            str(root / "rfdetr-nano/model_quantized.onnx"),
            options,
            providers=["CPUExecutionProvider"],
        )
        self.ball = ort.InferenceSession(
            str(root / "football-ball/model.onnx"),
            options,
            providers=["CPUExecutionProvider"],
        )

    def detect(self, frame, regions, target):
        height, width = frame.shape[:2]
        result = []
        for x, y, w, h in regions:
            left, top = max(0, round(x * width)), max(0, round(y * height))
            right, bottom = (
                min(width, round((x + w) * width)),
                min(height, round((y + h) * height)),
            )
            if right - left < 2 or bottom - top < 2:
                continue
            rgb = (
                cv2.cvtColor(
                    cv2.resize(frame[top:bottom, left:right], (384, 384)),
                    cv2.COLOR_BGR2RGB,
                ).astype(np.float32)
                / 255
            )
            if target == "ball":
                rgb = (rgb - np.array([0.485, 0.456, 0.406], np.float32)) / np.array(
                    [0.229, 0.224, 0.225], np.float32
                )
            tensor = np.ascontiguousarray(rgb.transpose(2, 0, 1)[None])
            session = self.ball if target == "ball" else self.people
            output = dict(
                zip(
                    [o.name for o in session.get_outputs()],
                    session.run(None, {session.get_inputs()[0].name: tensor}),
                )
            )
            boxes = output["dets" if target == "ball" else "pred_boxes"].reshape(-1, 4)
            logits = output["labels" if target == "ball" else "logits"].reshape(
                len(boxes), -1
            )
            scores = 1 / (1 + np.exp(-np.clip(logits, -50, 50)))
            for box, values in zip(boxes, scores):
                category = int(values.argmax())
                if target == "ball":
                    if category == 2:
                        continue
                    confidence = float(max(values[:2]))
                    threshold = 0.23
                    label = "ball"
                else:
                    if category != 1:
                        continue
                    confidence = float(values[1])
                    threshold = 0.4
                    label = "person"
                if confidence < threshold:
                    continue
                cx, cy, bw, bh = map(float, box)
                xx = max(0, (left + (cx - bw / 2) * (right - left)) / width)
                yy = max(0, (top + (cy - bh / 2) * (bottom - top)) / height)
                rr = min(1, (left + (cx + bw / 2) * (right - left)) / width)
                bb = min(1, (top + (cy + bh / 2) * (bottom - top)) / height)
                if rr <= xx or bb <= yy:
                    continue
                result.append(
                    dict(
                        label=label,
                        confidence=confidence,
                        x=xx,
                        y=yy,
                        width=rr - xx,
                        height=bb - yy,
                    )
                )
        kept = []
        for d in sorted(result, key=lambda d: -d["confidence"]):
            if not any(
                iou(d, other) > (0.3 if target == "ball" else 0.45) for other in kept
            ):
                kept.append(d)
        return kept


def ball_regions(width, height):
    side = min(512, width, height)
    xs = np.linspace(0, width - side, max(1, int(np.ceil(width / (side * 0.8)))))
    ys = np.linspace(0, height - side, max(1, int(np.ceil(height / (side * 0.8)))))
    return [(0, 0, 1, 1)] + [
        (float(x / width), float(y / height), side / width, side / height)
        for y in ys
        for x in xs
    ]


def roi(point, width, height):
    side = max(150, min(384, point["width"] * width * 25))
    w, h = min(1, side / width), min(1, side / height)
    return (
        max(0, min(1 - w, point["x"] - w / 2)),
        max(0, min(1 - h, point["y"] - h / 2)),
        w,
        h,
    )


def pitch_context(frame, x, y):
    height, width = frame.shape[:2]
    px, py = round(x * width), round(y * height)
    patch = frame[
        max(0, py - 16) : min(height, py + 17), max(0, px - 16) : min(width, px + 17)
    ]
    if not patch.size:
        return False
    b, g, r = cv2.split(patch.astype(np.float32))
    return bool(((g > r * 1.1) & (g > b * 1.08) & (g > 40)).mean() > 0.2)


def annotate_kits(frame, detections):
    height, width = frame.shape[:2]
    for d in detections:
        footx, footy = d["x"] + d["width"] / 2, d["y"] + d["height"]
        d["onPitch"] = pitch_context(frame, footx, footy)
        if not d["onPitch"]:
            continue
        x1, x2 = (
            round((d["x"] + d["width"] * 0.25) * width),
            round((d["x"] + d["width"] * 0.75) * width),
        )
        y1, y2 = (
            round((d["y"] + d["height"] * 0.18) * height),
            round((d["y"] + d["height"] * 0.52) * height),
        )
        torso = frame[max(0, y1) : min(height, y2), max(0, x1) : min(width, x2)]
        if not torso.size:
            continue
        rgb = torso[:, :, ::-1].reshape(-1, 3).astype(np.float32)
        green = (rgb[:, 1] > rgb[:, 0] * 1.1) & (rgb[:, 1] > rgb[:, 2] * 1.08)
        rgb = rgb[~green]
        if len(rgb) < 4:
            continue
        bins = (rgb // 32).astype(int)
        keys = bins[:, 0] * 64 + bins[:, 1] * 8 + bins[:, 2]
        mode = np.bincount(keys).argmax()
        d["kit"] = np.median(rgb[keys == mode], axis=0).astype(int).tolist()


def group_teams(frames):
    observations = [
        d
        for f in frames
        for d in f["detections"]
        if d["label"] == "person" and d.get("onPitch") and d.get("kit")
    ]
    if len(observations) < 8:
        return []
    colors = np.array([d["kit"] for d in observations], np.float32)
    cv2.setRNGSeed(17)
    _, labels, centers = cv2.kmeans(
        colors,
        2,
        None,
        (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 50, 0.1),
        5,
        cv2.KMEANS_PP_CENTERS,
    )
    if np.linalg.norm(centers[0] - centers[1]) < 65:
        return []
    # Track-level majority avoids changing a player's team on a single blurred crop.
    votes = {}
    for d, label in zip(observations, labels[:, 0]):
        if np.linalg.norm(np.array(d["kit"]) - centers[int(label)]) < 105:
            votes.setdefault(d["trackId"], []).append(int(label))
    stable = {
        key: int(np.mean(value) > 0.5)
        for key, value in votes.items()
        if len(value) >= 2
    }
    for d in observations:
        if d["trackId"] in stable:
            d["teamId"] = stable[d["trackId"]]
    return [
        dict(
            id=i,
            name=f"Team {'A' if i == 0 else 'B'} · color group",
            color=centers[i].astype(int).tolist(),
            samples=int((labels == i).sum()),
        )
        for i in range(2)
    ]
