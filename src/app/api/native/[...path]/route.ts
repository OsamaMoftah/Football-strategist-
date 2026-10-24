import { forwardNative } from "@/lib/cv/native-proxy";
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return forwardNative(
    request,
    (await context.params).path,
    process.env.NATIVE_API_URL,
    process.env.NATIVE_PUBLIC_ORIGIN ??
      (process.env.SPACE_HOST ? `https://${process.env.SPACE_HOST}` : undefined),
  );
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
