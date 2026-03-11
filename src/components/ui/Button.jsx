import { COLORS, FONTS } from "../../styles/colors";

const VARIANTS = {
  primary: {
    background: COLORS.primary,
    color: COLORS.white,
    border: "none",
    hoverBg: COLORS.primaryDark,
  },
  secondary: {
    background: "transparent",
    color: COLORS.primary,
    border: `2px solid ${COLORS.primary}`,
    hoverBg: COLORS.primary,
    hoverColor: COLORS.white,
  },
  ghost: {
    background: "transparent",
    color: COLORS.gray,
    border: `1px solid ${COLORS.grayLight}`,
    hoverBg: COLORS.offWhite,
    hoverColor: COLORS.dark,
  },
  danger: {
    background: "#fff0f0",
    color: COLORS.primaryDark,
    border: "none",
    hoverBg: "#ffe0e0",
  },
  dark: {
    background: COLORS.dark,
    color: COLORS.white,
    border: "none",
    hoverBg: COLORS.grayDark,
  },
};

const SIZES = {
  sm: { padding: "5px 12px", fontSize: 12 },
  md: { padding: "9px 20px", fontSize: 13 },
  lg: { padding: "12px 28px", fontSize: 15 },
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  onClick,
  type = "button",
  fullWidth = false,
  style: extraStyle = {},
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;

  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: s.padding,
    background: v.background,
    color: v.color,
    border: v.border || "none",
    borderRadius: 8,
    fontFamily: FONTS.heading,
    fontSize: s.fontSize,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    transition: "background 0.18s, color 0.18s, transform 0.15s",
    width: fullWidth ? "100%" : "auto",
    ...extraStyle,
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      style={baseStyle}
      onMouseEnter={e => {
        if (disabled || loading) return;
        if (v.hoverBg) e.currentTarget.style.background = v.hoverBg;
        if (v.hoverColor) e.currentTarget.style.color = v.hoverColor;
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        if (disabled || loading) return;
        e.currentTarget.style.background = v.background;
        e.currentTarget.style.color = v.color;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {loading ? "Aguarde..." : children}
    </button>
  );
}
