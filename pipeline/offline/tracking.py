"""Timestamp-based, camera-compensated tracking with explicit measurement provenance."""

import math
import numpy as np


def center(d):
    return d["x"] + d["width"] / 2, d["y"] + d["height"] / 2


def iou(a, b):
    area = max(
        0, min(a["x"] + a["width"], b["x"] + b["width"]) - max(a["x"], b["x"])
    ) * max(0, min(a["y"] + a["height"], b["y"] + b["height"]) - max(a["y"], b["y"]))
    return area / max(1e-9, a["width"] * a["height"] + b["width"] * b["height"] - area)


class PlayerTracker:
    def __init__(self, aspect=0.5625):
        self.aspect = aspect
        self.tracks = {}
        self.next_id = 1

    def reset(self):
        self.tracks.clear()

    def update(self, detections, timestamp, shift=(0, 0)):
        from scipy.optimize import linear_sum_assignment

        self.tracks = {
            k: v for k, v in self.tracks.items() if timestamp - v["seen"] <= 0.8
        }
        ids = list(self.tracks)
        predicted = [
            {
                **self.tracks[k]["box"],
                "x": self.tracks[k]["box"]["x"] + shift[0],
                "y": self.tracks[k]["box"]["y"] + shift[1],
            }
            for k in ids
        ]
        costs = np.full((len(ids), len(detections)), 1e6)
        for i, old in enumerate(predicted):
            for j, new in enumerate(detections):
                a, b = center(old), center(new)
                distance = math.hypot(a[0] - b[0], (a[1] - b[1]) * self.aspect)
                if distance > max(0.04, old["height"] * 0.6):
                    continue
                color = (
                    np.linalg.norm(
                        np.array(old.get("kit", [128] * 3))
                        - np.array(new.get("kit", [128] * 3))
                    )
                    / 442
                )
                costs[i, j] = 0.7 * (1 - iou(old, new)) + distance * 4 + color * 0.45
        assignments = {}
        if costs.size:
            rows, cols = linear_sum_assignment(costs)
            assignments = {j: ids[i] for i, j in zip(rows, cols) if costs[i, j] < 1.15}
        result = []
        for j, detection in enumerate(detections):
            track_id = assignments.get(j)
            if track_id is None:
                track_id = self.next_id
                self.next_id += 1
            measured = {**detection, "trackId": int(track_id)}
            self.tracks[track_id] = {"box": dict(measured), "seen": timestamp}
            result.append(measured)
        for i, track_id in enumerate(ids):
            if track_id not in assignments.values():
                self.tracks[track_id]["box"] = predicted[i]
        return result


class BallTracker:
    def __init__(self, width, height):
        self.width, self.height = width, height
        self.segment = 0
        self.last = self.prior = None
        self.last_anchor = -math.inf

    def reset(self):
        self.last = self.prior = None
        self.last_anchor = -math.inf

    def prediction(self, time, camera=(0, 0)):
        if not self.last:
            return None
        p = self.last
        dt = time - p["timestamp"]
        vx = vy = 0
        if self.prior and p["timestamp"] > self.prior["timestamp"]:
            q = self.prior
            elapsed = p["timestamp"] - q["timestamp"]
            vx = np.clip(
                (p["x"] - q["x"] - p["cameraX"] + q["cameraX"]) / elapsed, -1.2, 1.2
            )
            vy = np.clip(
                (p["y"] - q["y"] - p["cameraY"] + q["cameraY"]) / elapsed, -1.2, 1.2
            )
        return p["x"] + camera[0] - p["cameraX"] + vx * dt, p["y"] + camera[1] - p[
            "cameraY"
        ] + vy * dt

    def update(
        self, candidates, time, camera=(0, 0), cut=False, manual=None, appearance=None
    ):
        if (
            cut
            or (self.last and time - self.last["timestamp"] > 0.22)
            or time - self.last_anchor > 0.35
        ):
            self.reset()
        if manual is not None:
            self.reset()
            self.segment += 1
            point = dict(
                timestamp=time,
                x=float(manual[0]),
                y=float(manual[1]),
                width=8 / self.width,
                height=8 / self.height,
                confidence=1.0,
                segment=self.segment,
                source="manual",
                cameraX=camera[0],
                cameraY=camera[1],
            )
            self.last = point
            self.last_anchor = time
            return point
        prediction = self.prediction(time, camera)
        best = None
        best_score = -math.inf
        dt = time - self.last["timestamp"] if self.last else 0
        for d in candidates:
            w, h = d["width"] * self.width, d["height"] * self.height
            if (
                d["label"] != "ball"
                or d["confidence"] < (0.22 if self.last else 0.35)
                or min(w, h) < 2
                or d["width"] > 0.06
                or d["height"] > 0.08
                or not 0.3 < w / max(1, h) < 3.5
            ):
                continue
            x, y = center(d)
            distance = (
                math.hypot(
                    x - prediction[0], (y - prediction[1]) * self.height / self.width
                )
                if prediction
                else 0
            )
            if prediction and distance > min(0.18, 0.018 + dt * 1.2):
                continue
            score = d["confidence"] - distance * 4
            if score > best_score:
                best, best_score = d, score
        if best:
            if self.last is None:
                self.segment += 1
            x, y = center(best)
            point = dict(
                timestamp=time,
                x=x,
                y=y,
                width=best["width"],
                height=best["height"],
                confidence=best["confidence"],
                segment=self.segment,
                source="detector",
                cameraX=camera[0],
                cameraY=camera[1],
            )
            self.last_anchor = time
        elif appearance and self.last and time - self.last_anchor <= 0.18:
            point = {
                **self.last,
                **appearance,
                "timestamp": time,
                "source": "appearance",
                "cameraX": camera[0],
                "cameraY": camera[1],
            }
        else:
            return None
        self.prior, self.last = self.last, point
        return point


def validate_camera(previous, current):
    """Estimate camera translation/scale from robust tracked background features."""
    import cv2

    def small(frame):
        return cv2.resize(frame, (640, round(frame.shape[0] * 640 / frame.shape[1])))

    a, b = small(previous), small(current)
    hist_a = cv2.calcHist([a], [0], None, [32], [0, 256])
    hist_b = cv2.calcHist([b], [0], None, [32], [0, 256])
    change = float(np.abs(hist_a / hist_a.sum() - hist_b / hist_b.sum()).sum())
    mask = np.zeros(a.shape, np.uint8)
    mask[int(a.shape[0] * 0.18) : int(a.shape[0] * 0.95)] = 255
    points = cv2.goodFeaturesToTrack(a, 250, 0.025, 10, mask=mask)
    fallback = dict(
        x=0.0, y=0.0, scale=1.0, reliable=False, cut=change > 0.8, inliers=0
    )
    if points is None or len(points) < 8:
        return fallback
    moved, good, _ = cv2.calcOpticalFlowPyrLK(
        a, b, points, None, winSize=(21, 21), maxLevel=3
    )
    if moved is None:
        return fallback
    valid = good[:, 0] == 1
    if valid.sum() < 8:
        return fallback
    affine, inliers = cv2.estimateAffinePartial2D(
        points[valid],
        moved[valid],
        method=cv2.RANSAC,
        ransacReprojThreshold=2,
        maxIters=1000,
    )
    if affine is None:
        return fallback
    n = int(inliers.sum())
    scale = float(math.hypot(affine[0, 0], affine[1, 0]))
    reliable = n >= 10 and n / valid.sum() > 0.45 and 0.94 < scale < 1.06
    return dict(
        x=float(affine[0, 2] / 640) if reliable else 0.0,
        y=float(affine[1, 2] / a.shape[0]) if reliable else 0.0,
        scale=scale,
        reliable=bool(reliable),
        cut=bool(change > 0.8 or (change > 0.4 and n / valid.sum() < 0.2)),
        inliers=n,
    )


def follow_patch(previous, current, last, time, prediction):
    import cv2

    if not last or not prediction:
        return None
    h, w = current.shape
    x, y = round(last["x"] * w), round(last["y"] * h)
    radius = max(4, min(10, round(last["width"] * w * 0.65)))
    if x - radius < 0 or y - radius < 0 or x + radius >= w or y + radius >= h:
        return None
    template = previous[y - radius : y + radius + 1, x - radius : x + radius + 1]
    if template.std() < 8:
        return None
    px, py = round(prediction[0] * w), round(prediction[1] * h)
    search = max(18, round(w * 0.025))
    left, top = max(0, px - search), max(0, py - search)
    region = current[top : min(h, py + search + 1), left : min(w, px + search + 1)]
    if region.shape[0] < template.shape[0] or region.shape[1] < template.shape[1]:
        return None
    scores = cv2.matchTemplate(region, template, cv2.TM_CCOEFF_NORMED)
    _, score, _, location = cv2.minMaxLoc(scores)
    if score < 0.8:
        return None
    return dict(
        x=(left + location[0] + radius) / w,
        y=(top + location[1] + radius) / h,
        confidence=min(last["confidence"], float(score)) * 0.98,
    )
