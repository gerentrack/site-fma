/**
 * MyProfile.jsx — Meus dados (árbitro edita nome, telefone, senha).
 * Rota: /intranet/perfil
 */
import { useState, useEffect } from "react";
import IntranetLayout from "../IntranetLayout";
import { useIntranet } from "../../../context/IntranetContext";
import { RefereesService } from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";
import { REFEREE_CATEGORIES, REFEREE_ROLES, REFEREE_STATUS } from "../../../config/navigation";

const catMap = Object.fromEntries((REFEREE_CATEGORIES || []).map(c => [c.value, c]));
const roleMap = Object.fromEntries((REFEREE_ROLES || []).map(r => [r.value, r]));
const statusMap = Object.fromEntries((REFEREE_STATUS || []).map(s => [s.value, s]));

const inp = { width: "100%", padding: "10px 13px", borderRadius: 8, border: `1.5px solid #e8e8e8`, fontFamily: "'Barlow',sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" };

export default function MyProfile() {
  const { refereeId } = useIntranet();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    RefereesService.get(refereeId).then(r => {
      if (r.data) { setProfile(r.data); setForm({ name: r.data.name, phone: r.data.phone || "" }); }
    });
  }, [refereeId]);

  const saveProfile = async () => {
    setSaving(true); setMsg("");
    const r = await RefereesService.update(refereeId, { name: form.name, phone: form.phone });
    setSaving(false);
    setMsg(r.error ? `Erro: ${r.error}` : "✅ Dados atualizados com sucesso!");
  };

  const savePassword = async () => {
    if (!pw.current || !pw.next) { setPwMsg("Preencha todos os campos."); return; }
    if (pw.next !== pw.confirm) { setPwMsg("A nova senha e a confirmação não coincidem."); return; }
    if (pw.next.length < 6) { setPwMsg("A senha deve ter pelo menos 6 caracteres."); return; }
    setPwSaving(true); setPwMsg("");
    const r = await RefereesService.updatePassword(refereeId, pw.next);
    setPwSaving(false);
    setPwMsg(r.error ? `Erro: ${r.error}` : "✅ Senha alterada com sucesso!");
    if (!r.error) setPw({ current: "", next: "", confirm: "" });
  };

  if (!profile) return <IntranetLayout><div style={{ padding: 40, fontFamily: FONTS.body, color: COLORS.gray }}>Carregando...</div></IntranetLayout>;

  const cat = catMap[profile.category] || {};
  const role = roleMap[profile.role] || { label: profile.role, color: COLORS.gray };
  const status = statusMap[profile.status] || { label: profile.status, color: COLORS.gray };
  const card = { background: "#fff", borderRadius: 12, padding: "24px 26px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20 };

  return (
    <IntranetLayout>
      <div style={{ padding: 36, maxWidth: 700 }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 28px" }}>👤 Meus Dados</h1>

        {/* Info fixa */}
        <div style={card}>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.primary, margin: "0 0 16px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>Informações do Perfil</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {[
              { label: "E-mail (login)", value: profile.email },
              { label: "Cidade", value: profile.city },
              { label: "Categoria", value: cat.label || profile.category },
              { label: "Perfil", value: <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: `${role.color}15`, color: role.color }}>{role.label}</span> },
              { label: "Status", value: <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: `${status.color}15`, color: status.color }}>{status.label}</span> },
              { label: "Cadastrado em", value: profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("pt-BR") : "—" },
            ].map((item, i) => (
              <div key={i}>
                <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.dark }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Editar nome e telefone */}
        <div style={card}>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.primary, margin: "0 0 16px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>Editar Dados</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, display: "block", marginBottom: 6 }}>Nome completo</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, display: "block", marginBottom: 6 }}>Telefone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(31) 99999-0000" style={inp} />
            </div>
          </div>
          {msg && <div style={{ marginBottom: 12, fontFamily: FONTS.body, fontSize: 13, color: msg.startsWith("✅") ? "#007733" : "#cc0000" }}>{msg}</div>}
          <button onClick={saveProfile} disabled={saving}
            style={{ padding: "10px 24px", borderRadius: 8, background: saving ? COLORS.gray : COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>

        {/* Alterar senha */}
        <div style={card}>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.primary, margin: "0 0 16px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>Alterar Senha</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
            {[
              { key: "current", label: "Senha atual" },
              { key: "next", label: "Nova senha" },
              { key: "confirm", label: "Confirmar nova senha" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, display: "block", marginBottom: 6 }}>{f.label}</label>
                <input type="password" value={pw[f.key]} onChange={e => setPw(p => ({ ...p, [f.key]: e.target.value }))} style={inp} placeholder="••••••••" />
              </div>
            ))}
          </div>
          {pwMsg && <div style={{ marginBottom: 12, fontFamily: FONTS.body, fontSize: 13, color: pwMsg.startsWith("✅") ? "#007733" : "#cc0000" }}>{pwMsg}</div>}
          <button onClick={savePassword} disabled={pwSaving}
            style={{ padding: "10px 24px", borderRadius: 8, background: pwSaving ? COLORS.gray : COLORS.dark, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
            {pwSaving ? "Salvando..." : "Alterar Senha"}
          </button>
        </div>
      </div>
    </IntranetLayout>
  );
}
