"""Bounded, ephemeral native-inference jobs. No shared upload filenames or public files."""

from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
import hmac
import json
import math
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import threading
import time


@dataclass(frozen=True)
class Limits:
    max_bytes: int = 100 * 1024 * 1024
    max_seconds: int = 30
    max_jobs: int = 2
    max_stored: int = 16
    ttl_seconds: int = 3600
    runtime_seconds: int = 1200


@dataclass
class Job:
    id: str
    token: str
    name: str
    created: float = field(default_factory=time.time)
    status: str = "uploading"
    completed: int = 0
    total: int = 0
    error: str | None = None
    process: subprocess.Popen | None = field(default=None, repr=False)


class Jobs:
    def __init__(self, root, limits=None, command=None, validate=None):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.limits = limits or Limits()
        self.command = command or (
            lambda directory: [
                sys.executable,
                "-m",
                "pipeline.analyze_video",
                str(directory / "source.mp4"),
                "--output",
                str(directory),
            ]
        )
        self.validate = validate or self.validate_media
        self.jobs = {}
        self.lock = threading.RLock()
        self.pool = ThreadPoolExecutor(max_workers=1)

    def reserve(self, name):
        with self.lock:
            self.expire()
            active = sum(
                j.status in {"uploading", "receiving", "queued", "running"}
                for j in self.jobs.values()
            )
            if (
                active >= self.limits.max_jobs
                or len(self.jobs) >= self.limits.max_stored
            ):
                raise RuntimeError(
                    "The native queue is full. Try again after a job finishes or expires."
                )
            job = Job(secrets.token_hex(16), secrets.token_urlsafe(32), str(name)[:120])
            (self.root / job.id).mkdir(mode=0o700)
            self.jobs[job.id] = job
            return job

    def authorized(self, job_id, authorization):
        with self.lock:
            job = self.jobs.get(job_id)
            return (
                job
                if job
                and hmac.compare_digest(authorization or "", f"Bearer {job.token}")
                else None
            )

    def status(self, job):
        with self.lock:
            return dict(
                id=job.id,
                status=job.status,
                completed=job.completed,
                total=job.total,
                error=job.error,
            )

    def start(self, job):
        with self.lock:
            if job.status != "receiving":
                raise RuntimeError("Upload is no longer active")
            job.status = "queued"
            self.pool.submit(self.run, job)

    def validate_media(self, path):
        import cv2

        capture = cv2.VideoCapture(str(path))
        try:
            fps = capture.get(cv2.CAP_PROP_FPS)
            count = capture.get(cv2.CAP_PROP_FRAME_COUNT)
            width, height = (
                capture.get(cv2.CAP_PROP_FRAME_WIDTH),
                capture.get(cv2.CAP_PROP_FRAME_HEIGHT),
            )
            if not capture.isOpened() or not all(
                math.isfinite(v) and v > 0 for v in [fps, count, width, height]
            ):
                raise ValueError(
                    "The server could not decode this clip. Use an H.264 MP4 or WebM."
                )
            if count / fps > self.limits.max_seconds + 0.05:
                raise ValueError(
                    f"Native analysis supports clips up to {self.limits.max_seconds} seconds."
                )
            if width * height > 1920 * 1080 or max(width, height) > 1920 or fps > 60.1:
                raise ValueError(
                    "Use a clip up to 1920×1080 and 60 FPS for native analysis."
                )
            ok, _ = capture.read()
            if not ok:
                raise ValueError("The clip contains no decodable frames.")
        finally:
            capture.release()

    def run(self, job):
        directory = self.root / job.id
        source = directory / "source.mp4"
        timer = None
        try:
            with self.lock:
                if job.status != "queued":
                    return
            self.validate(source)
            with self.lock:
                if job.status != "queued":
                    return
                job.status = "running"
                job.process = subprocess.Popen(
                    self.command(directory),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                )
                process = job.process
            timer = threading.Timer(
                self.limits.runtime_seconds,
                self.cancel,
                args=(job, "Native processing timed out. Try a shorter clip."),
            )
            timer.daemon = True
            timer.start()
            with (directory / "worker.log").open("w") as log:
                for line in process.stdout:
                    log.write(line[:4096])
                    try:
                        progress = json.loads(line)
                        if "frame" in progress and "total" in progress:
                            with self.lock:
                                job.completed = int(progress["frame"])
                                job.total = int(progress["total"])
                    except (ValueError, TypeError, KeyError):
                        pass
            code = process.wait()
            with self.lock:
                if job.status != "running":
                    return
                if code != 0 or not (directory / "analysis.json").exists():
                    raise RuntimeError(
                        "Native inference failed. Try a shorter, decodable clip."
                    )
                result = json.loads((directory / "analysis.json").read_text())
                if result.get("schemaVersion") != 1:
                    raise RuntimeError("The engine produced an invalid result.")
                source.unlink(missing_ok=True)
                job.status = "complete"
                job.completed = job.total
        except Exception as error:
            source.unlink(missing_ok=True)
            with self.lock:
                if job.status not in {"cancelled", "failed"}:
                    job.status = "failed"
                    job.error = (
                        str(error)
                        if isinstance(error, (ValueError, RuntimeError))
                        else "Native processing failed. Try another clip."
                    )
            (directory / "analysis.json").unlink(missing_ok=True)
        finally:
            if timer:
                timer.cancel()
            process = job.process
            if process and process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
            source.unlink(missing_ok=True)
            (directory / "worker.log").unlink(missing_ok=True)
            with self.lock:
                job.process = None

    def cancel(self, job, error=None):
        with self.lock:
            process = job.process
            job.status = "failed" if error else "cancelled"
            job.error = error
            if process and process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
            shutil.rmtree(self.root / job.id, ignore_errors=True)
            return self.status(job)

    def expire(self, now=None):
        with self.lock:
            expired = [
                job
                for job in self.jobs.values()
                if (now or time.time()) - job.created
                > (
                    min(120, self.limits.ttl_seconds)
                    if job.status in {"uploading", "receiving"}
                    else self.limits.ttl_seconds
                )
            ]
            for job in expired:
                self.cancel(job)
                self.jobs.pop(job.id, None)

    def close(self):
        with self.lock:
            for job in self.jobs.values():
                self.cancel(job)
        self.pool.shutdown(wait=True, cancel_futures=True)
