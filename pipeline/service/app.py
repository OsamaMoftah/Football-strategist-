"""Loopback-only API; the Next.js server owns its public same-origin proxy."""

import asyncio
from contextlib import asynccontextmanager
import json
from pathlib import Path
import tempfile
import re
import shutil
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from .jobs import Jobs


def create_app(jobs=None):
    if jobs is None:
        root = Path(tempfile.gettempdir()) / "football-strategist-native-jobs"
        root.mkdir(mode=0o700, exist_ok=True)
        # A fresh process cannot authenticate earlier in-memory jobs. Remove only this
        # service's specifically named job directories on restart.
        for directory in root.iterdir():
            if re.fullmatch(r"[a-f0-9]{32}", directory.name) and directory.is_dir():
                shutil.rmtree(directory)
        jobs = Jobs(root)

    @asynccontextmanager
    async def lifespan(app):
        async def reap():
            while True:
                await asyncio.sleep(30)
                await asyncio.to_thread(jobs.expire)

        task = asyncio.create_task(reap())
        yield
        task.cancel()
        await asyncio.to_thread(jobs.close)

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

    @app.middleware("http")
    async def private_responses(request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    def authorize(request, job_id):
        job = jobs.authorized(job_id, request.headers.get("authorization"))
        if job is None:
            raise HTTPException(404, "Job not found or expired")
        return job

    @app.get("/health")
    def health():
        return dict(
            available=True,
            engine="python-onnx-opencv",
            maxBytes=jobs.limits.max_bytes,
            maxSeconds=jobs.limits.max_seconds,
            retentionSeconds=jobs.limits.ttl_seconds,
        )

    @app.post("/jobs", status_code=202)
    async def reserve(request: Request):
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > 2048:
                raise HTTPException(413, "Job metadata is too large")
        try:
            metadata = json.loads(body)
            name = metadata.get("name", "Uploaded clip")
            if not isinstance(name, str):
                raise ValueError()
        except (ValueError, AttributeError):
            raise HTTPException(400, "Invalid clip metadata")
        try:
            job = jobs.reserve(name)
        except RuntimeError as error:
            raise HTTPException(429, str(error))
        return dict(id=job.id, token=job.token, status="uploading")

    @app.put("/jobs/{job_id}", status_code=202)
    async def upload(job_id: str, request: Request):
        job = authorize(request, job_id)
        with jobs.lock:
            if job.status != "uploading":
                raise HTTPException(409, "Upload has already started")
            job.status = "receiving"
        path = jobs.root / job.id / "source.mp4"
        received = 0
        try:
            if request.headers.get("content-type", "").split(";")[0] not in {
                "video/mp4",
                "video/webm",
            }:
                raise HTTPException(415, "Choose an MP4 or WebM clip")
            try:
                declared = int(request.headers.get("content-length", 0))
            except ValueError:
                raise HTTPException(400, "Invalid upload length")
            if declared > jobs.limits.max_bytes:
                raise HTTPException(413, "Native upload exceeds 100 MB")
            with path.open("wb") as stream:
                async for chunk in request.stream():
                    with jobs.lock:
                        if job.status != "receiving":
                            raise HTTPException(409, "Upload was cancelled or expired")
                    received += len(chunk)
                    if received > jobs.limits.max_bytes:
                        raise HTTPException(413, "Native upload exceeds 100 MB")
                    stream.write(chunk)
            if not received:
                raise HTTPException(400, "The uploaded clip is empty")
            jobs.start(job)
        except BaseException:
            jobs.cancel(job)
            raise
        return dict(id=job.id, status="queued")

    @app.get("/jobs/{job_id}")
    def status(job_id: str, request: Request):
        return jobs.status(authorize(request, job_id))

    @app.get("/jobs/{job_id}/result")
    def result(job_id: str, request: Request):
        job = authorize(request, job_id)
        with jobs.lock:
            if job.status != "complete":
                raise HTTPException(409, "Analysis is not complete")
            import json

            return JSONResponse(
                json.loads((jobs.root / job.id / "analysis.json").read_text())
            )

    @app.delete("/jobs/{job_id}")
    def cancel(job_id: str, request: Request):
        return jobs.cancel(authorize(request, job_id))

    return app
