/**
 * OrganizerContext.jsx
 * Autenticação do portal de organizadores via Firebase Auth.
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { organizerAuthAPI, organizersAPI } from "../data/api";

const OrganizerContext = createContext(null);

export function OrganizerProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const s = await organizerAuthAPI.getSession();
        setSession(s);
      } else {
        setSession(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = useCallback(async (credentials) => {
    const result = await organizerAuthAPI.login(credentials);
    if (result.data) setSession(result.data.session);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await organizerAuthAPI.logout();
    setSession(null);
  }, []);

  const register = useCallback(async (data) => {
    const result = await organizerAuthAPI.register(data);
    if (result.data) {
      // Auto-login após cadastro
      const loginResult = await organizerAuthAPI.login({ email: data.email, password: data.password });
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
      organizerId:    session?.organizerId || null,
      organizerName:  session?.name        || "",
      organizerEmail: session?.email       || "",
    }}>
      {children}
    </OrganizerContext.Provider>
  );
}

export function useOrganizer() {
  return useContext(OrganizerContext);
}
