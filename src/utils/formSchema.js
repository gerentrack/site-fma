/**
 * formSchema.js — Schema canônico e gerenciamento de configuração de formulários.
 *
 * Responsabilidades:
 *   1. Definir os campos built-in de Permit e Chancela (labels, tipos, seções, obrigatoriedade)
 *   2. Ler/salvar config customizada no localStorage (admin pode alterar labels, required, active, adicionar campos)
 *   3. Retornar o schema "efetivo" mesclando defaults + customizações do admin
 *
 * Tipos de campo suportados:
 *   text, textarea, number, date, time, select, checkbox, upload
 *
 * Campos built-in: builtin: true → admin pode desativar/tornar não-obrigatório/renomear, mas NÃO excluir
 * Campos custom:   builtin: false → admin criou; pode excluir; armazenados junto com built-in no config
 *
 * Seções especiais (não configuráveis individualmente):
 *   "modalidades" → sempre presente; gerenciado por componente específico
 *
 * localStorage key: "fma_form_config" → { permit: [...], chancela: [...] }
 */

// ─── Seções canônicas ────────────────────────────────────────────────────────

export const FORM_SECTIONS = {
  // Permit
  datas:         { id: "datas",         title: "⏰ Datas e Horários",               tipo: "permit" },
  modalidades:   { id: "modalidades",   title: "🏃 Modalidades / Distâncias",       tipo: "both" },
  financeiro:    { id: "financeiro",    title: "💰 Financeiro",                     tipo: "both" },
  tecnico:       { id: "tecnico",       title: "⚙️ Aspectos Técnicos",              tipo: "both" },
  infraestrutura:{ id: "infraestrutura",title: "🏥 Infraestrutura e Seguro",        tipo: "permit" },
  composicao:    { id: "composicao",    title: "📋 Objetivo, Patrocinadores e Serviços", tipo: "permit" },
  documentos:    { id: "documentos",    title: "📁 Documentos Obrigatórios",        tipo: "both" },
  // Chancela específicas
  identificacao: { id: "identificacao", title: "🔗 Identificação do Evento",        tipo: "chancela" },
  equipemedica:  { id: "equipemedica",  title: "🏥 Equipe Médica",                  tipo: "chancela" },
  dadosfiscais:  { id: "dadosfiscais",  title: "🧾 Dados Fiscais",                  tipo: "chancela" },
  seguros:       { id: "seguros",       title: "🛡️ Seguro e Regulamentação",        tipo: "chancela" },
};

// ─── Opções de selects ───────────────────────────────────────────────────────

export const OPCOES_APURACAO = [
  "Chip/Transponder eletrônico",
  "Cronômetro manual",
  "Sistema de gun time",
  "Outro",
];
export const OPCOES_MEDICAO = [
  "Roda Medidora (Jones Counter)",
  "GPS",
  "Mapa Oficial Homologado",
  "Outro",
];

// ─── Schema built-in: PERMIT ─────────────────────────────────────────────────

export const PERMIT_FIELDS_DEFAULT = [
  // ── Datas e horários ──────────────────────────────────────────────────
  { id: "dataEncerramentoInscricoes", label: "Data de Encerramento das Inscrições", type: "date",     section: "datas",          required: true,  active: true, builtin: true, order: 10 },
  { id: "horarioLargada",             label: "Horário da Largada",                  type: "time",     section: "datas",          required: true,  active: true, builtin: true, order: 20 },

  // ── Financeiro ────────────────────────────────────────────────────────
  { id: "valorInscricao",             label: "Valor da Inscrição",                  type: "text",     section: "financeiro",     required: true,  active: true, builtin: true, order: 10, hint: "Ex: R$ 80,00 / Gratuito" },
  { id: "premiacaoDinheiro",          label: "Haverá premiação em dinheiro?",       type: "checkbox", section: "financeiro",     required: false, active: true, builtin: true, order: 20 },
  { id: "valorPremiacaoTotal",        label: "Valor Total da Premiação",            type: "text",     section: "financeiro",     required: false, active: true, builtin: true, order: 30, hint: "Preencher se premiação em dinheiro", conditional: "premiacaoDinheiro" },

  // ── Técnico ───────────────────────────────────────────────────────────
  { id: "sistemaApuracao",            label: "Sistema de Apuração",                 type: "select",   section: "tecnico",        required: true,  active: true, builtin: true, order: 10, options: OPCOES_APURACAO },
  { id: "empresaCronometragem",       label: "Empresa Responsável pela Cronometragem", type: "text",  section: "tecnico",        required: true,  active: true, builtin: true, order: 20 },
  { id: "formaMedicaoPercurso",       label: "Forma de Aferição do Percurso",       type: "select",   section: "tecnico",        required: true,  active: true, builtin: true, order: 30, options: OPCOES_MEDICAO },

  // ── Infraestrutura ────────────────────────────────────────────────────
  { id: "postoMedico",                label: "Haverá posto médico no evento?",      type: "checkbox", section: "infraestrutura", required: false, active: true, builtin: true, order: 10 },
  { id: "quantidadeAmbulancias",      label: "Quantidade de Ambulâncias",           type: "number",   section: "infraestrutura", required: false, active: true, builtin: true, order: 20, hint: "Preencher se houver posto médico", conditional: "postoMedico" },
  { id: "apoliceSeguros",             label: "Número da Apólice de Seguro",         type: "text",     section: "infraestrutura", required: true,  active: true, builtin: true, order: 30 },
  { id: "leiIncentivo",               label: "Financiado por Lei de Incentivo?",    type: "checkbox", section: "infraestrutura", required: false, active: true, builtin: true, order: 40 },

  // ── Composição ────────────────────────────────────────────────────────
  { id: "objetivoEvento",             label: "Objetivo do Evento",                  type: "textarea", section: "composicao",     required: true,  active: true, builtin: true, order: 10 },
  { id: "patrocinadores",             label: "Patrocinadores vinculados à prova",   type: "textarea", section: "composicao",     required: false, active: true, builtin: true, order: 20 },
  { id: "kitAtleta",                  label: "Composição do Kit do Atleta",         type: "textarea", section: "composicao",     required: false, active: true, builtin: true, order: 30 },
  { id: "empresasServicos",           label: "Empresas prestadoras e suas funções", type: "textarea", section: "composicao",     required: false, active: true, builtin: true, order: 40 },

  // ── Documentos ────────────────────────────────────────────────────────
  { id: "regulamento",                label: "Regulamento do Evento",               type: "upload",   section: "documentos",     required: true,  active: true, builtin: true, order: 10, accept: ".pdf,.doc,.docx" },
  { id: "mapaPercurso",               label: "Mapa do Percurso",                    type: "upload",   section: "documentos",     required: true,  active: true, builtin: true, order: 20, accept: ".pdf,.jpg,.png" },
];

// ─── Schema built-in: CHANCELA ───────────────────────────────────────────────

export const CHANCELA_FIELDS_DEFAULT = [
  // ── Identificação ─────────────────────────────────────────────────────
  { id: "linkDivulgacao",             label: "Link de Divulgação do Evento",        type: "text",     section: "identificacao",  required: true,  active: true, builtin: true, order: 10, hint: "URL do site ou rede social" },
  { id: "objetivoEvento",             label: "Objetivo do Evento",                  type: "textarea", section: "identificacao",  required: true,  active: true, builtin: true, order: 20 },

  // ── Financeiro ────────────────────────────────────────────────────────
  { id: "valorInscricao",             label: "Valor da Inscrição",                  type: "text",     section: "financeiro",     required: true,  active: true, builtin: true, order: 10, hint: "Ex: R$ 80,00 / Gratuito" },
  { id: "premiacaoDinheiro",          label: "Haverá premiação em dinheiro?",       type: "checkbox", section: "financeiro",     required: false, active: true, builtin: true, order: 20 },
  { id: "valorPremiacaoTotal",        label: "Valor Total da Premiação",            type: "text",     section: "financeiro",     required: false, active: true, builtin: true, order: 30, conditional: "premiacaoDinheiro" },

  // ── Técnico ───────────────────────────────────────────────────────────
  { id: "sistemaApuracao",            label: "Sistema de Apuração",                 type: "select",   section: "tecnico",        required: true,  active: true, builtin: true, order: 10, options: OPCOES_APURACAO },
  { id: "empresaCronometragem",       label: "Empresa Responsável pela Cronometragem", type: "text",  section: "tecnico",        required: true,  active: true, builtin: true, order: 20 },
  { id: "formaMedicaoPercurso",       label: "Forma de Aferição do Percurso",       type: "select",   section: "tecnico",        required: true,  active: true, builtin: true, order: 30, options: OPCOES_MEDICAO },

  // ── Equipe médica ─────────────────────────────────────────────────────
  { id: "medicoResponsavel",          label: "Médico Responsável (Nome e CRM)",     type: "text",     section: "equipemedica",   required: true,  active: true, builtin: true, order: 10, hint: "Ex: Dr. João Silva – CRM/MG 123456" },

  // ── Dados fiscais ─────────────────────────────────────────────────────
  { id: "dadosEmissaoRecibo",         label: "Dados para Emissão do Recibo",        type: "textarea", section: "dadosfiscais",   required: true,  active: true, builtin: true, order: 10, hint: "Nome empresarial, CNPJ e Endereço completo com CEP" },

  // ── Seguros e regulamentação ──────────────────────────────────────────
  { id: "apoliceSeguros",             label: "Número da Apólice de Seguro",         type: "text",     section: "seguros",        required: true,  active: true, builtin: true, order: 10 },

  // ── Documentos ────────────────────────────────────────────────────────
  { id: "regulamento",                label: "Upload do Regulamento",               type: "upload",   section: "documentos",     required: true,  active: true, builtin: true, order: 10, accept: ".pdf,.doc,.docx" },
  { id: "mapaPercurso",               label: "Mapa do Percurso",                    type: "upload",   section: "documentos",     required: true,  active: true, builtin: true, order: 20, accept: ".pdf,.jpg,.png", hint: "Planta baixa ou imagem do percurso" },
  { id: "arquivoGPX",                 label: "Arquivo Digital do Percurso (GPX/KML)", type: "upload", section: "documentos",     required: true,  active: true, builtin: true, order: 30, accept: ".gpx,.kml", hint: "Compatível com o mapa apresentado" },
  { id: "planoSegurancaResgate",      label: "Plano de Segurança e Resgate",        type: "upload",   section: "documentos",     required: true,  active: true, builtin: true, order: 40, accept: ".pdf,.doc,.docx", hint: "Contemplando estrutura mínima de resgate" },
  { id: "planoMedico",                label: "Plano Médico do Evento",              type: "upload",   section: "documentos",     required: true,  active: true, builtin: true, order: 50, accept: ".pdf,.doc,.docx", hint: "Estrutura de atendimento, equipe e logística de remoção" },
  { id: "comprovanteSeguros",         label: "Comprovante de Seguro Obrigatório",   type: "upload",   section: "documentos",     required: true,  active: true, builtin: true, order: 60, accept: ".pdf", hint: "Acidentes pessoais dos atletas + responsabilidade civil" },
  { id: "autorizacaoAmbiental",       label: "Autorização Ambiental / Uso da Área", type: "upload",  section: "documentos",     required: false, active: true, builtin: true, order: 70, accept: ".pdf,.doc,.docx", hint: "Obrigatório em unidades de conservação, áreas públicas ou privadas" },
  { id: "declaracaoCaracterizacaoPercurso", label: "Declaração de Caracterização Técnica do Percurso", type: "upload", section: "documentos", required: true, active: true, builtin: true, order: 80, accept: ".pdf,.doc,.docx" },
  { id: "regulamentoTecnico",         label: "Regulamento Técnico",                 type: "upload",   section: "documentos",     required: true,  active: true, builtin: true, order: 90, accept: ".pdf,.doc,.docx" },
];

// ─── localStorage key ────────────────────────────────────────────────────────

const LS_KEY = "fma_form_config";

// ─── API de config ────────────────────────────────────────────────────────────

/**
 * Retorna o config atual do localStorage, completando com defaults se necessário.
 * Garante que campos built-in nunca desapareçam mesmo que o localStorage seja parcial.
 *
 * @returns {{ permit: FieldDef[], chancela: FieldDef[] }}
 */
export function getFormConfig() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return _buildDefaults();
    const saved = JSON.parse(raw);
    return {
      permit:   _mergeWithDefaults(saved.permit   || [], PERMIT_FIELDS_DEFAULT),
      chancela: _mergeWithDefaults(saved.chancela || [], CHANCELA_FIELDS_DEFAULT),
    };
  } catch {
    return _buildDefaults();
  }
}

/** Salva config de um tipo específico no localStorage. */
export function saveFormConfig(tipo, fields) {
  const current = getFormConfig();
  const updated = { ...current, [tipo]: fields };
  localStorage.setItem(LS_KEY, JSON.stringify(updated));
}

/** Reseta o config de um tipo para os defaults canônicos. */
export function resetFormConfig(tipo) {
  const defaults = tipo === "permit" ? PERMIT_FIELDS_DEFAULT : CHANCELA_FIELDS_DEFAULT;
  saveFormConfig(tipo, defaults.map(f => ({ ...f })));
}

/** Inicializa o config se ainda não existir no localStorage. */
export function initFormConfig() {
  if (!localStorage.getItem(LS_KEY)) {
    localStorage.setItem(LS_KEY, JSON.stringify(_buildDefaults()));
  }
}

// ─── Helpers internos ────────────────────────────────────────────────────────

function _buildDefaults() {
  return {
    permit:   PERMIT_FIELDS_DEFAULT.map(f => ({ ...f })),
    chancela: CHANCELA_FIELDS_DEFAULT.map(f => ({ ...f })),
  };
}

/**
 * Mescla campos salvos (podem ter labels/required/active customizados) com defaults.
 * - Campos built-in que sumiram do localStorage são re-inseridos com defaults
 * - Campos custom que estão no saved são mantidos
 */
function _mergeWithDefaults(saved, defaults) {
  const savedMap = Object.fromEntries(saved.map(f => [f.id, f]));
  const result = defaults.map(def => {
    const customized = savedMap[def.id];
    if (customized) {
      // Preservar label/required/active/order do admin, manter tipo/section/builtin/options dos defaults
      return {
        ...def,
        label:    customized.label    ?? def.label,
        required: customized.required ?? def.required,
        active:   customized.active   ?? def.active,
        order:    customized.order    ?? def.order,
        hint:     customized.hint     ?? def.hint,
      };
    }
    return { ...def };
  });
  // Adicionar campos custom (builtin: false) que não estão nos defaults
  saved.filter(f => !f.builtin).forEach(custom => {
    if (!result.find(r => r.id === custom.id)) {
      result.push({ ...custom });
    }
  });
  return result.sort((a, b) => {
    // Ordenar por seção first, depois order
    if (a.section < b.section) return -1;
    if (a.section > b.section) return 1;
    return (a.order || 0) - (b.order || 0);
  });
}

// ─── Helpers de formulário ───────────────────────────────────────────────────

/**
 * Retorna os campos ativos de um tipo agrupados por seção.
 * Exclui campos especiais (seção "modalidades") que são renderizados à parte.
 *
 * @param {"permit"|"chancela"} tipo
 * @returns {{ sectionId: string, sectionTitle: string, fields: FieldDef[] }[]}
 */
export function getFieldsBySection(tipo) {
  const config = getFormConfig();
  const fields = config[tipo] || [];
  const activeFields = fields.filter(f => f.active && f.section !== "modalidades");

  const sectionsOrder = tipo === "permit"
    ? ["datas", "financeiro", "tecnico", "infraestrutura", "composicao", "documentos"]
    : ["identificacao", "financeiro", "tecnico", "equipemedica", "dadosfiscais", "seguros", "documentos"];

  const grouped = {};
  activeFields.forEach(f => {
    if (!grouped[f.section]) grouped[f.section] = [];
    grouped[f.section].push(f);
  });

  return sectionsOrder
    .filter(sid => grouped[sid] && grouped[sid].length > 0)
    .map(sid => ({
      sectionId: sid,
      sectionTitle: FORM_SECTIONS[sid]?.title || sid,
      fields: grouped[sid].sort((a, b) => (a.order || 0) - (b.order || 0)),
    }));
}

/**
 * Valida os campos técnicos de acordo com a configuração ativa.
 * Campos com required: true e active: true devem ter valor não vazio.
 * Upload: requer temArquivo: true.
 *
 * @param {object} ct — camposTecnicos
 * @param {"permit"|"chancela"} tipo
 * @returns {object} — mapa de erros { fieldId: "mensagem" }
 */
export function validarCamposConfig(ct, tipo) {
  const config = getFormConfig();
  const fields = config[tipo] || [];
  const e = {};

  fields.forEach(f => {
    if (!f.active || !f.required) return;

    // Campos condicionais: só validar se a condição for verdadeira
    if (f.conditional && !ct[f.conditional]) return;

    const val = ct[f.id];

    if (f.type === "upload") {
      if (!val?.temArquivo) e[f.id] = `${f.label} — envio obrigatório.`;
    } else if (f.type === "checkbox") {
      // checkbox required não faz sentido — ignorar
    } else if (f.type === "number") {
      if (!String(val || "").trim() || isNaN(Number(val))) e[f.id] = `${f.label} — campo obrigatório.`;
    } else {
      if (!String(val || "").trim()) e[f.id] = `${f.label} — campo obrigatório.`;
    }
  });

  // Validação de modalidades (sempre)
  const modalValidas = (ct.modalidades || []).filter(m => m.distancia.trim() !== "");
  if (modalValidas.length === 0) {
    e.modalidades = "Informe ao menos uma modalidade/distância.";
  } else {
    const semEstimativa = modalValidas.some(m => !m.estimativaInscritos || isNaN(Number(m.estimativaInscritos)));
    if (semEstimativa) e.modalidadesEstimativa = "Informe a estimativa de inscritos para cada modalidade.";
  }

  return e;
}

/**
 * Gera um ID único para um novo campo custom.
 */
export function gerarCampoCustomId(tipo) {
  return `custom_${tipo}_${Date.now()}`;
}
