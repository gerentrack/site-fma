import { useAdmin } from "../context/AdminContext";

/**
 * Hook de autenticação.
 * Wrapper sobre AdminContext com helpers extras.
 *
 * Uso:
 *   const { user, isAuthenticated, isSuperAdmin, login, logout } = useAuth();
 */
export function useAuth() {
  const { user, loading, login, logout, isAuthenticated } = useAdmin();

  const isSuperAdmin = user?.role === "super";
  const isEditor = user?.role === "editor" || isSuperAdmin;
  const isArbitro = user?.role === "arbitro" || isSuperAdmin;

  const can = (action) => {
    switch (action) {
      case "manage_users": return isSuperAdmin;
      case "publish": return isEditor;
      case "edit": return isEditor;
      case "view_admin": return isAuthenticated;
      default: return isAuthenticated;
    }
  };

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated,
    isSuperAdmin,
    isEditor,
    isArbitro,
    can,
  };
}
