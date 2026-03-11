/**
 * permitDefaults.js — Estrutura canônica, fábrica de defaults e migração de legado.
 * Cobre PERMIT e CHANCELA.
 *
 * Compatibilidade:
 *   - Registros antigos: `campos: { percursos, estimativaParticipantes, horarioLargada }`
 *   - normalizarCamposTecnicos(sol) sempre retorna o schema novo completo.
 *   - O campo `campos` legado é mantido intocado (nunca deletado).
 */

// ─── Defaults: PERMIT ────────────────────────────────────────────────────────

export function defaultCamposTecnicosPermit() {
  return {
    _tipo: "permit",
    _versao: 2,

    // Datas
    dataEncerramentoInscricoes: "",
    horarioLargada: "",

    // Modalidades (array dinâmico — estrutura compartilhada com Chancela)
    modalidades: [{ id: "m1", distancia: "", estimativaInscritos: "" }],

    // Financeiro
    valorInscricao: "",
    premiacaoDinheiro: false,
    valorPremiacaoTotal: "",

    // Técnico
    sistemaApuracao: "",
    empresaCronometragem: "",
    formaMedicaoPercurso: "",

    // Infraestrutura
    postoMedico: false,
    quantidadeAmbulancias: "",
    apoliceSeguros: "",
    leiIncentivo: false,

    // Composição
    objetivoEvento: "",
    patrocinadores: "",
    kitAtleta: "",
    empresasServicos: "",

    // Documentos obrigatórios
    regulamento:  { temArquivo: false, nomeArquivo: "", arquivoId: "" },
    mapaPercurso: { temArquivo: false, nomeArquivo: "", arquivoId: "" },
  };
}

// ─── Defaults: CHANCELA ──────────────────────────────────────────────────────

export function defaultCamposTecnicosChancela() {
  return {
    _tipo: "chancela",
    _versao: 1,

    // Identificação
    linkDivulgacao: "",
    objetivoEvento: "",

    // Modalidades (mesma estrutura do permit)
    modalidades: [{ id: "m1", distancia: "", estimativaInscritos: "" }],

    // Financeiro
    valorInscricao: "",
    premiacaoDinheiro: false,
    valorPremiacaoTotal: "",

    // Técnico
    sistemaApuracao: "",
    empresaCronometragem: "",
    formaMedicaoPercurso: "",

    // Equipe médica
    medicoResponsavel: "",

    // Dados fiscais
    dadosEmissaoRecibo: "",

    // Seguro
    apoliceSeguros: "",

    // Documentos
    regulamento:                      { temArquivo: false, nomeArquivo: "", arquivoId: "" },
    mapaPercurso:                     { temArquivo: false, nomeArquivo: "", arquivoId: "" },
    arquivoGPX:                       { temArquivo: false, nomeArquivo: "", arquivoId: "" },
    planoSegurancaResgate:            { temArquivo: false, nomeArquivo: "", arquivoId: "" },
    planoMedico:                      { temArquivo: false, nomeArquivo: "", arquivoId: "" },
    comprovanteSeguros:               { temArquivo: false, nomeArquivo: "", arquivoId: "" },
    autorizacaoAmbiental:             { temArquivo: false, nomeArquivo: "", arquivoId: "" },
    declaracaoCaracterizacaoPercurso: { temArquivo: false, nomeArquivo: "", arquivoId: "" },
    regulamentoTecnico:               { temArquivo: false, nomeArquivo: "", arquivoId: "" },
  };
}

// ─── Normalização + migração ─────────────────────────────────────────────────

/**
 * Retorna o camposTecnicos completo e normalizado de uma solicitação.
 * Migra automaticamente registros legados (com apenas `campos`).
 */
export function normalizarCamposTecnicos(sol) {
  if (sol.camposTecnicos && sol.camposTecnicos._tipo) {
    return mergeCamposTecnicos(sol.camposTecnicos, sol.tipo);
  }

  // Migrar legado
  const legado = sol.campos || {};

  if (sol.tipo === "permit") {
    const base = defaultCamposTecnicosPermit();
    if (legado.horarioLargada) base.horarioLargada = legado.horarioLargada;
    if (Array.isArray(legado.percursos) && legado.percursos.length > 0) {
      const est = legado.estimativaParticipantes
        ? Math.round(legado.estimativaParticipantes / legado.percursos.length)
        : "";
      base.modalidades = legado.percursos.map((dist, i) => ({
        id: `m${i + 1}`, distancia: dist, estimativaInscritos: String(est),
      }));
    } else if (legado.estimativaParticipantes) {
      base.modalidades = [{ id: "m1", distancia: "", estimativaInscritos: String(legado.estimativaParticipantes) }];
    }
    return base;
  }

  if (sol.tipo === "chancela") {
    return defaultCamposTecnicosChancela();
  }

  return { _tipo: sol.tipo || "desconhecido", _versao: 1 };
}

/**
 * Mescla camposTecnicos existente com defaults (garante campos novos no schema).
 * Não sobrescreve valores já preenchidos.
 */
export function mergeCamposTecnicos(existente, tipo) {
  const defaults = tipo === "permit"
    ? defaultCamposTecnicosPermit()
    : tipo === "chancela"
      ? defaultCamposTecnicosChancela()
      : {};
  return { ...defaults, ...existente };
}

// ─── Validação legada (mantida para compatibilidade) ─────────────────────────
// A validação principal agora é feita via validarCamposConfig(ct, tipo) de formSchema.js
// Estas funções continuam disponíveis para uso direto quando não há config customizada.

export function validarCamposTecnicosPermit(ct) {
  const e = {};
  if (!ct.dataEncerramentoInscricoes) e.dataEncerramentoInscricoes = "Data de encerramento das inscrições obrigatória.";
  if (!ct.horarioLargada)             e.horarioLargada = "Horário da largada obrigatório.";
  _validarModalidades(ct, e);
  if (!String(ct.valorInscricao || "").trim())    e.valorInscricao    = "Valor de inscrição obrigatório.";
  if (ct.premiacaoDinheiro && !String(ct.valorPremiacaoTotal || "").trim()) e.valorPremiacaoTotal = "Informe o valor total de premiação.";
  if (!String(ct.sistemaApuracao || "").trim())   e.sistemaApuracao   = "Sistema de apuração obrigatório.";
  if (!String(ct.empresaCronometragem || "").trim()) e.empresaCronometragem = "Empresa de cronometragem obrigatória.";
  if (!String(ct.formaMedicaoPercurso || "").trim()) e.formaMedicaoPercurso = "Forma de aferição obrigatória.";
  if (!String(ct.objetivoEvento || "").trim())    e.objetivoEvento    = "Objetivo do evento obrigatório.";
  if (ct.postoMedico && !String(ct.quantidadeAmbulancias || "").trim()) e.quantidadeAmbulancias = "Informe a quantidade de ambulâncias.";
  if (!String(ct.apoliceSeguros || "").trim())    e.apoliceSeguros    = "Número da apólice obrigatório.";
  if (!ct.regulamento?.temArquivo)  e.regulamento  = "Regulamento obrigatório.";
  if (!ct.mapaPercurso?.temArquivo) e.mapaPercurso = "Mapa do percurso obrigatório.";
  return e;
}

export function validarCamposTecnicosChancela(ct) {
  const e = {};
  if (!String(ct.linkDivulgacao || "").trim())   e.linkDivulgacao   = "Link de divulgação obrigatório.";
  if (!String(ct.objetivoEvento || "").trim())   e.objetivoEvento   = "Objetivo do evento obrigatório.";
  _validarModalidades(ct, e);
  if (!String(ct.valorInscricao || "").trim())   e.valorInscricao   = "Valor de inscrição obrigatório.";
  if (ct.premiacaoDinheiro && !String(ct.valorPremiacaoTotal || "").trim()) e.valorPremiacaoTotal = "Informe o valor total de premiação.";
  if (!String(ct.sistemaApuracao || "").trim())  e.sistemaApuracao  = "Sistema de apuração obrigatório.";
  if (!String(ct.empresaCronometragem || "").trim()) e.empresaCronometragem = "Empresa de cronometragem obrigatória.";
  if (!String(ct.formaMedicaoPercurso || "").trim()) e.formaMedicaoPercurso = "Forma de aferição obrigatória.";
  if (!String(ct.medicoResponsavel || "").trim()) e.medicoResponsavel = "Médico responsável obrigatório.";
  if (!String(ct.dadosEmissaoRecibo || "").trim()) e.dadosEmissaoRecibo = "Dados para emissão do recibo obrigatórios.";
  if (!String(ct.apoliceSeguros || "").trim())   e.apoliceSeguros   = "Número da apólice obrigatório.";
  if (!ct.regulamento?.temArquivo)                      e.regulamento                      = "Regulamento obrigatório.";
  if (!ct.mapaPercurso?.temArquivo)                     e.mapaPercurso                     = "Mapa do percurso obrigatório.";
  if (!ct.arquivoGPX?.temArquivo)                       e.arquivoGPX                       = "Arquivo GPX/KML obrigatório.";
  if (!ct.planoSegurancaResgate?.temArquivo)            e.planoSegurancaResgate            = "Plano de Segurança e Resgate obrigatório.";
  if (!ct.planoMedico?.temArquivo)                      e.planoMedico                      = "Plano Médico obrigatório.";
  if (!ct.comprovanteSeguros?.temArquivo)               e.comprovanteSeguros               = "Comprovante de seguro obrigatório.";
  if (!ct.declaracaoCaracterizacaoPercurso?.temArquivo) e.declaracaoCaracterizacaoPercurso = "Declaração de caracterização obrigatória.";
  if (!ct.regulamentoTecnico?.temArquivo)               e.regulamentoTecnico               = "Regulamento técnico obrigatório.";
  return e;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _validarModalidades(ct, e) {
  const validas = (ct.modalidades || []).filter(m => m.distancia.trim() !== "");
  if (validas.length === 0) {
    e.modalidades = "Informe ao menos uma modalidade/distância.";
  } else {
    const semEst = validas.some(m => !m.estimativaInscritos || isNaN(Number(m.estimativaInscritos)));
    if (semEst) e.modalidadesEstimativa = "Informe a estimativa de inscritos para cada modalidade.";
  }
}

export function totalEstimativaInscritos(ct) {
  return (ct.modalidades || []).reduce((acc, m) => acc + (Number(m.estimativaInscritos) || 0), 0);
}

export function modalidadesLabel(ct) {
  return (ct.modalidades || [])
    .filter(m => m.distancia)
    .map(m => `${m.distancia} (${m.estimativaInscritos || "?"})`)
    .join(" · ") || "—";
}

export function novaModalidadeId() {
  return `m${Date.now()}`;
}
