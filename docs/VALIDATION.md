# Validation and operational readiness

## Current evidence

| Check | Result | Scope |
| --- | --- | --- |
| CV behavioral tests | 22 passing | Decoder, association, geometry, appearance, cut/gap handling, abstention, cue gates and recording format |
| Python tests | 5 passing | Geometry/math helpers only |
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
2. Select Try motion demo. Download its JSON to inspect the saved reference output.
3. Select Analyze again. Record browser/device, model hashes, elapsed time and unresolved segments.
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
