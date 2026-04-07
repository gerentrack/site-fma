/**
 * FMA — Contador sequencial de recibos (Firestore)
 *
 * Coleção: counters
 * Documento: recibo_{ano}  →  { sequencial: N, ano: YYYY }
 */

import { doc, getDoc, setDoc, runTransaction } from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "counters";
const docId = (ano) => `recibo_${ano}`;

/** Formata número → "REC-001/2026" */
export function formatarNumeroRecibo(num, ano) {
  return `REC-${String(num).padStart(3, "0")}/${ano}`;
}

/** Reserva 1 número via transação atômica. Retorna o número reservado. */
export async function reservarNumeroRecibo(ano) {
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
