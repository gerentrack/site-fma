import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { COLORS, FONTS } from "../../styles/colors";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";

export default function AdminLogin() {
  const { login, isAuthenticated } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/admin";
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    const { error: err } = await login(form);
    setLoading(false);
    if (err) { setError(err); return; }
    navigate(from, { replace: true });
  };

  const handleResetPassword = async () => {
    setResetMsg(""); setError("");
    if (!form.email.trim()) { setError("Digite seu e-mail acima para recuperar a senha."); return; }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, form.email.trim());
      setResetMsg("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
    } catch {
      setResetMsg("Se este e-mail estiver cadastrado, você receberá as instruções de recuperação.");
    }
    setResetLoading(false);
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 8,
    border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body,
    fontSize: 14, outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{
      minHeight: "100vh", background: COLORS.dark,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: COLORS.white, borderRadius: 16, padding: "48px 40px",
        width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ marginBottom: 12 }}></div>
          <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 24, color: COLORS.primary, letterSpacing: 2 }}>FMA</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginTop: 4 }}>Painel Administrativo</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 6 }}>E-mail</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="seu@email.com"
            style={inputStyle}
            onFocus={e => e.currentTarget.style.borderColor = COLORS.primary}
            onBlur={e => e.currentTarget.style.borderColor = COLORS.grayLight}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 6 }}>Senha</label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="••••••••"
            style={inputStyle}
            onFocus={e => e.currentTarget.style.borderColor = COLORS.primary}
            onBlur={e => e.currentTarget.style.borderColor = COLORS.grayLight}
          />
        </div>

        {error && (
          <div style={{ background: "#fff0f0", border: `1px solid ${COLORS.primaryLight}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontFamily: FONTS.body, fontSize: 13, color: COLORS.primaryDark }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", padding: "13px", background: loading ? COLORS.gray : COLORS.primary,
            border: "none", borderRadius: 8, color: COLORS.white,
            fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer", letterSpacing: 1,
            textTransform: "uppercase", transition: "background 0.2s",
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button type="button" onClick={handleResetPassword} disabled={resetLoading}
            style={{ background: "none", border: "none", padding: 0, fontFamily: FONTS.body, fontSize: 13, color: COLORS.primary, cursor: resetLoading ? "not-allowed" : "pointer", textDecoration: "underline" }}>
            {resetLoading ? "Enviando..." : "Esqueci minha senha"}
          </button>
          {resetMsg && (
            <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #86efac", fontFamily: FONTS.body, fontSize: 12, color: "#15803d" }}>
              {resetMsg}
            </div>
          )}
        </div>

        <p style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, textAlign: "center", marginTop: 16 }}>
          Acesso restrito a usuários autorizados.
        </p>
      </div>
    </div>
  );
}
