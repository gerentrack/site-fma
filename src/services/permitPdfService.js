/**
 * FMA — Geração de PDFs de Permit e Chancela
 *
 * Usa jsPDF para gerar PDFs client-side idênticos ao modelo Word.
 * Cada PDF contém: fundo, logo FMA (topo), número, dados do evento e assinatura.
 *
 * Layout baseado no modelo Word (A4 portrait, 210×297mm):
 *   ┌─────────────────────────────┐
 *   │              [Logo FMA]     │  ← topo, acima do badge
 *   │                             │
 *   │     PERMIT BRONZE           │  ← fundo (badge)
 *   │     CORRIDA DE RUA          │
 *   │                             │
 *   │                             │
 *   │      Nº 001/2026            │
 *   │                             │
 *   │  O presente "Permit" da ... │
 *   │       ORGANIZADOR           │
 *   │  Realizar o evento ...      │
 *   │                             │
 *   │  Evento:   Nome do evento   │
 *   │  Percurso: 10km             │
 *   │  Data:     20 de abril ...  │
 *   │  Local:    Cidade - MG      │
 *   │                             │
 *   │  Belo Horizonte, dd/MM/yyyy │
 *   │      [Assinatura]           │
 *   └─────────────────────────────┘
 */

import { jsPDF } from "jspdf";
import { permitBg, chancelaBg, fmaLogo, assinatura, calibriUrl, calibriBoldUrl } from "../assets/permits";

/* ── Helpers ──────────────────────────────────────────────────────────── */

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "2026-04-12" → "12 de abril de 2026" */
export function formatarDataPorExtenso(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

/** "2026-04-04" → "04/04/2026" */
function formatarDataCurta(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

const _cache = {};
async function imgToBase64(url) {
  if (_cache[url]) return _cache[url];
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      _cache[url] = reader.result;
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
}

/** Converte URL de font (ttf) para ArrayBuffer base64 string para jsPDF. */
async function fontToBase64(url) {
  if (_cache["font_" + url]) return _cache["font_" + url];
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  _cache["font_" + url] = b64;
  return b64;
}

/** Pré-carrega todas as imagens e fontes em paralelo. */
export async function preloadAssets() {
  await Promise.all([
    imgToBase64(permitBg),
    imgToBase64(chancelaBg),
    imgToBase64(fmaLogo),
    imgToBase64(assinatura),
    fontToBase64(calibriUrl),
    fontToBase64(calibriBoldUrl),
  ]);
}

/** Registra fonte Calibri no jsPDF doc. */
async function registerCalibri(doc) {
  const regular = await fontToBase64(calibriUrl);
  const bold = await fontToBase64(calibriBoldUrl);
  doc.addFileToVFS("Calibri.ttf", regular);
  doc.addFileToVFS("Calibri-Bold.ttf", bold);
  doc.addFont("Calibri.ttf", "Calibri", "normal");
  doc.addFont("Calibri-Bold.ttf", "Calibri", "bold");
}

/* ── Geração de PDF ───────────────────────────────────────────────────── */

const PAGE_W = 210;
const PAGE_H = 297;

async function gerarPdf(dados, tipo) {
  const { numero, organizador, nomeEvento, modalidade, dataEvento, cidadeEvento, dataEmissao } = dados;

  const doc = new jsPDF("p", "mm", "a4");
  await registerCalibri(doc);

  // ── 1. Fundo cobrindo página inteira ──
  const bg = await imgToBase64(tipo === "chancela" ? chancelaBg : permitBg);
  doc.addImage(bg, "PNG", 0, 0, PAGE_W, PAGE_H);

  // ── 2. Logo FMA centralizada no topo (acima do badge PERMIT BRONZE) ──
  const logo = await imgToBase64(fmaLogo);
  // Logo FMA: 1064x500px → ratio 2.13:1 → 50mm x 23mm, centralizada
  doc.addImage(logo, "PNG", (PAGE_W - 48) / 2, 5, 48, 22);

  // ── 3. Número "Nº XXX/YYYY" — Calibri 26 bold ──
  // Chancela tem badge menor, informações sobem mais
  const numY = tipo === "chancela" ? 98 : 118;
  doc.setFont("Calibri", "bold");
  doc.setFontSize(26);
  doc.setTextColor(51, 51, 51);
  doc.text(`N\u00BA ${numero}`, PAGE_W / 2, numY, { align: "center" });

  // ── 4. Texto de autorização ──
  let y = numY + 14;

  doc.setFont("Calibri", "normal");
  doc.setFontSize(11);
  doc.setTextColor(51, 51, 51);

  const frase = tipo === "chancela"
    ? 'A presente "Chancela" da Federação Mineira de Atletismo garante a'
    : 'O presente "Permit" da Federação Mineira de Atletismo garante a';
  doc.text(frase, PAGE_W / 2, y, { align: "center" });
  y += 8;

  // Organizador (bold, maior)
  doc.setFont("Calibri", "bold");
  doc.setFontSize(12);
  doc.text(organizador, PAGE_W / 2, y, { align: "center", maxWidth: 160 });
  y += 8;

  // Complemento
  doc.setFont("Calibri", "normal");
  doc.setFontSize(11);
  doc.text(
    "Realizar o evento atlético abaixo, dentro das Regras da WA e Normas da CBAt e FMA:",
    PAGE_W / 2, y, { align: "center", maxWidth: 160 },
  );
  y += 12;

  // ── 5. Dados do evento (alinhados à esquerda, como no Word) ──
  const marginL = 25;
  const lineH = 10;

  doc.setFontSize(11);

  // Evento: Valor (label normal, valor bold)
  doc.setFont("Calibri", "normal");
  doc.text("Evento: ", marginL, y);
  doc.setFont("Calibri", "bold");
  const evtX = marginL + doc.getTextWidth("Evento: ");
  const nomeLines = doc.splitTextToSize(nomeEvento, PAGE_W - evtX - 30);
  doc.text(nomeLines, evtX, y);
  y += lineH * Math.max(1, nomeLines.length);

  // Percurso
  doc.setFont("Calibri", "normal");
  doc.text("Percurso: ", marginL, y);
  doc.setFont("Calibri", "bold");
  doc.text(modalidade, marginL + doc.getTextWidth("Percurso: "), y);
  y += lineH;

  // Data
  doc.setFont("Calibri", "normal");
  doc.text("Data: ", marginL, y);
  doc.setFont("Calibri", "bold");
  doc.text(formatarDataPorExtenso(dataEvento), marginL + doc.getTextWidth("Data: "), y);
  y += lineH;

  // Local
  doc.setFont("Calibri", "normal");
  doc.text("Local: ", marginL, y);
  doc.setFont("Calibri", "bold");
  doc.text(`${cidadeEvento} - MG`, marginL + doc.getTextWidth("Local: "), y);

  // ── 6. Rodapé (relativo ao conteúdo) ──
  y += 14;
  doc.setFontSize(11);
  doc.setFont("Calibri", "normal");
  doc.text(`Belo Horizonte, ${formatarDataCurta(dataEmissao)}`, marginL, y);

  // Assinatura (500x500px = quadrado → 30x30mm)
  const sig = await imgToBase64(assinatura);
  doc.addImage(sig, "PNG", 75, y - 12, 60, 60);

  return doc.output("blob");
}

/** Gera PDF de Permit. */
export async function gerarPermitPdf(dados) {
  return gerarPdf(dados, "permit");
}

/** Gera PDF de Chancela. */
export async function gerarChancelaPdf(dados) {
  return gerarPdf(dados, "chancela");
}
