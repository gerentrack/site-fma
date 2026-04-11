/**
 * IntranetContext.jsx
 * Autenticação da intranet de árbitros via Firebase Auth.
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { intranetAuthAPI } from "../data/api";

const IntranetContext = createContext(null);

export function IntranetProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const s = await intranetAuthAPI.getSession();
        setSession(s);
      } else {
        setSession(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await intranetAuthAPI.login(credentials);
    if (result.data) setSession(result.data.session);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await intranetAuthAPI.logout();
    setSession(null);
  }, []);

  const isAuthenticated  = !!session?.refereeId;
  const isAdmin          = session?.role === "admin";
  const isCoordinator    = session?.role === "coordenador";
  const canManage        = isAdmin || isCoordinator;

  return (
    <IntranetContext.Provider value={{
      session, loading, login, logout,
      isAuthenticated, isAdmin, isCoordinator, canManage,
      refereeId:           session?.refereeId || null,
      email:               session?.email     || "",
      role:                session?.role      || null,
      name:                session?.name      || "",
      mustChangePassword:  session?.mustChangePassword || false,
      profileComplete:     session?.profileComplete || false,
      emailVerified:       session?.emailVerified || false,
    }}>
      {children}
    </IntranetContext.Provider>
  );
}

export function useIntranet() {
  return useContext(IntranetContext);
}
