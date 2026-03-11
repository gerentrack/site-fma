import { COLORS, FONTS } from "../../styles/colors";

const PRESETS = {
  published:   { label: "Publicado",   bg: "#e6f9ee", color: "#007733" },
  draft:       { label: "Rascunho",    bg: "#f5f5f5", color: COLORS.gray },
  active:      { label: "Ativo",       bg: "#e6f9ee", color: "#007733" },
  inactive:    { label: "Inativo",     bg: "#f5f5f5", color: COLORS.gray },
  corrida:     { label: "Corrida",     bg: "#fff0f0", color: COLORS.primary },
  pista:       { label: "Pista",       bg: "#e8f0ff", color: "#0066cc" },
  trail:       { label: "Trail",       bg: "#e8f5e9", color: "#007733" },
  institucional: { label: "Institucional", bg: "#fff8e1", color: "#884400" },
  arbitragem:  { label: "Arbitragem",  bg: "#fff0f0", color: COLORS.primary },
  competicao:  { label: "Competição",  bg: "#e8f0ff", color: "#0066cc" },
  geral:       { label: "Geral",       bg: "#f5f5f5", color: COLORS.gray },
};

export default function Badge({ preset, label, bg, color }) {
  const p = PRESETS[preset] || {};
  const finalLabel = label || p.label || preset || "";
  const finalBg = bg || p.bg || COLORS.grayLight;
  const finalColor = color || p.color || COLORS.gray;

  return (
    <span style={{
      display: "inline-block",
      padding: "3px 11px",
      borderRadius: 20,
      fontSize: 11,
      fontFamily: FONTS.heading,
      fontWeight: 700,
      letterSpacing: 0.5,
      background: finalBg,
      color: finalColor,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>
      {finalLabel}
    </span>
  );
}
