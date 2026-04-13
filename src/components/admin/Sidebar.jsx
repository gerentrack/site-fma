import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { COLORS, FONTS } from "../../styles/colors";
import { ADMIN_NAV } from "../../config/navigation";
import Icon from "../../utils/icons";

const LEVEL_WEIGHT = { master: 4, admin: 3, editor: 2, viewer: 1 };
const LEVEL_LABEL  = { master: "Master", admin: "Administrador", editor: "Editor", viewer: "Visualizador" };

export default function Sidebar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const userWeight = LEVEL_WEIGHT[user?.level] || 0;

  const visibleNav = ADMIN_NAV.filter(item => {
    const itemWeight = LEVEL_WEIGHT[item.minLevel] || 0;
    if (userWeight < itemWeight) return false;
    // editor: só mostra se tem a section nas permissions
    if (user?.level === "editor" && item.section) {
      return user.permissions?.includes(item.section);
    }
    return true;
  });

  return (
    <aside style={{ width: 240, minHeight: "100vh", background: COLORS.dark, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 800, color: COLORS.primary, letterSpacing: 2 }}>FMA</div>
        <div style={{ fontFamily: FONTS.body, fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>PAINEL ADMINISTRATIVO</div>
      </div>

      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Conectado como</div>
        <div style={{ fontFamily: FONTS.heading, fontSize: 14, color: "#fff", fontWeight: 600 }}>{user?.name}</div>
        <div style={{ fontFamily: FONTS.body, fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>{LEVEL_LABEL[user?.level] || user?.level}</div>
      </div>

      <nav style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
        {visibleNav.map((item, i) => {
          const active = pathname === item.path;
          return (
            <div key={item.path}>
              {/* Separador de grupo */}
              {item.group && (
                <div style={{
                  padding: "14px 20px 6px",
                  fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: 1.5,
                  color: "rgba(255,255,255,0.25)",
                  marginTop: i > 0 ? 6 : 0,
                }}>
                  {item.group}
                </div>
              )}
              <Link to={item.path} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 20px", textDecoration: "none",
                fontFamily: FONTS.heading, fontSize: 13, fontWeight: 600,
                color: active ? "#fff" : "rgba(255,255,255,0.55)",
                background: active ? COLORS.primary : "transparent",
                borderLeft: active ? `3px solid ${COLORS.primaryLight}` : "3px solid transparent",
                transition: "background 0.15s, color 0.15s",
                letterSpacing: 0.3,
              }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; } }}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}><Icon name={item.icon} size={14} /></span>
                {item.label}
              </Link>
            </div>
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
