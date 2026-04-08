/**
 * MyProfile.jsx — Perfil completo do árbitro com edição de todos os campos.
 * Rota: /intranet/perfil
 */
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import IntranetLayout from "../IntranetLayout";
import { useIntranet } from "../../../context/IntranetContext";
import { RefereesService } from "../../../services/index";
import { intranetAuthAPI } from "../../../data/api";
import { useCep } from "../../../hooks/useCep";
import { uploadFile } from "../../../services/storageService";
import { COLORS, FONTS } from "../../../styles/colors";
import { REFEREE_CATEGORIES, REFEREE_ROLES, REFEREE_STATUS } from "../../../config/navigation";
import { validarCPF, validarNisPis, cpfJaExisteArbitro } from "../../../utils/cpfCnpj";

const roleMap = Object.fromEntries((REFEREE_ROLES || []).map(r => [r.value, r]));
const statusMap = Object.fromEntries((REFEREE_STATUS || []).map(s => [s.value, s]));

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const SEXO = [{ value: "masculino", label: "Masculino" }, { value: "feminino", label: "Feminino" }];
const ESTADO_CIVIL = [{ value: "solteiro", label: "Solteiro(a)" }, { value: "casado", label: "Casado(a)" }, { value: "divorciado", label: "Divorciado(a)" }, { value: "viuvo", label: "Viúvo(a)" }, { value: "uniao_estavel", label: "União Estável" }];
const COR = [{ value: "branca", label: "Branca" }, { value: "preta", label: "Preta" }, { value: "parda", label: "Parda" }, { value: "amarela", label: "Amarela" }, { value: "indigena", label: "Indígena" }];
const ESCOLARIDADE = [{ value: "fundamental", label: "Ensino Fundamental" }, { value: "medio", label: "Ensino Médio" }, { value: "superior", label: "Ensino Superior" }, { value: "pos_graduacao", label: "Pós-Graduação" }, { value: "mestrado", label: "Mestrado" }, { value: "doutorado", label: "Doutorado" }, { value: "pos_doutorado", label: "Pós-Doutorado" }];
const TIPO_CONTA = [{ value: "corrente", label: "Corrente" }, { value: "poupanca", label: "Poupança" }, { value: "pagamento", label: "Pagamento" }];
const CHAVE_PIX_TIPO = [{ value: "cpf", label: "CPF" }, { value: "email", label: "E-mail" }, { value: "telefone", label: "Telefone" }, { value: "aleatoria", label: "Aleatória" }];
const CAMISA = [{ value: "P", label: "P" }, { value: "M", label: "M" }, { value: "G", label: "G" }, { value: "GG", label: "GG" }, { value: "XG", label: "XG" }];
const SANGUE = ["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(v => ({ value: v, label: v }));
const DESLOCAMENTO = [{ value: "local", label: "Apenas minha cidade" }, { value: "metropolitana", label: "Região metropolitana" }, { value: "estadual", label: "Todo o estado" }, { value: "nacional", label: "Nacional" }];
const BANCOS = [
  { value: "001", label: "001 - Banco do Brasil" }, { value: "033", label: "033 - Santander" },
  { value: "104", label: "104 - Caixa Econômica" }, { value: "237", label: "237 - Bradesco" },
  { value: "341", label: "341 - Itaú Unibanco" }, { value: "077", label: "077 - Banco Inter" },
  { value: "260", label: "260 - Nubank" }, { value: "336", label: "336 - C6 Bank" },
  { value: "748", label: "748 - Sicredi" }, { value: "756", label: "756 - Sicoob" },
  { value: "212", label: "212 - Banco Original" }, { value: "422", label: "422 - Safra" },
  { value: "000", label: "Outro" },
];

function maskCpf(v) {
  return (v || "").replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskNis(v) {
  return (v || "").replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3}\.\d{5})(\d)/, "$1.$2").replace(/(\d{3}\.\d{5}\.\d{2})(\d)/, "$1-$2");
}

const inp = { width: "100%", padding: "10px 13px", borderRadius: 8, border: `1.5px solid #e8e8e8`, fontFamily: "'Barlow',sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" };
const sel = { ...inp, cursor: "pointer" };
const card = { background: "#fff", borderRadius: 12, padding: "24px 26px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20 };
const sectionTitle = (txt) => <h2 style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.primary, margin: "0 0 16px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>{txt}</h2>;
const label = (txt) => <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, display: "block", marginBottom: 6 }}>{txt}</label>;

export default function MyProfile() {
  const { refereeId } = useIntranet();
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  const { setCep: setCepHook, loading: cepLoading } = useCep((result) => {
    setData(prev => ({
      ...prev,
      logradouro: result.logradouro || prev.logradouro,
      bairro: result.bairro || prev.bairro,
      city: result.cidade || prev.city,
      state: result.estado || prev.state,
    }));
  });

  useEffect(() => {
    RefereesService.get(refereeId).then(r => { if (r.data) setData(r.data); });
  }, [refereeId]);

  const set = (k, v) => setData(prev => ({ ...prev, [k]: v }));

  const handleCep = (v) => {
    const digits = v.replace(/\D/g, "").slice(0, 8);
    const masked = digits.length > 5 ? `${digits.slice(0,5)}-${digits.slice(5)}` : digits;
    set("cep", masked);
    setCepHook(v);
  };

  const saveProfile = async () => {
    setSaving(true); setMsg("");
    const cpfRaw = (data.cpf || "").replace(/\D/g, "");
    if (cpfRaw && !validarCPF(cpfRaw)) {
      setSaving(false); setMsg("CPF inválido. Verifique os dígitos."); return;
    }
    if (cpfRaw && await cpfJaExisteArbitro(cpfRaw, refereeId)) {
      setSaving(false); setMsg("Este CPF já está cadastrado por outro árbitro."); return;
    }
    const nisRaw = (data.nisPis || "").replace(/\D/g, "");
    if (nisRaw && !validarNisPis(nisRaw)) {
      setSaving(false); setMsg("NIS/PIS/NIT inválido. Verifique os dígitos."); return;
    }
    const { id, password, ...payload } = data;
    const bancoInfo = BANCOS.find(b => b.value === payload.banco);
    if (bancoInfo) payload.bancoNome = bancoInfo.label.split(" - ")[1] || bancoInfo.label;
    payload.cpf = cpfRaw;
    const r = await RefereesService.update(refereeId, payload);
    setSaving(false);
    setMsg(r.error ? `Erro: ${r.error}` : "Dados atualizados com sucesso!");
  };

  const savePassword = async () => {
    if (!pw.current || !pw.next) { setPwMsg("Preencha todos os campos."); return; }
    if (pw.next !== pw.confirm) { setPwMsg("A nova senha e a confirmação não coincidem."); return; }
    if (pw.next.length < 6) { setPwMsg("A senha deve ter pelo menos 6 caracteres."); return; }
    setPwSaving(true); setPwMsg("");
    const r = await intranetAuthAPI.updatePassword(pw.current, pw.next, refereeId);
    setPwSaving(false);
    setPwMsg(r.error || "Senha alterada com sucesso!");
    if (!r.error) setPw({ current: "", next: "", confirm: "" });
  };

  if (!data) return <IntranetLayout><div style={{ padding: 40, fontFamily: FONTS.body, color: COLORS.gray }}>Carregando...</div></IntranetLayout>;

  const role = roleMap[data.role] || { label: data.role, color: COLORS.gray };
  const status = statusMap[data.status] || { label: data.status, color: COLORS.gray };
  const nivel = REFEREE_CATEGORIES.find(c => c.value === data.nivel);

  return (
    <IntranetLayout>
      <div style={{ padding: 36, maxWidth: 800 }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 8px" }}>Meus Dados</h1>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 28px" }}>Mantenha seus dados sempre atualizados.</p>

        {/* Status badges */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: `${role.color}15`, color: role.color }}>{role.label}</span>
          <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: `${status.color}15`, color: status.color }}>{status.label}</span>
          {nivel && <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: `${nivel.color}15`, color: nivel.color }}>{nivel.label}</span>}
        </div>

        {/* Foto 3x4 */}
        <div style={{ ...card, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 90, height: 120, borderRadius: 8, overflow: "hidden", background: COLORS.offWhite, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${COLORS.grayLight}` }}>
            {data.foto ? (
              <img src={data.foto} alt="Foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 11, color: COLORS.gray, textAlign: "center", fontFamily: FONTS.body }}>Sem foto</span>
            )}
          </div>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, marginBottom: 6 }}>Foto 3x4</div>
            <input type="file" accept="image/*" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) { setMsg("Foto deve ter no maximo 2MB."); return; }
              setMsg("Enviando foto...");
              const r = await uploadFile(file, `arbitros/${refereeId}/foto`);
              if (r.url) {
                await RefereesService.update(refereeId, { foto: r.url });
                set("foto", r.url);
                setMsg("Foto atualizada!");
              } else setMsg("Erro ao enviar foto.");
            }} style={{ fontSize: 13 }} />
            <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 4 }}>JPG ou PNG, max 2MB. Recomendado: 300x400px.</div>
          </div>
        </div>

        {/* Dados Pessoais */}
        <div style={card}>
          {sectionTitle("Dados Pessoais")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>{label("Nome completo")}<input value={data.name || ""} onChange={e => set("name", e.target.value)} style={inp} /></div>
            <div>{label("Data de Nascimento")}<input type="date" value={data.dataNascimento || ""} onChange={e => set("dataNascimento", e.target.value)} style={inp} /></div>
            <div>{label("Sexo")}<select value={data.sexo || ""} onChange={e => set("sexo", e.target.value)} style={sel}><option value="">Selecione...</option>{SEXO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Estado Civil")}<select value={data.estadoCivil || ""} onChange={e => set("estadoCivil", e.target.value)} style={sel}><option value="">Selecione...</option>{ESTADO_CIVIL.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Escolaridade")}<select value={data.escolaridade || ""} onChange={e => set("escolaridade", e.target.value)} style={sel}><option value="">Selecione...</option>{ESCOLARIDADE.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Município de Nascimento")}<input value={data.municipioNascimento || ""} onChange={e => set("municipioNascimento", e.target.value)} style={inp} /></div>
            <div>{label("UF de Nascimento")}<select value={data.ufNascimento || ""} onChange={e => set("ufNascimento", e.target.value)} style={sel}><option value="">Selecione...</option>{UFS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
            <div>{label("Nome do Pai")}<input value={data.nomePai || ""} onChange={e => set("nomePai", e.target.value)} style={inp} /></div>
            <div>{label("Nome da Mãe")}<input value={data.nomeMae || ""} onChange={e => set("nomeMae", e.target.value)} style={inp} /></div>
            <div>{label("Telefone")}<input value={data.phone || ""} onChange={e => set("phone", e.target.value)} placeholder="(31) 99999-9999" style={inp} /></div>
            <div>{label("E-mail")}<input value={data.email || ""} disabled style={{ ...inp, opacity: 0.6 }} /></div>
          </div>
        </div>

        {/* Documentos */}
        <div style={card}>
          {sectionTitle("Documentos")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>{label("CPF")}<input value={maskCpf(data.cpf)} onChange={e => set("cpf", maskCpf(e.target.value))} placeholder="000.000.000-00" style={inp} /></div>
            <div>{label("RG")}<input value={data.rg || ""} onChange={e => set("rg", e.target.value)} style={inp} /></div>
            <div>{label("Órgão Expedidor")}<input value={data.rgOrgao || ""} onChange={e => set("rgOrgao", e.target.value)} style={inp} /></div>
            <div>{label("UF do RG")}<select value={data.rgUf || ""} onChange={e => set("rgUf", e.target.value)} style={sel}><option value="">Selecione...</option>{UFS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
            <div>{label("Data de Expedição")}<input type="date" value={data.rgDataExpedicao || ""} onChange={e => set("rgDataExpedicao", e.target.value)} style={inp} /></div>
            <div>{label("NIS/PIS/NIT")}<input value={maskNis(data.nisPis)} onChange={e => set("nisPis", maskNis(e.target.value))} placeholder="000.00000.00-0" style={inp} /></div>
          </div>
        </div>

        {/* Endereço */}
        <div style={card}>
          {sectionTitle("Endereço")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>{label("CEP")}<input value={data.cep || ""} onChange={e => handleCep(e.target.value)} placeholder="00000-000" style={inp} />{cepLoading && <span style={{ fontSize: 11, color: COLORS.gray }}>Buscando...</span>}</div>
            <div />
            <div style={{ gridColumn: "1 / -1" }}>{label("Logradouro")}<input value={data.logradouro || ""} onChange={e => set("logradouro", e.target.value)} style={inp} /></div>
            <div>{label("Número")}<input value={data.numero || ""} onChange={e => set("numero", e.target.value)} style={inp} /></div>
            <div>{label("Complemento")}<input value={data.complemento || ""} onChange={e => set("complemento", e.target.value)} style={inp} /></div>
            <div>{label("Bairro")}<input value={data.bairro || ""} onChange={e => set("bairro", e.target.value)} style={inp} /></div>
            <div>{label("Cidade")}<input value={data.city || ""} onChange={e => set("city", e.target.value)} style={inp} /></div>
            <div>{label("UF")}<select value={data.state || ""} onChange={e => set("state", e.target.value)} style={sel}><option value="">Selecione...</option>{UFS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
          </div>
        </div>

        {/* Dados Bancários */}
        <div style={card}>
          {sectionTitle("Dados Bancários")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>{label("Banco")}<select value={data.banco || ""} onChange={e => set("banco", e.target.value)} style={sel}><option value="">Selecione...</option>{BANCOS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}</select></div>
            <div>{label("Tipo de Conta")}<select value={data.tipoConta || ""} onChange={e => set("tipoConta", e.target.value)} style={sel}><option value="">Selecione...</option>{TIPO_CONTA.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Agência (sem dígito)")}<input value={data.agencia || ""} onChange={e => set("agencia", e.target.value)} style={inp} /></div>
            <div>{label("Conta com Dígito")}<input value={data.contaDigito || ""} onChange={e => set("contaDigito", e.target.value)} placeholder="12345-6" style={inp} /></div>
            <div />
            <div>{label("Tipo da Chave PIX")}<select value={data.chavePixTipo || ""} onChange={e => set("chavePixTipo", e.target.value)} style={sel}><option value="">Selecione...</option>{CHAVE_PIX_TIPO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Chave PIX")}<input value={data.chavePix || ""} onChange={e => set("chavePix", e.target.value)} style={inp} /></div>
          </div>
        </div>

        {/* Profissional + Emergência */}
        <div style={card}>
          {sectionTitle("Profissional e Emergência")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>{label("Nível")}<select value={data.nivel || ""} onChange={e => set("nivel", e.target.value)} style={sel}><option value="">Selecione...</option>{REFEREE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
            <div>{label("Registro CBAT")}<input value={data.registroCbat || ""} onChange={e => set("registroCbat", e.target.value)} style={inp} /></div>
            <div>{label("Tamanho de Camisa")}<select value={data.tamanhoCamisa || ""} onChange={e => set("tamanhoCamisa", e.target.value)} style={sel}><option value="">Selecione...</option>{CAMISA.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Tipo Sanguíneo")}<select value={data.tipoSanguineo || ""} onChange={e => set("tipoSanguineo", e.target.value)} style={sel}><option value="">Selecione...</option>{SANGUE.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Cor/Raça")}<select value={data.cor || ""} onChange={e => set("cor", e.target.value)} style={sel}><option value="">Selecione...</option>{COR.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Disponibilidade de Deslocamento")}<select value={data.disponibilidadeDeslocamento || ""} onChange={e => set("disponibilidadeDeslocamento", e.target.value)} style={sel}><option value="">Selecione...</option>{DESLOCAMENTO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Contato de Emergência — Nome")}<input value={data.contatoEmergenciaNome || ""} onChange={e => set("contatoEmergenciaNome", e.target.value)} style={inp} /></div>
            <div>{label("Contato de Emergência — Telefone")}<input value={data.contatoEmergenciaTelefone || ""} onChange={e => set("contatoEmergenciaTelefone", e.target.value)} style={inp} /></div>
          </div>
        </div>

        {/* Salvar */}
        {msg && <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: msg.startsWith("Erro") ? "#fff0f0" : "#f0fdf4", fontFamily: FONTS.body, fontSize: 13, color: msg.startsWith("Erro") ? "#cc0000" : "#007733" }}>{msg}</div>}
        <button onClick={saveProfile} disabled={saving}
          style={{ padding: "12px 28px", borderRadius: 8, background: saving ? COLORS.gray : COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, textTransform: "uppercase", marginBottom: 32 }}>
          {saving ? "Salvando..." : "Salvar Alterações"}
        </button>

        {/* Alterar senha */}
        <div style={card}>
          {sectionTitle("Alterar Senha")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
            {[{ key: "current", label: "Senha atual" }, { key: "next", label: "Nova senha" }, { key: "confirm", label: "Confirmar" }].map(f => (
              <div key={f.key}>
                <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, display: "block", marginBottom: 6 }}>{f.label}</label>
                <input type="password" value={pw[f.key]} onChange={e => setPw(p => ({ ...p, [f.key]: e.target.value }))} style={inp} placeholder="••••••••" />
              </div>
            ))}
          </div>
          {pwMsg && <div style={{ marginBottom: 12, fontFamily: FONTS.body, fontSize: 13, color: pwMsg.startsWith("Senha alterada") ? "#007733" : "#cc0000" }}>{pwMsg}</div>}
          <button onClick={savePassword} disabled={pwSaving}
            style={{ padding: "10px 24px", borderRadius: 8, background: pwSaving ? COLORS.gray : COLORS.dark, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
            {pwSaving ? "Salvando..." : "Alterar Senha"}
          </button>
        </div>

        {/* Consentimentos LGPD */}
        <div style={card}>
          {sectionTitle("Privacidade e Consentimentos")}
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f9fafb", borderRadius: 8 }}>
              <div>
                <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: COLORS.dark }}>Política de Privacidade e Termos de Uso</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>
                  Aceito em {data.lgpdConsentAt ? new Date(data.lgpdConsentAt).toLocaleDateString("pt-BR") : "—"}
                </div>
              </div>
              <Link to="/privacidade" target="_blank" style={{ fontFamily: FONTS.heading, fontSize: 11, color: COLORS.primary, textDecoration: "underline" }}>Ver política</Link>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: data.lgpdSensitiveConsentAt ? "#f0fdf4" : "#fff0f0", borderRadius: 8 }}>
              <div>
                <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: COLORS.dark }}>Dados sensíveis (cor/raça e tipo sanguíneo)</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>
                  {data.lgpdSensitiveConsentAt
                    ? `Consentimento ativo desde ${new Date(data.lgpdSensitiveConsentAt).toLocaleDateString("pt-BR")}`
                    : "Consentimento revogado"}
                </div>
              </div>
              {data.lgpdSensitiveConsentAt && (
                <button onClick={async () => {
                  if (!confirm("Ao revogar, os campos cor/raça e tipo sanguíneo serão apagados. Deseja continuar?")) return;
                  await RefereesService.update(refereeId, { cor: "", tipoSanguineo: "", lgpdSensitiveConsentAt: "" });
                  setData(prev => ({ ...prev, cor: "", tipoSanguineo: "", lgpdSensitiveConsentAt: "" }));
                  setMsg("Consentimento de dados sensíveis revogado.");
                }} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fff5f5", color: "#cc0000", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>
                  Revogar
                </button>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f9fafb", borderRadius: 8 }}>
              <div>
                <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: COLORS.dark }}>Termo de Sigilo e Confidencialidade</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>
                  Aceito em {data.confidentialityConsentAt ? new Date(data.confidentialityConsentAt).toLocaleDateString("pt-BR") : "—"}
                </div>
              </div>
              <Link to="/termos" target="_blank" style={{ fontFamily: FONTS.heading, fontSize: 11, color: COLORS.primary, textDecoration: "underline" }}>Ver termos</Link>
            </div>
          </div>
        </div>
      </div>
    </IntranetLayout>
  );
}
