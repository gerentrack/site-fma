/**
 * CompleteProfileWizard.jsx
 * Wizard de 5 etapas para o árbitro preencher o perfil completo no primeiro acesso.
 */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useIntranet } from "../../context/IntranetContext";
import { refereesAPI } from "../../data/api";
import { useCep } from "../../hooks/useCep";
import { COLORS, FONTS } from "../../styles/colors";
import { validarCPF, validarNisPis, cpfJaExisteArbitro } from "../../utils/cpfCnpj";
import PoliticaPrivacidade from "../public/PoliticaPrivacidade";
import TermosUso from "../public/TermosUso";

// ── Opções de selects ─────────────────────────────────────────────────────────

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

const SEXO_OPTIONS        = [{ value: "masculino", label: "Masculino" }, { value: "feminino", label: "Feminino" }];
const ESTADO_CIVIL        = [{ value: "solteiro", label: "Solteiro(a)" }, { value: "casado", label: "Casado(a)" }, { value: "divorciado", label: "Divorciado(a)" }, { value: "viuvo", label: "Viúvo(a)" }, { value: "uniao_estavel", label: "União Estável" }];
const COR_OPTIONS         = [{ value: "branca", label: "Branca" }, { value: "preta", label: "Preta" }, { value: "parda", label: "Parda" }, { value: "amarela", label: "Amarela" }, { value: "indigena", label: "Indígena" }];
const ESCOLARIDADE        = [{ value: "fundamental", label: "Ensino Fundamental" }, { value: "medio", label: "Ensino Médio" }, { value: "superior", label: "Ensino Superior" }, { value: "pos_graduacao", label: "Pós-Graduação" }, { value: "mestrado", label: "Mestrado" }, { value: "doutorado", label: "Doutorado" }, { value: "pos_doutorado", label: "Pós-Doutorado" }];
const NIVEL_OPTIONS       = [{ value: "A", label: "Nível A" }, { value: "B", label: "Nível B" }, { value: "C", label: "Nível C" }, { value: "NI", label: "NI" }];
const TIPO_CONTA          = [{ value: "corrente", label: "Corrente" }, { value: "poupanca", label: "Poupança" }, { value: "pagamento", label: "Pagamento" }];
const CHAVE_PIX_TIPO      = [{ value: "cpf", label: "CPF" }, { value: "email", label: "E-mail" }, { value: "telefone", label: "Telefone" }, { value: "aleatoria", label: "Aleatória" }];
const CAMISA_OPTIONS      = [{ value: "P", label: "P" }, { value: "M", label: "M" }, { value: "G", label: "G" }, { value: "GG", label: "GG" }, { value: "XG", label: "XG" }];
const SANGUE_OPTIONS      = ["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(v => ({ value: v, label: v }));
const DESLOCAMENTO        = [{ value: "local", label: "Apenas minha cidade" }, { value: "metropolitana", label: "Região metropolitana" }, { value: "estadual", label: "Todo o estado" }, { value: "nacional", label: "Nacional" }];

const BANCOS = [
  { value: "001", label: "001 - Banco do Brasil" },
  { value: "033", label: "033 - Santander" },
  { value: "104", label: "104 - Caixa Econômica" },
  { value: "237", label: "237 - Bradesco" },
  { value: "341", label: "341 - Itaú Unibanco" },
  { value: "077", label: "077 - Banco Inter" },
  { value: "260", label: "260 - Nubank" },
  { value: "336", label: "336 - C6 Bank" },
  { value: "748", label: "748 - Sicredi" },
  { value: "756", label: "756 - Sicoob" },
  { value: "212", label: "212 - Banco Original" },
  { value: "422", label: "422 - Safra" },
  { value: "070", label: "070 - BRB" },
  { value: "085", label: "085 - AILOS" },
  { value: "290", label: "290 - PagBank" },
  { value: "380", label: "380 - PicPay" },
  { value: "403", label: "403 - Cora" },
  { value: "000", label: "Outro" },
];

const STEPS = [
  { key: "pessoal",      label: "Dados Pessoais" },
  { key: "documentos",   label: "Documentos" },
  { key: "endereco",     label: "Endereço" },
  { key: "bancario",     label: "Dados Bancários" },
  { key: "profissional", label: "Profissional" },
];

// ── Styles helpers ────────────────────────────────────────────────────────────

const inp = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body,
  fontSize: 14, outline: "none", boxSizing: "border-box",
  background: "#fff", color: COLORS.dark,
};
const labelSt = {
  fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark,
  display: "block", marginBottom: 4,
};
const errSt = { fontFamily: FONTS.body, fontSize: 11, color: COLORS.primary, marginTop: 2 };

function Field({ label, required, error, children }) {
  return (
    <div>
      <label style={labelSt}>{label}{required && <span style={{ color: COLORS.primary }}> *</span>}</label>
      {children}
      {error && <div style={errSt}>{error}</div>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", mask, maxLength, ...rest }) {
  const handleChange = (e) => {
    let v = e.target.value;
    if (mask === "cpf") v = v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    if (mask === "phone") v = v.replace(/\D/g, "").slice(0, 11).replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
    if (mask === "nis") v = v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3}\.\d{5})(\d)/, "$1.$2").replace(/(\d{3}\.\d{5}\.\d{2})(\d)/, "$1-$2");
    if (mask === "cep") v = v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
    onChange(v);
  };
  return <input type={type} value={value} onChange={handleChange} placeholder={placeholder} maxLength={maxLength} style={inp} {...rest} />;
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
      <option value="">{placeholder || "Selecione..."}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CompleteProfileWizard() {
  const { session, login } = useIntranet();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftMsg, setDraftMsg] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState(null); // "privacidade" | "termos" | null

  // Carregar dados existentes e retomar etapa salva
  useEffect(() => {
    if (!session?.refereeId) return;
    refereesAPI.get(session.refereeId).then(r => {
      if (r.data) {
        setData(prev => ({ ...prev, ...r.data }));
        if (typeof r.data.profileStep === "number" && r.data.profileStep > 0) {
          setStep(r.data.profileStep);
        }
      }
      setLoaded(true);
    });
  }, [session?.refereeId]);

  const set = (key, val) => {
    setData(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  // ── viaCEP ──
  const { cep: cepValue, setCep: setCepHook, loading: cepLoading } = useCep((result) => {
    setData(prev => ({
      ...prev,
      logradouro: result.logradouro || prev.logradouro,
      bairro: result.bairro || prev.bairro,
      city: result.cidade || prev.city,
      state: result.estado || prev.state,
    }));
  });

  const handleCep = (v) => {
    setCepHook(v);
    set("cep", v);
  };

  // ── Validação por etapa ──
  const validateStep = async () => {
    const e = {};
    if (step === 0) {
      if (!data.name?.trim()) e.name = "Obrigatório";
      if (!data.dataNascimento) e.dataNascimento = "Obrigatório";
      if (!data.sexo) e.sexo = "Obrigatório";
      if (!data.estadoCivil) e.estadoCivil = "Obrigatório";
      if (!data.cor) e.cor = "Obrigatório";
      if (!data.escolaridade) e.escolaridade = "Obrigatório";
      if (!data.municipioNascimento?.trim()) e.municipioNascimento = "Obrigatório";
      if (!data.ufNascimento) e.ufNascimento = "Obrigatório";
      if (!data.nomeMae?.trim()) e.nomeMae = "Obrigatório";
    }
    if (step === 1) {
      if (!validarCPF(data.cpf)) {
        e.cpf = "CPF inválido";
      } else if (await cpfJaExisteArbitro(data.cpf, session?.refereeId)) {
        e.cpf = "Este CPF já está cadastrado por outro árbitro";
      }
      if (!data.rg?.trim()) e.rg = "Obrigatório";
      if (!data.rgOrgao?.trim()) e.rgOrgao = "Obrigatório";
      if (!data.rgUf) e.rgUf = "Obrigatório";
      if (!data.rgDataExpedicao) e.rgDataExpedicao = "Obrigatório";
      if (!validarNisPis(data.nisPis)) e.nisPis = "NIS/PIS/NIT inválido";
    }
    if (step === 2) {
      if (!data.cep || data.cep.replace(/\D/g, "").length !== 8) e.cep = "CEP inválido";
      if (!data.logradouro?.trim()) e.logradouro = "Obrigatório";
      if (!data.numero?.trim()) e.numero = "Obrigatório";
      if (!data.bairro?.trim()) e.bairro = "Obrigatório";
      if (!data.city?.trim()) e.city = "Obrigatório";
      if (!data.state) e.state = "Obrigatório";
    }
    if (step === 3) {
      if (!data.banco) e.banco = "Obrigatório";
      if (!data.tipoConta) e.tipoConta = "Obrigatório";
      if (!data.agencia?.trim()) e.agencia = "Obrigatório";
      if (!data.contaDigito?.trim()) e.contaDigito = "Obrigatório";
      if (!data.chavePix?.trim()) e.chavePix = "Obrigatório";
      if (!data.chavePixTipo) e.chavePixTipo = "Obrigatório";
    }
    if (step === 4) {
      if (!data.phone || data.phone.replace(/\D/g, "").length < 10) e.phone = "Telefone inválido";
      if (!data.nivel) e.nivel = "Obrigatório";
      if (!data.registroCbat?.trim()) e.registroCbat = "Obrigatório";
      if (!data.tamanhoCamisa) e.tamanhoCamisa = "Obrigatório";
      if (!data.disponibilidadeDeslocamento) e.disponibilidadeDeslocamento = "Obrigatório";
      if (!data.lgpdConsent) e.lgpdConsent = "Você deve aceitar a Política de Privacidade para continuar.";
      if (!data.lgpdSensitiveConsent) e.lgpdSensitiveConsent = "Você deve consentir com o tratamento dos dados sensíveis para continuar.";
      if (!data.confidentialityConsent) e.confidentialityConsent = "Você deve aceitar o termo de sigilo e confidencialidade para continuar.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = async () => { if (await validateStep()) setStep(s => s + 1); };
  const prev = () => setStep(s => s - 1);

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setDraftMsg("");
    const { id, password, ...payload } = data;
    payload.cpf = (payload.cpf || "").replace(/\D/g, "");
    payload.profileStep = step;
    const bancoInfo = BANCOS.find(b => b.value === payload.banco);
    if (bancoInfo) payload.bancoNome = bancoInfo.label.split(" - ")[1] || bancoInfo.label;
    const result = await refereesAPI.update(session.refereeId, payload);
    setSavingDraft(false);
    setDraftMsg(result.error ? `Erro: ${result.error}` : "Rascunho salvo com sucesso!");
    setTimeout(() => setDraftMsg(""), 4000);
  };

  const handleFinish = async () => {
    if (!await validateStep()) return;
    setSaving(true);

    // Encontrar nome do banco
    const bancoInfo = BANCOS.find(b => b.value === data.banco);
    const payload = {
      ...data,
      bancoNome: bancoInfo ? bancoInfo.label.split(" - ")[1] || bancoInfo.label : "",
      cpf: (data.cpf || "").replace(/\D/g, ""),
      profileComplete: true,
      lgpdConsentAt: new Date().toISOString(),
      lgpdSensitiveConsentAt: new Date().toISOString(),
      confidentialityConsentAt: new Date().toISOString(),
    };
    // Remover campos internos
    delete payload.id;
    delete payload.password;

    const result = await refereesAPI.update(session.refereeId, payload);
    setSaving(false);

    if (result.error) {
      setErrors({ _form: result.error });
      return;
    }

    // Recarregar sessão — o reload re-aciona onAuthStateChanged que busca o perfil atualizado
    navigate("/intranet", { replace: true });
    window.location.reload();
  };

  if (!loaded) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f4f4", fontFamily: FONTS.body, color: COLORS.gray }}>Carregando...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f4f4", padding: "32px 24px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 800, color: COLORS.dark, margin: 0 }}>Complete seu Perfil</h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginTop: 6 }}>
            Preencha todos os dados obrigatórios para acessar a intranet.
          </p>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", gap: 4, marginBottom: 32 }}>
          {STEPS.map((s, i) => (
            <div key={s.key} style={{
              flex: 1, padding: "10px 8px", borderRadius: 8, textAlign: "center",
              background: i === step ? COLORS.primary : i < step ? "#007733" : "#e8e8e8",
              color: i <= step ? "#fff" : COLORS.gray,
              fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: 0.5,
              cursor: i < step ? "pointer" : "default",
              transition: "all 0.2s",
            }} onClick={() => { if (i < step) setStep(i); }}>
              {s.label}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 32, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

          {errors._form && (
            <div style={{ background: "#fff0f0", padding: "10px 14px", borderRadius: 8, marginBottom: 20, fontFamily: FONTS.body, fontSize: 13, color: COLORS.primary }}>{errors._form}</div>
          )}

          {/* ── Etapa 1: Dados Pessoais ── */}
          {step === 0 && (
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Nome Completo" required error={errors.name}><Input value={data.name || ""} onChange={v => set("name", v)} /></Field>
              </div>
              <Field label="Data de Nascimento" required error={errors.dataNascimento}><Input type="date" value={data.dataNascimento || ""} onChange={v => set("dataNascimento", v)} /></Field>
              <Field label="Sexo" required error={errors.sexo}><Select value={data.sexo || ""} onChange={v => set("sexo", v)} options={SEXO_OPTIONS} /></Field>
              <Field label="Estado Civil" required error={errors.estadoCivil}><Select value={data.estadoCivil || ""} onChange={v => set("estadoCivil", v)} options={ESTADO_CIVIL} /></Field>
              <Field label="Cor / Raça" required error={errors.cor}><Select value={data.cor || ""} onChange={v => set("cor", v)} options={COR_OPTIONS} /></Field>
              <Field label="Escolaridade" required error={errors.escolaridade}><Select value={data.escolaridade || ""} onChange={v => set("escolaridade", v)} options={ESCOLARIDADE} /></Field>
              <Field label="Município de Nascimento" required error={errors.municipioNascimento}><Input value={data.municipioNascimento || ""} onChange={v => set("municipioNascimento", v)} /></Field>
              <Field label="UF de Nascimento" required error={errors.ufNascimento}><Select value={data.ufNascimento || ""} onChange={v => set("ufNascimento", v)} options={UFS.map(u => ({ value: u, label: u }))} /></Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Nome do Pai" error={errors.nomePai}><Input value={data.nomePai || ""} onChange={v => set("nomePai", v)} /></Field>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Nome da Mãe" required error={errors.nomeMae}><Input value={data.nomeMae || ""} onChange={v => set("nomeMae", v)} /></Field>
              </div>
            </div>
          )}

          {/* ── Etapa 2: Documentos ── */}
          {step === 1 && (
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
              <Field label="CPF" required error={errors.cpf}><Input value={data.cpf || ""} onChange={v => set("cpf", v)} mask="cpf" placeholder="000.000.000-00" /></Field>
              <Field label="RG" required error={errors.rg}><Input value={data.rg || ""} onChange={v => set("rg", v)} /></Field>
              <Field label="Órgão Expedidor" required error={errors.rgOrgao}><Input value={data.rgOrgao || ""} onChange={v => set("rgOrgao", v)} placeholder="Ex: SSP, PC, IFP" /></Field>
              <Field label="UF do RG" required error={errors.rgUf}><Select value={data.rgUf || ""} onChange={v => set("rgUf", v)} options={UFS.map(u => ({ value: u, label: u }))} /></Field>
              <Field label="Data de Expedição" required error={errors.rgDataExpedicao}><Input type="date" value={data.rgDataExpedicao || ""} onChange={v => set("rgDataExpedicao", v)} /></Field>
              <Field label="NIS / PIS / NIT" required error={errors.nisPis}><Input value={data.nisPis || ""} onChange={v => set("nisPis", v)} mask="nis" placeholder="000.00000.00-0" /></Field>
            </div>
          )}

          {/* ── Etapa 3: Endereço ── */}
          {step === 2 && (
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
              <Field label="CEP" required error={errors.cep}>
                <Input value={data.cep || ""} onChange={handleCep} mask="cep" placeholder="00000-000" />
                {cepLoading && <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>Buscando...</div>}
              </Field>
              <div /> {/* spacer */}
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Logradouro" required error={errors.logradouro}><Input value={data.logradouro || ""} onChange={v => set("logradouro", v)} /></Field>
              </div>
              <Field label="Número" required error={errors.numero}><Input value={data.numero || ""} onChange={v => set("numero", v)} /></Field>
              <Field label="Complemento"><Input value={data.complemento || ""} onChange={v => set("complemento", v)} placeholder="Apto, bloco, etc." /></Field>
              <Field label="Bairro" required error={errors.bairro}><Input value={data.bairro || ""} onChange={v => set("bairro", v)} /></Field>
              <Field label="Cidade" required error={errors.city}><Input value={data.city || ""} onChange={v => set("city", v)} /></Field>
              <Field label="UF" required error={errors.state}><Select value={data.state || ""} onChange={v => set("state", v)} options={UFS.map(u => ({ value: u, label: u }))} /></Field>
            </div>
          )}

          {/* ── Etapa 4: Dados Bancários ── */}
          {step === 3 && (
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Banco" required error={errors.banco}><Select value={data.banco || ""} onChange={v => set("banco", v)} options={BANCOS} /></Field>
              </div>
              <Field label="Tipo de Conta" required error={errors.tipoConta}><Select value={data.tipoConta || ""} onChange={v => set("tipoConta", v)} options={TIPO_CONTA} /></Field>
              <Field label="Agência (sem dígito)" required error={errors.agencia}><Input value={data.agencia || ""} onChange={v => set("agencia", v)} placeholder="0001" /></Field>
              <Field label="Conta com Dígito" required error={errors.contaDigito}><Input value={data.contaDigito || ""} onChange={v => set("contaDigito", v)} placeholder="12345-6" /></Field>
              <div />
              <Field label="Tipo da Chave PIX" required error={errors.chavePixTipo}><Select value={data.chavePixTipo || ""} onChange={v => set("chavePixTipo", v)} options={CHAVE_PIX_TIPO} /></Field>
              <Field label="Chave PIX" required error={errors.chavePix}><Input value={data.chavePix || ""} onChange={v => set("chavePix", v)} placeholder="CPF, e-mail, telefone ou chave aleatória" /></Field>
            </div>
          )}

          {/* ── Etapa 5: Profissional + Emergência ── */}
          {step === 4 && (
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
              <Field label="Telefone" required error={errors.phone}><Input value={data.phone || ""} onChange={v => set("phone", v)} mask="phone" placeholder="(31) 99999-9999" /></Field>
              <Field label="Nível" required error={errors.nivel}><Select value={data.nivel || ""} onChange={v => set("nivel", v)} options={NIVEL_OPTIONS} /></Field>
              <Field label="Registro CBAT" required error={errors.registroCbat}><Input value={data.registroCbat || ""} onChange={v => set("registroCbat", v)} placeholder="Número de registro na CBAT" /></Field>
              <Field label="Tamanho de Camisa" required error={errors.tamanhoCamisa}><Select value={data.tamanhoCamisa || ""} onChange={v => set("tamanhoCamisa", v)} options={CAMISA_OPTIONS} /></Field>
              <Field label="Tipo Sanguíneo" error={errors.tipoSanguineo}><Select value={data.tipoSanguineo || ""} onChange={v => set("tipoSanguineo", v)} options={SANGUE_OPTIONS} /></Field>
              <Field label="Disponibilidade de Deslocamento" required error={errors.disponibilidadeDeslocamento}><Select value={data.disponibilidadeDeslocamento || ""} onChange={v => set("disponibilidadeDeslocamento", v)} options={DESLOCAMENTO} /></Field>

              <div style={{ gridColumn: "1 / -1", borderTop: `1px solid ${COLORS.grayLight}`, paddingTop: 16, marginTop: 4 }}>
                <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.dark, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Contato de Emergência</div>
              </div>
              <Field label="Nome" error={errors.contatoEmergenciaNome}><Input value={data.contatoEmergenciaNome || ""} onChange={v => set("contatoEmergenciaNome", v)} /></Field>
              <Field label="Telefone" error={errors.contatoEmergenciaTelefone}><Input value={data.contatoEmergenciaTelefone || ""} onChange={v => set("contatoEmergenciaTelefone", v)} mask="phone" placeholder="(31) 99999-9999" /></Field>

              {/* ── Consentimento LGPD ── */}
              <div style={{ gridColumn: "1 / -1", borderTop: `1px solid ${COLORS.grayLight}`, paddingTop: 16, marginTop: 8 }}>
                <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.dark, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Consentimento e Privacidade</div>

                <label style={{ display: "flex", gap: 10, cursor: "pointer", fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark, lineHeight: 1.6, marginBottom: 12, alignItems: "flex-start" }}>
                  <input type="checkbox" checked={data.lgpdConsent || false} onChange={e => set("lgpdConsent", e.target.checked)}
                    style={{ marginTop: 4, width: 18, height: 18, flexShrink: 0, accentColor: COLORS.primary }} />
                  <span>
                    Li e concordo com a{" "}
                    <button type="button" onClick={(e) => { e.preventDefault(); setModal("privacidade"); }} style={{ background: "none", border: "none", padding: 0, color: COLORS.primary, textDecoration: "underline", cursor: "pointer", font: "inherit" }}>Política de Privacidade</button>
                    {" "}e os{" "}
                    <button type="button" onClick={(e) => { e.preventDefault(); setModal("termos"); }} style={{ background: "none", border: "none", padding: 0, color: COLORS.primary, textDecoration: "underline", cursor: "pointer", font: "inherit" }}>Termos de Uso</button>
                    {" "}da FMA, e autorizo o tratamento dos meus dados pessoais para as finalidades descritas.
                  </span>
                </label>
                {errors.lgpdConsent && <div style={errSt}>{errors.lgpdConsent}</div>}

                <label style={{ display: "flex", gap: 10, cursor: "pointer", fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark, lineHeight: 1.6, alignItems: "flex-start" }}>
                  <input type="checkbox" checked={data.lgpdSensitiveConsent || false} onChange={e => set("lgpdSensitiveConsent", e.target.checked)}
                    style={{ marginTop: 4, width: 18, height: 18, flexShrink: 0, accentColor: COLORS.primary }} />
                  <span>
                    Autorizo, de forma específica e destacada (Art. 11, I da LGPD), o tratamento dos meus
                    dados sensíveis (<strong>cor/raça</strong> e <strong>tipo sanguíneo</strong>) para fins de
                    relatórios estatísticos, políticas de inclusão e segurança em eventos esportivos.
                  </span>
                </label>
                {errors.lgpdSensitiveConsent && <div style={errSt}>{errors.lgpdSensitiveConsent}</div>}

                <label style={{ display: "flex", gap: 10, cursor: "pointer", fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark, lineHeight: 1.6, marginTop: 12, alignItems: "flex-start" }}>
                  <input type="checkbox" checked={data.confidentialityConsent || false} onChange={e => set("confidentialityConsent", e.target.checked)}
                    style={{ marginTop: 4, width: 18, height: 18, flexShrink: 0, accentColor: COLORS.primary }} />
                  <span>
                    Declaro estar ciente de que a Intranet é ambiente restrito e confidencial.
                    Comprometo-me a não divulgar, compartilhar, reproduzir ou capturar (prints, gravações ou fotografias)
                    qualquer informação nela contida, sob pena de suspensão do acesso e responsabilização
                    administrativa, civil e criminal, conforme os{" "}
                    <button type="button" onClick={(e) => { e.preventDefault(); setModal("termos"); }} style={{ background: "none", border: "none", padding: 0, color: COLORS.primary, textDecoration: "underline", cursor: "pointer", font: "inherit" }}>Termos de Uso (seção 4.2)</button>.
                  </span>
                </label>
                {errors.confidentialityConsent && <div style={errSt}>{errors.confidentialityConsent}</div>}
              </div>
            </div>
          )}

          {/* ── Mensagem de rascunho ── */}
          {draftMsg && (
            <div style={{
              marginTop: 16, padding: "10px 14px", borderRadius: 8,
              background: draftMsg.startsWith("Erro") ? "#fff0f0" : "#e6f9ee",
              fontFamily: FONTS.body, fontSize: 13,
              color: draftMsg.startsWith("Erro") ? COLORS.primary : "#007733",
            }}>{draftMsg}</div>
          )}

          {/* ── Navegação ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, gap: 12 }}>
            {step > 0 ? (
              <button onClick={prev} style={{
                padding: "10px 24px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`,
                background: "transparent", color: COLORS.gray, fontFamily: FONTS.heading,
                fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "uppercase",
              }}>Voltar</button>
            ) : <div />}

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={handleSaveDraft} disabled={savingDraft} style={{
                padding: "10px 24px", borderRadius: 8,
                border: `1px solid ${COLORS.grayLight}`,
                background: "transparent", color: COLORS.dark, fontFamily: FONTS.heading,
                fontSize: 13, fontWeight: 700, cursor: savingDraft ? "not-allowed" : "pointer",
                textTransform: "uppercase", letterSpacing: 0.5,
              }}>{savingDraft ? "Salvando..." : "Salvar Rascunho"}</button>

              {step < STEPS.length - 1 ? (
                <button onClick={next} style={{
                  padding: "10px 24px", borderRadius: 8, border: "none",
                  background: COLORS.primary, color: "#fff", fontFamily: FONTS.heading,
                  fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}>Proximo</button>
              ) : (
                <button onClick={handleFinish} disabled={saving} style={{
                  padding: "10px 28px", borderRadius: 8, border: "none",
                  background: saving ? COLORS.gray : "#007733", color: "#fff", fontFamily: FONTS.heading,
                  fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>{saving ? "Salvando..." : "Concluir Perfil"}</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal Termos / Privacidade ── */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setModal(null)}>
          <div style={{
            background: "#fff", borderRadius: 14, width: "90%", maxWidth: 860,
            maxHeight: "85vh", overflow: "auto", position: "relative",
          }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setModal(null)} style={{
              position: "sticky", top: 12, float: "right", marginRight: 12,
              background: COLORS.dark, color: "#fff", border: "none", borderRadius: 8,
              width: 36, height: 36, fontSize: 18, cursor: "pointer", zIndex: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>X</button>
            {modal === "privacidade" && <PoliticaPrivacidade />}
            {modal === "termos" && <TermosUso />}
          </div>
        </div>
      )}
    </div>
  );
}
