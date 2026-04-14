import { Navigate, useNavigate } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { useAuth } from "../../hooks/useAuth";
import { useSessionTimeout } from "../../hooks/useSessionTimeout";
import { useMobileDrawer } from "../../hooks/useMobileDrawer";
import SessionWarning from "../ui/SessionWarning";
import Sidebar from "./Sidebar";
import { COLORS, FONTS } from "../../styles/colors";

const LEVEL_WEIGHT = { master: 4, admin: 3, editor: 2, viewer: 1 };

// Timeout por nível: master/admin = 2h, editor = 4h, viewer = 8h
const TIMEOUT_BY_LEVEL = { master: 120, admin: 120, editor: 240, viewer: 480 };

/**
 * AdminLayout — layout base do painel admin.
 *
 * Props opcionais:
 *   minLevel  — nível mínimo para acessar a rota (default: "viewer")
 *   section   — para editors, verifica se tem permissão na seção
 */
export default function AdminLayout({ children, minLevel = "viewer", section = null }) {
  const { isAuthenticated, loading, logout } = useAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { open, setOpen, toggle } = useMobileDrawer();

  const timeoutMinutes = TIMEOUT_BY_LEVEL[user?.level] || 120;
  const { warningSecondsLeft, dismiss } = useSessionTimeout({
    timeoutMinutes,
    warningMinutes: 5,
    onTimeout: async () => { await logout(); navigate("/admin/login", { replace: true }); },
    enabled: isAuthenticated,
  });

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: COLORS.dark }}><span style={{ color: COLORS.white, fontFamily: FONTS.body }}>Carregando...</span></div>;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace state={{ from: window.location.pathname }} />;

  // Forçar troca de senha no primeiro login
  if (user?.mustChangePassword) return <Navigate to="/admin/alterar-senha" replace />;

  // Verificar nível de acesso
  const userWeight = LEVEL_WEIGHT[user?.level] || 0;
  const requiredWeight = LEVEL_WEIGHT[minLevel] || 0;
  if (userWeight < requiredWeight) {
    return <Navigate to="/admin" replace />;
  }

  // Para editors, verificar permissão de seção
  if (user?.level === "editor" && section && !user.permissions?.includes(section)) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: COLORS.offWhite }}>
      <SessionWarning secondsLeft={warningSecondsLeft} onDismiss={dismiss} />
      {/* Mobile topbar */}
      <div className="show-mobile-flex" style={{ position: "sticky", top: 0, zIndex: 998, height: 48, alignItems: "center", justifyContent: "space-between", padding: "0 16px", background: COLORS.dark }}>
        <button className="hamburger" onClick={toggle} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", padding: 4 }}>&#9776;</button>
        <span style={{ color: "#fff", fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>Admin FMA</span>
        <div style={{ width: 30 }} />
      </div>
      <div style={{ display: "flex", flex: 1 }}>
        {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <main className="layout-main" style={{ flex: 1, overflow: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
