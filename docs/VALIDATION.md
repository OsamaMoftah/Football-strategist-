# Validation and operational readiness

## Native case — 24 October 2026

- 600 frames / 20.02 seconds, 1280×720, real CC BY-SA 4.0 footage by NaBUru38.
- Native CPU inference: 242.6 seconds; 500 retained points before review (478 detector, 22 appearance).
- Visual review excluded a 21-point false acquisition on a printed advertising football. Raw points and exclusion remain inspectable. Reviewed output: 479 points across four segments, longest 9.009s. Unresolved intervals remain gaps.
- Ten evenly spaced source frames received an overlay-assisted implementation-agent spot check. Eight visible samples: seven within a 12-pixel tolerance, one missed; two ambiguous samples excluded. Manual labels have approximately ±3px uncertainty and are not blinded/independent truth. This is a post-development sanity check, not benchmark accuracy.
- Qwen3-VL-4B-Instruct returned no supported events in both full-sequence and shorter-window runs. The default thinking tag also exhausted its output budget. No automatic strategy-understanding claim follows from this experiment.
- Three coaching notes are implementation-agent visual reviews, distinct from model detections and unsuccessful VLM proposals.
- Native MP4: H.264, 1280×720, 600 frames, 20.02s; full FFmpeg decode passed.
- Current behavioral suites: 26 TypeScript CV tests and 15 Python tests.

Artifacts: [case files and provenance](../public/demo/u17/README.md). Reproduce with [native CLI commands](NATIVE_ENGINE.md). Multi-match generalization, player-ID metrics, fully independent labels, VFR timestamps and successful event inference remain open.

## Earlier browser-case evidence

| Check | Result | Scope |
| --- | --- | --- |
| CV behavioral tests | 26 passing | Decoder, association, geometry, appearance, cut/gap handling, abstention, cue gates and recording format |
| Python tests | 15 passing | Geometry, native tracking, model preprocessing and review gates |
| Typecheck, lint, formatting, production build | Passing locally | Application source |
| Browser inference | Completed in Brave/WASM | Included 3.39 s licensed stadium clip |
| Ball continuity | 1.7 s / 3.39 s, 2 segments | 14 detector anchors + 9 appearance estimates; not accuracy |
| Runtime | 90.1 s | One development-machine full inference run |
| Video export | VP9, 408×358, 84 frames; complete FFmpeg decode | Actual downloaded annotated WebM |
| Hosted container | Build and HTTP/model-asset smoke checks passed in GitHub Actions | Non-root port-7860 runtime |
| Display | DPR 2; timestamp seek read back at 1.50 s | Browser canvas/source fit |

Evidence: [saved browser result](../public/demo/leao-analysis.json), [detailed execution notes](evidence/ball-motion/verification.md), [sample exported frame](evidence/ball-motion/football-strategist-annotated-frame.png). The CI badge reports the actual current repository checks; local results do not substitute for hosted checks.

The initial ball-anchor pass retained 0.8 seconds of continuity. Adaptive detector fallback increased this to 1.7 seconds on the same clip. This comparison only establishes retained trace duration in that case. It does not establish correctness of every point or general improvement over unseen matches.

An additional eight-frame offline comparison against the COCO ball category contains candidate coordinates/scores, without a labeled ground-truth dataset. No precision, recall or benchmark accuracy claim is made from those frames.

## Reproduce the browser case

1. Open the app in a current Chromium desktop browser.
2. Select Open annotated demo. Download its JSON to inspect the saved reference output.
3. Open Analysis options and select Run browser pass. Record browser/device, model hashes, elapsed time and unresolved segments.
4. Download the newly measured JSON. Verify that its points come from model/appearance/manual provenance as labeled.
5. Seek to 1.50 s and inspect source pixels, marker and trail. Check lost-ball intervals and confirm they remain gaps.
6. Export an annotated video while keeping the tab visible. Decode the entire result with FFmpeg and compare frames at retained timestamps.
7. Add a manual ball anchor on a clearly visible frame; confirm it remains labeled `manual` in JSON and is not counted as a detector observation.

Runtime and exact outputs can vary by decoder, device and quantized inference behavior. Never replace failure gaps with synthetic positions to make this case look complete.

## Before commercial operation

- [ ] Define the intended workflow and acceptance thresholds: analyst review differs from automated officiating or operational decisions.
- [ ] Build a rights-cleared, representative evaluation set with exact source hashes, held-out matches and labeled visible/occluded-ball intervals.
- [ ] Report ball localization error, precision/recall, false acquisitions, track fragmentation, identity errors and time-to-reacquire by camera condition.
- [ ] Independently label team assignments and control events; evaluate cue precision and false explanations, with sample counts and uncertainty.
- [ ] Test shot cuts, zooms, replays, overlays, low light, motion blur, aerial balls and similar kits.
- [ ] Establish supported device/browser memory and runtime budgets, export reliability and graceful cancellation/source replacement.
- [ ] For metric claims, add clip-specific pitch calibration with reprojection errors, temporal camera handling and ground-truth validation. Current math helpers are insufficient.
- [ ] Confirm footage/model/data rights for the specific distribution and use; keep third-party attribution and ShareAlike obligations where applicable.
- [ ] Add persistence, project isolation, access control, monitoring and support processes if a multi-user hosted service is introduced.

These are concrete remaining engineering gates. The current project demonstrates a connected local review workflow and transparent evidence; it is not certified production analytics.
