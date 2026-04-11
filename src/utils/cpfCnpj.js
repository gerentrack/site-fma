/**
 * Validação de CPF e CNPJ — algoritmo oficial dos dígitos verificadores.
 * Também inclui checagem de duplicidade no Firestore.
 */
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

// ── Validação matemática ─────────────────────────────────────────────────────

export function validarCPF(cpf) {
  const digits = (cpf || "").replace(/\D/g, "");
  if (digits.length !== 11) return false;
  // Rejeitar sequências repetidas (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(digits)) return false;
  // Dígito verificador 1
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(digits[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== Number(digits[9])) return false;
  // Dígito verificador 2
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(digits[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === Number(digits[10]);
}

export function validarCNPJ(cnpj) {
  const digits = (cnpj || "").replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) soma += Number(digits[i]) * pesos1[i];
  let resto = soma % 11;
  if (Number(digits[12]) !== (resto < 2 ? 0 : 11 - resto)) return false;
  soma = 0;
  for (let i = 0; i < 13; i++) soma += Number(digits[i]) * pesos2[i];
  resto = soma % 11;
  return Number(digits[13]) === (resto < 2 ? 0 : 11 - resto);
}

export function validarNisPis(nis) {
  const digits = (nis || "").replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(digits[i]) * pesos[i];
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  return dv === Number(digits[10]);
}

// ── Checagem de duplicidade no Firestore ─────────────────────────────────────

/**
 * Verifica se um CPF já existe na coleção de árbitros.
 * @param {string} cpf — somente dígitos
 * @param {string} [excludeId] — ID do documento a ignorar (para edição)
 * @returns {Promise<boolean>} true se já existe
 */
export async function cpfJaExisteArbitro(cpf, excludeId) {
  const digits = (cpf || "").replace(/\D/g, "");
  if (!digits) return false;
  const q = query(collection(db, "referees"), where("cpf", "==", digits));
  const snap = await getDocs(q);
  return snap.docs.some(d => d.id !== excludeId);
}

/**
 * Verifica se um CPF/CNPJ já existe na coleção de organizadores.
 * @param {string} cpfCnpj — somente dígitos
 * @param {string} [excludeId] — ID do documento a ignorar (para edição)
 * @returns {Promise<boolean>} true se já existe
 */
export async function cpfCnpjJaExisteOrganizador(cpfCnpj, excludeId) {
  const digits = (cpfCnpj || "").replace(/\D/g, "");
  if (!digits) return false;
  const snap = await getDocs(collection(db, "organizers"));
  return snap.docs.some(d => d.id !== excludeId && d.data().cpfCnpj === digits);
}
