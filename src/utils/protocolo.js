/**
 * protocolo.js — Utilitários para geração e gestão do protocolo FMA.
 *
 * Formato: FMA-{ano}-{sequencial com 4 dígitos}
 * Exemplos: FMA-2026-0001, FMA-2026-0042, FMA-2027-0001
 *
 * O contador é persistido no localStorage por ano, de forma independente.
 * Chave: "fma_protocolo_seq_{ano}"  →  valor: número inteiro
 *
 * Regras:
 *   1. Protocolo gerado UMA única vez por solicitação (quando entra em "em_analise")
 *   2. Se a solicitação já tem protocoloFMA preenchido, NÃO gerar novamente
 *   3. Sequencial é por ano — começa em 1 a cada virada de ano
 *   4. Permit e Chancela usam a mesma lógica e o mesmo contador
 */

/** Prefixo da chave localStorage para o contador de protocolo por ano. */
const SEQ_KEY_PREFIX = "fma_protocolo_seq_";

/**
 * Retorna a chave localStorage do contador para o ano informado.
 * @param {number|string} ano
 * @returns {string} ex: "fma_protocolo_seq_2026"
 */
export function seqKey(ano) {
  return `${SEQ_KEY_PREFIX}${ano}`;
}

/**
 * Lê o sequencial atual do ano no localStorage.
 * Retorna 0 se ainda não existe nenhum protocolo para este ano.
 * @param {number|string} ano
 * @returns {number}
 */
export function lerSequencial(ano) {
  const raw = localStorage.getItem(seqKey(ano));
  const val = parseInt(raw, 10);
  return isNaN(val) ? 0 : val;
}

/**
 * Persiste o sequencial no localStorage para o ano informado.
 * @param {number|string} ano
 * @param {number} sequencial
 */
export function salvarSequencial(ano, sequencial) {
  localStorage.setItem(seqKey(ano), String(sequencial));
}

/**
 * Retorna o próximo sequencial disponível para o ano e já persiste o
 * incremento no localStorage (lê → incrementa → persiste → retorna).
 * @param {number|string} ano
 * @returns {number} — começa em 1
 */
export function proximoSequencial(ano) {
  const atual = lerSequencial(ano);
  const proximo = atual + 1;
  salvarSequencial(ano, proximo);
  return proximo;
}

/**
 * Formata o número sequencial com zeros à esquerda (mínimo 4 dígitos).
 * @param {number} seq
 * @returns {string} ex: "0001", "0042", "1000"
 */
export function formatarSequencial(seq) {
  return String(seq).padStart(4, "0");
}

/**
 * Gera um protocolo FMA completo consumindo o próximo sequencial do ano.
 *
 * ⚠️  Esta função tem efeito colateral: incrementa o contador no localStorage.
 *     Use `garantirProtocolo()` para garantir idempotência por solicitação.
 *
 * @param {number|string} [ano] — padrão: ano corrente
 * @returns {string} ex: "FMA-2026-0001"
 */
export function gerarProtocolo(ano) {
  const anoFinal = ano ?? new Date().getFullYear();
  const seq = proximoSequencial(anoFinal);
  return `FMA-${anoFinal}-${formatarSequencial(seq)}`;
}

/**
 * Garante que uma solicitação tenha protocolo, gerando um novo SOMENTE se
 * ela ainda não possui (protocoloFMA vazio ou ausente).
 *
 * É a função principal — deve ser chamada ao mudar status para "em_analise".
 *
 * @param {object} solicitacao — objeto Solicitacao
 * @param {number|string} [ano] — padrão: ano corrente
 * @returns {{ protocolo: string, gerado: boolean }}
 *   gerado = true  → protocolo foi criado agora
 *   gerado = false → solicitação já tinha protocolo; retornado sem modificação
 *
 * @example
 *   const { protocolo, gerado } = garantirProtocolo(solicitacao);
 *   if (gerado) console.log("Novo protocolo:", protocolo);
 */
export function garantirProtocolo(solicitacao, ano) {
  if (solicitacao.protocoloFMA && solicitacao.protocoloFMA.trim() !== "") {
    return { protocolo: solicitacao.protocoloFMA, gerado: false };
  }
  const anoFinal = ano ?? new Date().getFullYear();
  const protocolo = gerarProtocolo(anoFinal);
  return { protocolo, gerado: true };
}

/**
 * Valida se uma string tem o formato esperado de protocolo FMA.
 * @param {string} str
 * @returns {boolean}
 */
export function isProtocoloValido(str) {
  return /^FMA-\d{4}-\d{4,}$/.test(str ?? "");
}

/**
 * Retorna o total de protocolos emitidos no ano informado.
 * @param {number|string} [ano] — padrão: ano corrente
 * @returns {number}
 */
export function totalProtocolosAno(ano) {
  return lerSequencial(ano ?? new Date().getFullYear());
}

/**
 * Lista todos os anos que possuem contadores de protocolo no localStorage.
 * @returns {number[]} — array de anos, ordenados crescente
 */
export function anosComProtocolo() {
  const anos = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(SEQ_KEY_PREFIX)) {
      const ano = parseInt(key.replace(SEQ_KEY_PREFIX, ""), 10);
      if (!isNaN(ano)) anos.push(ano);
    }
  }
  return anos.sort((a, b) => a - b);
}
