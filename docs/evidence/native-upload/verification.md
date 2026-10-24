# Native upload-path verification — 24 October 2026

- Real Next.js production test server on localhost:3001, fixed proxy to loopback FastAPI:8000.
- In the browser, selected Native CPU server and submitted the rights-cleared 20.02s public case through Run native analysis. This uses the same File-to-job upload client as an independently selected file; it does not verify the OS file-picker permission flow.
- UI showed uploading, queueing and measured 240/600 and 510/600 progress. Completion returned 200 player samples and fresh heuristic movement cues, replacing the reference case's visual-review notes.
- Read actual tracking JSON from the viewer's export link: `engine=python-onnx-opencv`, 600 processed frames, 500 retained ball points, 186216.034958ms processing, source SHA-256 `0e3ae453dc8cb22097431e6923bbbf2b66725a8f2e0a80e7c5842d2f0c1d6c1b`. No reviewed events were present, as expected for a fresh pass.
- Submitted a second job and cancelled using the visible Cancel analysis control. The previous result remained available. Inspection after completion and cancellation found zero job files and zero native inference child processes.
- The new native pass is unreviewed: it still contains the raw engine's known advertising-ball false acquisition. No accuracy improvement follows from adding a server transport.
- Python service tests cover token isolation, limits including chunked uploads, failure cleanup, cancellation, queue capacity, expiry and two-phase upload. TS tests cover source verification, progress, cancellation cleanup, server failure and proxy request policy.

Hosted container and Hugging Face checks must be recorded separately after actual deployment; local HTTP success is not proof of a hosted upload flow.
