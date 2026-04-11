/**
 * MeusDados.jsx — Perfil e dados do organizador logado.
 * Rota: /portal/meus-dados
 * - Visualização e edição dos dados cadastrais
 * - Alteração de e-mail (com reautenticação)
 * - Alteração de senha
 */
import { useState, useEffect, useCallback } from "react";
import { useOrganizer } from "../../context/OrganizerContext";
import { OrganizersService } from "../../services/index";
import { notificarFmaExclusaoLgpd } from "../../services/emailService";
import { COLORS, FONTS } from "../../styles/colors";

function maskPhone(v = "") {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}

function maskCnpj(v = "") {
  const d = v.replace(/\D/g, "");
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5").slice(0, 18);
}

const inp = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: `1.5px solid ${COLORS.grayLight}`, fontFamily: FONTS.body,
  fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff",
};
const inpReadonly = { ...inp, background: "#f3f4f6", color: COLORS.gray, cursor: "not-allowed" };

export default function MeusDados() {
  const { organizerId } = useOrganizer();
  const [organizer, setOrganizer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Alterar e-mail
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ newEmail: "", password: "" });
  const [emailError, setEmailError] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  // Alterar senha
  const [passForm, setPassForm] = useState({ current: "", newPass: "", confirm: "" });
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  // Website preview
  const [websitePreview, setWebsitePreview] = useState("");

  const load = useCallback(async () => {
    const r = await OrganizersService.get(organizerId);
    if (r.data) { setOrganizer(r.data); setForm(r.data); setWebsitePreview(r.data.website || ""); }
    setLoading(false);
  }, [organizerId]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    let website = (form.website || "").trim();
    if (website && !website.match(/^https?:\/\//)) website = "https://" + website;
    const r = await OrganizersService.update(organizerId, {
      phone: form.phone?.replace(/\D/g, ""),
      website,
    });
    setSaving(false);
    if (r.error) { setError(r.error); return; }
    setOrganizer(r.data); setForm(r.data);
    setSuccess("Dados atualizados com sucesso!"); setEditing(false);
    setTimeout(() => setSuccess(""), 4000);
  };

  const handleEmailChange = async () => {
    setEmailError("");
    if (!emailForm.newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.newEmail)) {
      setEmailError("E-mail inválido."); return;
    }
    if (!emailForm.password) { setEmailError("Informe sua senha atual para confirmar."); return; }
    setEmailSaving(true);
    const r = await OrganizersService.updateEmail(organizerId, emailForm.newEmail.trim(), emailForm.password);
    setEmailSaving(false);
    if (r.error) { setEmailError(r.error); return; }
    setShowEmailModal(false);
    setEmailForm({ newEmail: "", password: "" });
    setSuccess("E-mail alterado com sucesso!");
    load();
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
  const fieldLabel = (t) => (
    <label style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray,
      display: "block", marginBottom: 5 }}>{t}</label>
  );

  if (loading) return <div style={{ padding: 60, textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>Carregando...</div>;

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

        {success && <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontFamily: FONTS.body, fontSize: 13, color: "#15803d" }}>{success}</div>}
        {error && <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontFamily: FONTS.body, fontSize: 13, color: "#dc2626" }}>{error}</div>}

        {/* Dados cadastrais */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            {section("Dados cadastrais")}
            {!editing && (
              <button onClick={() => setEditing(true)}
                style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`,
                  background: "#fff", color: COLORS.dark, fontFamily: FONTS.heading, fontSize: 12,
                  fontWeight: 700, cursor: "pointer" }}>Editar</button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Razão Social — somente leitura */}
            <div style={{ gridColumn: "1/-1" }}>
              {fieldLabel("Razão Social")}
              <div style={{ ...inpReadonly, padding: "10px 12px" }}>{organizer?.name || "—"}</div>
            </div>

            {/* CNPJ — somente leitura */}
            <div>
              {fieldLabel("CNPJ")}
              <div style={{ ...inpReadonly, padding: "10px 12px" }}>{maskCnpj(organizer?.cpfCnpj || "")}</div>
            </div>

            {/* Nome Fantasia — somente leitura */}
            <div>
              {fieldLabel("Nome Fantasia")}
              <div style={{ ...inpReadonly, padding: "10px 12px", fontStyle: organizer?.organization ? "normal" : "italic", color: organizer?.organization ? COLORS.gray : "#9ca3af" }}>
                {organizer?.organization || "Não cadastrado na Receita Federal"}
              </div>
            </div>

            {/* E-mail — leitura com botão de alterar */}
            <div style={{ gridColumn: "1/-1" }}>
              {fieldLabel("E-mail (login)")}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ ...inpReadonly, padding: "10px 12px", flex: 1 }}>{organizer?.email || "—"}</div>
                <button onClick={() => { setShowEmailModal(true); setEmailForm({ newEmail: "", password: "" }); setEmailError(""); }}
                  style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`,
                    background: "#fff", color: "#0066cc", fontFamily: FONTS.heading, fontSize: 12,
                    fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                  Alterar e-mail
                </button>
              </div>
            </div>

            {/* Telefone — editável */}
            <div>
              {fieldLabel("Telefone / WhatsApp")}
              {editing ? (
                <input value={maskPhone(form.phone || "")}
                  onChange={e => set("phone", e.target.value.replace(/\D/g, ""))}
                  style={inp} />
              ) : (
                <div style={{ ...inpReadonly, padding: "10px 12px" }}>{maskPhone(organizer?.phone || "") || "—"}</div>
              )}
            </div>

            <div />

            {/* Cidade — somente leitura */}
            <div>
              {fieldLabel("Cidade")}
              <div style={{ ...inpReadonly, padding: "10px 12px" }}>{organizer?.city || "—"}</div>
            </div>

            {/* Estado — somente leitura */}
            <div>
              {fieldLabel("Estado")}
              <div style={{ ...inpReadonly, padding: "10px 12px" }}>{organizer?.state || "—"}</div>
            </div>

            {/* Endereço — somente leitura */}
            <div style={{ gridColumn: "1/-1" }}>
              {fieldLabel("Endereço")}
              <div style={{ ...inpReadonly, padding: "10px 12px" }}>{organizer?.address || "—"}</div>
            </div>

            {/* Site — editável com modelo e preview */}
            <div style={{ gridColumn: "1/-1" }}>
              {fieldLabel("Site")}
              {editing ? (
                <>
                  <input value={form.website || ""}
                    onChange={e => {
                      const v = e.target.value;
                      set("website", v);
                      setWebsitePreview(v && !v.match(/^https?:\/\//) ? "https://" + v : v);
                    }}
                    placeholder="www.exemplo.com.br"
                    style={inp} />
                  <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 4 }}>
                    Modelo: www.seusite.com.br
                  </div>
                  {websitePreview && /^https?:\/\/.+\..+/.test(websitePreview) && (
                    <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 8, background: "#f0f9ff", border: "1px solid #bae6fd" }}>
                      <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#0284c7", marginBottom: 4 }}>Preview</div>
                      <a href={websitePreview} target="_blank" rel="noreferrer"
                        style={{ fontFamily: FONTS.body, fontSize: 13, color: "#0066cc", textDecoration: "underline", wordBreak: "break-all" }}>
                        {websitePreview}
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ ...inpReadonly, padding: "10px 12px" }}>
                  {organizer?.website ? (
                    <a href={organizer.website} target="_blank" rel="noreferrer"
                      style={{ color: "#0066cc", textDecoration: "underline", wordBreak: "break-all" }}>
                      {organizer.website}
                    </a>
                  ) : "—"}
                </div>
              )}
            </div>
          </div>

          {editing && (
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button onClick={() => { setEditing(false); setForm(organizer); setWebsitePreview(organizer?.website || ""); }}
                style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`,
                  background: "#fff", color: COLORS.gray, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: "10px 24px", borderRadius: 8, border: "none",
                  background: saving ? COLORS.gray : "#0066cc", color: "#fff",
                  fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          )}
        </div>

        {/* Privacidade e LGPD */}
        <div style={card}>
          {section("Privacidade e Protecao de Dados (LGPD)")}
          <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 16px" }}>
            Conforme a Lei Geral de Protecao de Dados, voce tem direito de acessar, exportar e solicitar a exclusao dos seus dados pessoais.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <button onClick={() => {
              if (!organizer) return;
              const exportData = {
                nome: organizer.name, email: organizer.email, tipoPessoa: organizer.tipoPessoa,
                cpfCnpj: organizer.cpfCnpj, phone: organizer.phone, organization: organizer.organization,
                address: organizer.address, city: organizer.city, state: organizer.state,
                website: organizer.website,
                lgpdConsentAt: organizer.lgpdConsentAt, lgpdConsentVersion: organizer.lgpdConsentVersion,
                termosConsentVersion: organizer.termosConsentVersion,
                createdAt: organizer.createdAt, updatedAt: organizer.updatedAt,
              };
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `meus-dados-fma-${new Date().toISOString().slice(0, 10)}.json`;
              a.click(); URL.revokeObjectURL(url);
            }}
              style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#0066cc", color: "#fff",
                cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
              Exportar meus dados (JSON)
            </button>

            {!organizer?.lgpdExclusaoSolicitadaEm ? (
              <button onClick={async () => {
                if (!confirm("Ao solicitar a exclusao, seus dados pessoais serao removidos do sistema. Dados necessarios para obrigacoes legais poderao ser mantidos. Deseja continuar?")) return;
                await OrganizersService.update(organizerId, {
                  lgpdExclusaoSolicitadaEm: new Date().toISOString(),
                  lgpdExclusaoStatus: "solicitada",
                });
                notificarFmaExclusaoLgpd({
                  nome: organizer?.name || "Organizador",
                  tipo: "organizador",
                  email: organizer?.email || "",
                }).catch(() => {});
                setSuccess("Solicitacao de exclusao registrada. A FMA tera ate 15 dias para processar.");
                load();
              }}
                style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fff5f5", color: "#cc0000",
                  cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
                Solicitar exclusao dos meus dados
              </button>
            ) : (
              <div style={{ padding: "10px 20px", borderRadius: 8, background: "#fef3c7", border: "1px solid #fde68a",
                fontFamily: FONTS.body, fontSize: 13, color: "#92400e" }}>
                Exclusao solicitada em {new Date(organizer.lgpdExclusaoSolicitadaEm).toLocaleDateString("pt-BR")}.
                A FMA tera ate 15 dias para processar.
              </div>
            )}
          </div>

          {organizer?.lgpdConsentAt && (
            <div style={{ fontSize: 11, fontFamily: FONTS.body, color: COLORS.gray }}>
              Consentimento aceito em {new Date(organizer.lgpdConsentAt).toLocaleDateString("pt-BR")}
              {organizer.lgpdConsentVersion ? ` (versao ${organizer.lgpdConsentVersion})` : ""}
            </div>
          )}
        </div>

        {/* Alterar senha */}
        <div style={card}>
          {section("Alterar senha")}
          {passSuccess && <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontFamily: FONTS.body, fontSize: 13, color: "#15803d" }}>{passSuccess}</div>}
          {passError && <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontFamily: FONTS.body, fontSize: 13, color: "#dc2626" }}>{passError}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Senha atual", key: "current" },
              { label: "Nova senha", key: "newPass" },
              { label: "Confirmar nova senha", key: "confirm" },
            ].map(f => (
              <div key={f.key}>
                {fieldLabel(f.label)}
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
                {savingPass ? "Salvando..." : "Alterar senha"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de alteração de e-mail */}
      {showEmailModal && (
        <div onClick={() => setShowEmailModal(false)}
          style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440, padding: "28px 32px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 900, color: COLORS.dark, margin: "0 0 6px", textTransform: "uppercase" }}>Alterar e-mail</h3>
            <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 20px" }}>
              E-mail atual: <strong>{organizer?.email}</strong>
            </p>

            {emailError && <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontFamily: FONTS.body, fontSize: 13, color: "#dc2626" }}>{emailError}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                {fieldLabel("Novo e-mail")}
                <input type="email" value={emailForm.newEmail}
                  onChange={e => setEmailForm(f => ({ ...f, newEmail: e.target.value }))}
                  placeholder="novo@email.com" style={inp} autoFocus />
              </div>
              <div>
                {fieldLabel("Senha atual (para confirmar)")}
                <input type="password" value={emailForm.password}
                  onChange={e => setEmailForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Digite sua senha" style={inp} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowEmailModal(false)}
                style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleEmailChange} disabled={emailSaving}
                style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: emailSaving ? COLORS.gray : "#0066cc", color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: emailSaving ? "not-allowed" : "pointer", opacity: emailSaving ? 0.6 : 1 }}>
                {emailSaving ? "Salvando..." : "Confirmar alteração"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
