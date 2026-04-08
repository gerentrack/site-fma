/**
 * IntranetLayout.jsx
 * Layout base da intranet de árbitros.
 * - Verifica autenticação; se não autenticado redireciona para /intranet/login.
 * - Sidebar com nav responsiva ao role do usuário logado.
 * - Exporta também useIntranetGuard para proteção de rotas.
 */
import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useIntranet } from "../../context/IntranetContext";
import { useSessionTimeout } from "../../hooks/useSessionTimeout";
import SessionWarning from "../../components/ui/SessionWarning";
import { COLORS, FONTS } from "../../styles/colors";
import {
  INTRANET_NAV_ARBITRO,
  INTRANET_NAV_ADMIN,
  REFEREE_ROLES,
} from "../../config/navigation";
import { EnvioDocumentosService, AnuidadesService, RefereeAssignmentsService, RefereesService } from "../../services/index";

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
  const { isAuthenticated, loading, logout, name, role, canManage, mustChangePassword, profileComplete, refereeId } = useIntranet();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifsVistas, setNotifsVistas] = useState(false);

  const { warningSecondsLeft, dismiss } = useSessionTimeout({
    timeoutMinutes: 1440, // 24 horas
    warningMinutes: 10,
    onTimeout: async () => { await logout(); navigate("/intranet/login", { replace: true }); },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/intranet/login", { replace: true, state: { from: location.pathname } });
    }
  }, [isAuthenticated, loading]);

  // Fluxo de primeiro acesso: troca de senha → completar perfil
  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (mustChangePassword && location.pathname !== "/intranet/alterar-senha") {
        navigate("/intranet/alterar-senha", { replace: true });
      } else if (!mustChangePassword && !profileComplete && location.pathname !== "/intranet/completar-perfil") {
        navigate("/intranet/completar-perfil", { replace: true });
      }
    }
  }, [isAuthenticated, loading, mustChangePassword, profileComplete, location.pathname]);

  // Role guard
  useEffect(() => {
    if (!loading && isAuthenticated && requireRole) {
      if (requireRole === "admin" && role !== "admin") navigate("/intranet", { replace: true });
      if (requireRole === "canManage" && !canManage) navigate("/intranet", { replace: true });
    }
  }, [isAuthenticated, loading, role]);

  // Notificações (atualiza a cada 60s)
  useEffect(() => {
    if (!isAuthenticated || !refereeId || loading) return;
    const fetchNotifs = () => {
      const items = [];
      const ano = new Date().getFullYear();
      Promise.all([
        RefereesService.get(refereeId).then(r => {
          const nv = r.data?.nivel || "";
          return EnvioDocumentosService.listByReferee(refereeId, nv);
        }),
        AnuidadesService.getByRefereeAno(refereeId, ano),
        RefereeAssignmentsService.getByReferee ? RefereeAssignmentsService.getByReferee(refereeId) : Promise.resolve({ data: [] }),
      ]).then(([msgRes, anRes, asRes]) => {
        const msgs = (msgRes.data || []).filter(d => d.remetenteId !== refereeId && !(d.leituras || {})[refereeId]);
        if (msgs.length) items.push({ text: `${msgs.length} mensagem(ns) nao lida(s)`, to: "/intranet/mensagens", color: "#d97706" });
        const an = anRes.data;
        if (an && (an.status === "pendente" || an.status === "vencido")) items.push({ text: `Anuidade ${ano} ${an.status}`, to: "/intranet/anuidade", color: "#dc2626" });
        const futuras = (asRes.data || []).filter(a => a.event?.date >= new Date().toISOString().slice(0, 10));
        if (futuras.length) items.push({ text: `${futuras.length} escala(s) futura(s)`, to: "/intranet/escalas", color: "#0066cc" });
        setNotifs(prev => {
          const changed = prev.map(n => n.text).join("|") !== items.map(n => n.text).join("|");
          if (changed) setNotifsVistas(false);
          return items;
        });
      }).catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refereeId, loading]);

  if (loading || !isAuthenticated) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", color: "#fff", fontFamily: FONTS.body }}>Verificando acesso...</div>;
  }

  const nav = canManage ? INTRANET_NAV_ADMIN : INTRANET_NAV_ARBITRO;
  const roleInfo = roleMap[role] || { label: role, color: COLORS.gray };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f4f4f4" }}>
      <SessionWarning secondsLeft={warningSecondsLeft} onDismiss={dismiss} />
      {/* Sidebar */}
      <aside style={{ width: 220, background: "#1a1a1a", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        {/* Brand */}
        <div style={{ padding: "22px 18px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 900, letterSpacing: 4, textTransform: "uppercase", color: COLORS.primary }}>FMA</div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 900, textTransform: "uppercase", color: "#fff", letterSpacing: 0.5, lineHeight: 1.2 }}>Intranet</div>
          </Link>
        </div>

        {/* User info + Notificações */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: FONTS.body, fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{name}</div>
            <div style={{ position: "relative" }}>
              <button onClick={() => { setShowNotifs(s => !s); setNotifsVistas(true); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: notifs.length > 0 && !notifsVistas ? "#fbbf24" : "rgba(255,255,255,0.4)", padding: "2px 4px", position: "relative" }}>
                🔔
                {notifs.length > 0 && !notifsVistas && (
                  <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#dc2626", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{notifs.length}</span>
                )}
              </button>
              {showNotifs && (
                <div style={{ position: "fixed", left: 8, top: 70, width: 210, background: "#fff", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 9999, overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", borderBottom: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark }}>
                    Notificacoes
                  </div>
                  {notifs.length === 0 ? (
                    <div style={{ padding: "14px", fontSize: 12, color: COLORS.gray, textAlign: "center" }}>Nenhuma notificacao.</div>
                  ) : (
                    notifs.map((n, i) => (
                      <Link key={i} to={n.to} onClick={() => setShowNotifs(false)}
                        style={{ display: "block", padding: "10px 14px", borderBottom: `1px solid ${COLORS.grayLight}`, textDecoration: "none", fontSize: 12, fontFamily: FONTS.body, color: n.color || COLORS.dark, transition: "background 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = COLORS.offWhite}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        {n.text}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, background: `${roleInfo.color}30`, color: roleInfo.color }}>
            {roleInfo.label}
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          {nav.map((item, i) => (
            <div key={item.path}>
              {item.group && (
                <div style={{
                  fontFamily: FONTS.heading, fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: 2, color: "rgba(255,255,255,0.3)", padding: "10px 16px 4px",
                  marginTop: i > 0 ? 6 : 0,
                }}>{item.group}</div>
              )}
              <NavLink item={item} />
            </div>
          ))}
        </nav>

        {/* Aviso de sigilo */}
        <div style={{ padding: "10px 14px", margin: "0 8px 8px", borderRadius: 8, background: "rgba(255,200,0,0.08)", border: "1px solid rgba(255,200,0,0.15)" }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#fbbf24", marginBottom: 3 }}>Ambiente confidencial</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 10, color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
            É proibida a divulgação, captura de tela ou compartilhamento de qualquer informação desta área.
          </div>
        </div>

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
