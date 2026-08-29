import { ImageResponse } from "next/og";

// The standard apple-touch-icon size iOS actually requests.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#161614",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 150,
            height: 150,
            alignItems: "center",
            justifyContent: "center",
            border: "6px solid #d4af4f",
            color: "#d4af4f",
            fontFamily: "serif",
            fontSize: 52,
            fontWeight: 700,
            letterSpacing: 2,
          }}
        >
          CSN
        </div>
      </div>
    ),
    size,
  );
}
