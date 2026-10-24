# Native uploads

The Docker edition runs the web viewer and Python CV engine together. Vercel keeps the browser engine and the saved native reference case; it does not run Python video jobs.

## User flow

1. Select **Native CPU server** before choosing a clip, or change the engine in **Analysis options** and choose **Run native analysis**.
2. The interface discloses server processing before submission. Container signatures are checked before decoding; playlists and renamed non-video files are rejected. Native limits are 30 seconds, 100 MB, 1920×1080 maximum pixel count and 60 FPS. Use constant-frame-rate H.264 MP4 or WebM; variable-frame-rate synchronization is not yet validated.
3. A private job receipt is created before the bytes are sent. The viewer displays queue state and source-frame progress, with a visible cancel action.
4. When processing completes, the browser verifies the result's SHA-256 against the exact selected file before displaying overlays. A result for another source is rejected.
5. Source media is removed when processing completes, fails or is cancelled. The browser also deletes the server job after receiving the result. If the browser disconnects, temporary artifacts expire after approximately one hour; unstarted/interrupted uploads expire after two minutes, with a cleanup sweep every 30 seconds. A service restart removes earlier job directories because in-memory receipts no longer exist.
6. The result and original playable file remain in the browser's memory. Save video, tracking JSON and written findings use that result. Reloading loses the local project.

The default remains **On this device**, which sends no clip to the server. Selecting native explicitly sends it to the application host. Job IDs and separate bearer tokens are generated cryptographically; tokens stay in browser memory and are not included in public asset URLs, query strings, cookies, access logs or analytics. This is a bounded anonymous portfolio service, not an authenticated multi-tenant product.

## API and limits

| Method | Path | Meaning |
| --- | --- | --- |
| GET | `/api/native/health` | Availability, engine and upload limits |
| POST | `/api/native/jobs` | Reserve a job with JSON `{ "name": "clip.mp4" }`; returns private ID/token |
| PUT | `/api/native/jobs/{id}` | Stream raw MP4/WebM bytes with `Authorization: Bearer …` |
| GET | `/api/native/jobs/{id}` | Private queued/running/complete/failed/cancelled status |
| GET | `/api/native/jobs/{id}/result` | Private completed AnalysisResult JSON |
| DELETE | `/api/native/jobs/{id}` | Terminate processing and remove temporary files |

Next.js streams a fixed route allowlist to `NATIVE_API_URL`, configured by the operator and never by the client. The Docker image uses `http://127.0.0.1:8000`; Uvicorn is not exposed publicly. Cross-origin browser requests are rejected. Behind a reverse proxy, set `NATIVE_PUBLIC_ORIGIN` to the exact external origin. Hugging Face automatically uses its operator-supplied `SPACE_HOST` environment variable to derive this origin. The public port is 7860.

One inference subprocess runs at a time, with two job slots including uploads/queueing and at most 16 retained job records. Processing times out after 20 minutes. This keeps CPU and storage bounded but does not prevent deliberate anonymous queue abuse; account authentication and per-user quotas remain production work. No GPU, VLM weights, paid inference API or external video storage is used.

## Run locally

```bash
python3.12 -m venv pipeline/.native-venv
pipeline/.native-venv/bin/pip install -r pipeline/requirements-server.txt
PYTHONPATH=. pipeline/.native-venv/bin/python -m uvicorn \
  pipeline.service.app:create_app --factory --host 127.0.0.1 --port 8000 --no-access-log
```

In another terminal:

```bash
NATIVE_API_URL=http://127.0.0.1:8000 pnpm dev
```

For the complete container:

```bash
docker build -t football-strategist .
docker run --rm -e NATIVE_PUBLIC_ORIGIN=http://localhost:7860 -p 7860:7860 football-strategist
```

The runtime uses Python 3.12 because NumPy/SciPy pins require Python 3.12+. The launcher forwards termination and stops the other service if Node or Uvicorn exits. CI builds the real container and submits a 0.5-second licensed fixture through its HTTP proxy, then verifies the measured source hash and removes the job.

## What results mean

A native upload receives fresh model detections, tracks, kit-color groups and heuristic review cues. It does **not** inherit the reference case's manually reviewed event notes or its excluded advertising-ball segment. The raw engine can still follow a printed football or lose the real one. The experimental Qwen event pipeline remains offline and unsuccessful on the reference case; it is not silently presented as working upload inference. Pose estimation, pitch calibration, possession truth, strategy classification and independently validated accuracy remain separate work.
