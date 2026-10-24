import { forwardNative } from "@/lib/cv/native-proxy";
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return forwardNative(request, (await context.params).path, process.env.NATIVE_API_URL);
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
