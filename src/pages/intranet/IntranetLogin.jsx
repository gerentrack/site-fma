/**
 * IntranetLogin.jsx — Página de login da intranet de árbitros.
 * Rota: /intranet/login
 */
import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useIntranet } from "../../context/IntranetContext";
import { COLORS, FONTS } from "../../styles/colors";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";

export default function IntranetLogin() {
  const { login, loginWithGoogle } = useIntranet();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/intranet";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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
    navigate(from, { replace: true });
  };

  const handleGoogleLogin = async () => {
    setError(""); setGoogleLoading(true);
    const r = await loginWithGoogle();
    setGoogleLoading(false);
    if (r.error) { setError(r.error); return; }
    if (r.data) navigate("/intranet");
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

        {/* Separador */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: COLORS.grayLight }} />
          <span style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, textTransform: "uppercase", letterSpacing: 1 }}>ou</span>
          <div style={{ flex: 1, height: 1, background: COLORS.grayLight }} />
        </div>

        {/* Botao Google */}
        <button type="button" onClick={handleGoogleLogin} disabled={googleLoading || loading}
          style={{ width: "100%", padding: "12px 0", borderRadius: 8, background: "#fff", color: COLORS.dark,
            border: `1.5px solid ${COLORS.grayLight}`, cursor: (googleLoading || loading) ? "not-allowed" : "pointer",
            fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, letterSpacing: 0.5,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "border-color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#4285f4"}
          onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.grayLight}>
          {!googleLoading && (
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          )}
          {googleLoading ? "Entrando..." : "Entrar com Google"}
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
