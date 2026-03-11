import { Navigate } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import Sidebar from "./Sidebar";
import { COLORS, FONTS } from "../../styles/colors";
export default function AdminLayout({ children }) {
  const { isAuthenticated, loading } = useAdmin();
  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: COLORS.dark }}><span style={{ color: COLORS.white, fontFamily: FONTS.body }}>Carregando...</span></div>;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.offWhite }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
    </div>
  );
}
