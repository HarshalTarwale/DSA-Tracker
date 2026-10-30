import { ImageResponse } from "next/og";
import { IconArt } from "@/lib/icon-art";

const SIZES = new Set([192, 512]);

/** PWA icons for the manifest: /icons/192 and /icons/512 (maskable-safe: full-bleed black). */
export async function GET(_req: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size: raw } = await ctx.params;
  const size = Number(raw);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  return new ImageResponse(<IconArt size={size} rounded={false} />, {
    width: size,
    height: size,
    headers: { "Cache-Control": "public, max-age=31536000, immutable" },
  });
}

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}
