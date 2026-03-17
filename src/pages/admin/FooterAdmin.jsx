import { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import { FormField, TextInput, TextArea, CheckboxInput } from "../../components/ui/FormField";
import FileUpload from "../../components/ui/FileUpload";
import { useApi } from "../../hooks/useApi";
import { FooterConfigService } from "../../services/index";
import { COLORS, FONTS } from "../../styles/colors";

export default function FooterAdmin() {
  const [values, setValues] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [linkInput, setLinkInput] = useState({ label: "", to: "" });

  useEffect(() => {
    FooterConfigService.get().then(r => r.data && setValues(r.data));
  }, []);

  const set = (key, value) => setValues(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await FooterConfigService.update(values);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const addLink = () => {
    if (!linkInput.label || !linkInput.to) return;
    set("usefulLinks", [...(values.usefulLinks || []), { ...linkInput }]);
    setLinkInput({ label: "", to: "" });
  };

  const removeLink = (idx) => {
    set("usefulLinks", values.usefulLinks.filter((_, i) => i !== idx));
  };

  if (!values) return <AdminLayout><div style={{ padding: 40 }}>Carregando...</div></AdminLayout>;

  const sectionStyle = {
    background: "#fff",
    borderRadius: 12,
    padding: 28,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    display: "grid",
    gap: 18,
    marginBottom: 24,
  };

  const sectionTitle = (text) => (
    <h3 style={{ fontFamily: FONTS?.heading || "sans-serif", fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.primary, margin: 0, paddingBottom: 12, borderBottom: `1px solid ${COLORS.grayLight}` }}>
      {text}
    </h3>
  );

  return (
    <AdminLayout>
      <div style={{ padding: 40, maxWidth: 860 }}>
        <PageHeader
          title="Configurações do Rodapé"
          subtitle="Todas as informações exibidas no rodapé do site."
          actions={[]}
          action={{ label: saving ? "Salvando..." : saved ? "✓ Salvo!" : "Salvar Alterações", onClick: handleSave }}
        />

        {/* Logo & Identidade Visual */}
        <div style={sectionStyle}>
          {sectionTitle("🖼️ Logo & Identidade Visual")}

          {/* Preview do logo atual */}
          {values.logoUrl && (
            <div style={{ marginBottom: 16, padding: 16, background: "#f9fafb", borderRadius: 8, border: "1.5px dashed #d1d5db", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Preview</div>
              <div style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Header (fundo vermelho)</div>
                  <div style={{ background: "#cc0000", padding: "8px 16px", borderRadius: 6, display: "inline-block" }}>
                    <img src={values.logoUrl} alt="logo" style={{ height: 36, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Footer (fundo escuro)</div>
                  <div style={{ background: "#1a1a2e", padding: "8px 16px", borderRadius: 6, display: "inline-block" }}>
                    <img src={values.logoUrl} alt="logo" style={{ height: 36, objectFit: "contain" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <FormField label="Logo do Site" hint="PNG ou SVG com fundo transparente. Recomendado: 400x120px.">
            <FileUpload
              value={values.logoUrl || ""}
              onChange={(url) => set("logoUrl", url)}
              folder="logos"
              accept="image/*"
              hint="PNG, SVG ou WebP com fundo transparente. Recomendado: 400x120px."
              mode="both"
              preview={false}
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Nome do Site" hint="Exibido quando não há logo. Ex: FMA">
              <TextInput value={values.siteName || ""} onChange={v => set("siteName", v)} placeholder="FMA" />
            </FormField>
            <FormField label="Subtítulo do Header" hint="Linha abaixo do nome. Ex: FED. MINEIRA DE ATLETISMO">
              <TextInput value={values.siteSubtitle || ""} onChange={v => set("siteSubtitle", v)} placeholder="FED. MINEIRA DE ATLETISMO" />
            </FormField>
          </div>

          <FormField label="Texto alternativo do logo (alt)" hint="Para acessibilidade e SEO.">
            <TextInput value={values.logoAlt || ""} onChange={v => set("logoAlt", v)} placeholder="Federação Mineira de Atletismo" />
          </FormField>
        </div>

        {/* Identidade */}
        <div style={sectionStyle}>
          {sectionTitle("Identidade & Créditos")}
          <FormField label="Texto Institucional" hint="Exibido no canto esquerdo do rodapé.">
            <TextArea value={values.institutionalText} onChange={v => set("institutionalText", v)} rows={3} />
          </FormField>
          <FormField label="Texto de Copyright" hint='Ex: "Federação Mineira de Atletismo". O ano é adicionado automaticamente.'>
            <TextInput value={values.copyrightText} onChange={v => set("copyrightText", v)} />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="Crédito do Desenvolvedor">
              <TextInput value={values.developerCredit} onChange={v => set("developerCredit", v)} placeholder="Desenvolvido por..." />
            </FormField>
            <FormField label="Link do Desenvolvedor">
              <TextInput value={values.developerLink} onChange={v => set("developerLink", v)} placeholder="https://..." type="url" />
            </FormField>
          </div>
        </div>

        {/* Contato */}
        <div style={sectionStyle}>
          {sectionTitle("Informações de Contato")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="Telefone">
              <TextInput value={values.phone} onChange={v => set("phone", v)} placeholder="(31) 3566-4232" />
            </FormField>
            <FormField label="Link do Telefone">
              <TextInput value={values.phoneLink} onChange={v => set("phoneLink", v)} placeholder="tel:+55..." />
            </FormField>
            <FormField label="WhatsApp">
              <TextInput value={values.whatsapp} onChange={v => set("whatsapp", v)} placeholder="(31) 99815-2403" />
            </FormField>
            <FormField label="Link do WhatsApp">
              <TextInput value={values.whatsappLink} onChange={v => set("whatsappLink", v)} placeholder="https://wa.me/55..." />
            </FormField>
            <FormField label="E-mail">
              <TextInput value={values.email} onChange={v => set("email", v)} type="email" />
            </FormField>
            <FormField label="Link do E-mail">
              <TextInput value={values.emailLink} onChange={v => set("emailLink", v)} placeholder="mailto:..." />
            </FormField>
          </div>
          <FormField label="Endereço">
            <TextInput value={values.address} onChange={v => set("address", v)} placeholder="Av. Olegário Maciel, 311 – Sala 205" />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="Cidade / Estado">
              <TextInput value={values.city} onChange={v => set("city", v)} placeholder="Belo Horizonte – MG" />
            </FormField>
            <FormField label="Horário de Funcionamento">
              <TextInput value={values.hours} onChange={v => set("hours", v)} placeholder="Segunda a Sexta: 12:30h às 18:00h" />
            </FormField>
          </div>
        </div>

        {/* Links úteis */}
        <div style={sectionStyle}>
          {sectionTitle("Links Úteis no Rodapé")}
          {(values.usefulLinks || []).length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {values.usefulLinks.map((link, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, background: COLORS.offWhite || "#f7f7f7", borderRadius: 6, padding: "8px 14px" }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{link.label}</span>
                  <span style={{ flex: 1, fontSize: 12, color: COLORS.gray }}>{link.to}</span>
                  <button onClick={() => removeLink(idx)} style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 16, padding: 0 }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <FormField label="Label">
              <TextInput value={linkInput.label} onChange={v => setLinkInput(l => ({ ...l, label: v }))} placeholder="Ex: Galeria de Fotos" />
            </FormField>
            <FormField label="Rota ou URL">
              <TextInput value={linkInput.to} onChange={v => setLinkInput(l => ({ ...l, to: v }))} placeholder="/galeria ou https://..." />
            </FormField>
            <Button variant="secondary" onClick={addLink} size="md">+ Adicionar</Button>
          </div>
        </div>

        {/* Newsletter */}
        <div style={sectionStyle}>
          {sectionTitle("Newsletter")}
          <CheckboxInput checked={values.newsletterEnabled} onChange={v => set("newsletterEnabled", v)} label="Exibir bloco de newsletter no rodapé" />
          {values.newsletterEnabled && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <FormField label="Título">
                <TextInput value={values.newsletterTitle} onChange={v => set("newsletterTitle", v)} />
              </FormField>
              <FormField label="Placeholder do campo">
                <TextInput value={values.newsletterPlaceholder} onChange={v => set("newsletterPlaceholder", v)} />
              </FormField>
              <FormField label="Label do botão">
                <TextInput value={values.newsletterButtonLabel} onChange={v => set("newsletterButtonLabel", v)} />
              </FormField>
            </div>
          )}
        </div>

        {/* Visibilidade de seções */}
        <div style={sectionStyle}>
          {sectionTitle("Visibilidade de Seções")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            <CheckboxInput checked={values.showPartners} onChange={v => set("showPartners", v)} label="Exibir bloco de Parceiros" />
            <CheckboxInput checked={values.showSocialLinks} onChange={v => set("showSocialLinks", v)} label="Exibir Redes Sociais" />
            <CheckboxInput checked={values.showNewsletter} onChange={v => set("showNewsletter", v)} label="Exibir Newsletter" />
            <CheckboxInput checked={values.showUsefulLinks} onChange={v => set("showUsefulLinks", v)} label="Exibir Links Úteis" />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={handleSave} loading={saving} size="lg">
            {saved ? "✓ Alterações Salvas!" : "Salvar Todas as Alterações"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
