/**
 * ArbitroDetalheAdmin.jsx
 * Visualização e edição básica de um árbitro pelo painel admin.
 * Rota: /admin/arbitros/:id
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { FormField, SelectInput } from "../../components/ui/FormField";
import { refereesAPI } from "../../data/api";
import { REFEREE_CATEGORIES, REFEREE_ROLES, REFEREE_STATUS } from "../../config/navigation";
import { COLORS, FONTS } from "../../styles/colors";

const field = (label, value) => (
  <div>
    <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 4 }}>{label}</div>
    <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.dark }}>{value || "—"}</div>
  </div>
);

export default function ArbitroDetalheAdmin() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    refereesAPI.get(id).then(r => {
      if (r.data) setData(r.data);
      else navigate("/admin/arbitros");
    });
  }, [id]);

  const set = (k, v) => setData(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true); setMsg("");
    const r = await refereesAPI.update(id, { nivel: data.nivel, role: data.role, status: data.status, notes: data.notes });
    setSaving(false);
    setMsg(r.error ? `Erro: ${r.error}` : "Dados atualizados.");
  };

  if (!data) return <AdminLayout minLevel="admin"><div style={{ padding: 40, fontFamily: FONTS.body, color: COLORS.gray }}>Carregando...</div></AdminLayout>;

  const card = { background: "#fff", borderRadius: 12, padding: "24px 26px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20 };
  const section = (txt) => <h2 style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.primary, margin: "0 0 16px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>{txt}</h2>;

  const nivelInfo = REFEREE_CATEGORIES.find(c => c.value === data.nivel);

  return (
    <AdminLayout minLevel="admin">
      <div style={{ padding: 40, maxWidth: 800 }}>
        <PageHeader
          title={data.name || "Árbitro"}
          subtitle={data.email}
          backTo="/admin/arbitros"
        />

        {/* Badges */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {nivelInfo && <Badge label={nivelInfo.label} bg={`${nivelInfo.color}15`} color={nivelInfo.color} />}
          <Badge label={data.profileComplete ? "Perfil completo" : "Perfil incompleto"} bg={data.profileComplete ? "#e6f9ee" : "#fef3c7"} color={data.profileComplete ? "#007733" : "#92400e"} />
          <Badge label={data.mustChangePassword ? "Senha pendente" : "Senha ok"} bg={data.mustChangePassword ? "#fef3c7" : "#e6f9ee"} color={data.mustChangePassword ? "#92400e" : "#007733"} />
        </div>

        {/* Dados Pessoais (read-only) */}
        <div style={card}>
          {section("Dados Pessoais")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {field("Nome", data.name)}
            {field("E-mail", data.email)}
            {field("Telefone", data.phone)}
            {field("CPF", data.cpf)}
            {field("Data de Nascimento", data.dataNascimento ? new Date(data.dataNascimento + "T12:00:00").toLocaleDateString("pt-BR") : null)}
            {field("Sexo", data.sexo === "masculino" ? "Masculino" : data.sexo === "feminino" ? "Feminino" : data.sexo)}
          </div>
        </div>

        {/* Endereço (read-only) */}
        <div style={card}>
          {section("Endereço")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {field("CEP", data.cep)}
            {field("Logradouro", data.logradouro)}
            {field("Número", data.numero)}
            {field("Bairro", data.bairro)}
            {field("Cidade", data.city)}
            {field("UF", data.state)}
          </div>
        </div>

        {/* Dados Bancários (read-only) */}
        <div style={card}>
          {section("Dados Bancários")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {field("Banco", data.bancoNome || data.banco)}
            {field("Agência", data.agencia)}
            {field("Conta", data.contaDigito)}
            {field("Tipo de Conta", data.tipoConta)}
            {field("Chave PIX", data.chavePix)}
            {field("Tipo PIX", data.chavePixTipo)}
          </div>
        </div>

        {/* Emergência (read-only) */}
        <div style={card}>
          {section("Contato de Emergência")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {field("Nome", data.contatoEmergenciaNome)}
            {field("Telefone", data.contatoEmergenciaTelefone)}
          </div>
        </div>

        {/* Gestão (editável) */}
        <div style={card}>
          {section("Gestão — editável pelo admin")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <FormField label="Nível">
              <SelectInput value={data.nivel || ""} onChange={v => set("nivel", v)} placeholder="Selecione..." options={REFEREE_CATEGORIES.map(c => ({ value: c.value, label: c.label }))} />
            </FormField>
            <FormField label="Função">
              <SelectInput value={data.role} onChange={v => set("role", v)} options={REFEREE_ROLES.map(r => ({ value: r.value, label: r.label }))} />
            </FormField>
            <FormField label="Status">
              <SelectInput value={data.status} onChange={v => set("status", v)} options={REFEREE_STATUS.map(s => ({ value: s.value, label: s.label }))} />
            </FormField>
          </div>
          <div style={{ marginTop: 14 }}>
            <FormField label="Observações internas">
              <textarea value={data.notes || ""} onChange={e => set("notes", e.target.value)} rows={3} placeholder="Anotações visíveis apenas para a coordenação..."
                style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: `1.5px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            </FormField>
          </div>

          {msg && <div style={{ marginTop: 12, fontFamily: FONTS.body, fontSize: 13, color: msg.startsWith("Erro") ? "#cc0000" : "#007733" }}>{msg}</div>}

          <div style={{ marginTop: 16 }}>
            <Button variant="primary" onClick={save} loading={saving}>Salvar Alterações</Button>
          </div>
        </div>

        {/* Consentimentos */}
        <div style={card}>
          {section("Consentimentos LGPD")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {field("Política de Privacidade", data.lgpdConsentAt ? new Date(data.lgpdConsentAt).toLocaleDateString("pt-BR") : "Pendente")}
            {field("Dados Sensíveis", data.lgpdSensitiveConsentAt ? new Date(data.lgpdSensitiveConsentAt).toLocaleDateString("pt-BR") : "Revogado/Pendente")}
            {field("Sigilo", data.confidentialityConsentAt ? new Date(data.confidentialityConsentAt).toLocaleDateString("pt-BR") : "Pendente")}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
