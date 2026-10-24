# Ball motion and sequence intelligence — 24 October 2026

Production: https://football-strategist.vercel.app/
Deployment: dpl_6B9q5axpPohzRbqL1bRqBrFkNGMD
Immutable build: https://pitchpulse-lmpqrtvqi-osamamoftahs-projects.vercel.app

## Executed checks

- 22/22 TypeScript CV tests: association, geometry rejection, short interpolation, cuts, long gaps, appearance matching, featureless-patch rejection, ball decoder/background, team grouping, pressure evidence, static-image abstention, camera-only motion, cut-safe control cues, existing CV and export helpers.
- TypeScript compilation, ESLint and Next production build: passed. Hosted Vercel build passed.
- Python helpers: 5/5 passed (`PYTHONPATH=. pipeline/.venv/bin/pytest pipeline/tests -q`). These do not validate image tracking or pitch calibration.
- Actual ONNX Runtime WASM execution in Brave, not a mocked detector: both person and new football models loaded and completed inference on the included licensed moving clip.
- Initial 4 Hz ball-anchor pass: 13 retained points and 0.8 seconds continuous trace. Adaptive extra detector checks: 23 retained points (14 detector / 9 appearance), 1.7 seconds continuous trace across 2 segments. This is an acquisition/continuity result on one 3.39-second clip, not an accuracy measurement.
- Processing time of saved full browser run: 90.069 seconds on development machine. Inference remains expensive; precomputed genuine observations make the included demo instant. Uploaded clips still run the engine locally.
- Production demo opens with actual saved inference JSON; 7 player frames at 2 Hz, 23 ball points at 12 Hz. No synthetic ball points substituted.
- Timeline seek to 1.50 s: video currentTime read back exactly 1.5; overlay canvas 1814 physical px / 907.15 CSS px on DPR 2 screen. Source aspect/pillarboxing preserved.
- Live findings and generated Markdown contain the image-space progression cue, its 10 detector anchors, verification question and limits. It is not classified as a confirmed tactical strategy.
- Mobile widths 375 and 320 px: document scrollWidth equals viewport width; controls wrap; side panel stacks.
- Annotated WebM downloaded through native Save dialog. FFprobe: VP9, 408×358, 85 frames; complete FFmpeg decode succeeded. `annotated-frame.png` confirms the blue trace and yellow ball marker in the actual exported frame.

## Model and footage provenance

Ball model: https://huggingface.co/build-small-hackathon/futheros-ball-rfdetr
Published checkpoint revision d4dfe1076a9ef09d5326c30997d03926974ea757. Apache-2.0. Safe weights-only checkpoint load, RF-DETR 1.11.2 export, MatMul-only dynamic per-channel QUInt8 quantization. No claim that the published checkpoint is the README's v2 model. SHA-256 and input normalization are in `public/models/football-ball/NOTICE.txt`; reproduction script is `pipeline/export_ball_model.py`.

An offline 8-frame full-frame-plus-tiles comparison against the original COCO model is saved as `model-comparison.json`. It contains candidates and scores, not ground-truth accuracy. Both models miss or select false candidates in some frames. No precision/recall claim is made from it.

Licensed included moving clip: “Goal by Rafael Leao”, Saggittarius A, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Goal_by_Rafael_Leao.webm . Source bytes SHA-256: 4847f5647696567c48a13b39b6621419ddf69fc5ed75110e82778f52eb8d6df5. Source media unchanged; overlays added. Annotated demo derivatives share CC BY-SA 4.0.

## Remaining limits

The demo ball is unresolved during substantial portions of the clip, especially the shot. Appearance tracking can drift to similar pixels; estimates are labeled and capped between detector anchors. Camera translation is approximate and does not correct zoom or perspective. Kit colors can include officials or be wrong under occlusion. Pressure and control changes are heuristic prompts, not validated possession or strategy classification. No metric speed, offside, formation, territory or xT is produced from uncalibrated uploaded video. Eight unlabelled comparison frames and one short movement test are not a broad accuracy benchmark. No phone hardware/browser inference test was run.

## Football strategist publication pass

Renamed demo: https://football-strategist.vercel.app/ . Production deployment dpl_FhrFy6DYE3Wwuq17kEvKy922DVLB. Refined single-column rail, Readout/Ball trace/Teams keyboard tabs, source-aspect trajectory, live crop, compact layers/actions and exact scrubber. 320/375/414/768/1050 px layouts checked with no visible lateral control clipping. ArrowRight changed both slider and video from 1.50 to 1.51 s. Original code is MIT; model and media terms remain separate.

A local standalone preview was rebuilt while its process remained running, removing copied static assets and producing a worker-start error. This was a stale local build artifact, not a model error: the copied `.next/standalone/.next/static` directory no longer existed. The immutable deployed build is the final browser verification target. Do not mutate a running standalone deployment in place.
