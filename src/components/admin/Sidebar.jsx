import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { COLORS, FONTS } from "../../styles/colors";
import { ADMIN_NAV } from "../../config/navigation";

export default function Sidebar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside style={{ width: 240, minHeight: "100vh", background: COLORS.dark, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 800, color: COLORS.primary, letterSpacing: 2 }}>FMA</div>
        <div style={{ fontFamily: FONTS.body, fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>PAINEL ADMINISTRATIVO</div>
      </div>

      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Conectado como</div>
        <div style={{ fontFamily: FONTS.heading, fontSize: 14, color: "#fff", fontWeight: 600 }}>{user?.name}</div>
        <div style={{ fontFamily: FONTS.body, fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>{user?.role}</div>
      </div>

      <nav style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
        {ADMIN_NAV.map(item => {
          const active = pathname === item.path;
          return (
            <Link key={item.path} to={item.path} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 20px", textDecoration: "none",
              fontFamily: FONTS.heading, fontSize: 13.5, fontWeight: 600,
              color: active ? "#fff" : "rgba(255,255,255,0.55)",
              background: active ? COLORS.primary : "transparent",
              borderLeft: active ? `3px solid ${COLORS.primaryLight}` : "3px solid transparent",
              transition: "background 0.15s, color 0.15s",
              letterSpacing: 0.3,
            }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; } }}
            >
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <Link to="/" style={{ display: "block", fontFamily: FONTS.body, fontSize: 12, color: "rgba(255,255,255,0.4)", textDecoration: "none", marginBottom: 10 }}>← Ver site</Link>
        <button onClick={logout} style={{ width: "100%", padding: "9px", background: "rgba(204,0,0,0.15)", border: "1px solid rgba(204,0,0,0.3)", borderRadius: 6, color: COLORS.primaryLight, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Sair</button>
      </div>
    </aside>
  );
}
