/**
 * protocolo.js — Utilitários para geração e gestão do protocolo FMA.
 *
 * Formato: FMA-{ano}-{sequencial com 4 dígitos}
 * Exemplos: FMA-2026-0001, FMA-2026-0042, FMA-2027-0001
 *
 * O contador é persistido no Firestore (collection: counters, doc: protocolo_{ano})
 * via transação atômica — seguro para múltiplos usuários/abas simultâneos.
 *
 * Regras:
 *   1. Protocolo gerado UMA única vez por solicitação (quando entra em "em_analise")
 *   2. Se a solicitação já tem protocoloFMA preenchido, NÃO gerar novamente
 *   3. Sequencial é por ano — começa em 1 a cada virada de ano
 *   4. Permit e Chancela usam a mesma lógica e o mesmo contador
 */

import { doc, getDoc, setDoc, runTransaction } from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "counters";
const docId = (ano) => `protocolo_${ano}`;

/**
 * Formata o número sequencial com zeros à esquerda (mínimo 4 dígitos).
 * @param {number} seq
 * @returns {string} ex: "0001", "0042", "1000"
 */
export function formatarSequencial(seq) {
  return String(seq).padStart(4, "0");
}

/**
 * Lê o sequencial atual do ano no Firestore (sem incrementar).
 * Retorna 0 se ainda não existe nenhum protocolo para este ano.
 * @param {number|string} ano
 * @returns {Promise<number>}
 */
export async function lerSequencial(ano) {
  const ref = doc(db, COLLECTION, docId(ano));
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().sequencial : 0;
}

/**
 * Reserva o próximo número de protocolo via transação atômica no Firestore.
 * @param {number|string} ano
 * @returns {Promise<number>} — o número reservado (começa em 1)
 */
async function reservarProximoSequencial(ano) {
  const ref = doc(db, COLLECTION, docId(ano));
  const numero = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    const atual = snap.exists() ? snap.data().sequencial : 0;
    const proximo = atual + 1;
    transaction.set(ref, { sequencial: proximo, ano: Number(ano) });
    return proximo;
  });
  return numero;
}

/**
 * Gera um protocolo FMA completo consumindo o próximo sequencial do ano.
 *
 * ⚠️  Esta função tem efeito colateral: incrementa o contador no Firestore.
 *     Use `garantirProtocolo()` para garantir idempotência por solicitação.
 *
 * @param {number|string} [ano] — padrão: ano corrente
 * @returns {Promise<string>} ex: "FMA-2026-0001"
 */
export async function gerarProtocolo(ano) {
  const anoFinal = ano ?? new Date().getFullYear();
  const seq = await reservarProximoSequencial(anoFinal);
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
 * @returns {Promise<{ protocolo: string, gerado: boolean }>}
 */
export async function garantirProtocolo(solicitacao, ano) {
  if (solicitacao.protocoloFMA && solicitacao.protocoloFMA.trim() !== "") {
    return { protocolo: solicitacao.protocoloFMA, gerado: false };
  }
  const anoFinal = ano ?? new Date().getFullYear();
  const protocolo = await gerarProtocolo(anoFinal);
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
 * @returns {Promise<number>}
 */
export async function totalProtocolosAno(ano) {
  return lerSequencial(ano ?? new Date().getFullYear());
}

/**
 * Define o contador manualmente (override do admin).
 * @param {number|string} ano
 * @param {number} valor
 */
export async function setContador(ano, valor) {
  const ref = doc(db, COLLECTION, docId(ano));
  await setDoc(ref, { sequencial: Number(valor), ano: Number(ano) });
}
