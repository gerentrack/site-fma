/**
 * OrganizerContext.jsx
 * Contexto de autenticação do portal de organizadores.
 * Completamente separado do AdminContext e IntranetContext.
 *
 * Provê: session, loading, login, logout, register,
 *        isAuthenticated, organizerId, organizerName
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { OrganizerAuthService, OrganizersService } from "../services/index";

const OrganizerContext = createContext(null);

export function OrganizerProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = OrganizerAuthService.getSession();
    setSession(s || null);
    setLoading(false);
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await OrganizerAuthService.login(credentials);
    if (result.data) setSession(result.data.session);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await OrganizerAuthService.logout();
    setSession(null);
  }, []);

  const register = useCallback(async (data) => {
    const result = await OrganizersService.register(data);
    if (result.data) {
      // Auto-login após cadastro
      const loginResult = await OrganizerAuthService.login({
        email: data.email,
        password: data.password,
      });
      if (loginResult.data) setSession(loginResult.data.session);
    }
    return result;
  }, []);

  const isAuthenticated = !!session?.organizerId;

  return (
    <OrganizerContext.Provider value={{
      session,
      loading,
      login,
      logout,
      register,
      isAuthenticated,
      organizerId: session?.organizerId || null,
      organizerName: session?.name || "",
      organizerEmail: session?.email || "",
      organizerOrg: session?.organization || "",
    }}>
      {children}
    </OrganizerContext.Provider>
  );
}

export function useOrganizer() {
  return useContext(OrganizerContext);
}
