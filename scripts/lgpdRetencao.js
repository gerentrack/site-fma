/**
 * Script LGPD — Política de retenção de dados.
 * Processa exclusões solicitadas e limpa dados de cadastros inativos conforme prazos legais.
 *
 * Uso: node scripts/lgpdRetencao.js
 * Recomendação: executar semanalmente via cron ou Cloud Scheduler.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, "../serviceAccountKey.json");

let app;
try {
  const sa = JSON.parse(readFileSync(keyPath, "utf8"));
  app = initializeApp({ credential: cert(sa) });
} catch {
  console.error("serviceAccountKey.json nao encontrado.");
  process.exit(1);
}

const db = getFirestore(app);
const del = FieldValue.delete();

// Prazos (em dias)
const PRAZO_EXCLUSAO = 15;
const PRAZO_INATIVO_ANOS = 5;
const PRAZO_BANCO_DIAS = 30;

function diasAtras(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString();
}

// ── 1. Processar solicitações de exclusão (prazo: 15 dias) ───────────────────
async function processarExclusoesArbitros() {
  const snap = await db.collection("referees").where("lgpdExclusaoStatus", "==", "solicitada").get();
  let count = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const solicitadoEm = data.lgpdExclusaoSolicitadaEm;
    if (!solicitadoEm) continue;
    const limite = new Date(solicitadoEm);
    limite.setDate(limite.getDate() + PRAZO_EXCLUSAO);
    if (new Date() < limite) continue; // ainda dentro do prazo

    // Anonimizar dados pessoais (manter ID e registros fiscais mínimos)
    await doc.ref.update({
      name: "DADOS REMOVIDOS (LGPD)", email: del, phone: del,
      cpf: del, rg: del, rgOrgao: del, rgUf: del, rgDataExpedicao: del, nisPis: del,
      dataNascimento: del, sexo: del, estadoCivil: del, cor: del, escolaridade: del,
      municipioNascimento: del, ufNascimento: del, nomePai: del, nomeMae: del,
      cep: del, logradouro: del, numero: del, complemento: del, bairro: del, city: del, state: del,
      banco: del, bancoNome: del, tipoConta: del, agencia: del, contaDigito: del, chavePix: del, chavePixTipo: del,
      contatoEmergenciaNome: del, contatoEmergenciaTelefone: del,
      tipoSanguineo: del, foto: del,
      lgpdExclusaoStatus: "concluida",
      lgpdExclusaoConcluidaEm: new Date().toISOString(),
      status: "excluido_lgpd",
    });
    count++;
    console.log(`  Arbitro ${doc.id} — dados anonimizados`);
  }
  return count;
}

async function processarExclusoesOrganizadores() {
  const snap = await db.collection("organizers").where("lgpdExclusaoStatus", "==", "solicitada").get();
  let count = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const solicitadoEm = data.lgpdExclusaoSolicitadaEm;
    if (!solicitadoEm) continue;
    const limite = new Date(solicitadoEm);
    limite.setDate(limite.getDate() + PRAZO_EXCLUSAO);
    if (new Date() < limite) continue;

    await doc.ref.update({
      name: "DADOS REMOVIDOS (LGPD)", email: del, phone: del,
      cpfCnpj: del, address: del, city: del, state: del,
      lgpdExclusaoStatus: "concluida",
      lgpdExclusaoConcluidaEm: new Date().toISOString(),
      status: "excluido_lgpd", active: false,
    });
    count++;
    console.log(`  Organizador ${doc.id} — dados anonimizados`);
  }
  return count;
}

// ── 2. Limpar dados bancários de árbitros inativos há mais de 30 dias ────────
async function limparBancosInativos() {
  const limite = diasAtras(PRAZO_BANCO_DIAS);
  const snap = await db.collection("referees").where("status", "==", "inativo").get();
  let count = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!data.banco && !data.chavePix) continue; // já limpo
    const inativadoEm = data.updatedAt || data.createdAt || "";
    if (inativadoEm > limite) continue; // ainda dentro do prazo

    await doc.ref.update({
      banco: del, bancoNome: del, tipoConta: del, agencia: del,
      contaDigito: del, chavePix: del, chavePixTipo: del,
      lgpdBancosRemovidosEm: new Date().toISOString(),
    });
    count++;
    console.log(`  Arbitro ${doc.id} — dados bancarios removidos (inativo)`);
  }
  return count;
}

// ── 3. Anonimizar árbitros inativos há mais de 5 anos ────────────────────────
async function anonimizarInativosAntigos() {
  const limite = diasAtras(PRAZO_INATIVO_ANOS * 365);
  const snap = await db.collection("referees").where("status", "==", "inativo").get();
  let count = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.name === "DADOS REMOVIDOS (LGPD)") continue; // já anonimizado
    const inativadoEm = data.updatedAt || data.createdAt || "";
    if (inativadoEm > limite) continue;

    await doc.ref.update({
      name: "DADOS REMOVIDOS (LGPD)", email: del, phone: del,
      cpf: del, rg: del, rgOrgao: del, rgUf: del, rgDataExpedicao: del, nisPis: del,
      dataNascimento: del, sexo: del, estadoCivil: del, cor: del, escolaridade: del,
      municipioNascimento: del, ufNascimento: del, nomePai: del, nomeMae: del,
      cep: del, logradouro: del, numero: del, complemento: del, bairro: del, city: del, state: del,
      banco: del, bancoNome: del, tipoConta: del, agencia: del, contaDigito: del, chavePix: del, chavePixTipo: del,
      contatoEmergenciaNome: del, contatoEmergenciaTelefone: del,
      tipoSanguineo: del, foto: del,
      status: "excluido_lgpd",
      lgpdAnonimizadoEm: new Date().toISOString(),
    });
    count++;
    console.log(`  Arbitro ${doc.id} — anonimizado (inativo >5 anos)`);
  }
  return count;
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  LGPD — Politica de Retencao de Dados");
  console.log(`  Execucao: ${new Date().toLocaleString("pt-BR")}`);
  console.log("═══════════════════════════════════════════════════\n");

  console.log("1. Exclusoes solicitadas por titulares...");
  const excArb = await processarExclusoesArbitros();
  const excOrg = await processarExclusoesOrganizadores();
  console.log(`   ${excArb + excOrg} exclusoes processadas\n`);

  console.log("2. Dados bancarios de inativos (>30 dias)...");
  const bancos = await limparBancosInativos();
  console.log(`   ${bancos} registros limpos\n`);

  console.log("3. Anonimizacao de inativos (>5 anos)...");
  const anon = await anonimizarInativosAntigos();
  console.log(`   ${anon} registros anonimizados\n`);

  console.log("───────────────────────────────────────────────────");
  console.log("Concluido.");
  console.log("───────────────────────────────────────────────────");
  process.exit(0);
}

main().catch(e => { console.error("Erro:", e); process.exit(1); });
