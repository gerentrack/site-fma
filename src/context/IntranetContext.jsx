/**
 * IntranetContext.jsx
 * Contexto de autenticação da intranet de árbitros.
 * Completamente separado do AdminContext (FMA admin).
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { IntranetAuthService } from "../services/index";

const IntranetContext = createContext(null);

export function IntranetProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = IntranetAuthService.getSession();
    setSession(s);
    setLoading(false);
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await IntranetAuthService.login(credentials);
    if (result.data) setSession(result.data.session);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await IntranetAuthService.logout();
    setSession(null);
  }, []);

  const isAuthenticated = !!session?.refereeId;
  const isAdmin = session?.role === "admin";
  const isCoordinator = session?.role === "coordenador";
  const canManage = isAdmin || isCoordinator;

  return (
    <IntranetContext.Provider value={{
      session, loading, login, logout,
      isAuthenticated, isAdmin, isCoordinator, canManage,
      refereeId: session?.refereeId || null,
      role: session?.role || null,
      name: session?.name || "",
    }}>
      {children}
    </IntranetContext.Provider>
  );
}

export function useIntranet() {
  return useContext(IntranetContext);
}
