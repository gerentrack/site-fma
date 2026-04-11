/**
 * VerificarEmailPortal.jsx
 * Verificação obrigatória de e-mail do organizador após login.
 * Permite corrigir o e-mail caso esteja errado.
 */
import { useState } from "react";
import { useOrganizer } from "../../context/OrganizerContext";
import { organizersAPI } from "../../data/api";
import { enviarCodigoVerificacao } from "../../services/emailService";
import { COLORS, FONTS } from "../../styles/colors";

export default function VerificarEmailPortal() {
  const { organizerId, organizerEmail, organizerName, logout } = useOrganizer();

  const [code, setCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [expiry, setExpiry] = useState(null);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);

  // Alterar email
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const gerarCodigo = () => String(Math.floor(100000 + Math.random() * 900000));

  const enviarCodigo = async () => {
    setSending(true);
    setMsg("");
    const c = gerarCodigo();
    setSentCode(c);
    setExpiry(Date.now() + 10 * 60 * 1000);
    await enviarCodigoVerificacao({
      email: organizerEmail,
      nome: organizerName || "Organizador",
      codigo: c,
    });
    setSent(true);
    setMsg("Codigo enviado! Verifique sua caixa de entrada.");
    setSending(false);
  };

  const verificar = async () => {
    setMsg("");
    if (Date.now() > expiry) {
      setMsg("Codigo expirado. Solicite um novo.");
      setSent(false);
      return;
    }
    if (code.trim() !== sentCode) {
      setMsg("Codigo incorreto. Tente novamente.");
      return;
    }
    setVerifying(true);
    await organizersAPI.update(organizerId, {
      emailVerified: true,
      emailVerifiedAt: new Date().toISOString(),
    });
    setVerifying(false);
    window.location.href = "/portal";
  };

  const salvarNovoEmail = async () => {
    setEmailError("");
    const email = newEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError("E-mail invalido."); return; }
    if (!password) { setEmailError("Digite sua senha para confirmar."); return; }
    setSavingEmail(true);
    const r = await organizersAPI.updateEmail(organizerId, email, password);
    setSavingEmail(false);
    if (r.error) { setEmailError(r.error); return; }
    window.location.reload();
  };

  const inp = {
    width: "100%", padding: "12px 14px", borderRadius: 8,
    border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body,
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f172a 0%,#1e293b 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "48px 40px", width: "100%", maxWidth: 420,
        boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>&#9993;</div>
          <h1 style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 22, color: COLORS.dark, margin: 0 }}>
            Verificar E-mail
          </h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginTop: 8 }}>
            Precisamos confirmar seu e-mail <strong>{organizerEmail}</strong> para liberar o acesso ao portal.
          </p>
        </div>

        {editingEmail ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 6 }}>
                Novo e-mail
              </label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="seu@email.com" style={inp} />
            </div>
            <div>
              <label style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 6 }}>
                Senha atual
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && salvarNovoEmail()}
                placeholder="Confirme sua senha" style={inp} />
            </div>
            {emailError && (
              <div style={{ background: "#fff0f0", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px",
                fontFamily: FONTS.body, fontSize: 13, color: "#dc2626" }}>{emailError}</div>
            )}
            <button onClick={salvarNovoEmail} disabled={savingEmail} style={{
              width: "100%", padding: 13,
              background: savingEmail ? COLORS.gray : "#0066cc",
              border: "none", borderRadius: 8, color: "#fff",
              fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700,
              cursor: savingEmail ? "not-allowed" : "pointer",
              textTransform: "uppercase", letterSpacing: 1,
            }}>
              {savingEmail ? "Salvando..." : "Salvar novo e-mail"}
            </button>
            <button onClick={() => { setEditingEmail(false); setEmailError(""); }} type="button"
              style={{ background: "none", border: "none", cursor: "pointer",
                fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, textDecoration: "underline", padding: 0 }}>
              Cancelar
            </button>
          </div>
        ) : !sent ? (
          <div style={{ display: "grid", gap: 12 }}>
            <button onClick={enviarCodigo} disabled={sending} style={{
              width: "100%", padding: 13,
              background: sending ? COLORS.gray : "#0066cc",
              border: "none", borderRadius: 8, color: "#fff",
              fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700,
              cursor: sending ? "not-allowed" : "pointer",
              textTransform: "uppercase", letterSpacing: 1,
            }}>
              {sending ? "Enviando..." : "Enviar Codigo de Verificacao"}
            </button>
            <button onClick={() => { setEditingEmail(true); setNewEmail(""); setPassword(""); }} type="button"
              style={{ background: "none", border: "none", cursor: "pointer",
                fontFamily: FONTS.body, fontSize: 13, color: "#0066cc", textDecoration: "underline", padding: 0 }}>
              E-mail incorreto? Alterar
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 6 }}>
                Codigo de verificacao
              </label>
              <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={e => e.key === "Enter" && code.length === 6 && verificar()}
                placeholder="000000" maxLength={6}
                style={{ ...inp, letterSpacing: 8, textAlign: "center", fontSize: 24, fontWeight: 700 }} />
            </div>

            <button onClick={verificar} disabled={verifying || code.length !== 6} style={{
              width: "100%", padding: 13,
              background: verifying || code.length !== 6 ? COLORS.gray : "#15803d",
              border: "none", borderRadius: 8, color: "#fff",
              fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700,
              cursor: verifying || code.length !== 6 ? "not-allowed" : "pointer",
              textTransform: "uppercase", letterSpacing: 1,
            }}>
              {verifying ? "Verificando..." : "Confirmar"}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={enviarCodigo} disabled={sending} type="button"
                style={{ background: "none", border: "none", cursor: "pointer",
                  fontFamily: FONTS.body, fontSize: 13, color: "#0066cc", textDecoration: "underline", padding: 0 }}>
                {sending ? "Enviando..." : "Reenviar codigo"}
              </button>
              <button onClick={() => { setEditingEmail(true); setSent(false); setNewEmail(""); setPassword(""); setMsg(""); }} type="button"
                style={{ background: "none", border: "none", cursor: "pointer",
                  fontFamily: FONTS.body, fontSize: 13, color: "#0066cc", textDecoration: "underline", padding: 0 }}>
                Alterar e-mail
              </button>
            </div>
          </div>
        )}

        {msg && (
          <div style={{
            background: msg.includes("enviado") ? "#f0fdf4" : "#fff0f0",
            border: `1px solid ${msg.includes("enviado") ? "#bbf7d0" : "#fca5a5"}`,
            borderRadius: 8, padding: "10px 14px", marginTop: 16,
            fontFamily: FONTS.body, fontSize: 13,
            color: msg.includes("enviado") ? "#15803d" : "#dc2626",
          }}>
            {msg}
          </div>
        )}

        <button onClick={logout} style={{
          width: "100%", marginTop: 20, padding: 10,
          background: "transparent", border: `1px solid ${COLORS.grayLight}`,
          borderRadius: 8, fontFamily: FONTS.body, fontSize: 13,
          color: COLORS.gray, cursor: "pointer",
        }}>
          Sair
        </button>
      </div>
    </div>
  );
}
