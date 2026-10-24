/** The upstream is operator configuration; clients can never choose a destination. */
export async function forwardNative(
  request: Request,
  path: string[],
  backend: string | undefined,
  publicOrigin?: string,
) {
  const route = path.join("/");
  const valid =
    route === "health" || route === "jobs" || /^jobs\/[a-f0-9]{32}(\/result)?$/.test(route);
  const json = (detail: string, status: number) =>
    Response.json({ detail }, { status, headers: { "Cache-Control": "no-store" } });
  if (!valid) return json("Not found", 404);
  const methods =
    route === "health" || route.endsWith("/result")
      ? ["GET"]
      : route === "jobs"
        ? ["POST"]
        : ["GET", "PUT", "DELETE"];
  if (!methods.includes(request.method)) return json("Method not allowed", 405);
  const origin = request.headers.get("origin");
  if (origin && origin !== (publicOrigin ?? new URL(request.url).origin))
    return json("Cross-origin access is not permitted", 403);
  if (!backend)
    return json(
      "Native processing is not available on this deployment. Use browser processing.",
      503,
    );
  const headers = new Headers();
  for (const key of ["content-type", "content-length", "authorization"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  try {
    const body = ["POST", "PUT"].includes(request.method) ? request.body : undefined;
    const init: RequestInit & { duplex?: string } = {
      method: request.method,
      headers,
      body,
      signal: request.signal,
      cache: "no-store",
      redirect: "error",
      ...(body ? { duplex: "half" } : {}),
    };
    const response = await fetch(`${backend.replace(/\/$/, "")}/${route}`, init);
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return json(
      "The native engine is starting or unavailable. Try again shortly, or choose browser processing.",
      503,
    );
  }
}
