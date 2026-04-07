/**
 * taxaCalculator.js — Motor de cálculo de taxas (Regimento de Taxas 2026).
 *
 * Funções puras, sem dependência de UI ou Firebase.
 * Cobre Art. 7 (Taxa de Solicitação de Permit/Chancela).
 */

// ─── Tabela padrão (Art. 7) ─────────────────────────────────────────────────

export const TABELA_PADRAO = {
  faixas: [
    { ate: 500,      valor: 1.50 },
    { ate: 1000,     valor: 2.00 },
    { ate: Infinity, valor: 2.50 },
  ],
  minimo: 500,
  maximo: 4500,
  taxaUrgencia: 500,
};

// ─── Prazos por tipo ─────────────────────────────────────────────────────────

export const PRAZOS = {
  permit:   { urgenciaDias: 15, minimoDias: 5 },
  chancela: { urgenciaDias: 30, minimoDias: 15 },
};

// ─── Tabela de Arbitragem (Art. 6) — apenas referência ──────────────────────

export const TABELA_ARBITRAGEM = {
  pistaECampo: {
    porNivel: [
      { nivel: "A",  diaria: 230 },
      { nivel: "B",  diaria: 240 },
      { nivel: "C",  diaria: 250 },
      { nivel: "NI", diaria: 250 },
    ],
    porFuncao: [
      { funcao: "Secretaria e Gestão",        diaria: 300 },
      { funcao: "Organização",                diaria: 450 },
      { funcao: "Direção de Competição",      diaria: 450 },
      { funcao: "Staff e Estagiários",        diaria: 50, obs: "meia diária" },
      { funcao: "Chefe de Setor",             diaria: 50, obs: "bonificação" },
    ],
  },
  corridaDeRua6h: [
    { funcao: "Árbitro Chefe",                diaria: 180 },
    { funcao: "Árbitro Auxiliar",             diaria: 150 },
    { funcao: "Coordenador ou Representante", diaria: 250 },
  ],
  corridaDeRua12h: [
    { funcao: "Árbitro Chefe",                diaria: 250 },
    { funcao: "Árbitro Auxiliar",             diaria: 230 },
    { funcao: "Coordenador ou Representante", diaria: 450 },
  ],
};

// ─── Cálculo por modalidade ─────────────────────────────────────────────────

/**
 * Calcula a taxa para uma única modalidade com base no número de inscritos.
 * @param {number} inscritos — estimativa de inscritos
 * @param {object} [tabela=TABELA_PADRAO] — tabela de faixas (padrão ou customizada)
 * @returns {{ inscritos, valorBruto, valorFinal }}
 */
export function calcularTaxaModalidade(inscritos, tabela = TABELA_PADRAO) {
  const n = Math.max(0, Math.round(Number(inscritos) || 0));
  if (n === 0) return { inscritos: 0, valorBruto: 0, valorFinal: 0, detalhamento: [], aplicouMinimo: false, aplicouMaximo: false };

  const faixas = tabela.faixas || TABELA_PADRAO.faixas;
  const minimo = tabela.minimo ?? TABELA_PADRAO.minimo;
  const maximo = tabela.maximo ?? TABELA_PADRAO.maximo;

  // Encontrar a faixa que corresponde ao total de inscritos
  // A faixa é aplicada ao TOTAL (não progressiva)
  let valorUnitario = faixas[faixas.length - 1].valor; // fallback: última faixa
  let faixaLabel = "";
  for (const faixa of faixas) {
    if (n <= faixa.ate) {
      valorUnitario = faixa.valor;
      faixaLabel = faixa.ate === Infinity
        ? `Acima de ${faixas[faixas.indexOf(faixa) - 1]?.ate || 0}`
        : `Ate ${faixa.ate}`;
      break;
    }
  }

  const valorBruto = Math.round(n * valorUnitario * 100) / 100;
  const detalhamento = [{
    qtd: n,
    valorUnitario,
    subtotal: valorBruto,
    faixaLabel,
  }];

  const aplicouMinimo = valorBruto < minimo;
  const aplicouMaximo = valorBruto > maximo;
  const valorFinal = Math.min(maximo, Math.max(minimo, valorBruto));

  return { inscritos: n, valorBruto, valorFinal, detalhamento, aplicouMinimo, aplicouMaximo };
}

// ─── Desconto de parceiro ───────────────────────────────────────────────────

/**
 * Aplica desconto de parceiro sobre o subtotal.
 * @param {number} subtotal
 * @param {"isencao"|"desconto"|"tabela_customizada"|""} tipoDesconto
 * @param {number} [percentual=0] — 0-100, usado se tipo="desconto"
 * @returns {{ tipo, percentual, valorDesconto, valorFinal, descricao }}
 */
export function aplicarDesconto(subtotal, tipoDesconto, percentual = 0) {
  if (!tipoDesconto || tipoDesconto === "tabela_customizada") {
    // Tabela customizada já foi aplicada no cálculo por modalidade
    return { tipo: tipoDesconto || "", percentual: 0, valorDesconto: 0, valorFinal: subtotal, descricao: "" };
  }

  if (tipoDesconto === "isencao") {
    return { tipo: "isencao", percentual: 100, valorDesconto: subtotal, valorFinal: 0, descricao: "Parceiro FMA — isenção total" };
  }

  if (tipoDesconto === "desconto") {
    const pct = Math.min(100, Math.max(0, Number(percentual) || 0));
    const valorDesconto = Math.round(subtotal * pct / 100 * 100) / 100;
    return {
      tipo: "desconto",
      percentual: pct,
      valorDesconto,
      valorFinal: Math.round((subtotal - valorDesconto) * 100) / 100,
      descricao: `Parceiro FMA — ${pct}% de desconto`,
    };
  }

  return { tipo: "", percentual: 0, valorDesconto: 0, valorFinal: subtotal, descricao: "" };
}

// ─── Verificação de prazos ──────────────────────────────────────────────────

/**
 * Calcula a diferença em dias corridos entre hoje e a data do evento.
 * @param {string} dataEvento — "YYYY-MM-DD"
 * @param {Date} [hoje] — data de referência (padrão: hoje)
 * @returns {number} dias restantes (pode ser negativo se já passou)
 */
export function diasAteEvento(dataEvento, hoje = new Date()) {
  if (!dataEvento) return Infinity;
  const evento = new Date(dataEvento + "T00:00:00");
  const ref = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.ceil((evento - ref) / (1000 * 60 * 60 * 24));
}

/**
 * Verifica se a solicitação é urgente (prazo inferior ao definido por tipo).
 */
export function isUrgente(dataEvento, tipo = "permit", hoje = new Date()) {
  const prazos = PRAZOS[tipo] || PRAZOS.permit;
  return diasAteEvento(dataEvento, hoje) < prazos.urgenciaDias;
}

/**
 * Verifica se o prazo é insuficiente (pode ser indeferida).
 */
export function isPrazoInsuficiente(dataEvento, tipo = "permit", hoje = new Date()) {
  const prazos = PRAZOS[tipo] || PRAZOS.permit;
  return diasAteEvento(dataEvento, hoje) < prazos.minimoDias;
}

// ─── Cálculo total ──────────────────────────────────────────────────────────

/**
 * Calcula a taxa total de uma solicitação.
 *
 * @param {Array<{id, distancia, estimativaInscritos}>} modalidades
 * @param {string} dataEvento — "YYYY-MM-DD"
 * @param {"permit"|"chancela"} tipo
 * @param {object} [tabela=TABELA_PADRAO] — tabela de faixas (padrão ou parceiro)
 * @param {{ tipo: string, percentual?: number }} [desconto] — dados do parceiro
 * @param {Date} [hoje] — data de referência
 * @returns {object} resultado completo
 */
export function calcularTaxaTotal(modalidades, dataEvento, tipo = "permit", tabela = TABELA_PADRAO, desconto = null, hoje = new Date()) {
  const mods = (modalidades || [])
    .filter(m => m.distancia && Number(m.estimativaInscritos) > 0)
    .map(m => {
      const calc = calcularTaxaModalidade(m.estimativaInscritos, tabela);
      return { id: m.id, distancia: m.distancia, ...calc };
    });

  const subtotal = mods.reduce((acc, m) => acc + m.valorFinal, 0);

  // Urgência
  const urgente = isUrgente(dataEvento, tipo, hoje);
  const prazoInsuficiente = isPrazoInsuficiente(dataEvento, tipo, hoje);
  const urgencia = urgente ? (tabela.taxaUrgencia ?? TABELA_PADRAO.taxaUrgencia) : 0;

  const subtotalComUrgencia = subtotal + urgencia;

  // Desconto de parceiro
  const descontoResult = desconto
    ? aplicarDesconto(subtotalComUrgencia, desconto.tipo, desconto.percentual)
    : { tipo: "", percentual: 0, valorDesconto: 0, valorFinal: subtotalComUrgencia, descricao: "" };

  const dias = diasAteEvento(dataEvento, hoje);
  const prazos = PRAZOS[tipo] || PRAZOS.permit;

  return {
    modalidades: mods,
    subtotal,
    urgencia,
    isUrgente: urgente,
    isPrazoInsuficiente: prazoInsuficiente,
    diasAteEvento: dias,
    prazos,
    desconto: {
      tipo: descontoResult.tipo,
      percentual: descontoResult.percentual,
      valor: descontoResult.valorDesconto,
      descricao: descontoResult.descricao,
    },
    total: Math.round(descontoResult.valorFinal * 100) / 100,
  };
}

// ─── Formatação ─────────────────────────────────────────────────────────────

/**
 * Formata valor em reais.
 */
export function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}
