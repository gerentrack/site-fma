import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../data/api";
const AdminContext = createContext(null);
export function AdminProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (authAPI.check()) setUser(authAPI.getUser()); setLoading(false); }, []);
  const login = async (credentials) => { const { data, error } = await authAPI.login(credentials); if (data) setUser(data.user); return { data, error }; };
  const logout = async () => { await authAPI.logout(); setUser(null); };
  return <AdminContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>{children}</AdminContext.Provider>;
}
export function useAdmin() { return useContext(AdminContext); }
