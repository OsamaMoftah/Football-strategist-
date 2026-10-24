import type { Detection, Region } from "./types";
import { aborted } from "./types";

export class DetectorClient {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason: Error) => void }
  >();
  constructor(private signal: AbortSignal) {
    this.worker = new Worker(new URL("./detector.worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (event) => {
      const request = this.pending.get(event.data.id);
      if (!request) return;
      this.pending.delete(event.data.id);
      if (event.data.error) request.reject(new Error(event.data.error));
      else request.resolve(event.data.result);
    };
    this.worker.onerror = () =>
      this.fail(
        new Error("The browser could not start the CV worker. Reload and try Chrome or Edge."),
      );
    signal.addEventListener("abort", this.cancel, { once: true });
  }
  private cancel = () => this.fail(aborted());
  private fail(error: Error) {
    this.worker.terminate();
    for (const p of this.pending.values()) p.reject(error);
    this.pending.clear();
  }
  private request(
    type: "load" | "detect",
    tiles?: Array<{ pixels: ArrayBuffer; region: Region }>,
    target: "people" | "ball" = "people",
  ): Promise<unknown> {
    if (this.signal.aborted) return Promise.reject(aborted());
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, tiles, target }, tiles?.map((t) => t.pixels) ?? []);
    });
  }
  async load(target: "people" | "ball" = "people") {
    await this.request("load", undefined, target);
  }
  async detect(
    tiles: Array<{ pixels: ArrayBuffer; region: Region }>,
    target: "people" | "ball" = "people",
  ) {
    return (await this.request("detect", tiles, target)) as Detection[];
  }
  dispose() {
    this.signal.removeEventListener("abort", this.cancel);
    this.fail(aborted());
  }
}
