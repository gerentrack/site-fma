import { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { authAPI } from "../data/api";

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await authAPI.getUser();
        setUser(profile || null);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (credentials) => {
    const result = await authAPI.login(credentials);
    if (result.data) setUser(result.data.user);
    return result;
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  return (
    <AdminContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
