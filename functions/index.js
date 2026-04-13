/**
 * Cloud Functions — FMA Site
 * Análise de solicitações com IA (Claude / Anthropic)
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const Anthropic = require("@anthropic-ai/sdk");
const { promptPermit, promptChancela } = require("./prompts");

initializeApp();
const db = getFirestore();

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

exports.analisarSolicitacao = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 60, region: "southamerica-east1" },
  async (request) => {
    // 1. Validar autenticação
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login necessário.");
    }

    // 2. Validar que é admin
    const uid = request.auth.uid;
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("permission-denied", "Usuário não encontrado.");
    }
    const userData = userDoc.data();
    const roles = userData.roles || [userData.role];
    if (!roles.includes("admin")) {
      throw new HttpsError("permission-denied", "Acesso restrito a administradores.");
    }

    // 3. Validar dados recebidos
    const { solicitacao } = request.data;
    if (!solicitacao || !solicitacao.tipo) {
      throw new HttpsError("invalid-argument", "Dados da solicitação inválidos.");
    }

    // 4. Montar prompt por tipo
    const tipo = solicitacao.tipo;
    let prompt;
    if (tipo === "permit") {
      prompt = promptPermit(solicitacao);
    } else if (tipo === "chancela") {
      prompt = promptChancela(solicitacao);
    } else {
      throw new HttpsError("invalid-argument", `Tipo de solicitação desconhecido: ${tipo}`);
    }

    // 5. Chamar API Claude
    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      const response = await client.messages.create({
        model: "claude-sonnet-4-5-20241022",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      });

      const parecer = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      return { parecer };
    } catch (err) {
      console.error("Erro ao chamar API Claude:", err);
      throw new HttpsError("internal", "Erro ao processar análise com IA. Tente novamente.");
    }
  }
);
