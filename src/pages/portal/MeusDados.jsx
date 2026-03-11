/**
 * MeusDados.jsx — Perfil e dados do organizador logado.
 * Rota: /portal/meus-dados
 * - Visualização e edição dos dados cadastrais
 * - Alteração de senha
 */
import { useState, useEffect, useCallback } from "react";
import { useOrganizer } from "../../context/OrganizerContext";
import { OrganizersService } from "../../services/index";
import { COLORS, FONTS } from "../../styles/colors";

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

function maskPhone(v = "") {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}

export default function MeusDados() {
  const { organizerId, organizerName } = useOrganizer();
  const [organizer, setOrganizer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Alterar senha
  const [passForm, setPassForm] = useState({ current: "", newPass: "", confirm: "" });
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  const load = useCallback(async () => {
    const r = await OrganizersService.get(organizerId);
    if (r.data) { setOrganizer(r.data); setForm(r.data); }
    setLoading(false);
  }, [organizerId]);

  useEffect(() => { load(); }, [load]);

  const inp = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: `1.5px solid ${COLORS.grayLight}`, fontFamily: FONTS.body,
    fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff",
  };
  const inpReadonly = { ...inp, background: COLORS.offWhite, color: COLORS.gray, cursor: "not-allowed" };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    const r = await OrganizersService.update(organizerId, {
      name: form.name, organization: form.organization,
      phone: form.phone?.replace(/\D/g, ""), city: form.city,
      state: form.state, address: form.address, website: form.website,
    });
    setSaving(false);
    if (r.error) { setError(r.error); return; }
    setOrganizer(r.data); setForm(r.data);
    setSuccess("Dados atualizados com sucesso!"); setEditing(false);
    setTimeout(() => setSuccess(""), 4000);
  };

  const handlePassChange = async () => {
    setPassError(""); setPassSuccess("");
    if (!passForm.current) { setPassError("Informe a senha atual."); return; }
    if (passForm.newPass.length < 6) { setPassError("Mínimo 6 caracteres."); return; }
    if (passForm.newPass !== passForm.confirm) { setPassError("Senhas não coincidem."); return; }
    setSavingPass(true);
    const r = await OrganizersService.updatePassword(organizerId, {
      currentPassword: passForm.current, newPassword: passForm.newPass,
    });
    setSavingPass(false);
    if (r.error) { setPassError(r.error); return; }
    setPassSuccess("Senha alterada com sucesso!");
    setPassForm({ current: "", newPass: "", confirm: "" });
    setTimeout(() => setPassSuccess(""), 4000);
  };

  const card = { background: "#fff", borderRadius: 12, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20 };
  const section = (t) => (
    <h3 style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800, textTransform: "uppercase",
      letterSpacing: 2, color: COLORS.dark, margin: "0 0 18px", paddingBottom: 10,
      borderBottom: `2px solid ${COLORS.grayLight}` }}>{t}</h3>
  );

  if (loading) return <><div style={{ padding: 60, textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>⏳ Carregando...</div></>;

  return (
    <>
      <div style={{ padding: "36px 40px 60px", maxWidth: 740 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: 2, color: "#0066cc", marginBottom: 6 }}>
            Portal FMA
          </div>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 28, fontWeight: 900,
            color: COLORS.dark, textTransform: "uppercase", margin: 0 }}>Meus Dados</h1>
        </div>

        {success && <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontFamily: FONTS.body, fontSize: 13, color: "#15803d" }}>✅ {success}</div>}
        {error && <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontFamily: FONTS.body, fontSize: 13, color: "#dc2626" }}>⚠️ {error}</div>}

        {/* Dados cadastrais */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            {section("Dados cadastrais")}
            {!editing && (
              <button onClick={() => setEditing(true)}
                style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`,
                  background: "#fff", color: COLORS.dark, fontFamily: FONTS.heading, fontSize: 12,
                  fontWeight: 700, cursor: "pointer" }}>✏️ Editar</button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { label: "Nome / Razão Social", key: "name", full: true, editable: true },
              { label: "E-mail (login)", key: "email", full: false, editable: false },
              { label: "CPF / CNPJ", key: "cpfCnpj", full: false, editable: false },
              { label: "Telefone", key: "phone", full: false, editable: true, mask: true },
              { label: "Organização / Nome Fantasia", key: "organization", full: true, editable: true },
              { label: "Cidade", key: "city", full: false, editable: true },
              { label: "Estado", key: "state", full: false, editable: true, select: ESTADOS },
              { label: "Endereço", key: "address", full: true, editable: true },
              { label: "Site", key: "website", full: true, editable: true },
            ].map(f => (
              <div key={f.key} style={{ gridColumn: f.full ? "1/-1" : undefined }}>
                <label style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray,
                  display: "block", marginBottom: 5 }}>{f.label}</label>
                {f.select && editing && f.editable ? (
                  <select value={form[f.key] || ""} onChange={e => set(f.key, e.target.value)} style={inp}>
                    {f.select.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : editing && f.editable ? (
                  <input value={f.mask ? maskPhone(form[f.key] || "") : (form[f.key] || "")}
                    onChange={e => set(f.key, f.mask ? e.target.value.replace(/\D/g, "") : e.target.value)}
                    style={inp} />
                ) : (
                  <div style={{ fontFamily: FONTS.body, fontSize: 14, color: f.editable ? COLORS.dark : COLORS.gray,
                    padding: "10px 12px", borderRadius: 8, background: COLORS.offWhite, border: `1px solid ${COLORS.grayLight}` }}>
                    {f.mask ? maskPhone(organizer?.[f.key] || "") : (organizer?.[f.key] || "—")}
                  </div>
                )}
              </div>
            ))}
          </div>
          {editing && (
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button onClick={() => { setEditing(false); setForm(organizer); }}
                style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`,
                  background: "#fff", color: COLORS.gray, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: "10px 24px", borderRadius: 8, border: "none",
                  background: saving ? COLORS.gray : "#0066cc", color: "#fff",
                  fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Salvando..." : "💾 Salvar"}
              </button>
            </div>
          )}
        </div>

        {/* Alterar senha */}
        <div style={card}>
          {section("Alterar senha")}
          {passSuccess && <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontFamily: FONTS.body, fontSize: 13, color: "#15803d" }}>✅ {passSuccess}</div>}
          {passError && <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontFamily: FONTS.body, fontSize: 13, color: "#dc2626" }}>⚠️ {passError}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Senha atual", key: "current" },
              { label: "Nova senha", key: "newPass" },
              { label: "Confirmar nova senha", key: "confirm" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray,
                  display: "block", marginBottom: 5 }}>{f.label}</label>
                <input type="password" value={passForm[f.key]}
                  onChange={e => setPassForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ ...inp, maxWidth: 300 }} />
              </div>
            ))}
            <div>
              <button onClick={handlePassChange} disabled={savingPass}
                style={{ padding: "10px 22px", borderRadius: 8, border: "none",
                  background: savingPass ? COLORS.gray : COLORS.dark, color: "#fff",
                  fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: savingPass ? "not-allowed" : "pointer" }}>
                {savingPass ? "Salvando..." : "🔐 Alterar senha"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
