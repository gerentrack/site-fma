/**
 * EmailService — Envio de emails via EmailJS.
 * Para migrar para outro provider (Firebase, Resend etc),
 * basta substituir as funções send* mantendo a mesma assinatura.
 */

import emailjs from "@emailjs/browser";

const SERVICE_ID  = "service_ft1lli7";
const PUBLIC_KEY  = "9HDiomKK9NAYFSWvg";

const TEMPLATES = {
  solicitacaoStatus: "template_3nwxt3g",
  arbitroEscalacao:  "template_x21qcfq",
};

const PORTAL_LINK  = `${window.location.origin}/portal`;
const INTRANET_LINK = `${window.location.origin}/intranet`;

// Inicializa EmailJS com a Public Key
emailjs.init(PUBLIC_KEY);

// Mapa de status para texto legível
const STATUS_LABELS = {
  rascunho:   "Rascunho",
  submetido:  "Submetido",
  em_analise: "Em Análise",
  aprovado:   "Aprovado ✅",
  rejeitado:  "Rejeitado ❌",
  cancelado:  "Cancelado",
};

/**
 * Notifica o organizador sobre mudança de status da solicitação.
 * @param {object} params
 * @param {string} params.organizadorEmail
 * @param {string} params.organizadorNome
 * @param {string} params.protocolo
 * @param {string} params.evento
 * @param {string} params.status  — chave do status (ex: "aprovado")
 * @param {string} [params.observacao]
 */
export async function notificarStatusSolicitacao({ organizadorEmail, organizadorNome, protocolo, evento, status, observacao = "" }) {
  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATES.solicitacaoStatus,
      {
        organizador_email: organizadorEmail,
        organizador_nome:  organizadorNome,
        protocolo,
        evento,
        status:      STATUS_LABELS[status] || status,
        observacao:  observacao || "—",
        portal_link: PORTAL_LINK,
      },
      PUBLIC_KEY
    );
    return { ok: true };
  } catch (e) {
    console.error("EmailService.notificarStatusSolicitacao:", e);
    return { ok: false, error: e.message };
  }
}

/**
 * Notifica o árbitro sobre uma nova escalação.
 * @param {object} params
 * @param {string} params.arbitroEmail
 * @param {string} params.arbitroNome
 * @param {string} params.evento
 * @param {string} params.data       — data formatada (ex: "15/03/2026")
 * @param {string} params.local
 * @param {string} params.funcao
 * @param {string} [params.observacao]
 */
export async function notificarEscalacaoArbitro({ arbitroEmail, arbitroNome, evento, data, local, funcao, observacao = "" }) {
  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATES.arbitroEscalacao,
      {
        arbitro_email:  arbitroEmail,
        arbitro_nome:   arbitroNome,
        evento,
        data,
        local:          local || "A confirmar",
        funcao:         funcao || "Árbitro",
        observacao:     observacao || "—",
        intranet_link:  INTRANET_LINK,
      },
      PUBLIC_KEY
    );
    return { ok: true };
  } catch (e) {
    console.error("EmailService.notificarEscalacaoArbitro:", e);
    return { ok: false, error: e.message };
  }
}
