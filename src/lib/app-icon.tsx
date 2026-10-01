import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { brand } from "@/lib/brand-config";

/** Serve the approved size-specific PNG without redrawing or masking it. */
export async function appIcon(size: number) {
  const artwork = await readFile(
    join(process.cwd(), "public", brand.assets.icon(size)),
  );
  return new Response(new Uint8Array(artwork), {
    headers: { "Content-Type": "image/png" },
  });
}
