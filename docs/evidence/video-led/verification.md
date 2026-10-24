# Video-led review verification — 24 October 2026

The primary experience now consists of a full-width source video, synchronized measured overlays, a simple key-moment strip and one observation/coaching question. The previous side rail, map, activity chart and statistics grid are not rendered in this view. Existing findings/strategy views, worker inference, cancellation, manual correction and exports are retained.

The landing preview is the actual previously decoded annotated WebM with embedded attribution. Reduced-motion visitors do not receive autoplay. It does not represent newly computed results.

## Executed checks

- 25 CV tests passed, including three new tests proving cue timestamps/questions survive, ball-only segments do not become fabricated football events, and empty/weak evidence yields no fake moment. The new test initially failed because its implementation module did not exist, then passed after implementation.
- `pnpm verify` passed: asset hashes, formatting, types, ESLint, tests and production build.
- Browser production build: Open annotated demo loaded saved genuine results. “Watch this moment” started playback from 0.583333 s; readback showed playback advancing and paused=false. Precise scrubber Home/ArrowRight changed media time to 0.01 s and paused playback.
- At 1.50 s, canvas measured 2756 physical pixels / 1378 CSS pixels at DPR 2; source fit and ball trace aligned visibly.
- At 320, 375, 414, 768 and 1050 px: document scrollWidth equaled viewport width, and visible controls were not clipped laterally.
- Analysis options expanded to reveal existing layer toggles, rerun and manual correction. Secondary export details retain JSON, report and annotated-video actions.

No paid model API, fabricated skeletons, or new automatic strategy-recognition claims were introduced. The engine and its existing validation boundary are unchanged; this is a presentation and interaction change.

## Public build readback

Deployment dpl_FNkgxJ5HFMZ3MCzuRunDK9VEwSXs is live at https://football-strategist.vercel.app/ (anonymous HTTP 200). The production page shows “See the play” with a genuine annotated preview; opening it leads to the full-width clip with no sequence sidebar. Key moments, secondary evidence and export links were verified in the actual public browser. The new Save video action started recording and exposed progress; Cancel export returned to an idle, usable state without an error. Inference and recording implementation modules were not changed in this pass.
