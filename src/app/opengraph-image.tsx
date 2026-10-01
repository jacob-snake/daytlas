/* eslint-disable @next/next/no-img-element -- ImageResponse requires an embedded image. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { brand } from "@/lib/brand-config";
import { ImageResponse } from "next/og";
export const alt = `${brand.name} — Your days, in a bigger picture. Independent, open-source insights for your Oura history.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function SocialImage() {
  const logo = await readFile(
    join(process.cwd(), "public", brand.assets.socialLogo),
  );
  const logoData = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: "#f8f8f5",
        color: "#181917",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          padding: 10,
          background: "#fff",
          width: 260,
          borderRadius: 16,
        }}
      >
        <img src={logoData} alt={brand.name} width={240} height={96} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 84,
          letterSpacing: -5,
          lineHeight: 1.06,
        }}
      >
        <span>Your days, in a</span>
        <span>bigger picture.</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <span style={{ fontSize: 23, color: "#64675f", maxWidth: 510 }}>
          A thoughtful home for your Oura history.
        </span>
        <svg width="340" height="110" viewBox="0 0 340 110">
          <path
            d="M0 90L20 82L40 88L60 58L80 64L100 70L120 42L140 54L160 45L180 63L200 37L220 42L240 16L260 28L280 19L300 38L320 20L340 8"
            stroke="#2e6be6"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      </div>
    </div>,
    size,
  );
}
