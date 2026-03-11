import { COLORS, FONTS } from "../../styles/colors";

export default function DropdownMenu({ items, visible }) {
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <div style={{
      position: "absolute",
      top: "100%",
      left: 0,
      background: COLORS.white,
      minWidth: 220,
      boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
      borderRadius: 8,
      overflow: "hidden",
      zIndex: 1000,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(-8px)",
      pointerEvents: visible ? "all" : "none",
      transition: "opacity 0.2s ease, transform 0.2s ease",
      borderTop: `3px solid ${COLORS.primary}`,
    }}>
      {safeItems.map((item, i) => (
        <a
          key={i}
          href={item.link}
          style={{
            display: "block",
            padding: "10px 18px",
            color: COLORS.dark,
            textDecoration: "none",
            fontSize: 13.5,
            fontFamily: FONTS.body,
            borderBottom: i < safeItems.length - 1 ? `1px solid ${COLORS.grayLight}` : "none",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = COLORS.offWhite;
            e.currentTarget.style.color = COLORS.primary;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = COLORS.dark;
          }}
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}
