import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand-config";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Neutral initial while a final logo is being selected. Tracks the central name.
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 20,
        background: "#181917",
        color: "#f8f8f5",
        fontSize: 42,
        fontWeight: 600,
      }}
    >
      {brand.initial}
    </div>,
    size,
  );
}
