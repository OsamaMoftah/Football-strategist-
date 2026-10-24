# Native upload-path verification — 24 October 2026

- Real Next.js production test server on localhost:3001, fixed proxy to loopback FastAPI:8000.
- In the browser, selected Native CPU server and submitted the rights-cleared 20.02s public case through Run native analysis. This uses the same File-to-job upload client as an independently selected file; it does not verify the OS file-picker permission flow.
- UI showed uploading, queueing and measured 240/600 and 510/600 progress. Completion returned 200 player samples and fresh heuristic movement cues, replacing the reference case's visual-review notes.
- Read actual tracking JSON from the viewer's export link: `engine=python-onnx-opencv`, 600 processed frames, 500 retained ball points, 186216.034958ms processing, source SHA-256 `0e3ae453dc8cb22097431e6923bbbf2b66725a8f2e0a80e7c5842d2f0c1d6c1b`. No reviewed events were present, as expected for a fresh pass.
- Submitted a second job and cancelled using the visible Cancel analysis control. The previous result remained available. Inspection after completion and cancellation found zero job files and zero native inference child processes.
- The new native pass is unreviewed: it still contains the raw engine's known advertising-ball false acquisition. No accuracy improvement follows from adding a server transport.
- Python service tests cover token isolation, limits including chunked uploads, failure cleanup, cancellation, queue capacity, expiry and two-phase upload. TS tests cover source verification, progress, cancellation cleanup, server failure and proxy request policy.

## Hosted checks

- Canonical code `3cdd3d8`; GitHub Actions run `40119832795` passed web, Python and container jobs. The container job submitted a real 15-frame fixture, verified source hash/ball output and deleted its job.
- Space: `sammoftah/Football-strategist`, CPU Basic, RUNNING. Origin-fixed deployment snapshot: `36e6960f3040e8ff3ee2414011339ed1458bce64`.
- Real HTTPS smoke: submitted a 0.5s/15-frame licensed fixture to the public native endpoint, received 15 retained ball points and matching source hash, then deleted the private job. Repeated with the browser Origin header after fixing the reverse-proxy mismatch.
- The strict origin check initially rejected legitimate requests because the internal HTTP bind URL differed from public HTTPS. A regression test now covers the mismatch; the route derives the exact external origin from Hugging Face's operator-supplied SPACE_HOST, or explicit NATIVE_PUBLIC_ORIGIN elsewhere. Other origins remain rejected.
- Hosted browser confirmed Native CPU server became enabled, disclosed server processing and accepted a new 20.02s submission with a visible cancel control. The full hosted run is evaluated separately from the short smoke fixture; do not substitute one for the other.
- No GPU, VLM inference service, persistent storage or newly purchased hardware was provisioned.

## Full hosted browser completion

The 20.02-second browser submission completed on CPU Basic in **685.4408 seconds**, processing all **600 source frames**. Its export contained **501 retained ball points** (461 detector anchors, 40 appearance estimates), four track segments and 200 player samples. The client verified source SHA-256 `0e3ae453dc8cb22097431e6923bbbf2b66725a8f2e0a80e7c5842d2f0c1d6c1b` before accepting it. Five heuristic review moments were shown; no visually reviewed or automatically confirmed tactical events were present.

[Actual hosted result](hosted-analysis.json) · [Actual hosted viewer at 13.78s](hosted-review.png).

This is one hosted runtime/data-flow measurement. It is not accuracy or real-time performance. The saved result is unreviewed and may include false acquisitions. Host and local outputs differ slightly with decoder/platform/quantized inference; neither run is treated as ground truth. The source footage is NaBUru38's CC BY-SA 4.0 U17 sequence, credited in the viewer and [case manifest](../../../public/demo/u17/README.md).
