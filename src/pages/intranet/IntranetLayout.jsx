/**
 * IntranetLayout.jsx
 * Layout base da intranet de árbitros.
 * - Verifica autenticação; se não autenticado redireciona para /intranet/login.
 * - Sidebar com nav responsiva ao role do usuário logado.
 * - Exporta também useIntranetGuard para proteção de rotas.
 */
import { useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useIntranet } from "../../context/IntranetContext";
import { COLORS, FONTS } from "../../styles/colors";
import {
  INTRANET_NAV_ARBITRO,
  INTRANET_NAV_ADMIN,
  REFEREE_ROLES,
} from "../../config/navigation";

const roleMap = Object.fromEntries(REFEREE_ROLES.map(r => [r.value, r]));

function NavLink({ item }) {
  const location = useLocation();
  const active = location.pathname === item.path || (item.path !== "/intranet" && location.pathname.startsWith(item.path));
  return (
    <Link
      to={item.path}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 16px", borderRadius: 8, textDecoration: "none",
        fontFamily: FONTS.heading, fontSize: 13, fontWeight: active ? 700 : 500,
        background: active ? `${COLORS.primary}18` : "transparent",
        color: active ? COLORS.primary : "rgba(255,255,255,0.75)",
        borderLeft: active ? `3px solid ${COLORS.primary}` : "3px solid transparent",
        transition: "all 0.15s",
      }}
    >
      <span style={{ fontSize: 16 }}>{item.icon}</span>
      {item.label}
    </Link>
  );
}

export default function IntranetLayout({ children, requireRole = null }) {
  const { isAuthenticated, loading, logout, name, role, canManage } = useIntranet();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/intranet/login", { replace: true, state: { from: location.pathname } });
    }
  }, [isAuthenticated, loading]);

  // Role guard
  useEffect(() => {
    if (!loading && isAuthenticated && requireRole) {
      if (requireRole === "admin" && role !== "admin") navigate("/intranet", { replace: true });
      if (requireRole === "canManage" && !canManage) navigate("/intranet", { replace: true });
    }
  }, [isAuthenticated, loading, role]);

  if (loading || !isAuthenticated) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", color: "#fff", fontFamily: FONTS.body }}>Verificando acesso...</div>;
  }

  const nav = canManage ? INTRANET_NAV_ADMIN : INTRANET_NAV_ARBITRO;
  const roleInfo = roleMap[role] || { label: role, color: COLORS.gray };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f4f4f4" }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: "#1a1a1a", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        {/* Brand */}
        <div style={{ padding: "22px 18px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 900, letterSpacing: 4, textTransform: "uppercase", color: COLORS.primary }}>FMA</div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 900, textTransform: "uppercase", color: "#fff", letterSpacing: 0.5, lineHeight: 1.2 }}>Intranet</div>
          </Link>
        </div>

        {/* User info */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, background: `${roleInfo.color}30`, color: roleInfo.color }}>
            {roleInfo.label}
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {nav.map(item => <NavLink key={item.path} item={item} />)}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 8 }}>
          <Link to="/arbitros" style={{ fontFamily: FONTS.body, fontSize: 11, color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>← Área pública</Link>
          <button
            onClick={logout}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: "#ff6666", textAlign: "left", padding: 0 }}
          >
            Sair da Intranet
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>{children}</main>
    </div>
  );
}
