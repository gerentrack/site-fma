import { useAdmin } from "../context/AdminContext";

/**
 * Hook de autenticação do painel admin.
 *
 * Hierarquia de levels:
 *   master (4) → admin (3) → editor (2) → viewer (1)
 *
 * Uso:
 *   const { user, isMaster, isAdmin, can, hasSection } = useAuth();
 */
const LEVEL_WEIGHT = { master: 4, admin: 3, editor: 2, viewer: 1 };

export function useAuth() {
  const { user, loading, login, logout, isAuthenticated } = useAdmin();

  const level  = user?.level || "viewer";
  const weight = LEVEL_WEIGHT[level] || 0;

  const isMaster = level === "master";
  const isAdmin  = weight >= 3;     // master ou admin
  const isEditor = weight >= 2;     // master, admin ou editor
  const isViewer = weight >= 1;     // todos

  /** Verifica se o usuário tem acesso a uma seção editorial (ex: "noticias") */
  const hasSection = (section) => {
    if (isAdmin) return true;                                   // admin+ vê tudo
    if (level === "editor") return user?.permissions?.includes(section) || false;
    return level === "viewer";                                  // viewer vê (read-only)
  };

  /** Verifica permissão por ação */
  const can = (action) => {
    switch (action) {
      case "manage_admins":    return isMaster;
      case "manage_users":     return isAdmin;
      case "manage_portal":    return isAdmin;
      case "manage_intranet":  return isAdmin;
      case "config_system":    return isMaster;
      case "publish":          return isEditor;
      case "edit":             return isEditor;
      case "view_admin":       return isViewer;
      default:                 return isAuthenticated;
    }
  };

  return {
    user, loading, login, logout, isAuthenticated,
    level, isMaster, isAdmin, isEditor, isViewer,
    hasSection, can,
    // backward-compat aliases
    isSuperAdmin: isMaster,
  };
}
