import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand-config";

/** Temporary initial, not the proposed logo. Full-bleed artwork allows OS masks. */
export function appIcon(size: number) {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: "#181917",
        color: "#f8f8f5",
        fontSize: size * 0.52,
        fontWeight: 600,
      }}
    >
      {brand.initial}
    </div>,
    { width: size, height: size },
  );
}
