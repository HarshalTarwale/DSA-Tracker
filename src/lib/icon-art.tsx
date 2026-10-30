/** Shared artwork for generated app icons (ImageResponse JSX; inline styles required). */
export function IconArt({ size, rounded = true }: { size: number; rounded?: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000000",
        borderRadius: rounded ? size * 0.22 : 0,
        border: `${Math.max(1, Math.round(size / 48))}px solid #232323`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: size * 0.04,
          fontSize: size * 0.46,
          fontWeight: 700,
          letterSpacing: -size * 0.02,
          color: "#F5F5F5",
          lineHeight: 1,
          marginTop: -size * 0.04,
        }}
      >
        <span style={{ color: "#4F8CFF" }}>{"{"}</span>
        <span style={{ fontSize: size * 0.3 }}>DSA</span>
        <span style={{ color: "#4F8CFF" }}>{"}"}</span>
      </div>
    </div>
  );
}
