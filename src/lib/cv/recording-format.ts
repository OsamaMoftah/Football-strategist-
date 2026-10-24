export function recordingFormat(supports: (mimeType: string) => boolean) {
  for (const mimeType of [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ]) {
    if (supports(mimeType))
      return { mimeType, extension: mimeType.startsWith("video/mp4") ? "mp4" : "webm" };
  }
  throw new Error("This browser does not support video export. Try Chrome or Edge.");
}
