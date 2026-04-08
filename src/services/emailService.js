/**
 * EmailService — Envio de emails via Firebase (Trigger Email from Firestore).
 *
 * Como funciona:
 *   1. O código escreve um documento na collection "mail" do Firestore
 *   2. A extensão "Trigger Email from Firestore" detecta e envia via SMTP
 *   3. Tudo server-side — sem credenciais expostas no client
 *
 * Pré-requisito:
 *   Instalar a extensão no Firebase Console:
 *   Extensions → Trigger Email from Firestore (firebase/firestore-send-email)
 *   Configurar SMTP (Gmail, SendGrid, etc) na instalação da extensão.
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const mailRef = collection(db, "mail");

const BASE_URL      = "https://www.atletismomg.org.br";
const PORTAL_LINK   = `${BASE_URL}/portal`;
const INTRANET_LINK = `${BASE_URL}/intranet`;
const SITE_LINK     = BASE_URL;

const FROM_FMA = "FMA - Federação Mineira de Atletismo <mg@cbat.org.br>";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function enviarEmail({ to, subject, html }) {
  try {
    await addDoc(mailRef, {
      to,
      message: { subject, html },
      from: FROM_FMA,
      createdAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (e) {
    console.error("EmailService:", e);
    return { ok: false, error: e.message };
  }
}

function templateBase(conteudo, rodape = "") {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
      <div style="background:#1a1a1a;padding:24px 32px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:900;letter-spacing:3px;">FMA</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.5);font-size:12px;">Federação Mineira de Atletismo</p>
      </div>
      <div style="padding:32px;line-height:1.6;color:#333;">
        ${conteudo}
      </div>
      <div style="background:#f8f8f8;padding:20px 32px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center;">
        ${rodape || `<a href="${SITE_LINK}" style="color:#cc0000;text-decoration:none;">atletismomg.org.br</a> — Federação Mineira de Atletismo`}
      </div>
    </div>
  `;
}

// Mapa de status para texto legível
const STATUS_LABELS = {
  rascunho:   "Rascunho",
  submetido:  "Submetido",
  enviada:    "Enviada",
  em_analise: "Em Análise",
  pendencia:  "Pendência",
  aprovado:   "Aprovado",
  aprovada:   "Aprovada",
  rejeitado:  "Rejeitado",
  rejeitada:  "Rejeitada",
  cancelado:  "Cancelado",
};

const STATUS_COLORS = {
  aprovado: "#15803d", aprovada: "#15803d",
  rejeitado: "#dc2626", rejeitada: "#dc2626",
  em_analise: "#0066cc", pendencia: "#b45309",
  enviada: "#0066cc", submetido: "#6b7280",
  cancelado: "#6b7280", rascunho: "#6b7280",
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. Notificação de Status de Solicitação (já existia)
// ═════════════════════════════════════════════════════════════════════════════

export async function notificarStatusSolicitacao({
  organizadorEmail, organizadorNome, protocolo, evento, status, observacao = "",
}) {
  const statusLabel = STATUS_LABELS[status] || status;
  const statusColor = STATUS_COLORS[status] || "#333";

  const html = templateBase(`
    <p>Olá, <strong>${organizadorNome}</strong>!</p>
    <p>Sua solicitação teve uma atualização de status:</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;width:130px;border:1px solid #eee;">Protocolo</td><td style="padding:10px 14px;border:1px solid #eee;">${protocolo}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Evento</td><td style="padding:10px 14px;border:1px solid #eee;">${evento}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Novo Status</td><td style="padding:10px 14px;border:1px solid #eee;"><span style="display:inline-block;padding:4px 14px;border-radius:20px;background:${statusColor}15;color:${statusColor};font-weight:700;">${statusLabel}</span></td></tr>
      ${observacao && observacao !== "—" ? `<tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Observação</td><td style="padding:10px 14px;border:1px solid #eee;">${observacao}</td></tr>` : ""}
    </table>
    <p>Acompanhe o andamento da sua solicitação no Portal do Organizador:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${PORTAL_LINK}" style="display:inline-block;padding:12px 28px;background:#0066cc;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Acessar o Portal</a>
    </p>
  `);

  return enviarEmail({
    to: organizadorEmail,
    subject: `[FMA] Solicitação ${protocolo} — ${statusLabel}`,
    html,
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. Notificação de Escalação de Árbitro (já existia)
// ═════════════════════════════════════════════════════════════════════════════

export async function notificarEscalacaoArbitro({
  arbitroEmail, arbitroNome, evento, data, local, funcao, observacao = "",
}) {
  const html = templateBase(`
    <p>Olá, <strong>${arbitroNome}</strong>!</p>
    <p>Você foi escalado(a) para um evento:</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;width:130px;border:1px solid #eee;">Evento</td><td style="padding:10px 14px;border:1px solid #eee;">${evento}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Data</td><td style="padding:10px 14px;border:1px solid #eee;">${data}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Local</td><td style="padding:10px 14px;border:1px solid #eee;">${local}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Função</td><td style="padding:10px 14px;border:1px solid #eee;">${funcao}</td></tr>
      ${observacao && observacao !== "—" ? `<tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Observação</td><td style="padding:10px 14px;border:1px solid #eee;">${observacao}</td></tr>` : ""}
    </table>
    <p>Acesse a Intranet para mais detalhes e confirmar sua disponibilidade:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${INTRANET_LINK}" style="display:inline-block;padding:12px 28px;background:#cc0000;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Acessar a Intranet</a>
    </p>
  `);

  return enviarEmail({
    to: arbitroEmail,
    subject: `[FMA] Escalação: ${evento} — ${data}`,
    html,
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. Ouvidoria — Confirmação + Notificação interna
// ═════════════════════════════════════════════════════════════════════════════

export async function enviarOuvidoria({
  nome, email, assunto, mensagem, anonimo = false,
}) {
  // Email de confirmação para o remetente
  const htmlConfirmacao = templateBase(`
    <p>Olá${!anonimo && nome ? `, <strong>${nome}</strong>` : ""}!</p>
    <p>Recebemos sua manifestação na Ouvidoria da FMA. Ela será analisada e respondida em até <strong>10 dias úteis</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;width:130px;border:1px solid #eee;">Assunto</td><td style="padding:10px 14px;border:1px solid #eee;">${assunto}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Mensagem</td><td style="padding:10px 14px;border:1px solid #eee;">${mensagem.replace(/\n/g, "<br>")}</td></tr>
    </table>
    <p style="font-size:13px;color:#666;">Caso precise complementar sua manifestação, responda diretamente a este e-mail ou entre em contato com <a href="mailto:mg@cbat.org.br" style="color:#cc0000;">mg@cbat.org.br</a>.</p>
  `);

  // Email interno para a FMA com a manifestação
  const htmlInterno = templateBase(`
    <h2 style="margin:0 0 16px;color:#cc0000;">Nova Manifestação — Ouvidoria</h2>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;width:130px;border:1px solid #eee;">Nome</td><td style="padding:10px 14px;border:1px solid #eee;">${anonimo ? "<em>Anônimo</em>" : (nome || "Não informado")}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">E-mail</td><td style="padding:10px 14px;border:1px solid #eee;">${email}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Assunto</td><td style="padding:10px 14px;border:1px solid #eee;">${assunto}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Mensagem</td><td style="padding:10px 14px;border:1px solid #eee;">${mensagem.replace(/\n/g, "<br>")}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Anônimo</td><td style="padding:10px 14px;border:1px solid #eee;">${anonimo ? "Sim" : "Não"}</td></tr>
    </table>
  `);

  const [r1, r2] = await Promise.all([
    enviarEmail({ to: email, subject: `[FMA] Ouvidoria — Recebemos sua manifestação`, html: htmlConfirmacao }),
    enviarEmail({ to: "mg@cbat.org.br", subject: `[Ouvidoria FMA] ${assunto}`, html: htmlInterno }),
  ]);

  return r1.ok && r2.ok ? { ok: true } : { ok: false, error: r1.error || r2.error };
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. Contato — Formulário público
// ═════════════════════════════════════════════════════════════════════════════

export async function enviarContato({
  nome, email, assunto, mensagem,
}) {
  // Confirmação para o remetente
  const htmlConfirmacao = templateBase(`
    <p>Olá, <strong>${nome}</strong>!</p>
    <p>Recebemos sua mensagem e responderemos o mais breve possível.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;width:130px;border:1px solid #eee;">Assunto</td><td style="padding:10px 14px;border:1px solid #eee;">${assunto}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Mensagem</td><td style="padding:10px 14px;border:1px solid #eee;">${mensagem.replace(/\n/g, "<br>")}</td></tr>
    </table>
    <p style="font-size:13px;color:#666;">Este é um e-mail automático. Para complementar sua mensagem, entre em contato diretamente com <a href="mailto:mg@cbat.org.br" style="color:#cc0000;">mg@cbat.org.br</a>.</p>
  `);

  // Email interno para a FMA
  const htmlInterno = templateBase(`
    <h2 style="margin:0 0 16px;color:#cc0000;">Nova Mensagem — Formulário de Contato</h2>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;width:130px;border:1px solid #eee;">Nome</td><td style="padding:10px 14px;border:1px solid #eee;">${nome}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">E-mail</td><td style="padding:10px 14px;border:1px solid #eee;">${email}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Assunto</td><td style="padding:10px 14px;border:1px solid #eee;">${assunto}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Mensagem</td><td style="padding:10px 14px;border:1px solid #eee;">${mensagem.replace(/\n/g, "<br>")}</td></tr>
    </table>
    <p style="text-align:center;">
      <a href="mailto:${email}" style="display:inline-block;padding:10px 24px;background:#0066cc;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Responder ${nome}</a>
    </p>
  `);

  const [r1, r2] = await Promise.all([
    enviarEmail({ to: email, subject: `[FMA] Recebemos sua mensagem`, html: htmlConfirmacao }),
    enviarEmail({ to: "mg@cbat.org.br", subject: `[Contato FMA] ${assunto}`, html: htmlInterno }),
  ]);

  return r1.ok && r2.ok ? { ok: true } : { ok: false, error: r1.error || r2.error };
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. Boas-vindas — Cadastro de Organizador
// ═════════════════════════════════════════════════════════════════════════════

export async function enviarBoasVindasOrganizador({
  email, nome, organizacao,
}) {
  const html = templateBase(`
    <p>Olá, <strong>${nome}</strong>!</p>
    <p>Bem-vindo(a) ao <strong>Portal de Organizadores</strong> da Federação Mineira de Atletismo!</p>
    <p>Sua conta foi criada com sucesso${organizacao ? ` para <strong>${organizacao}</strong>` : ""}. Agora você pode:</p>
    <ul style="margin:16px 0;padding-left:20px;">
      <li>Solicitar <strong>Permits</strong> e <strong>Chancelas</strong> para seus eventos</li>
      <li>Acompanhar o status das solicitações em tempo real</li>
      <li>Enviar documentos e comprovantes de pagamento</li>
      <li>Receber notificações sobre atualizações</li>
    </ul>
    <p style="text-align:center;margin:28px 0;">
      <a href="${PORTAL_LINK}" style="display:inline-block;padding:14px 32px;background:#0066cc;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">Acessar o Portal</a>
    </p>
    <p style="font-size:13px;color:#666;">Em caso de dúvidas, entre em contato com <a href="mailto:mg@cbat.org.br" style="color:#cc0000;">mg@cbat.org.br</a>.</p>
  `);

  return enviarEmail({
    to: email,
    subject: `[FMA] Bem-vindo ao Portal de Organizadores!`,
    html,
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. Notificação de Árbitro — Cadastro/Status
// ═════════════════════════════════════════════════════════════════════════════

export async function notificarArbitroCadastro({
  arbitroEmail, arbitroNome,
}) {
  const html = templateBase(`
    <p>Olá, <strong>${arbitroNome}</strong>!</p>
    <p>Seu cadastro na <strong>Intranet de Árbitros</strong> da FMA foi criado com sucesso.</p>
    <p>Através da Intranet você poderá:</p>
    <ul style="margin:16px 0;padding-left:20px;">
      <li>Visualizar suas <strong>escalações</strong> para eventos</li>
      <li>Informar sua <strong>disponibilidade</strong></li>
      <li>Atualizar seus <strong>dados pessoais</strong></li>
    </ul>
    <p style="text-align:center;margin:28px 0;">
      <a href="${INTRANET_LINK}" style="display:inline-block;padding:14px 32px;background:#cc0000;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">Acessar a Intranet</a>
    </p>
    <p style="font-size:13px;color:#666;">Em caso de dúvidas, entre em contato com a coordenação de árbitros.</p>
  `);

  return enviarEmail({
    to: arbitroEmail,
    subject: `[FMA] Bem-vindo à Intranet de Árbitros!`,
    html,
  });
}

export async function notificarArbitroStatus({
  arbitroEmail, arbitroNome, novoStatus,
}) {
  const statusLabels = { ativo: "Ativo", inativo: "Inativo", suspenso: "Suspenso" };
  const statusColors = { ativo: "#15803d", inativo: "#6b7280", suspenso: "#dc2626" };
  const label = statusLabels[novoStatus] || novoStatus;
  const color = statusColors[novoStatus] || "#333";

  const html = templateBase(`
    <p>Olá, <strong>${arbitroNome}</strong>!</p>
    <p>O status do seu cadastro de árbitro na FMA foi atualizado:</p>
    <p style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;padding:10px 28px;border-radius:24px;background:${color}15;color:${color};font-size:18px;font-weight:700;">${label}</span>
    </p>
    ${novoStatus === "ativo" ? `<p>Você está apto(a) a receber escalações para eventos. Acesse a Intranet para verificar sua disponibilidade.</p>` : ""}
    ${novoStatus === "suspenso" ? `<p>Durante a suspensão, você não receberá novas escalações. Em caso de dúvidas, entre em contato com a coordenação.</p>` : ""}
    <p style="text-align:center;margin:24px 0;">
      <a href="${INTRANET_LINK}" style="display:inline-block;padding:12px 28px;background:#cc0000;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Acessar a Intranet</a>
    </p>
  `);

  return enviarEmail({
    to: arbitroEmail,
    subject: `[FMA] Seu status de árbitro foi atualizado: ${label}`,
    html,
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. Notificações da Intranet
// ═════════════════════════════════════════════════════════════════════════════

export async function notificarAnuidade({ arbitroEmail, arbitroNome, ano, valor, status }) {
  const statusLabels = { pendente: "Pendente", vencido: "Vencida", pago: "Paga", isento: "Isento" };
  const html = templateBase(`
    <p>Ola, <strong>${arbitroNome}</strong>!</p>
    <p>Informamos sobre sua anuidade de arbitragem <strong>${ano}</strong>:</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;width:130px;border:1px solid #eee;">Ano</td><td style="padding:10px 14px;border:1px solid #eee;">${ano}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Valor</td><td style="padding:10px 14px;border:1px solid #eee;">R$ ${(valor || 0).toFixed(2)}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Status</td><td style="padding:10px 14px;border:1px solid #eee;">${statusLabels[status] || status}</td></tr>
    </table>
    <p>Acesse a Intranet para mais detalhes:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${INTRANET_LINK}" style="display:inline-block;padding:12px 28px;background:#cc0000;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Acessar a Intranet</a>
    </p>
  `);
  return enviarEmail({ to: arbitroEmail, subject: `[FMA] Anuidade ${ano} — ${statusLabels[status] || status}`, html });
}

export async function notificarMensagemRecebida({ arbitroEmail, arbitroNome, remetenteNome, titulo }) {
  const html = templateBase(`
    <p>Ola, <strong>${arbitroNome}</strong>!</p>
    <p>Voce recebeu uma nova mensagem na Intranet FMA:</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;width:130px;border:1px solid #eee;">De</td><td style="padding:10px 14px;border:1px solid #eee;">${remetenteNome}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Assunto</td><td style="padding:10px 14px;border:1px solid #eee;">${titulo}</td></tr>
    </table>
    <p style="text-align:center;margin:24px 0;">
      <a href="${INTRANET_LINK}" style="display:inline-block;padding:12px 28px;background:#cc0000;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Ver Mensagem</a>
    </p>
  `);
  return enviarEmail({ to: arbitroEmail, subject: `[FMA] Nova mensagem: ${titulo}`, html });
}

export async function notificarReembolso({ arbitroEmail, arbitroNome, status, categoria, valor, valorAprovado, motivo }) {
  const statusLabels = { aprovado: "Aprovado", aprovado_parcial: "Aprovado parcialmente", rejeitado: "Rejeitado" };
  const html = templateBase(`
    <p>Ola, <strong>${arbitroNome}</strong>!</p>
    <p>Seu pedido de reembolso foi atualizado:</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;width:130px;border:1px solid #eee;">Categoria</td><td style="padding:10px 14px;border:1px solid #eee;">${categoria}</td></tr>
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Valor solicitado</td><td style="padding:10px 14px;border:1px solid #eee;">R$ ${(valor || 0).toFixed(2)}</td></tr>
      ${valorAprovado != null ? `<tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Valor aprovado</td><td style="padding:10px 14px;border:1px solid #eee;">R$ ${(valorAprovado || 0).toFixed(2)}</td></tr>` : ""}
      <tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Status</td><td style="padding:10px 14px;border:1px solid #eee;">${statusLabels[status] || status}</td></tr>
      ${motivo ? `<tr><td style="padding:10px 14px;background:#f8f8f8;font-weight:700;border:1px solid #eee;">Motivo</td><td style="padding:10px 14px;border:1px solid #eee;">${motivo}</td></tr>` : ""}
    </table>
    <p style="text-align:center;margin:24px 0;">
      <a href="${INTRANET_LINK}" style="display:inline-block;padding:12px 28px;background:#cc0000;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Ver Detalhes</a>
    </p>
  `);
  return enviarEmail({ to: arbitroEmail, subject: `[FMA] Reembolso ${statusLabels[status] || status}: ${categoria}`, html });
}

export async function notificarAvaliacao({ arbitroEmail, arbitroNome, evento, nota }) {
  const html = templateBase(`
    <p>Ola, <strong>${arbitroNome}</strong>!</p>
    <p>Voce recebeu uma avaliacao de desempenho referente ao evento <strong>${evento}</strong>.</p>
    <p style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;padding:14px 32px;border-radius:12px;background:#f8f8f8;font-size:24px;font-weight:900;color:${nota >= 4 ? '#15803d' : nota >= 3 ? '#d97706' : '#dc2626'};">${nota}/5</span>
    </p>
    <p>Acesse a Intranet para ver os detalhes completos.</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${INTRANET_LINK}" style="display:inline-block;padding:12px 28px;background:#cc0000;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Acessar a Intranet</a>
    </p>
  `);
  return enviarEmail({ to: arbitroEmail, subject: `[FMA] Avaliacao de desempenho: ${evento}`, html });
}

export async function notificarDiariaPaga({ arbitroEmail, arbitroNome, evento, valor }) {
  const html = templateBase(`
    <p>Ola, <strong>${arbitroNome}</strong>!</p>
    <p>Sua diaria referente ao evento <strong>${evento}</strong> foi confirmada como paga.</p>
    <p style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;padding:14px 32px;border-radius:12px;background:#f0fdf4;font-size:20px;font-weight:900;color:#15803d;">R$ ${(valor || 0).toFixed(2)}</span>
    </p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${INTRANET_LINK}" style="display:inline-block;padding:12px 28px;background:#cc0000;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Acessar a Intranet</a>
    </p>
  `);
  return enviarEmail({ to: arbitroEmail, subject: `[FMA] Diaria paga: ${evento}`, html });
}
