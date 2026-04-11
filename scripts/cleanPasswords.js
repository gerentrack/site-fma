/**
 * Script de limpeza LGPD — Remove campo "password" de documentos no Firestore.
 * Coleções: referees, organizers, users
 *
 * Uso: node scripts/cleanPasswords.js
 * Requer: GOOGLE_APPLICATION_CREDENTIALS ou firebase-admin configurado
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Tenta carregar service account key
const keyPath = resolve(__dirname, "../serviceAccountKey.json");
let app;
try {
  const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
  app = initializeApp({ credential: cert(serviceAccount) });
} catch {
  console.error("❌ Arquivo serviceAccountKey.json não encontrado em", keyPath);
  console.error("   Baixe em: Firebase Console → Configurações → Contas de serviço → Gerar nova chave privada");
  process.exit(1);
}

const db = getFirestore(app);

async function limparSenhas(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  let total = 0;
  let limpos = 0;

  for (const doc of snapshot.docs) {
    total++;
    const data = doc.data();
    if ("password" in data) {
      await doc.ref.update({ password: FieldValue.delete() });
      limpos++;
      console.log(`  🗑️  ${collectionName}/${doc.id} — campo password removido`);
    }
  }

  console.log(`✅ ${collectionName}: ${limpos}/${total} documentos limpos\n`);
  return limpos;
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  LGPD — Limpeza de senhas armazenadas no Firestore");
  console.log("═══════════════════════════════════════════════════\n");

  const collections = ["referees", "organizers", "users"];
  let totalLimpos = 0;

  for (const col of collections) {
    totalLimpos += await limparSenhas(col);
  }

  console.log("───────────────────────────────────────────────────");
  console.log(`Total: ${totalLimpos} documentos tiveram o campo password removido.`);
  console.log("───────────────────────────────────────────────────");
  process.exit(0);
}

main().catch((e) => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
