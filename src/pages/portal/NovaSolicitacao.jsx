/**
 * NovaSolicitacao.jsx — Criação de solicitação de Permit ou Chancela.
 * Rota: /portal/nova-solicitacao
 *
 * Stepper 3 etapas:
 *   1. Tipo (Permit / Chancela)
 *   2. Dados base do evento
 *   3. Formulário técnico — config-driven (lê formSchema.js do localStorage)
 *      Seções e campos definidos pelo admin no painel /admin/formularios
 *
 * Campos especiais (sempre renderizados independente do config):
 *   - Modalidades (array dinâmico)
 */
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useOrganizer } from "../../context/OrganizerContext";
import { SolicitacoesService, MovimentacoesService, ArquivosService, OrganizersService, TaxasConfigService } from "../../services/index";
import { uploadFile } from "../../services/storageService";
import { COLORS, FONTS } from "../../styles/colors";
import { SOLICITACAO_TIPOS } from "../../config/navigation";

import { useCep } from "../../hooks/useCep";
import CepField from "../../components/common/CepField";
import { validarCPF, validarCNPJ } from "../../utils/cpfCnpj";
import {
  defaultCamposTecnicosPermit, defaultCamposTecnicosChancela,
  novaModalidadeId, totalEstimativaInscritos,
} from "../../utils/permitDefaults";
import {
  getFieldsBySection, validarCamposConfig, initFormConfig, getFormConfig,
} from "../../utils/formSchema";
import {
  calcularTaxaTotal, formatarMoeda, TABELA_PADRAO, PRAZOS,
} from "../../utils/taxaCalculator";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sanitize(str) {
  return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 80);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ─── Helpers de estilo ────────────────────────────────────────────────────────
const priBtn = {
  padding: "11px 24px", borderRadius: 8, border: "none",
  background: "#0066cc", color: "#fff", fontFamily: FONTS.heading,
  fontSize: 13, fontWeight: 800, cursor: "pointer", textTransform: "uppercase",
};
const secBtn = {
  padding: "11px 18px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`,
  background: "#fff", color: COLORS.grayDark, fontFamily: FONTS.heading,
  fontSize: 13, fontWeight: 700, cursor: "pointer",
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function NovaSolicitacao() {
  const { organizerId, organizerName, organizerActive, motivoDesativacao } = useOrganizer();
  const navigate = useNavigate();

  useEffect(() => { initFormConfig(); }, []);

  if (!organizerActive) {
    return (
      <div style={{ padding: "60px 40px", maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}></div>
        <h2 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: "#dc2626", textTransform: "uppercase", margin: "0 0 12px" }}>Conta bloqueada</h2>
        <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: "0 0 16px", lineHeight: 1.6 }}>
          Sua conta foi desativada pela FMA. Não é possível criar novas solicitações.
        </p>
        {motivoDesativacao && (
          <div style={{ padding: "12px 16px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", textAlign: "left", marginBottom: 20 }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#dc2626", marginBottom: 4 }}>Motivo</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 14, color: "#991b1b" }}>{motivoDesativacao}</div>
          </div>
        )}
        <button onClick={() => navigate("/portal")}
          style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          ← Voltar ao Portal
        </button>
      </div>
    );
  }

  // ── Config de taxas e dados do organizador (parceria) ─────────────────────
  const [taxasConfig, setTaxasConfig] = useState(null);
  const [organizerData, setOrganizerData] = useState(null);
  const [comprovantePagamento, setComprovantePagamento] = useState(null); // File object
  const [pagadorTerceiro, setPagadorTerceiro] = useState(false);
  const [pagadorNome, setPagadorNome] = useState("");
  const [pagadorCpfCnpj, setPagadorCpfCnpj] = useState("");
  const [pagadorContato, setPagadorContato] = useState("");
  const [pagadorEndereco, setPagadorEndereco] = useState("");
  const [anuenciaAceita, setAnuenciaAceita] = useState(false);

  // CEP do terceiro pagador
  const [pagadorNumero, setPagadorNumero] = useState("");
  const [pagadorComplemento, setPagadorComplemento] = useState("");
  const {
    cep: pagadorCep, setCep: setPagadorCep,
    setNumero: pagadorCepSetNumero,
    loading: pagadorCepLoading, error: pagadorCepError, endereco: pagadorCepEndereco,
  } = useCep((found) => {
    const partes = [found.logradouro, pagadorNumero, pagadorComplemento, found.bairro, found.cidade, found.estado].filter(Boolean);
    setPagadorEndereco(partes.join(", "));
  });

  useEffect(() => {
    TaxasConfigService.get().then(r => setTaxasConfig(r.data));
    if (organizerId) {
      OrganizersService.get(organizerId).then(r => { if (r.data) setOrganizerData(r.data); });
    }
  }, [organizerId]);

  const [step, setStep]   = useState(1);
  const [tipo, setTipo]   = useState("");
  const [form, setForm]   = useState({
    nomeEvento: "", dataEvento: "", cidadeEvento: "",
    localEvento: "", descricaoEvento: "", lat: "", lng: "",
  });
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [nomeLocal, setNomeLocal] = useState("");
  const { cep, setCep, setNumero: cepSetNumero, loading: cepLoading, error: cepError, endereco: cepEndereco } = useCep((found) => {
    setF("cidadeEvento", found.cidade);
    setF("localEvento", `${found.logradouro}${numero ? ", " + numero : ""}${complemento ? ", " + complemento : ""}, ${found.bairro}`);
    setF("lat", found.lat ?? "");
    setF("lng", found.lng ?? "");
  });

  const [ct, setCt]       = useState({});
  const [uploadRefs]      = useState({}); // { fieldId: React.RefObject }
  const [pendingFiles, setPendingFiles] = useState({});  // { fieldId: File }
  const [errors, setErrors]       = useState({});
  const [ctErrors, setCtErrors]   = useState({});
  const [saving, setSaving]       = useState(false);
  const [globalError, setGlobalError] = useState("");

  const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };
  const setC = (k, v) => { setCt(c => ({ ...c, [k]: v })); setCtErrors(e => ({ ...e, [k]: "" })); };

  const addModalidade = () =>
    setCt(c => ({ ...c, modalidades: [...(c.modalidades || []), { id: novaModalidadeId(), distancia: "", estimativaInscritos: "" }] }));
  const addModalidadeComNome = (nome) =>
    setCt(c => ({ ...c, modalidades: [...(c.modalidades || []), { id: novaModalidadeId(), distancia: nome, estimativaInscritos: "" }] }));
  const removeModalidade = (id) =>
    setCt(c => ({ ...c, modalidades: (c.modalidades || []).filter(m => m.id !== id) }));
  const setModalidade = (id, key, value) => {
    setCt(c => ({ ...c, modalidades: (c.modalidades || []).map(m => m.id === id ? { ...m, [key]: value } : m) }));
    setCtErrors(e => ({ ...e, modalidades: "", modalidadesEstimativa: "" }));
  };

  const getOrCreateRef = (fieldId) => {
    if (!uploadRefs[fieldId]) uploadRefs[fieldId] = { current: null };
    return uploadRefs[fieldId];
  };

  const handleFileChange = (fieldId, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setCtErrors(e => ({ ...e, [fieldId]: "Arquivo muito grande (máx. 5 MB)." }));
      return;
    }
    setPendingFiles(p => ({ ...p, [fieldId]: file }));
    setCt(c => ({ ...c, [fieldId]: { temArquivo: true, nomeArquivo: file.name, arquivoId: "" } }));
    setCtErrors(e => ({ ...e, [fieldId]: "" }));
  };

  // ── Cálculo de taxa em tempo real ────────────────────────────────────────
  const taxaCalc = useMemo(() => {
    if (!tipo || !ct.modalidades) return null;
    const tabela = (organizerData?.parceiro && organizerData?.parceiroTipo === "tabela_customizada" && organizerData?.tabelaTaxas)
      ? organizerData.tabelaTaxas : TABELA_PADRAO;
    const desconto = organizerData?.parceiro
      ? { tipo: organizerData.parceiroTipo, percentual: organizerData.parceiroDesconto || 0 }
      : null;
    return calcularTaxaTotal(ct.modalidades, form.dataEvento, tipo, tabela, desconto);
  }, [ct.modalidades, form.dataEvento, tipo, organizerData]);

  const bloqueio = taxasConfig?.bloqueioEnvioSemPagamento ?? true;
  const isParceiro = organizerData?.parceiro && organizerData?.parceiroTipo === "isencao";
  const precisaPagamento = bloqueio && !isParceiro && (taxaCalc?.total || 0) > 0;
  const temComprovante = !!comprovantePagamento;
  const envioLiberado = !precisaPagamento || temComprovante;

  const inp = (hasError = false) => ({
    width: "100%", padding: "10px 13px", borderRadius: 8,
    border: `1.5px solid ${hasError ? "#fca5a5" : COLORS.grayLight}`,
    fontFamily: FONTS.body, fontSize: 14, outline: "none",
    boxSizing: "border-box", background: "#fff", transition: "border-color 0.15s",
  });
  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 14 };
  const LBL = ({ children, req }) => (
    <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 5 }}>
      {children}{req && <span style={{ color: COLORS.primary }}> *</span>}
    </label>
  );

  const validateBase = () => {
    const e = {};
    if (!form.nomeEvento.trim())   e.nomeEvento   = "Nome do evento obrigatório.";
    if (!form.dataEvento)          e.dataEvento   = "Data de realização obrigatória.";
    if (!form.cidadeEvento.trim()) e.cidadeEvento = "Município obrigatório.";
    if (!form.localEvento.trim())  e.localEvento  = "Local de realização obrigatório.";
    return e;
  };

  const uploadArquivosPendentes = async (solicitacaoId, ctAtual, storagePath) => {
    const ctAtualizado = { ...ctAtual };
    const allFields = (getFormConfig()[tipo] || []);
    const fieldMap = Object.fromEntries(allFields.map(f => [f.id, f.label]));
    for (const [fieldId, file] of Object.entries(pendingFiles)) {
      try {
        const ext = file.name.includes(".") ? file.name.split(".").pop() : "pdf";
        const campoLabel = sanitize(fieldMap[fieldId] || fieldId);
        const nomeEvento = sanitize(form.nomeEvento || "evento");
        const nomeArquivo = `${campoLabel}_${nomeEvento}.${ext}`;
        const renamedFile = new File([file], nomeArquivo, { type: file.type });

        // Upload para Firebase Storage na pasta da solicitação
        const { url, path, error: uploadError } = await uploadFile(
          renamedFile,
          storagePath
        );
        if (uploadError) throw new Error(uploadError);

        // Registra metadados no Firestore
        const r = await ArquivosService.upload({
          solicitacaoId, nome: nomeArquivo, tamanho: file.size,
          tipo: file.type || "application/octet-stream",
          descricao: `Documento: ${fieldMap[fieldId] || fieldId}`, categoria: "obrigatorio",
          url, storagePath: path,
          enviadoPor: "organizador", enviadoPorId: organizerId,
        });
        if (r.data) {
          ctAtualizado[fieldId] = {
            temArquivo: true, nomeArquivo,
            arquivoId: r.data.id, url,
          };
        }
      } catch (e) {
        ctAtualizado[fieldId] = { temArquivo: false, nomeArquivo: file.name, arquivoId: "", erro: e.message };
      }
    }
    return ctAtualizado;
  };

  const handleSave = async (enviar = false) => {
    const eBase = validateBase();
    const eTec  = enviar ? validarCamposConfig(ct, tipo) : {};
    if (Object.keys(eBase).length > 0) { setErrors(eBase); if (step === 3) setStep(2); return; }
    if (Object.keys(eTec).length > 0)  { setCtErrors(eTec); return; }

    // Validação de pagamento no envio
    if (enviar && precisaPagamento && !temComprovante) {
      setGlobalError("Anexe o comprovante de pagamento para enviar a solicitação.");
      return;
    }

    setSaving(true); setGlobalError("");
    const formFinal = { ...form };
    if (nomeLocal.trim()) formFinal.localEvento = nomeLocal.trim() + " — " + formFinal.localEvento;

    const sanitize = (s) => (s || "sem-nome").replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, "").trim().replace(/\s+/g, "_");
    const anoEvento = (formFinal.dataEvento || "").slice(0, 4) || String(new Date().getFullYear());
    const storagePath = `solicitacoes/${anoEvento}/${sanitize(organizerName)}/${sanitize(formFinal.nomeEvento)}`;

    // Montar dados de taxas
    const taxasData = taxaCalc ? {
      modalidades: taxaCalc.modalidades,
      subtotal: taxaCalc.subtotal,
      urgencia: taxaCalc.urgencia,
      descontoTipo: taxaCalc.desconto?.tipo || "",
      descontoValor: taxaCalc.desconto?.valor || 0,
      descontoDescricao: taxaCalc.desconto?.descricao || "",
      total: taxaCalc.total,
      calculadoEm: new Date().toISOString(),
      ajustadoPorFMA: false,
      observacaoAjuste: "",
    } : {};

    // Validar dados do terceiro pagador
    if (enviar && pagadorTerceiro) {
      if (!pagadorNome.trim()) { setGlobalError("Informe o nome do terceiro pagador."); setSaving(false); return; }
      const pagadorDoc = pagadorCpfCnpj.replace(/\D/g, "");
      if (!pagadorDoc) { setGlobalError("Informe o CPF/CNPJ do terceiro pagador."); setSaving(false); return; }
      if (pagadorDoc.length <= 11 && !validarCPF(pagadorDoc)) { setGlobalError("CPF do terceiro pagador é inválido."); setSaving(false); return; }
      if (pagadorDoc.length > 11 && !validarCNPJ(pagadorDoc)) { setGlobalError("CNPJ do terceiro pagador é inválido."); setSaving(false); return; }
      if (!pagadorEndereco.trim()) { setGlobalError("Informe o endereco do terceiro pagador."); setSaving(false); return; }
      if (!anuenciaAceita) { setGlobalError("Aceite a declaracao de anuencia para pagamento por terceiro."); setSaving(false); return; }
    }

    const pagamentoData = {
      status: isParceiro ? "isento" : (comprovantePagamento ? "comprovante_anexado" : "pendente"),
      comprovanteArquivoId: "",
      confirmadoPor: "",
      confirmadoEm: "",
      observacao: "",
      pagadorTerceiro,
      pagadorNome: pagadorTerceiro ? pagadorNome.trim() : "",
      pagadorCpfCnpj: pagadorTerceiro ? pagadorCpfCnpj.trim() : "",
      pagadorContato: pagadorTerceiro ? pagadorContato.trim() : "",
      pagadorEndereco: pagadorTerceiro ? pagadorEndereco.trim() : "",
      anuenciaAceita: pagadorTerceiro ? anuenciaAceita : false,
      anuenciaAceitaEm: pagadorTerceiro && anuenciaAceita ? new Date().toISOString() : "",
    };

    const r = await SolicitacoesService.create({
      ...formFinal, tipo, organizerId, status: "rascunho", campos: {},
      camposTecnicos: ct, taxas: taxasData, pagamento: pagamentoData,
      storagePath,
    });
    if (r.error) { setGlobalError(r.error); setSaving(false); return; }
    const sol = r.data;

    const ctComArquivos = await uploadArquivosPendentes(sol.id, ct, storagePath);
    await SolicitacoesService.update(sol.id, { camposTecnicos: ctComArquivos });

    // Upload do comprovante de pagamento (renomeado com o nome do evento)
    if (comprovantePagamento) {
      try {
        const ext = comprovantePagamento.name.includes(".") ? comprovantePagamento.name.split(".").pop() : "pdf";
        const nomeEvento = (formFinal.nomeEvento || "evento").replace(/[^a-zA-Z0-9À-ÿ\s-]/g, "").trim().replace(/\s+/g, "_");
        const nomeComprovante = `Comprovante_Pagamento_${nomeEvento}.${ext}`;
        const renamedFile = new File([comprovantePagamento], nomeComprovante, { type: comprovantePagamento.type });
        const { url, path } = await uploadFile(renamedFile, storagePath);
        const arqR = await ArquivosService.upload({
          solicitacaoId: sol.id, nome: nomeComprovante,
          tamanho: comprovantePagamento.size, tipo: comprovantePagamento.type || "application/octet-stream",
          descricao: "Comprovante de pagamento", categoria: "obrigatorio",
          url, storagePath: path,
          enviadoPor: "organizador", enviadoPorId: organizerId,
        });
        if (arqR.data) {
          await SolicitacoesService.update(sol.id, {
            pagamento: { ...pagamentoData, comprovanteArquivoId: arqR.data.id },
          });
        }
      } catch (e) {
      }
    }

    await MovimentacoesService.registrar({
      solicitacaoId: sol.id, tipoEvento: "criada",
      statusAnterior: "", statusNovo: "rascunho",
      descricao: "Solicitação criada como rascunho.",
      autor: "organizador", autorNome: organizerName, autorId: organizerId, visivel: true,
    });
    if (enviar) await SolicitacoesService.enviar(sol.id, organizerId, organizerName);
    setSaving(false);
    navigate(`/portal/solicitacoes/${sol.id}`);
  };

  const handleNextStep2 = () => {
    const e = validateBase();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setStep(3);
  };

  const handleSelectTipo = (t) => {
    setTipo(t);
    setCt(t === "permit" ? defaultCamposTecnicosPermit() : defaultCamposTecnicosChancela());
    setPendingFiles({});
  };

  const STEPS = [
    { n: 1, l: "Tipo" },
    { n: 2, l: "Dados do evento" },
    { n: 3, l: tipo === "permit" ? "Formulário Permit" : tipo === "chancela" ? "Formulário Chancela" : "Detalhes" },
  ];

  return (
    <>
      <div style={{ padding: "36px 40px 80px", maxWidth: 820 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: "#0066cc", marginBottom: 6 }}>Portal FMA</div>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 28, fontWeight: 900, color: COLORS.dark, textTransform: "uppercase", margin: 0 }}>Nova Solicitação</h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "6px 0 0" }}>Solicite um Permit ou Chancela para seu evento de atletismo.</p>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", marginBottom: 28, background: "#fff", borderRadius: 10, border: `1px solid ${COLORS.grayLight}`, overflow: "hidden" }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ flex: 1, padding: "12px 10px", textAlign: "center",
              background: step === s.n ? "#0066cc" : step > s.n ? "#e8f0fe" : "#fff",
              borderRight: i < STEPS.length - 1 ? `1px solid ${COLORS.grayLight}` : "none" }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: step === s.n ? "#fff" : step > s.n ? "#0066cc" : COLORS.gray }}>
                {`${s.n}. `}{s.l}
              </div>
            </div>
          ))}
        </div>

        {globalError && (
          <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontFamily: FONTS.body, fontSize: 13, color: "#dc2626" }}>{globalError}</div>
        )}

        {/* ── Step 1: Tipo ── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, margin: "0 0 18px" }}>Selecione o tipo de solicitação</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              {SOLICITACAO_TIPOS.map(t => {
                const detalhes = t.value === "permit" ? {
                  norma: "Norma 07 da CBAt",
                  modalidades: "Corridas de rua e ultramaratonas",
                  distancias: "1 Milha, 5km, 10km, 15km, 20km, 25km, 30km, Meia-Maratona, Maratona, Ultramaratonas",
                  inclui: "Arbitragem oficial, medição de percurso certificada e cronometragem",
                } : {
                  norma: "Norma 15 da CBAt",
                  modalidades: "Corridas em montanha e corridas em trilha",
                  distancias: "Subida Clássica, Subida e Descida, Vertical, Longa Distância, Revezamentos (classes XXS a XXL)",
                  inclui: "Delegado Técnico, plano de segurança e autorização ambiental",
                };
                return (
                <button key={t.value} onClick={() => handleSelectTipo(t.value)}
                  style={{ padding: "28px 24px", borderRadius: 14, textAlign: "left", cursor: "pointer",
                    border: `2.5px solid ${tipo === t.value ? "#0066cc" : COLORS.grayLight}`,
                    background: tipo === t.value ? "#eff6ff" : "#fff", transition: "all 0.15s" }}>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 900, color: tipo === t.value ? "#0066cc" : COLORS.dark, textTransform: "uppercase", marginBottom: 8 }}>{t.label}</div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, lineHeight: 1.5, marginBottom: 12 }}>{t.desc}</div>
                  <div style={{ fontSize: 12, fontFamily: FONTS.body, color: COLORS.gray, lineHeight: 1.7, borderTop: `1px solid ${COLORS.grayLight}`, paddingTop: 10 }}>
                    <div><strong>Modalidades:</strong> {detalhes.modalidades}</div>
                    <div><strong>Distâncias:</strong> {detalhes.distancias}</div>
                    <div><strong>Inclui:</strong> {detalhes.inclui}</div>
                    <div style={{ marginTop: 4, fontStyle: "italic", fontSize: 11, color: "#9ca3af" }}>Conforme {detalhes.norma}</div>
                  </div>
                  {tipo === t.value && (
                    <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "#0066cc", color: "#fff", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>Selecionado</div>
                  )}
                </button>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => { if (tipo) setStep(2); }} disabled={!tipo}
                style={{ ...priBtn, background: tipo ? "#0066cc" : COLORS.gray, cursor: tipo ? "pointer" : "not-allowed" }}>
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Dados base ── */}
        {step === 2 && (
          <div>
            <TipoBadge tipo={tipo} onBack={() => setStep(1)} />
            <div style={card}>
              <SecTitle>Dados do Evento</SecTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <LBL req>Nome do Evento</LBL>
                  <input value={form.nomeEvento} onChange={e => setF("nomeEvento", e.target.value)} placeholder="Ex: Corrida de Rua BH 2026 – 1ª Etapa" style={inp(!!errors.nomeEvento)} />
                  {errors.nomeEvento && <ErrMsg msg={errors.nomeEvento} />}
                </div>
                <div>
                    <LBL req>Data de Realização</LBL>
                    <input type="date" value={form.dataEvento} onChange={e => setF("dataEvento", e.target.value)} style={inp(!!errors.dataEvento)} />
                    {errors.dataEvento && <ErrMsg msg={errors.dataEvento} />}
                  </div>
                <div>
                  <LBL req>Local de realização</LBL>
                  <CepField
                    cep={cep} onChange={setCep}
                    numero={numero} onNumero={(v) => {
                      setNumero(v);
                      if (cepEndereco) setF("localEvento", [cepEndereco.logradouro, v, complemento, cepEndereco.bairro].filter(Boolean).join(", "));
                    }}
                    loading={cepLoading} error={cepError} endereco={cepEndereco}
                    complemento={complemento}
                    onComplemento={(v) => {
                      setComplemento(v);
                      if (cepEndereco) setF("localEvento", [cepEndereco.logradouro, numero, v, cepEndereco.bairro].filter(Boolean).join(", "));
                    }}
                    setNumero={cepSetNumero}
                    required
                    nomeLocal={nomeLocal}
                    onNomeLocal={setNomeLocal}
                  />
                  {(errors.cidadeEvento || errors.localEvento) && <ErrMsg msg={errors.cidadeEvento || errors.localEvento} />}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setStep(1)} style={secBtn}>← Voltar</button>
              <button onClick={handleNextStep2} style={priBtn}>Continuar →</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Formulário técnico (config-driven) ── */}
        {step === 3 && (tipo === "permit" || tipo === "chancela") && (
          <div>
            <TipoBadge tipo={tipo} onBack={() => setStep(1)} />

            {/* Seção Modalidades — sempre presente */}
            <div style={card}>
              <SecTitle>Modalidades / Distâncias</SecTitle>
              <ModalidadesSection
                modalidades={ct.modalidades || []}
                ctErrors={ctErrors}
                setModalidade={setModalidade}
                addModalidade={addModalidade}
                addModalidadeComNome={addModalidadeComNome}
                removeModalidade={removeModalidade}
                inp={inp}
                tipo={tipo}
              />
            </div>

            {/* Seções dinâmicas do config */}
            <ConfigSections
              tipo={tipo} ct={ct} ctErrors={ctErrors}
              setC={setC}
              uploadRefs={uploadRefs}
              pendingFiles={pendingFiles}
              onFileChange={handleFileChange}
              getOrCreateRef={getOrCreateRef}
              inp={inp} card={card}
            />

            {/* ── Card Estimativa de Taxa ── */}
            {taxaCalc && taxaCalc.modalidades.length > 0 && (
              <TaxaEstimativaCard
                taxaCalc={taxaCalc}
                tipo={tipo}
                organizerData={organizerData}
                taxasConfig={taxasConfig}
                bloqueio={bloqueio}
                comprovantePagamento={comprovantePagamento}
                onComprovanteChange={setComprovantePagamento}
                envioLiberado={envioLiberado}
                pagadorTerceiro={pagadorTerceiro}
                onPagadorTerceiroChange={setPagadorTerceiro}
                pagadorNome={pagadorNome}
                onPagadorNomeChange={setPagadorNome}
                pagadorCpfCnpj={pagadorCpfCnpj}
                onPagadorCpfCnpjChange={setPagadorCpfCnpj}
                pagadorContato={pagadorContato}
                onPagadorContatoChange={setPagadorContato}
                pagadorEndereco={pagadorEndereco}
                onPagadorEnderecoChange={setPagadorEndereco}
                pagadorCep={pagadorCep}
                onPagadorCepChange={setPagadorCep}
                pagadorNumero={pagadorNumero}
                onPagadorNumeroChange={(v) => {
                  setPagadorNumero(v);
                  pagadorCepSetNumero(v, pagadorComplemento);
                  if (pagadorCepEndereco) setPagadorEndereco([pagadorCepEndereco.logradouro, v, pagadorComplemento, pagadorCepEndereco.bairro, pagadorCepEndereco.cidade, pagadorCepEndereco.estado].filter(Boolean).join(", "));
                }}
                pagadorComplemento={pagadorComplemento}
                onPagadorComplementoChange={(v) => {
                  setPagadorComplemento(v);
                  if (pagadorCepEndereco) setPagadorEndereco([pagadorCepEndereco.logradouro, pagadorNumero, v, pagadorCepEndereco.bairro, pagadorCepEndereco.cidade, pagadorCepEndereco.estado].filter(Boolean).join(", "));
                }}
                pagadorCepLoading={pagadorCepLoading}
                pagadorCepError={pagadorCepError}
                pagadorCepEndereco={pagadorCepEndereco}
                pagadorCepSetNumero={pagadorCepSetNumero}
                anuenciaAceita={anuenciaAceita}
                onAnuenciaChange={setAnuenciaAceita}
              />
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
              <button onClick={() => setStep(2)} style={secBtn}>← Voltar</button>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => handleSave(false)} disabled={saving} style={{ ...secBtn, opacity: saving ? 0.6 : 1 }}>
                  Salvar rascunho
                </button>
                <button onClick={() => handleSave(true)} disabled={saving || (precisaPagamento && !temComprovante)}
                  style={{ ...priBtn, opacity: (saving || (precisaPagamento && !temComprovante)) ? 0.6 : 1, cursor: (saving || (precisaPagamento && !temComprovante)) ? "not-allowed" : "pointer" }}
                  title={precisaPagamento && !temComprovante ? "Anexe o comprovante de pagamento" : ""}>
                  {saving ? "Enviando..." : "Enviar para analise"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function ErrMsg({ msg }) {
  return <div style={{ fontFamily: FONTS.body, fontSize: 11, color: "#dc2626", marginTop: 3 }}>{msg}</div>;
}

function TipoBadge({ tipo, onBack }) {
  const t = SOLICITACAO_TIPOS.find(x => x.value === tipo);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, padding: "10px 16px", background: "#eff6ff", borderRadius: 10, border: "1.5px solid #bfdbfe" }}>
      <span style={{ fontSize: 20 }}>{t?.icon}</span>
      <div>
        <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, color: "#0066cc" }}>Tipo: {t?.label}</div>
        <button onClick={onBack} style={{ fontFamily: FONTS.body, fontSize: 11, color: "#0066cc", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Alterar tipo</button>
      </div>
    </div>
  );
}

// ─── Card de Estimativa de Taxa ──────────────────────────────────────────────
function TaxaEstimativaCard({ taxaCalc, tipo, organizerData, taxasConfig, bloqueio, comprovantePagamento, onComprovanteChange, envioLiberado, pagadorTerceiro, onPagadorTerceiroChange, pagadorNome, onPagadorNomeChange, pagadorCpfCnpj, onPagadorCpfCnpjChange, pagadorContato, onPagadorContatoChange, pagadorEndereco, onPagadorEnderecoChange, pagadorCep, onPagadorCepChange, pagadorNumero, onPagadorNumeroChange, pagadorComplemento, onPagadorComplementoChange, pagadorCepLoading, pagadorCepError, pagadorCepEndereco, pagadorCepSetNumero, anuenciaAceita, onAnuenciaChange }) {
  const fileRef = useRef(null);
  const [expandido, setExpandido] = useState(null); // id da modalidade expandida
  const isParceiro = organizerData?.parceiro && organizerData?.parceiroTipo === "isencao";
  const prazos = PRAZOS[tipo] || PRAZOS.permit;
  const db = taxasConfig?.dadosBancarios || {};

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 14, border: `2px solid ${taxaCalc.isPrazoInsuficiente ? "#fca5a5" : taxaCalc.isUrgente ? "#fcd34d" : "#bae6fd"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}></span>
        <h3 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, margin: 0 }}>
          Taxa Estimada
        </h3>
        <span style={{ fontSize: 10, color: COLORS.gray, fontFamily: FONTS.body, marginLeft: "auto" }}>
          Estimativa — valor final sujeito a confirmacao pela FMA
        </span>
      </div>

      {/* Alertas de prazo */}
      {taxaCalc.isPrazoInsuficiente && (
        <div style={{ padding: "8px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fca5a5", marginBottom: 10, fontSize: 13, color: "#dc2626", fontFamily: FONTS.body }}>
          <strong>Prazo insuficiente!</strong> Solicitacoes de {tipo === "chancela" ? "Chancela" : "Permit"} com menos de {prazos.minimoDias} dias {tipo === "permit" ? "uteis " : ""}podem ser indeferidas.
        </div>
      )}
      {taxaCalc.isUrgente && !taxaCalc.isPrazoInsuficiente && (
        <div style={{ padding: "8px 14px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fcd34d", marginBottom: 10, fontSize: 13, color: "#92400e", fontFamily: FONTS.body }}>
          <strong>Taxa de urgencia aplicada (+{formatarMoeda(taxaCalc.urgencia)})</strong> — prazo inferior a {prazos.urgenciaDias} dias.
        </div>
      )}

      {/* Parceiro badge */}
      {isParceiro && (
        <div style={{ padding: "6px 12px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 10, fontSize: 12, color: "#15803d", fontFamily: FONTS.body, display: "inline-block" }}>
          Parceiro FMA — {taxaCalc.desconto?.descricao || organizerData.parceiroDescricao || "tabela diferenciada"}
        </div>
      )}

      {/* Detalhamento por modalidade */}
      <div style={{ marginBottom: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: COLORS.offWhite }}>
              <th style={{ textAlign: "left", padding: "6px 10px", fontSize: 11, fontWeight: 700, color: COLORS.grayDark }}>Modalidade</th>
              <th style={{ textAlign: "right", padding: "6px 10px", fontSize: 11, fontWeight: 700, color: COLORS.grayDark }}>Inscritos</th>
              <th style={{ textAlign: "right", padding: "6px 10px", fontSize: 11, fontWeight: 700, color: COLORS.grayDark }}>Bruto</th>
              <th style={{ textAlign: "right", padding: "6px 10px", fontSize: 11, fontWeight: 700, color: COLORS.grayDark }}>Valor</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {taxaCalc.modalidades.map(m => (
              <React.Fragment key={m.id}>
                <tr style={{ borderBottom: expandido === m.id ? "none" : `1px solid ${COLORS.grayLight}`, cursor: "pointer" }}
                  onClick={() => setExpandido(expandido === m.id ? null : m.id)}>
                  <td style={{ padding: "6px 10px" }}>{m.distancia}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right" }}>{m.inscritos.toLocaleString("pt-BR")}</td>
                  <td style={{ padding: "6px 10px", textAlign: "right", color: COLORS.gray, fontSize: 12 }}>
                    {m.valorBruto !== m.valorFinal ? formatarMoeda(m.valorBruto) : ""}
                  </td>
                  <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600 }}>{formatarMoeda(m.valorFinal)}</td>
                  <td style={{ padding: "6px 4px", textAlign: "center", fontSize: 10, color: COLORS.gray }}>
                    {expandido === m.id ? "▲" : "▼"}
                  </td>
                </tr>
                {expandido === m.id && m.detalhamento && (
                  <tr>
                    <td colSpan={5} style={{ padding: "0 10px 8px", background: "#f8fafc" }}>
                      <div style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, fontSize: 12, fontFamily: FONTS.body }}>
                        <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 6 }}>
                          Calculo detalhado
                        </div>
                        {m.detalhamento.map((d, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, color: COLORS.grayDark }}>
                            <span>
                              {d.qtd.toLocaleString("pt-BR")} inscritos x {formatarMoeda(d.valorUnitario)}/inscrito
                              <span style={{ fontSize: 10, color: COLORS.gray, marginLeft: 4 }}>(faixa: {d.faixaLabel})</span>
                            </span>
                            <span style={{ fontWeight: 600 }}>{formatarMoeda(d.subtotal)}</span>
                          </div>
                        ))}
                        {m.aplicouMinimo && (
                          <div style={{ fontSize: 11, color: "#d97706", marginTop: 4, padding: "4px 8px", background: "#fffbeb", borderRadius: 4 }}>
                            Valor minimo aplicado: {formatarMoeda(m.valorBruto)} → {formatarMoeda(m.valorFinal)}
                          </div>
                        )}
                        {m.aplicouMaximo && (
                          <div style={{ fontSize: 11, color: "#d97706", marginTop: 4, padding: "4px 8px", background: "#fffbeb", borderRadius: 4 }}>
                            Valor maximo aplicado: {formatarMoeda(m.valorBruto)} → {formatarMoeda(m.valorFinal)}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totais */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontFamily: FONTS.body, borderTop: `1px solid ${COLORS.grayLight}`, paddingTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Subtotal</span><span>{formatarMoeda(taxaCalc.subtotal)}</span>
        </div>
        {taxaCalc.urgencia > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", color: "#92400e" }}>
            <span>Taxa de urgencia</span><span>+{formatarMoeda(taxaCalc.urgencia)}</span>
          </div>
        )}
        {taxaCalc.desconto?.valor > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", color: "#15803d" }}>
            <span>{taxaCalc.desconto.descricao}</span><span>-{formatarMoeda(taxaCalc.desconto.valor)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 16, marginTop: 4, paddingTop: 6, borderTop: `2px solid ${COLORS.grayLight}` }}>
          <span>Total</span><span style={{ color: COLORS.primary }}>{formatarMoeda(taxaCalc.total)}</span>
        </div>
      </div>

      {/* Dados bancários + upload comprovante */}
      {/* Terceiro pagador */}
      {taxaCalc.total > 0 && (
        <div style={{ marginTop: 14, padding: 14, background: "#f8fafc", borderRadius: 8, border: `1px solid ${COLORS.grayLight}` }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: FONTS.body, fontSize: 13, marginBottom: pagadorTerceiro ? 12 : 0 }}>
            <input type="checkbox" checked={pagadorTerceiro} onChange={e => onPagadorTerceiroChange(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: COLORS.primary }} />
            <span>O pagamento sera realizado por terceiro (pessoa fisica ou juridica diferente do organizador)</span>
          </label>

          {pagadorTerceiro && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, marginBottom: 4 }}>
                    Nome / Razao social do pagador <span style={{ color: COLORS.primary }}>*</span>
                  </div>
                  <input value={pagadorNome} onChange={e => onPagadorNomeChange(e.target.value)}
                    placeholder="Nome completo ou razao social"
                    style={{ width: "100%", padding: "8px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 13, fontFamily: FONTS.body, boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, marginBottom: 4 }}>
                    CPF / CNPJ do pagador <span style={{ color: COLORS.primary }}>*</span>
                  </div>
                  <input value={pagadorCpfCnpj} onChange={e => onPagadorCpfCnpjChange(e.target.value)}
                    placeholder="Somente numeros"
                    style={{ width: "100%", padding: "8px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 13, fontFamily: FONTS.body, boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, marginBottom: 4 }}>
                  E-mail ou telefone do pagador
                </div>
                <input value={pagadorContato} onChange={e => onPagadorContatoChange(e.target.value)}
                  placeholder="Para contato em caso de necessidade"
                  style={{ width: "100%", padding: "8px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 13, fontFamily: FONTS.body, boxSizing: "border-box" }} />
              </div>
              <div>
                <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, marginBottom: 4 }}>
                  Endereco do pagador <span style={{ color: COLORS.primary }}>*</span>
                </div>
                <CepField
                  cep={pagadorCep} onChange={onPagadorCepChange}
                  numero={pagadorNumero} onNumero={onPagadorNumeroChange}
                  complemento={pagadorComplemento} onComplemento={onPagadorComplementoChange}
                  setNumero={pagadorCepSetNumero}
                  loading={pagadorCepLoading} error={pagadorCepError} endereco={pagadorCepEndereco}
                  required
                />
              </div>

              {/* Declaracao de anuencia */}
              <div style={{ padding: "12px 14px", borderRadius: 8, background: anuenciaAceita ? "#f0fdf4" : "#fffbeb", border: `1.5px solid ${anuenciaAceita ? "#86efac" : "#fcd34d"}` }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={anuenciaAceita} onChange={e => onAnuenciaChange(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: COLORS.primary, marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontFamily: FONTS.body, color: COLORS.dark, lineHeight: 1.6 }}>
                    <strong>Declaro</strong>, na qualidade de organizador do evento, que possuo anuencia expressa do terceiro pagador acima identificado para a realizacao do pagamento das taxas federativas em seu nome, autorizando a emissao do respectivo recibo em favor deste. Assumo total responsabilidade penal e administrativa pela veracidade desta declaracao.
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dados bancários + upload comprovante */}
      {taxaCalc.total > 0 && !isParceiro && (
        <div style={{ marginTop: 14, padding: 14, background: "#f8fafc", borderRadius: 8, border: `1px solid ${COLORS.grayLight}` }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, marginBottom: 8 }}>
            Dados para pagamento
          </div>
          <div style={{ fontSize: 12, fontFamily: FONTS.body, color: COLORS.grayDark, lineHeight: 1.8 }}>
            {db.favorecido && <div><strong>Favorecido:</strong> {db.favorecido}</div>}
            {db.cnpj && <div><strong>CNPJ:</strong> {db.cnpj}</div>}
            {db.banco && <div><strong>Banco:</strong> {db.banco}</div>}
            {db.agencia && <div><strong>Agencia:</strong> {db.agencia}</div>}
            {db.conta && <div><strong>Conta:</strong> {db.conta}</div>}
            {db.pix && <div><strong>Chave PIX:</strong> {db.pix}</div>}
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, marginBottom: 6 }}>
              Comprovante de pagamento {bloqueio && <span style={{ color: COLORS.primary }}>*</span>}
            </div>
            {comprovantePagamento ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                <span style={{ fontSize: 16 }}></span>
                <span style={{ flex: 1, fontSize: 13, fontFamily: FONTS.body, color: "#15803d" }}>{comprovantePagamento.name}</span>
                <button type="button" onClick={() => onComprovanteChange(null)}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fff5f5", color: "#dc2626", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                  Remover
                </button>
              </div>
            ) : (
              <div>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
                  onChange={e => { if (e.target.files[0]) onComprovanteChange(e.target.files[0]); }} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  style={{ padding: "8px 16px", borderRadius: 8, border: `1.5px dashed ${COLORS.grayLight}`, background: "#fff", color: "#0066cc", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
                  Anexar comprovante
                </button>
                {bloqueio && (
                  <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4, fontFamily: FONTS.body }}>
                    O envio da solicitacao requer comprovante de pagamento anexado.
                  </div>
                )}
                {!bloqueio && (
                  <div style={{ fontSize: 11, color: "#92400e", marginTop: 4, fontFamily: FONTS.body }}>
                    Pagamento pendente. Voce pode enviar sem comprovante, mas sera cobrado durante a analise.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SecTitle({ children }) {
  return (
    <h3 style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.dark, margin: "0 0 16px", paddingBottom: 10, borderBottom: `2px solid ${COLORS.grayLight}` }}>
      {children}
    </h3>
  );
}

// ─── Modalidades ──────────────────────────────────────────────────────────────

const SUGESTOES_PERMIT = [
  "1 Milha", "5km", "10km", "15km", "20km", "25km", "30km",
  "Meia-Maratona (21,097km)", "Maratona (42,195km)",
  "Ultra 50km", "Ultra 100km", "Ultra 6h", "Ultra 12h", "Ultra 24h",
  "Revezamento", "Caminhada",
];

const SUGESTOES_CHANCELA = [
  "Trail XXS (0-24 EKm)", "Trail XS (25-44 EKm)", "Trail S (45-74 EKm)",
  "Trail M (75-144 EKm)", "Trail L (115-154 EKm)", "Trail XL (155-209 EKm)", "Trail XXL (210+ EKm)",
  "Subida Clássica", "Subida e Descida Clássica", "Vertical",
  "Longa Distância", "Revezamento", "Corrida de Montanha",
];

function ModalidadesSection({ modalidades, ctErrors, setModalidade, addModalidade, addModalidadeComNome, removeModalidade, inp, tipo }) {
  const [outraAberta, setOutraAberta] = useState(false);
  const [outraTexto, setOutraTexto] = useState("");

  const total = modalidades.reduce((acc, m) => acc + (Number(m.estimativaInscritos) || 0), 0);
  const sugestoes = tipo === "chancela" ? SUGESTOES_CHANCELA : SUGESTOES_PERMIT;
  const usadas = new Set(modalidades.map(m => m.distancia));

  const adicionarDistancia = (nome) => {
    const vazia = modalidades.find(m => !m.distancia.trim());
    if (vazia) setModalidade(vazia.id, "distancia", nome);
    else addModalidadeComNome(nome);
  };

  const adicionarOutra = () => {
    if (!outraTexto.trim()) return;
    adicionarDistancia(outraTexto.trim());
    setOutraTexto("");
    setOutraAberta(false);
  };

  const chipBase = {
    padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
    fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700,
    whiteSpace: "nowrap", transition: "all 0.15s",
  };
  const chipDisponivel = { ...chipBase, background: "#f0f9ff", color: "#0066cc", border: "1.5px solid #bae6fd" };
  const chipSelecionado = { ...chipBase, background: "#0066cc", color: "#fff" };

  return (
    <>
      {ctErrors.modalidades && <ErrMsg msg={ctErrors.modalidades} />}
      {ctErrors.modalidadesEstimativa && <ErrMsg msg={ctErrors.modalidadesEstimativa} />}

      {/* Chips de seleção */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 8 }}>
          Selecione as distâncias do evento:
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {sugestoes.map(s => {
            const selecionada = usadas.has(s);
            return (
              <button key={s} type="button"
                onClick={() => {
                  if (selecionada) {
                    const mod = modalidades.find(m => m.distancia === s);
                    if (mod) removeModalidade(mod.id);
                  } else {
                    adicionarDistancia(s);
                  }
                }}
                style={selecionada ? chipSelecionado : chipDisponivel}
                onMouseEnter={e => { if (!selecionada) { e.currentTarget.style.background = "#0066cc"; e.currentTarget.style.color = "#fff"; } }}
                onMouseLeave={e => { if (!selecionada) { e.currentTarget.style.background = "#f0f9ff"; e.currentTarget.style.color = "#0066cc"; } }}
              >{selecionada ? s : s}</button>
            );
          })}
          {/* Chip "Outra distância" */}
          <button type="button" onClick={() => setOutraAberta(!outraAberta)}
            style={{ ...chipBase, background: "#f8fafc", color: "#475569", border: `1.5px dashed ${COLORS.grayLight}` }}>
            Outra distância
          </button>
        </div>
      </div>

      {/* Campo para distância personalizada */}
      {outraAberta && (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 5 }}>Distância personalizada</label>
            <input value={outraTexto} onChange={e => setOutraTexto(e.target.value)}
              placeholder="Ex: 8km, 12km, 3km"
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), adicionarOutra())}
              style={inp(false)} autoFocus />
          </div>
          <button type="button" onClick={adicionarOutra}
            style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#0066cc", color: "#fff",
              fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            Adicionar
          </button>
          <button type="button" onClick={() => { setOutraAberta(false); setOutraTexto(""); }}
            style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray,
              fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      )}

      {/* Lista de modalidades selecionadas com estimativa */}
      {modalidades.filter(m => m.distancia.trim()).length > 0 && (
        <div>
          <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 8 }}>
            Estimativa de inscritos por modalidade <span style={{ color: COLORS.primary }}>*</span>
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {modalidades.filter(m => m.distancia.trim()).map(m => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "#f8fafc", border: `1px solid ${COLORS.grayLight}` }}>
                <span style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.dark, flex: 1 }}>
                  {m.distancia}
                </span>
                <input type="number" min="1" value={m.estimativaInscritos}
                  onChange={e => setModalidade(m.id, "estimativaInscritos", e.target.value)}
                  placeholder="Qtd. atletas"
                  style={{ width: 140, padding: "7px 10px", borderRadius: 6, border: `1.5px solid ${ctErrors.modalidadesEstimativa && !m.estimativaInscritos ? "#dc2626" : COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", textAlign: "center" }} />
                <button type="button" onClick={() => removeModalidade(m.id)}
                  style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #fca5a5", background: "#fff5f5", color: "#dc2626", cursor: "pointer", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {total > 0 && (
        <div style={{ marginTop: 10, fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
          Total estimado: <strong>{total.toLocaleString("pt-BR")} inscritos</strong>
        </div>
      )}
    </>
  );
}

// ─── Seções dinâmicas (config-driven) ────────────────────────────────────────
function ConfigSections({ tipo, ct, ctErrors, setC, uploadRefs, onFileChange, getOrCreateRef, inp, card }) {
  const sections = getFieldsBySection(tipo);

  return (
    <>
      {sections.map(({ sectionId, sectionTitle, fields }) => {
        // Ignorar seção de modalidades (já renderizada acima)
        if (sectionId === "modalidades") return null;
        const uploadFields = fields.filter(f => f.type === "upload");
        const otherFields  = fields.filter(f => f.type !== "upload");

        return (
          <div key={sectionId} style={card}>
            <SecTitle>{sectionTitle}</SecTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {otherFields.map(f => (
                <DynamicField
                  key={f.id} field={f}
                  value={ct[f.id]}
                  ctValue={ct}
                  error={ctErrors[f.id]}
                  onChange={v => setC(f.id, v)}
                  inp={inp}
                />
              ))}
              {uploadFields.map(f => {
                // Condicional: esconder upload se condição não atendida
                if (f.conditional && !ct[f.conditional]) return null;
                if (f.conditionalValue && ct[f.conditionalValue.field] !== f.conditionalValue.value) return null;
                const ref = getOrCreateRef(f.id);
                return (
                  <UploadField
                    key={f.id}
                    label={f.label}
                    required={f.required}
                    hint={f.hint}
                    accept={f.accept || ".pdf,.doc,.docx,.jpg,.png"}
                    arquivo={ct[f.id]}
                    fileRef={ref}
                    onFileChange={file => onFileChange(f.id, file)}
                    error={ctErrors[f.id]}
                    showMergePdf={!!f.hintLink}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ─── Campo dinâmico ───────────────────────────────────────────────────────────
function DynamicField({ field: f, value, ctValue, error, onChange, inp }) {
  const LBL = () => (
    <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 5 }}>
      {f.label}{f.required && <span style={{ color: COLORS.primary }}> *</span>}
    </label>
  );

  // Condicional: só exibir se condição for verdadeira
  if (f.conditional && !ctValue[f.conditional]) return null;
  if (f.conditionalValue && ctValue[f.conditionalValue.field] !== f.conditionalValue.value) return null;

  if (f.type === "checkbox") {
    return (
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: FONTS.body, fontSize: 14, color: COLORS.dark }}>
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} style={{ width: 16, height: 16 }} />
        {f.label}
      </label>
    );
  }

  if (f.type === "select") {
    return (
      <div>
        <LBL />
        <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ ...inp(!!error), cursor: "pointer" }}>
          <option value="">Selecione...</option>
          {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {f.hint && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 3 }}>{f.hint}</div>}
        {error && <ErrMsg msg={error} />}
      </div>
    );
  }

  if (f.type === "textarea") {
    return (
      <div>
        <LBL />
        <textarea value={value || ""} onChange={e => onChange(e.target.value)}
          placeholder={f.hint || ""} rows={3}
          style={{ ...inp(!!error), resize: "vertical" }} />
        {f.hint && !error && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 3 }}>{f.hint}</div>}
        {error && <ErrMsg msg={error} />}
      </div>
    );
  }

  if (f.type === "number") {
    return (
      <div>
        <LBL />
        <input type="number" min="0" value={value || ""} onChange={e => onChange(e.target.value)}
          placeholder={f.hint || ""} style={inp(!!error)} />
        {error && <ErrMsg msg={error} />}
      </div>
    );
  }

  // currency — toggle Gratuito/Pago com campo de valor
  if (f.type === "currency") {
    const isGratuito = value === "Gratuito" || value === "gratuito";
    return (
      <div>
        <LBL />
        <div style={{ display: "flex", gap: 0, border: `1.5px solid ${COLORS.grayLight}`, borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
          <button type="button" onClick={() => onChange("Gratuito")}
            style={{ flex: 1, padding: "10px", border: "none", cursor: "pointer",
              background: isGratuito ? "#15803d" : "#fff",
              color: isGratuito ? "#fff" : COLORS.gray,
              fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
            Gratuito
          </button>
          <button type="button" onClick={() => { if (isGratuito) onChange(""); }}
            style={{ flex: 1, padding: "10px", border: "none", cursor: "pointer",
              background: !isGratuito ? "#0066cc" : "#fff",
              color: !isGratuito ? "#fff" : COLORS.gray,
              fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
            Pago
          </button>
        </div>
        {!isGratuito && (
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, pointerEvents: "none" }}>R$</span>
            <input type="text" value={value === "Gratuito" ? "" : (value || "")}
              onChange={e => {
                const v = e.target.value.replace(/[^\d,.]/g, "");
                onChange(v);
              }}
              placeholder="80,00"
              style={{ ...inp(!!error), paddingLeft: 36 }} />
          </div>
        )}
        {error && <ErrMsg msg={error} />}
      </div>
    );
  }

  // text, date, time
  return (
    <div>
      <LBL />
      <input type={f.type === "date" ? "date" : f.type === "time" ? "time" : "text"}
        value={value || ""} onChange={e => onChange(e.target.value)}
        placeholder={f.hint || ""}
        style={inp(!!error)} />
      {f.hint && f.type === "text" && !error && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 3 }}>{f.hint}</div>}
      {error && <ErrMsg msg={error} />}
    </div>
  );
}

// ─── Upload de arquivo ────────────────────────────────────────────────────────
function UploadField({ label, required, hint, accept, arquivo, fileRef, onFileChange, error, showMergePdf }) {
  const localRef = useRef(null);
  const ref = fileRef || localRef;
  const mergeInputRef = useRef(null);
  const [merging, setMerging] = useState(false);
  const [mergeFiles, setMergeFiles] = useState([]);
  const [showMerge, setShowMerge] = useState(false);
  const [mergePreview, setMergePreview] = useState(null); // { url, file, pages }

  const handleMerge = async () => {
    if (mergeFiles.length < 2) return;
    setMerging(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const merged = await PDFDocument.create();
      for (const file of mergeFiles) {
        const bytes = await file.arrayBuffer();
        const tipo = file.type || file.name.split(".").pop().toLowerCase();
        if (tipo === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          try {
            const pdf = await PDFDocument.load(bytes);
            const pages = await merged.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(p => merged.addPage(p));
          } catch { /* PDF inválido */ }
        } else {
          // Imagem (JPG/PNG) → converter em página PDF
          try {
            const isJpg = tipo.includes("jpeg") || tipo.includes("jpg") || file.name.toLowerCase().match(/\.jpe?g$/);
            const img = isJpg ? await merged.embedJpg(bytes) : await merged.embedPng(bytes);
            const { width, height } = img.scale(1);
            const page = merged.addPage([width, height]);
            page.drawImage(img, { x: 0, y: 0, width, height });
          } catch { /* Imagem inválida */ }
        }
      }
      const mergedBytes = await merged.save();
      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      const mergedFile = new File([blob], "mapa_percurso_unificado.pdf", { type: "application/pdf" });
      // Preview antes de confirmar
      const previewUrl = URL.createObjectURL(blob);
      setMergePreview({ url: previewUrl, file: mergedFile, pages: merged.getPageCount() });
    } catch (e) {
      alert("Erro ao unir os PDFs. Verifique se todos os arquivos são PDFs válidos.");
    }
    setMerging(false);
  };

  return (
    <div>
      <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 5 }}>
        {label}{required && <span style={{ color: COLORS.primary }}> *</span>}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 14px", borderRadius: 8,
        border: `1.5px ${error ? "solid #fca5a5" : arquivo?.temArquivo ? "solid #86efac" : "dashed #94a3b8"}`,
        background: arquivo?.temArquivo ? "#f0fdf4" : "#f8fafc" }}>
        <input ref={ref} type="file" accept={accept || ".pdf,.doc,.docx,.jpg,.png"}
          style={{ display: "none" }} onChange={e => onFileChange(e.target.files?.[0])} />
        {arquivo?.temArquivo ? (
          <>
            <span style={{ fontFamily: FONTS.body, fontSize: 13, color: "#15803d", flex: 1 }}>{arquivo.nomeArquivo}</span>
            <button type="button" onClick={() => ref.current?.click()}
              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #86efac", background: "#fff", color: "#15803d", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>
              Trocar
            </button>
          </>
        ) : (
          <>
            <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, flex: 1 }}>Nenhum arquivo selecionado</span>
            <button type="button" onClick={() => ref.current?.click()}
              style={{ padding: "7px 14px", borderRadius: 6, border: "none", background: "#0066cc", color: "#fff", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
              Selecionar
            </button>
          </>
        )}
      </div>
      {hint && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 3, lineHeight: 1.5 }}>{hint}</div>}

      {/* Preview do PDF unificado */}
      {mergePreview && (
        <div style={{ marginTop: 10, borderRadius: 8, border: "1.5px solid #86efac", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f0fdf4" }}>
            <span style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: "#15803d" }}>
              PDF unificado — {mergePreview.pages} página(s)
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => { onFileChange(mergePreview.file); setMergePreview(null); setShowMerge(false); setMergeFiles([]); }}
                style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#15803d", color: "#fff", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>
                Confirmar e usar
              </button>
              <button type="button" onClick={() => { URL.revokeObjectURL(mergePreview.url); setMergePreview(null); }}
                style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>
                Voltar
              </button>
            </div>
          </div>
          <iframe src={mergePreview.url + "#toolbar=0&navpanes=0"} title="Preview PDF unificado"
            style={{ width: "100%", height: 400, border: "none" }} />
        </div>
      )}

      {/* Botão para unir PDFs */}
      {showMergePdf && !arquivo?.temArquivo && (
        <div style={{ marginTop: 8 }}>
          {!showMerge ? (
            <button type="button" onClick={() => setShowMerge(true)}
              style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: "#0066cc",
                cursor: "pointer", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>
              Unir múltiplos arquivos (PDFs e imagens) em um documento
            </button>
          ) : (
            <div style={{ padding: "14px 16px", borderRadius: 8, background: "#f0f9ff", border: "1px solid #bae6fd" }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, color: "#1e40af", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Unir PDFs
              </div>
              <input ref={mergeInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple style={{ display: "none" }}
                onChange={e => setMergeFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button type="button" onClick={() => mergeInputRef.current?.click()}
                  style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.dark,
                    cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
                  Adicionar arquivos
                </button>
                <button type="button" onClick={() => { setShowMerge(false); setMergeFiles([]); }}
                  style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray,
                    cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
                  Cancelar
                </button>
              </div>
              {mergeFiles.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  {mergeFiles.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: "#fff", border: `1px solid ${COLORS.grayLight}`, marginBottom: 4 }}>
                      <span style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.dark, flex: 1 }}>{i + 1}. {f.name}</span>
                      <button type="button" onClick={() => setMergeFiles(prev => prev.filter((_, j) => j !== i))}
                        style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #fca5a5", background: "#fff5f5", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                        x
                      </button>
                    </div>
                  ))}
                  <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 4 }}>
                    {mergeFiles.length} arquivo(s) — serão unidos na ordem listada em um único PDF
                  </div>
                </div>
              )}
              {mergeFiles.length >= 2 && (
                <button type="button" onClick={handleMerge} disabled={merging}
                  style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: merging ? COLORS.gray : "#0066cc", color: "#fff",
                    cursor: merging ? "not-allowed" : "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
                  {merging ? "Unindo..." : `Unir ${mergeFiles.length} arquivos`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {error && <ErrMsg msg={error} />}
    </div>
  );
}
