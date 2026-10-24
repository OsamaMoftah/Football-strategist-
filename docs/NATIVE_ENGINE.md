# Native processing

This path processes footage offline and publishes its measured artifacts to the web viewer. The Docker edition can now submit uploads to Python through the [native job service](NATIVE_UPLOADS.md). Vercel uses the browser worker. Uploads do not call Ollama.

Requirements: Python 3.12+, FFmpeg on PATH, included licensed ONNX models. Tested locally with Python 3.14, OpenCV 5.0, ONNX Runtime 1.26 CPU, Apple M5 / 24 GB. The pinned dependencies also run in the Python CI job.

```bash
python3 -m venv pipeline/.native-venv
pipeline/.native-venv/bin/pip install -r pipeline/requirements-offline.txt
PYTHONPATH=. pipeline/.native-venv/bin/python -m pipeline.analyze_video \
  public/demo/u17/source.mp4 --output /tmp/football-raw
```

The command writes `analysis.json` and per-source-frame `camera.json`. The analysis contains model/source SHA-256 hashes, source FPS, actual processed-frame count, detector/appearance/manual provenance, and normalized source-image coordinates. JSON is published only after the pass completes. The raw pass is reusable; reviewing or rendering it does not rerun inference. There is no per-frame inference cache or resume after a mid-pass interruption yet.

An optional `--corrections anchors.json` accepts a JSON array of `{ "timestamp": 1.2, "x": 0.5, "y": 0.6 }` normalized manual ball anchors. Anchors remain labeled `manual`; they are not detector successes. `--player-stride 3` controls player sampling; ball sampling remains source-frame rate. `--seconds 20` limits the sequence.

Apply the included explicit exclusion and visual-review notes to the exact source:

```bash
PYTHONPATH=. pipeline/.native-venv/bin/python -m pipeline.review_analysis \
  /tmp/football-raw/analysis.json public/demo/u17/review.json \
  --output /tmp/football-reviewed.json
PYTHONPATH=. pipeline/.native-venv/bin/python -m pipeline.render_video \
  public/demo/u17/source.mp4 /tmp/football-reviewed.json \
  --output /tmp/football-annotated.mp4 \
  --credit 'NaBUru38 / Wikimedia Commons / CC BY-SA 4.0 - silent, annotated'
PYTHONPATH=. pipeline/.native-venv/bin/python -m pipeline.evaluate_ball \
  /tmp/football-reviewed.json public/demo/u17/labels.json \
  --output /tmp/football-evaluation.json
```

Segment IDs depend on the inference run; inspect a new result before reusing an exclusion. All review files require the matching source hash and evidence notes. Keep raw output when distributing reviewed artifacts. Renderer writes to a temporary MP4 and only replaces the destination after successful FFmpeg completion. It produces a silent file and supports ordinary constant-frame-rate clips; variable-frame-rate timestamps and projective camera calibration remain open work.

## Experimental local event proposals

Install Ollama from its official distribution, start its localhost server and obtain the explicit **instruction** checkpoint (approximately 3.3 GB; Apache-2.0). The default `qwen3-vl:4b` tag selected a thinking checkpoint during this run and exhausted its output budget. Empty/truncated output is rejected.

```bash
ollama pull qwen3-vl:4b-instruct
PYTHONPATH=. pipeline/.native-venv/bin/python -m pipeline.propose_events \
  public/demo/u17/source.mp4 --output /tmp/football-events \
  --model qwen3-vl:4b-instruct --start 6 --end 10 --interval 1
```

The command uses only `127.0.0.1:11434`, rejects cloud-tagged models, saves actual sampled JPEGs and their hashes, model digest, prompt and raw response. Proposals need two distinct sampled frames and valid source timestamps. They remain `proposed` until separately reviewed. A model's self-reported confidence is not calibrated event accuracy.

On this case both the 11-frame full-sequence pass and the five-frame 6–10s window returned **zero supported events**. The three published coaching notes come from implementation-agent visual inspection, explicitly labeled `visual-review`. They do not demonstrate automated tactical understanding. The next engineering step is an evaluated event model/prompt on a labeled multi-clip dataset, rather than treating these notes as successful VLM output.

## Limits

Camera compensation is approximate translation; zoom, perspective, tracking drift and cuts can break identity. Team clusters describe torso colors, not confirmed clubs. Background printed footballs can fool the detector. A reviewed exclusion in this case removes one such segment. No pose model, homography, metric speed, offside, possession truth or automated strategy recognition is implemented by this native path.
