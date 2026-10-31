import { coreFetch } from "@/lib/api";

// A note's attachment, only for its owner: the session cookie becomes their JWT for core, and
// Storage's RLS checks it again. There's no public or signed URL to leak. `?download=<file name>`
// saves it instead of showing it.
export async function GET(request: Request, ctx: RouteContext<"/attachments/[name]">) {
  const { name } = await ctx.params;
  const res = await coreFetch(`/attachments/${encodeURIComponent(name)}`);
  if (!res.ok) return new Response(null, { status: res.status });

  const headers = new Headers({
    "Content-Type": res.headers.get("Content-Type")!,
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  });
  const download = new URL(request.url).searchParams.get("download");
  if (download !== null)
    headers.set(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(download || name)}`,
    );
  return new Response(res.body, { headers });
}
