/**
 * PortalLayout.jsx — Layout do portal de organizadores.
 * - Guard de autenticação: redireciona para /portal/login se não autenticado.
 * - Sidebar escura com nav do organizador.
 */
import { useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useOrganizer } from "../../context/OrganizerContext";
import { useSessionTimeout } from "../../hooks/useSessionTimeout";
import SessionWarning from "../../components/ui/SessionWarning";
import { COLORS, FONTS } from "../../styles/colors";
import { PORTAL_NAV } from "../../config/navigation";

function NavLink({ item }) {
  const location = useLocation();
  const active = location.pathname === item.path ||
    (item.path !== "/portal" && location.pathname.startsWith(item.path));
  return (
    <Link to={item.path} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 16px", borderRadius: 8, textDecoration: "none",
      fontFamily: FONTS.heading, fontSize: 13, fontWeight: active ? 700 : 500,
      background: active ? "rgba(0,102,204,0.18)" : "transparent",
      color: active ? "#60a5fa" : "rgba(255,255,255,0.72)",
      borderLeft: active ? "3px solid #60a5fa" : "3px solid transparent",
      transition: "all 0.15s",
    }}>
      <span style={{ fontSize: 15 }}>{item.icon}</span>
      {item.label}
    </Link>
  );
}

export default function PortalLayout({ children }) {
  const { isAuthenticated, loading, logout, organizerName, organizerOrg } = useOrganizer();
  const navigate = useNavigate();
  const location = useLocation();

  const { warningSecondsLeft, dismiss } = useSessionTimeout({
    timeoutMinutes: 10080, // 7 dias
    warningMinutes: 30,
    onTimeout: async () => { await logout(); navigate("/portal/login", { replace: true }); },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/portal/login", { replace: true, state: { from: location.pathname } });
    }
  }, [isAuthenticated, loading]);

  if (loading || !isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#0f172a", color: "#fff", fontFamily: FONTS.body }}>
        Verificando acesso...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f1f5f9" }}>
      <SessionWarning secondsLeft={warningSecondsLeft} onDismiss={dismiss} />
      {/* Sidebar */}
      <aside style={{ width: 230, background: "#0f172a", display: "flex", flexDirection: "column",
        flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        {/* Brand */}
        <div style={{ padding: "22px 18px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 900,
              letterSpacing: 4, textTransform: "uppercase", color: "#60a5fa" }}>FMA</div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 900,
              textTransform: "uppercase", color: "#fff", letterSpacing: 0.5, lineHeight: 1.3 }}>
              Portal do Organizador
            </div>
          </Link>
        </div>

        {/* User info */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, fontWeight: 600, color: "#fff",
            marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {organizerName}
          </div>
          {organizerOrg && (
            <div style={{ fontFamily: FONTS.body, fontSize: 11, color: "rgba(255,255,255,0.45)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {organizerOrg}
            </div>
          )}
          <span style={{ display: "inline-block", marginTop: 6, padding: "2px 8px",
            borderRadius: 20, fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700,
            background: "rgba(96,165,250,0.18)", color: "#60a5fa" }}>
            Organizador
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {PORTAL_NAV.map(item => <NavLink key={item.path} item={item} />)}
        </nav>

        {/* Footer */}
        <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column", gap: 8 }}>
          <Link to="/portal/ajuda" style={{ fontFamily: FONTS.body, fontSize: 11,
            color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>❓ Ajuda</Link>
          <Link to="/" style={{ fontFamily: FONTS.body, fontSize: 11,
            color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>← Site FMA</Link>
          <button onClick={logout} style={{ background: "transparent", border: "none",
            cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700,
            color: "#f87171", textAlign: "left", padding: 0 }}>
            Sair do Portal
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>
        {children}
      </main>
    </div>
  );
}
