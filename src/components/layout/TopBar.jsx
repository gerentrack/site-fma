import { COLORS, FONTS } from "../../styles/colors";
const contacts = [
  { icon: "✉️", label: "mg@cbat.org.br", link: "mailto:mg@cbat.org.br" },
  { icon: "💬", label: "(31) 99815-2403", link: "https://wa.me/5531998152403" },
];
export default function TopBar() {
  return (
    <div style={{ background: COLORS.primaryDark, padding: "7px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
      <span style={{ fontFamily: FONTS.body, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>🕐 Atendimento: 12:30h às 18h</span>
      <div style={{ display: "flex", gap: 20 }}>
        {contacts.map((c, i) => (
          <a key={i} href={c.link} style={{ display: "flex", gap: 5, alignItems: "center", color: "rgba(255,255,255,0.85)", textDecoration: "none", fontSize: 12, fontFamily: FONTS.body, transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = COLORS.grayLight}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.85)"}
          ><span>{c.icon}</span> {c.label}</a>
        ))}
      </div>
    </div>
  );
}
