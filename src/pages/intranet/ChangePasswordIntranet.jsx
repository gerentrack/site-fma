/**
 * ChangePasswordIntranet.jsx
 * Troca de senha obrigatória no primeiro login do árbitro.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIntranet } from "../../context/IntranetContext";
import { intranetAuthAPI } from "../../data/api";
import { COLORS, FONTS } from "../../styles/colors";

export default function ChangePasswordIntranet() {
  const { session, login } = useIntranet();
  const navigate = useNavigate();

  const [form, setForm] = useState({ current: "", newPass: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!form.current) { setError("Digite sua senha atual (temporária)."); return; }
    if (!form.newPass) { setError("Digite a nova senha."); return; }
    if (form.newPass.length < 6) { setError("A nova senha deve ter no mínimo 6 caracteres."); return; }
    if (form.newPass === form.current) { setError("A nova senha deve ser diferente da atual."); return; }
    if (form.newPass !== form.confirm) { setError("As senhas não conferem."); return; }

    setLoading(true);
    const result = await intranetAuthAPI.updatePassword(form.current, form.newPass, session.refereeId);
    setLoading(false);

    if (result.error) { setError(result.error); return; }

    // Salvar email antes do logout (logout limpa a session do contexto)
    const email = session.email;
    await intranetAuthAPI.logout();
    await login({ email, password: form.newPass });
    navigate("/intranet", { replace: true });
  };

  const inp = {
    width: "100%", padding: "12px 14px", borderRadius: 8,
    border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body,
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "48px 40px", width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 22, color: COLORS.dark, margin: 0 }}>Alterar Senha</h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginTop: 8 }}>
            Por segurança, crie uma nova senha antes de acessar a intranet.
          </p>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 6 }}>Senha atual (temporária)</label>
            <input type="password" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="Senha fornecida pelo coordenador" style={inp} />
          </div>
          <div>
            <label style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 6 }}>Nova senha</label>
            <input type="password" value={form.newPass} onChange={e => setForm(f => ({ ...f, newPass: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="Mínimo 6 caracteres" style={inp} />
          </div>
          <div>
            <label style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 6 }}>Confirmar nova senha</label>
            <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="Repita a nova senha" style={inp} />
          </div>
        </div>

        {error && (
          <div style={{ background: "#fff0f0", border: `1px solid ${COLORS.primaryLight}`, borderRadius: 8, padding: "10px 14px", marginTop: 16, fontFamily: FONTS.body, fontSize: 13, color: COLORS.primaryDark }}>{error}</div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: "100%", padding: 13, marginTop: 24,
          background: loading ? COLORS.gray : COLORS.primary,
          border: "none", borderRadius: 8, color: "#fff",
          fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          textTransform: "uppercase", letterSpacing: 1,
        }}>
          {loading ? "Alterando..." : "Alterar Senha"}
        </button>
      </div>
    </div>
  );
}
