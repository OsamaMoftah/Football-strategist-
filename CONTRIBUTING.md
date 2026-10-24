# Contributing

Use Node.js 22/24 and pnpm 9.15.5. Install with `pnpm install --frozen-lockfile`, then run `pnpm dev`.

Before opening a change, run `pnpm verify` and the Python checks if touching `pipeline/`. Keep behavioral tests focused on real failure modes. A passing test or build is not evidence of model accuracy.

Preserve the measurement boundary: raw detections, accepted ball points, appearance estimates, manual anchors and synthetic samples must stay distinguishable. Include a reproducible clip/hash, browser/device, timestamps, expected behavior and actual output when reporting an inference issue. Do not attach private or unlicensed footage to public issues.

UI changes should retain the Werkstatt typography, cobalt/putty palette and ruled layouts. Check 320, 375, 414 and 768 px widths plus the intermediate desktop/tablet layout. Readout tabs must work by keyboard; controls must not jump or overflow. Compare on-screen overlays and recorded exports.

Third-party model/media changes require provenance, compatible terms, notices and checksum updates. No credentials or customer clips belong in the repository.
