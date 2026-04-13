import { useState } from "react";
import { Link } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";
const CATEGORY_LABELS = { arbitragem: "Arbitragem", competicao: "Competição", institucional: "Institucional", geral: "Notícia" };
export default function NewsCard({ item }) {
  const [hovered, setHovered] = useState(false);
  const formattedDate = item.date ? new Date(item.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : "";
  return (
    <div style={{ background: COLORS.white, borderRadius: 12, overflow: "hidden", boxShadow: hovered ? "0 12px 40px rgba(0,0,0,0.15)" : "0 2px 12px rgba(0,0,0,0.07)", transition: "box-shadow 0.3s, transform 0.3s", transform: hovered ? "translateY(-4px)" : "translateY(0)", cursor: "pointer" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <img src={item.image} alt={item.title} style={{ width: "100%", height: 180, objectFit: "cover", display: "block", transform: hovered ? "scale(1.05)" : "scale(1)", transition: "transform 0.4s ease" }} />
        <div style={{ position: "absolute", top: 12, left: 12, background: COLORS.primary, color: COLORS.white, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, fontFamily: FONTS.heading, letterSpacing: 1, textTransform: "uppercase" }}>{CATEGORY_LABELS[item.category] || "Notícia"}</div>
      </div>
      <div style={{ padding: "16px 18px 20px" }}>
        <p style={{ fontFamily: FONTS.body, fontSize: 11.5, color: COLORS.gray, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 5 }}>{formattedDate}</p>
        <h3 style={{ fontFamily: FONTS.heading, fontSize: 17, fontWeight: 700, color: COLORS.dark, margin: "0 0 14px", lineHeight: 1.35 }}>{item.title}</h3>
        <Link to={`/noticias/${item.slug || item.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: COLORS.primary, fontWeight: 700, fontSize: 13, fontFamily: FONTS.heading, textDecoration: "none", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `2px solid ${COLORS.primaryLight}`, paddingBottom: 1 }}>Leia Mais →</Link>
      </div>
    </div>
  );
}
