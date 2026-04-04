/**
 * FMA — Contador sequencial de permits/chancelas (Firestore)
 *
 * Coleção: counters
 * Documento: permit_{ano}  →  { sequencial: N, ano: YYYY }
 *
 * Numeração compartilhada entre Permit e Chancela.
 */

import { doc, getDoc, setDoc, runTransaction } from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "counters";
const docId = (ano) => `permit_${ano}`;

/** Formata número → "001/2026" (3 dígitos, zero-padded) */
export function formatarNumero(num, ano) {
  return `${String(num).padStart(3, "0")}/${ano}`;
}

/** Lê o último número usado (sem incrementar). Retorna 0 se não existir. */
export async function getUltimoNumero(ano) {
  const ref = doc(db, COLLECTION, docId(ano));
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().sequencial : 0;
}

/** Retorna o próximo número disponível (sem consumir). */
export async function getProximoNumero(ano) {
  return (await getUltimoNumero(ano)) + 1;
}

/**
 * Reserva N números consecutivos via transação atômica.
 * Retorna array de números reservados: [207, 208, 209].
 */
export async function reservarNumeros(ano, quantidade) {
  const ref = doc(db, COLLECTION, docId(ano));

  const numeros = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    const atual = snap.exists() ? snap.data().sequencial : 0;
    const reservados = [];
    for (let i = 1; i <= quantidade; i++) {
      reservados.push(atual + i);
    }
    transaction.set(ref, { sequencial: atual + quantidade, ano: Number(ano) });
    return reservados;
  });

  return numeros;
}

/**
 * Define o contador manualmente (override do admin).
 * Usado quando o admin editou os números ou fez permits fora do sistema.
 */
export async function setContador(ano, valor) {
  const ref = doc(db, COLLECTION, docId(ano));
  await setDoc(ref, { sequencial: Number(valor), ano: Number(ano) });
}
