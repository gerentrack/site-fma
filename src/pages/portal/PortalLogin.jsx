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
  const { login, isAuthenticated } = useOrganizer();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/portal";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
              ⚠️ {error}
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
                    background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>
                  {showPass ? "🙈" : "👁️"}
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
