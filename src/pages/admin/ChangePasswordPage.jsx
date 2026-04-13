/**
 * ChangePasswordPage.jsx
 * Tela de troca de senha obrigatória no primeiro login.
 * O usuário não pode acessar o painel sem trocar a senha temporária.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { authAPI } from "../../data/api";
import { COLORS, FONTS } from "../../styles/colors";

export default function ChangePasswordPage() {
  const { user, login } = useAdmin();
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
    const result = await authAPI.updatePassword(form.current, form.newPass);
    setLoading(false);

    if (result.error) {
      if (result.error.includes("wrong-password") || result.error.includes("invalid-credential")) {
        setError("Senha atual incorreta.");
      } else {
        setError(result.error);
      }
      return;
    }

    // Recarregar o perfil para limpar mustChangePassword
    // Salvar email antes do logout (logout limpa o user do contexto)
    const email = user.email;
    await authAPI.logout();
    await login({ email, password: form.newPass });
    navigate("/admin", { replace: true });
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
        width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ marginBottom: 12 }}></div>
          <h1 style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 22, color: COLORS.dark, margin: 0 }}>
            Alterar Senha
          </h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginTop: 8 }}>
            Por segurança, você precisa criar uma nova senha antes de acessar o painel.
          </p>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 6 }}>
              Senha atual (temporária)
            </label>
            <input
              type="password"
              value={form.current}
              onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Senha fornecida pelo administrador"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = COLORS.primary}
              onBlur={e => e.currentTarget.style.borderColor = COLORS.grayLight}
            />
          </div>

          <div>
            <label style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 6 }}>
              Nova senha
            </label>
            <input
              type="password"
              value={form.newPass}
              onChange={e => setForm(f => ({ ...f, newPass: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Mínimo 6 caracteres"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = COLORS.primary}
              onBlur={e => e.currentTarget.style.borderColor = COLORS.grayLight}
            />
          </div>

          <div>
            <label style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 6 }}>
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Repita a nova senha"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = COLORS.primary}
              onBlur={e => e.currentTarget.style.borderColor = COLORS.grayLight}
            />
          </div>
        </div>

        {error && (
          <div style={{ background: "#fff0f0", border: `1px solid ${COLORS.primaryLight}`, borderRadius: 8, padding: "10px 14px", marginTop: 16, fontFamily: FONTS.body, fontSize: 13, color: COLORS.primaryDark }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", padding: "13px", marginTop: 24,
            background: loading ? COLORS.gray : COLORS.primary,
            border: "none", borderRadius: 8, color: COLORS.white,
            fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer", letterSpacing: 1,
            textTransform: "uppercase", transition: "background 0.2s",
          }}
        >
          {loading ? "Alterando..." : "Alterar Senha"}
        </button>
      </div>
    </div>
  );
}
