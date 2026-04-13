/**
 * PortalLogin.jsx — Login e acesso ao portal de organizadores.
 * Rota: /portal/login
 * - Formulário de login (e-mail + senha)
 * - Link para cadastro
 * - Credenciais de demo exibidas no rodapé
 * - Redireciona para /portal após login bem-sucedido
 */
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useOrganizer } from "../../context/OrganizerContext";
import { COLORS, FONTS } from "../../styles/colors";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";

export default function PortalLogin() {
  const { login, loginWithGoogle, isAuthenticated } = useOrganizer();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/portal";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const inp = (extra = {}) => ({
    width: "100%", padding: "12px 14px", borderRadius: 8,
    border: `1.5px solid ${COLORS.grayLight}`, fontFamily: FONTS.body,
    fontSize: 15, outline: "none", boxSizing: "border-box",
    background: "#fff", ...extra,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Preencha e-mail e senha."); return; }
    setLoading(true);
    const result = await login({ email: email.trim(), password });
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    navigate(from, { replace: true });
  };

  const handleGoogleLogin = async () => {
    setError(""); setGoogleLoading(true);
    const r = await loginWithGoogle();
    setGoogleLoading(false);
    if (r.error) { setError(r.error); return; }
    if (r.data) navigate(from, { replace: true });
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
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f172a 0%,#1e293b 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 28, fontWeight: 900,
              letterSpacing: 4, color: "#60a5fa" }}>FMA</div>
          </Link>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 800,
            textTransform: "uppercase", color: "#fff", margin: "8px 0 4px", letterSpacing: 1 }}>
            Portal do Organizador
          </h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>
            Permit &amp; Chancela — FMA
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "36px 32px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 800, color: COLORS.dark,
            textTransform: "uppercase", margin: "0 0 24px", letterSpacing: 0.5 }}>
            Entrar na minha conta
          </h2>

          {error && (
            <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8,
              padding: "10px 14px", marginBottom: 18, fontFamily: FONTS.body, fontSize: 13,
              color: "#dc2626", display: "flex", gap: 8 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark,
                display: "block", marginBottom: 6 }}>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" autoComplete="email"
                style={inp()}
                onFocus={e => e.target.style.borderColor = "#60a5fa"}
                onBlur={e => e.target.style.borderColor = COLORS.grayLight} />
            </div>
            <div>
              <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark,
                display: "block", marginBottom: 6 }}>Senha</label>
              <div style={{ position: "relative" }}>
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Sua senha" autoComplete="current-password"
                  style={inp({ paddingRight: 48 })}
                  onFocus={e => e.target.style.borderColor = "#60a5fa"}
                  onBlur={e => e.target.style.borderColor = COLORS.grayLight} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: 4, color: COLORS.gray }}>
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{ marginTop: 4, padding: "14px", borderRadius: 8, border: "none",
                background: loading ? COLORS.gray : "#0066cc", color: "#fff",
                fontFamily: FONTS.heading, fontSize: 15, fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer", textTransform: "uppercase",
                letterSpacing: 1, transition: "background 0.2s" }}>
              {loading ? "Entrando..." : "Entrar"}
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
            style={{ width: "100%", padding: "14px 0", borderRadius: 8, background: "#fff", color: COLORS.dark,
              border: `1.5px solid ${COLORS.grayLight}`, cursor: (googleLoading || loading) ? "not-allowed" : "pointer",
              fontFamily: FONTS.heading, fontSize: 15, fontWeight: 800, letterSpacing: 0.5,
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
              style={{ background: "none", border: "none", padding: 0, fontFamily: FONTS.body, fontSize: 13, color: "#0066cc", cursor: resetLoading ? "not-allowed" : "pointer", textDecoration: "underline" }}>
              {resetLoading ? "Enviando..." : "Esqueci minha senha"}
            </button>
            {resetMsg && (
              <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #86efac", fontFamily: FONTS.body, fontSize: 12, color: "#15803d" }}>
                {resetMsg}
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, textAlign: "center", fontFamily: FONTS.body, fontSize: 13 }}>
            <span style={{ color: COLORS.gray }}>Ainda não tem conta? </span>
            <Link to="/portal/cadastro" style={{ color: "#0066cc", fontWeight: 700, textDecoration: "none" }}>
              Cadastre-se
            </Link>
          </div>
        </div>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <div style={{ fontFamily: FONTS.body, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
            Acesso restrito a organizadores cadastrados.
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link to="/" style={{ fontFamily: FONTS.body, fontSize: 12,
            color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>
            ← Voltar ao site da FMA
          </Link>
        </div>
      </div>
    </div>
  );
}
