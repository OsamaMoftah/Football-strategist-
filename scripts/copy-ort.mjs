import { mkdir, copyFile } from "node:fs/promises";

await mkdir("public/ort", { recursive: true });
for (const name of ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"]) {
  await copyFile(`node_modules/onnxruntime-web/dist/${name}`, `public/ort/${name}`);
}
