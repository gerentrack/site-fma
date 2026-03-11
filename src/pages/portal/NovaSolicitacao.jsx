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
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOrganizer } from "../../context/OrganizerContext";
import { SolicitacoesService, MovimentacoesService, ArquivosService } from "../../services/index";
import { COLORS, FONTS } from "../../styles/colors";
import { SOLICITACAO_TIPOS } from "../../config/navigation";
import {
  defaultCamposTecnicosPermit, defaultCamposTecnicosChancela,
  novaModalidadeId, totalEstimativaInscritos,
} from "../../utils/permitDefaults";
import {
  getFieldsBySection, validarCamposConfig, initFormConfig,
} from "../../utils/formSchema";

// ─── Helpers de arquivo ───────────────────────────────────────────────────────
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
  const { organizerId, organizerName } = useOrganizer();
  const navigate = useNavigate();

  useEffect(() => { initFormConfig(); }, []);

  const [step, setStep]   = useState(1);
  const [tipo, setTipo]   = useState("");
  const [form, setForm]   = useState({
    nomeEvento: "", dataEvento: "", cidadeEvento: "",
    localEvento: "", descricaoEvento: "",
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

  const uploadArquivosPendentes = async (solicitacaoId, ctAtual) => {
    const ctAtualizado = { ...ctAtual };
    for (const [fieldId, file] of Object.entries(pendingFiles)) {
      try {
        const dataUrl = await fileToBase64(file);
        const r = await ArquivosService.upload({
          solicitacaoId, nome: file.name, tamanho: file.size,
          tipo: file.type || "application/octet-stream",
          descricao: `Documento: ${fieldId}`, categoria: "obrigatorio", dataUrl,
          enviadoPor: "organizador", enviadoPorId: organizerId,
        });
        if (r.data) {
          ctAtualizado[fieldId] = { temArquivo: true, nomeArquivo: file.name, arquivoId: r.data.id };
        }
      } catch { /* falha silenciosa — pode reenviar na tela de detalhe */ }
    }
    return ctAtualizado;
  };

  const handleSave = async (enviar = false) => {
    const eBase = validateBase();
    const eTec  = enviar ? validarCamposConfig(ct, tipo) : {};
    if (Object.keys(eBase).length > 0) { setErrors(eBase); if (step === 3) setStep(2); return; }
    if (Object.keys(eTec).length > 0)  { setCtErrors(eTec); return; }

    setSaving(true); setGlobalError("");
    const r = await SolicitacoesService.create({ ...form, tipo, organizerId, campos: {}, camposTecnicos: ct });
    if (r.error) { setGlobalError(r.error); setSaving(false); return; }
    const sol = r.data;

    const ctComArquivos = await uploadArquivosPendentes(sol.id, ct);
    await SolicitacoesService.update(sol.id, { camposTecnicos: ctComArquivos });

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
                {step > s.n ? "✓ " : `${s.n}. `}{s.l}
              </div>
            </div>
          ))}
        </div>

        {globalError && (
          <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontFamily: FONTS.body, fontSize: 13, color: "#dc2626" }}>⚠️ {globalError}</div>
        )}

        {/* ── Step 1: Tipo ── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, margin: "0 0 18px" }}>Selecione o tipo de solicitação</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              {SOLICITACAO_TIPOS.map(t => (
                <button key={t.value} onClick={() => handleSelectTipo(t.value)}
                  style={{ padding: "28px 24px", borderRadius: 14, textAlign: "left", cursor: "pointer",
                    border: `2.5px solid ${tipo === t.value ? "#0066cc" : COLORS.grayLight}`,
                    background: tipo === t.value ? "#eff6ff" : "#fff", transition: "all 0.15s" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>{t.icon}</div>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 900, color: tipo === t.value ? "#0066cc" : COLORS.dark, textTransform: "uppercase", marginBottom: 8 }}>{t.label}</div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, lineHeight: 1.5 }}>{t.desc}</div>
                  {tipo === t.value && (
                    <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "#0066cc", color: "#fff", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>✓ Selecionado</div>
                  )}
                </button>
              ))}
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
              <SecTitle>📋 Dados do Evento</SecTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <LBL req>Nome do Evento</LBL>
                  <input value={form.nomeEvento} onChange={e => setF("nomeEvento", e.target.value)} placeholder="Ex: Corrida de Rua BH 2026 – 1ª Etapa" style={inp(!!errors.nomeEvento)} />
                  {errors.nomeEvento && <ErrMsg msg={errors.nomeEvento} />}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <LBL req>Data de Realização</LBL>
                    <input type="date" value={form.dataEvento} onChange={e => setF("dataEvento", e.target.value)} style={inp(!!errors.dataEvento)} />
                    {errors.dataEvento && <ErrMsg msg={errors.dataEvento} />}
                  </div>
                  <div>
                    <LBL req>Município</LBL>
                    <input value={form.cidadeEvento} onChange={e => setF("cidadeEvento", e.target.value)} placeholder="Ex: Belo Horizonte" style={inp(!!errors.cidadeEvento)} />
                    {errors.cidadeEvento && <ErrMsg msg={errors.cidadeEvento} />}
                  </div>
                </div>
                <div>
                  <LBL req>Local de Realização</LBL>
                  <input value={form.localEvento} onChange={e => setF("localEvento", e.target.value)} placeholder="Ex: Parque Municipal – Av. Afonso Pena, BH/MG" style={inp(!!errors.localEvento)} />
                  {errors.localEvento && <ErrMsg msg={errors.localEvento} />}
                </div>
                <div>
                  <LBL>Descrição do Evento</LBL>
                  <textarea value={form.descricaoEvento} onChange={e => setF("descricaoEvento", e.target.value)}
                    placeholder="Descreva brevemente o evento." rows={3} style={{ ...inp(), resize: "vertical" }} />
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
              <SecTitle>🏃 Modalidades / Distâncias</SecTitle>
              <ModalidadesSection
                modalidades={ct.modalidades || []}
                ctErrors={ctErrors}
                setModalidade={setModalidade}
                addModalidade={addModalidade}
                removeModalidade={removeModalidade}
                inp={inp}
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

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
              <button onClick={() => setStep(2)} style={secBtn}>← Voltar</button>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => handleSave(false)} disabled={saving} style={{ ...secBtn, opacity: saving ? 0.6 : 1 }}>
                  📝 Salvar rascunho
                </button>
                <button onClick={() => handleSave(true)} disabled={saving} style={{ ...priBtn, opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Enviando..." : "📤 Enviar para análise"}
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

function SecTitle({ children }) {
  return (
    <h3 style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.dark, margin: "0 0 16px", paddingBottom: 10, borderBottom: `2px solid ${COLORS.grayLight}` }}>
      {children}
    </h3>
  );
}

// ─── Modalidades ──────────────────────────────────────────────────────────────
function ModalidadesSection({ modalidades, ctErrors, setModalidade, addModalidade, removeModalidade, inp }) {
  const total = modalidades.reduce((acc, m) => acc + (Number(m.estimativaInscritos) || 0), 0);
  return (
    <>
      {ctErrors.modalidades && <ErrMsg msg={ctErrors.modalidades} />}
      {ctErrors.modalidadesEstimativa && <ErrMsg msg={ctErrors.modalidadesEstimativa} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {modalidades.map((m, i) => (
          <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 180px 36px", gap: 10, alignItems: "flex-end" }}>
            <div>
              {i === 0 && <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 5 }}>Distância / Categoria <span style={{ color: COLORS.primary }}>*</span></label>}
              <input value={m.distancia} onChange={e => setModalidade(m.id, "distancia", e.target.value)}
                placeholder="Ex: 10km, 5km, Sub-18, Cadeirante"
                style={inp(!!(ctErrors.modalidades && !m.distancia.trim()))} />
            </div>
            <div>
              {i === 0 && <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 5 }}>Estimativa <span style={{ color: COLORS.primary }}>*</span></label>}
              <input type="number" min="1" value={m.estimativaInscritos}
                onChange={e => setModalidade(m.id, "estimativaInscritos", e.target.value)}
                placeholder="Qtd. atletas"
                style={inp(!!(ctErrors.modalidadesEstimativa && !m.estimativaInscritos))} />
            </div>
            <div style={{ paddingTop: i === 0 ? 22 : 0 }}>
              {modalidades.length > 1 && (
                <button type="button" onClick={() => removeModalidade(m.id)}
                  style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #fca5a5", background: "#fff5f5", color: "#dc2626", cursor: "pointer", fontSize: 16, fontWeight: 700 }}>×</button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addModalidade}
        style={{ marginTop: 12, padding: "7px 16px", borderRadius: 8, border: "1.5px dashed #94a3b8", background: "#f8fafc", color: "#475569", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
        + Adicionar modalidade
      </button>
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
function UploadField({ label, required, hint, accept, arquivo, fileRef, onFileChange, error }) {
  const localRef = useRef(null);
  const ref = fileRef || localRef;

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
            <span style={{ fontFamily: FONTS.body, fontSize: 13, color: "#15803d", flex: 1 }}>✅ {arquivo.nomeArquivo}</span>
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
              📎 Selecionar
            </button>
          </>
        )}
      </div>
      {hint && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 3 }}>{hint}</div>}
      {error && <ErrMsg msg={error} />}
    </div>
  );
}
