# Deployment

## Vercel

Import the GitHub repository as a Next.js project. Use Node.js 22 or 24, pnpm 9.15.5 and `pnpm build`. No API secrets are required. The build copies the ONNX Runtime assets. Keep the model and license files in `public/`.

The current live portfolio build is linked from the root README. `football-strategist.vercel.app` is registered on the existing Vercel project as a production domain, so it follows future production deployments. When adding another public name, attach it to the project as a production domain rather than assigning only a deployment alias; an alias alone can inherit deployment authentication protection. A successful build does not validate detections: use the browser case in [VALIDATION.md](VALIDATION.md).

## Hugging Face Docker Space

The root README already includes `sdk: docker`, `app_port: 7860` and model references, following [Hugging Face's Docker Spaces documentation](https://huggingface.co/docs/hub/spaces-sdks-docker). The Dockerfile builds Next.js standalone output and serves it as non-root UID 1000 on port 7860. The Docker edition also runs FastAPI on loopback and a queued native CV subprocess. The visitor chooses browser or native processing. CPU Basic is sufficient; no GPU is required. See [native uploads](NATIVE_UPLOADS.md).

1. Create a Docker Space under your own account, choosing its visibility and hardware. Check the current account/hardware terms in Hugging Face before creating it; this repository does not provision or purchase hosting.
2. Copy this repository's code and bundled assets into the Space repository, preserving its README metadata, license and notices. Use the Hugging Face CLI or Git with the account's normal authentication flow. Do not put tokens in source or Docker build arguments.
3. Wait for the Space build and open its full-screen app.
4. Confirm Try motion demo, local rerun, cancel, seeking, all three readout tabs and downloads inside the hosted browser context. An iframe/browser policy may affect download behavior; test the direct app URL as well.

Local container smoke test:

```bash
docker build -t football-strategist .
docker run --rm -p 7860:7860 football-strategist
```

Open `http://localhost:7860`. CI builds the image, checks the HTTP/model/health endpoints and submits a short real native job with source-hash verification. No Hugging Face Space is published by the GitHub workflow.

## Storage and deployment boundaries

Browser-mode clips/results remain on the device and are lost on a full reload. Native-mode clips are uploaded to this host temporarily; source media is deleted when processing ends or is cancelled, and abandoned job artifacts expire after approximately one hour. Tokens stay in browser memory. See the full [retention and API policy](NATIVE_UPLOADS.md). Hugging Face container storage is ephemeral unless configured otherwise; this app does not require persistent server storage. See [Hugging Face storage documentation](https://huggingface.co/docs/hub/spaces-storage) before adding server-side persistence.

Models are shipped as static assets with source revision and checksums. `pnpm verify:assets` checks the committed bytes. Do not substitute a new checkpoint silently: update its notice, hash, preprocessing contract and evaluation evidence together.
