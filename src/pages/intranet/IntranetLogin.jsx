/**
 * IntranetLogin.jsx — Página de login da intranet de árbitros.
 * Rota: /intranet/login
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useIntranet } from "../../context/IntranetContext";
import { COLORS, FONTS } from "../../styles/colors";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";

export default function IntranetLogin() {
  const { login } = useIntranet();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Preencha e-mail e senha."); return; }
    setLoading(true); setError("");
    const r = await login({ email, password });
    setLoading(false);
    if (r.error) { setError(r.error); return; }
    navigate("/intranet");
  };

  const handleResetPassword = async () => {
    setResetMsg(""); setError("");
    if (!email.trim()) { setError("Digite seu e-mail acima para recuperar a senha."); return; }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetMsg("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
    } catch {
      setResetMsg("Se este e-mail estiver cadastrado, você receberá as instruções de recuperação.");
    }
    setResetLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      {/* Logo / Brand */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 900, letterSpacing: 4, textTransform: "uppercase", color: COLORS.primary, marginBottom: 4 }}>FMA</div>
          <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: "#fff", letterSpacing: 1 }}>Intranet de Árbitros</div>
        </Link>
        <div style={{ fontFamily: FONTS.body, fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>Área restrita — acesso exclusivo para árbitros credenciados</div>
      </div>

      {/* Card */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "36px 40px", width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        <h2 style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 800, color: COLORS.dark, margin: "0 0 24px", textTransform: "uppercase", letterSpacing: 1 }}>Entrar</h2>

        {error && (
          <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#991b1b", fontFamily: FONTS.body, fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, display: "block", marginBottom: 6 }}>E-mail</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username"
              placeholder="seu@email.com"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 14, outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = COLORS.primary}
              onBlur={e => e.target.style.borderColor = COLORS.grayLight}
            />
          </div>
          <div>
            <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, display: "block", marginBottom: 6 }}>Senha</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
              placeholder="••••••••"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 14, outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = COLORS.primary}
              onBlur={e => e.target.style.borderColor = COLORS.grayLight}
            />
          </div>
          <button
            type="submit" disabled={loading}
            style={{ padding: "12px 0", borderRadius: 8, background: loading ? COLORS.gray : COLORS.primary, color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer", fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, letterSpacing: 0.5, marginTop: 4, transition: "background 0.2s" }}
          >
            {loading ? "Entrando..." : "Entrar na Intranet"}
          </button>
        </form>

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

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${COLORS.grayLight}`, textAlign: "center" }}>
          <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>
            Acesso restrito a árbitros credenciados pela FMA.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <Link to="/arbitros" style={{ fontFamily: FONTS.body, fontSize: 13, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>
          ← Voltar à área pública de Árbitros
        </Link>
      </div>
    </div>
  );
}
