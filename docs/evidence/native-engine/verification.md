# Native-engine execution — 24 October 2026

## Input and inference

- Wikimedia NaBUru38 U17 New Zealand–Canada source, first 600 frames, 1280×720, 29.97002997 FPS, 20.02s, silent H.264. Source SHA-256: `0e3ae453dc8cb22097431e6923bbbf2b66725a8f2e0a80e7c5842d2f0c1d6c1b`.
- CPU ONNX Runtime 1.26; Apple M5 / 24 GB; model hashes in saved JSON. Full run: 242.5819s. Ball every source frame; player observations every third frame (200 samples).
- Raw retained ball track: 500 points, 478 detector + 22 appearance, five segments. Review excludes 21 points following a printed advertising football, preserving the entire raw track and reason. Reviewed result: 479 points, four segments, longest 9.009s.
- Ten-frame overlay-assisted visual spot check: eight visible samples, seven within 12px, one missed, two ambiguous excluded. Labels are implementation-agent-created, approximate and not blinded. No benchmark or independent accuracy conclusion.
- Final-code smoke run: 30/30 source frames decoded and processed; 30 retained points, 16.809s. This checks CLI execution, not performance improvement.

## Event experiment

- Local Ollama `qwen3-vl:4b` thinking tag exhausted 1,600 output tokens without structured content; rejected.
- Explicit instruction digest `84f7ed8042fa7cdbd902f7dcb7d0370e032095047cc3244179f263b77b5bc318`:
  - 11 full-sequence images, 47.8s, no supported events.
  - five 6–10s images, 38.4s, no supported events.
- Published coaching notes are three implementation-agent visual reviews, not successful model event extraction. Raw instruction response and sampling manifests are retained.

## Checks

- `pnpm verify`: passed asset integrity, Prettier, TypeScript, ESLint, 26 CV tests and production build.
- `PYTHONPATH=. pipeline/.ball-venv/bin/python -m pytest pipeline/tests -q`: 15 passed.
- Ruff check on the added native modules/tests: passed.
- Native annotated MP4: 600 frames, H.264, 1280×720, 20.02s; entire file decoded with FFmpeg without errors.
- Brave local app: Open annotated demo loaded 200 measured player samples and three reviewed moments. Selecting the third moment read back seek 12.20s. Watch this moment read back `paused=false`, advancing currentTime 12.4411s.
- DPR 2 canvas: 2756×1550 backing pixels for 1378×775 CSS pixels. Source video 1280×720, readyState 4. No captured browser error logs.
- Actual Save video workflow: progress reached completion; saved browser-generated VP9 WebM, 1280×720, 500 decoded frames, final packet PTS 19.959s. Entire download decoded without errors. Recording frame count differs from the native source pass because MediaRecorder records presentation frames in real time.
- [Verified review screen](review.png) includes the actual 12.2s video, synchronized overlay and selected explanation. Caption was moved below the existing trace badge after visual inspection found an overlap.

## Remaining work

Successful automatic event understanding, pose estimation, calibrated pitch projection, robust long-term player IDs, independent multi-match accuracy evaluation, variable-frame-rate support, inference checkpoint/resume and a hosted Python upload service remain open. Hugging Face metadata/container exist; no live Hugging Face deployment is claimed.
