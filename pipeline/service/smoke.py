"""Real container lifecycle smoke: submit a 0.5s fixture, verify hashes, delete it."""

import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.request
from urllib.parse import urlparse

base = os.environ.get("FOOTBALL_SMOKE_URL", "http://127.0.0.1:7860/api/native")


def request(path, method="GET", data=None, token=None, media="application/json"):
    headers = {
        "Content-Type": media,
        "Origin": f"{urlparse(base).scheme}://{urlparse(base).netloc}",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(base + path, data=data, method=method, headers=headers)
    return json.load(urllib.request.urlopen(req, timeout=30))


with tempfile.TemporaryDirectory() as directory:
    video = Path(directory) / "test.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-i",
            "public/demo/u17/source.mp4",
            "-t",
            "0.5",
            "-an",
            "-c:v",
            "libx264",
            "-y",
            str(video),
        ],
        check=True,
    )
    content = video.read_bytes()
    job = request("/jobs", "POST", json.dumps({"name": "CI fixture.mp4"}).encode())
    try:
        request("/jobs/" + job["id"], "PUT", content, job["token"], "video/mp4")
        deadline = time.time() + 180
        while time.time() < deadline:
            state = request("/jobs/" + job["id"], token=job["token"])
            if state["status"] == "failed":
                raise RuntimeError(state["error"])
            if state["status"] == "complete":
                break
            time.sleep(1)
        else:
            raise TimeoutError("Native service did not finish")
        result = request("/jobs/" + job["id"] + "/result", token=job["token"])
        assert (
            result["processing"]["sourceSha256"] == hashlib.sha256(content).hexdigest()
        )
        assert result["processing"]["framesProcessed"] >= 14
        assert result["frames"] and result["ballTrack"]
        print(
            json.dumps(
                {
                    "nativeSmoke": "passed",
                    "frames": result["processing"]["framesProcessed"],
                    "ballPoints": len(result["ballTrack"]),
                }
            )
        )
    finally:
        request("/jobs/" + job["id"], "DELETE", token=job["token"])
