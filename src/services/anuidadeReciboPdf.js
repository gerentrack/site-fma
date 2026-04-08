/**
 * FMA — Geração de PDF de Recibo de Anuidade
 *
 * Usa jsPDF com fonte Helvetica padrão + logo PNG.
 * Arquivo resultante ~20-30KB.
 */

import { jsPDF } from "jspdf";
import { fmaLogo } from "../assets/permits";

const MESES = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function dataExtenso(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatarMoeda(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

function valorPorExtenso(valor) {
  if (!valor || valor === 0) return "zero reais";
  const unidades = ["", "um", "dois", "tres", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const teens = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  const partes = [];
  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  if (inteiro === 100) {
    partes.push("cem");
  } else if (inteiro > 0) {
    const milhar = Math.floor(inteiro / 1000);
    const resto = inteiro % 1000;
    if (milhar > 0) partes.push(milhar === 1 ? "mil" : unidades[milhar] + " mil");
    const c = Math.floor(resto / 100);
    const d = Math.floor((resto % 100) / 10);
    const u = resto % 10;
    if (c > 0) partes.push(centenas[c]);
    if (d === 1) partes.push(teens[u]);
    else {
      if (d > 0) partes.push(dezenas[d]);
      if (u > 0) partes.push(unidades[u]);
    }
  }

  let texto = partes.join(" e ");
  if (inteiro === 1) texto += " real";
  else if (inteiro > 0) texto += " reais";

  if (centavos > 0) {
    if (inteiro > 0) texto += " e ";
    const d = Math.floor(centavos / 10);
    const u = centavos % 10;
    if (d === 1) texto += teens[u];
    else {
      if (d > 0) texto += dezenas[d];
      if (u > 0) texto += (d > 0 ? " e " : "") + unidades[u];
    }
    texto += centavos === 1 ? " centavo" : " centavos";
  }

  return texto;
}

const _cache = {};
async function imgToBase64(url) {
  if (_cache[url]) return _cache[url];
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => { _cache[url] = reader.result; resolve(reader.result); };
    reader.readAsDataURL(blob);
  });
}

function maskCpf(cpf) {
  const d = (cpf || "").replace(/\D/g, "");
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/**
 * Gera PDF do recibo de anuidade.
 * @param {object} dados
 * @param {string} dados.reciboNumero — ex: "REC-005/2026"
 * @param {string} dados.arbitroNome
 * @param {string} dados.arbitroCpf
 * @param {string} dados.arbitroNivel — "A" | "B" | "C" | "NI"
 * @param {number} dados.ano
 * @param {number} dados.valor
 * @param {string} dados.confirmadoEm — ISO date
 * @param {string} dados.confirmadoPor
 * @param {string} [dados.assinaturaUrl] — URL da imagem da assinatura do presidente
 * @param {string} [dados.presidenteNome]
 * @param {string} [dados.presidenteCargo]
 * @returns {Promise<Blob>}
 */
export async function gerarAnuidadeReciboPdf(dados) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const ML = 25;
  const MR = 25;
  const CW = W - ML - MR;

  pdf.setFont("helvetica", "normal");

  let y = 20;

  // Logo
  try {
    const logoData = await imgToBase64(fmaLogo);
    const logoW = 38, logoH = 19;
    pdf.addImage(logoData, "PNG", (W - logoW) / 2, y, logoW, logoH);
    y += logoH + 4;
  } catch {
    y += 8;
  }

  // Header institucional
  pdf.setFontSize(8);
  pdf.setTextColor(100);
  pdf.text("Federacao Mineira de Atletismo", W / 2, y, { align: "center" });
  y += 3.5;
  pdf.text("CNPJ: 16.681.223/0001-00", W / 2, y, { align: "center" });
  y += 3.5;
  pdf.text("Av. Olegario Maciel, 311 - Sala 205 - Centro - Belo Horizonte/MG - CEP 30.180-110", W / 2, y, { align: "center" });
  y += 10;

  // Linha
  pdf.setDrawColor(180);
  pdf.setLineWidth(0.4);
  pdf.line(ML, y, W - MR, y);
  y += 10;

  // Titulo
  pdf.setFontSize(15);
  pdf.setTextColor(0);
  pdf.setFont("helvetica", "bold");
  pdf.text("RECIBO DE PAGAMENTO DE ANUIDADE", W / 2, y, { align: "center" });
  y += 7;

  // Numero do recibo
  pdf.setFontSize(12);
  pdf.setTextColor(180, 0, 0);
  pdf.text(dados.reciboNumero || "", W / 2, y, { align: "center" });
  y += 12;

  // Dados do árbitro
  pdf.setTextColor(0);
  pdf.setFontSize(10);

  const rows = [
    ["Arbitro:", dados.arbitroNome || ""],
    ["CPF:", maskCpf(dados.arbitroCpf)],
    ["Nivel:", dados.arbitroNivel || "—"],
  ];

  pdf.setDrawColor(220);
  pdf.setLineWidth(0.3);
  pdf.line(ML, y - 3, W - MR, y - 3);
  y += 2;

  for (const [label, value] of rows) {
    pdf.setFont("helvetica", "bold");
    pdf.text(label, ML, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(value, ML + 28, y);
    y += 5.5;
  }

  pdf.line(ML, y, W - MR, y);
  y += 8;

  // Referente e valor
  const detalhes = [
    ["Referente:", `Anuidade de Arbitragem ${dados.ano}`],
    ["Valor:", `${formatarMoeda(dados.valor)} (${valorPorExtenso(dados.valor)})`],
    ["Status:", "PAGO"],
  ];

  for (const [label, value] of detalhes) {
    pdf.setFont("helvetica", "bold");
    pdf.text(label, ML, y);
    pdf.setFont("helvetica", "normal");
    const valLines = pdf.splitTextToSize(value, CW - 30);
    pdf.text(valLines, ML + 28, y);
    y += valLines.length * 4.5 + 2;
  }

  pdf.line(ML, y, W - MR, y);
  y += 8;

  // Confirmação
  if (dados.confirmadoEm) {
    pdf.setFont("helvetica", "bold");
    pdf.text("Confirmado em:", ML, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(new Date(dados.confirmadoEm).toLocaleDateString("pt-BR"), ML + 35, y);
    y += 5.5;
  }
  if (dados.confirmadoPor) {
    pdf.setFont("helvetica", "bold");
    pdf.text("Confirmado por:", ML, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(dados.confirmadoPor, ML + 35, y);
    y += 5.5;
  }

  y += 8;

  // Declaração
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  const declaracao = "Para maior clareza, firmamos o presente recibo, que passa a ter validade apos a confirmacao do credito na conta da Federacao Mineira de Atletismo.";
  const declLines = pdf.splitTextToSize(declaracao, CW);
  pdf.text(declLines, ML, y);
  y += declLines.length * 4 + 12;

  // Local e data
  pdf.setFontSize(10);
  pdf.text(`Belo Horizonte/MG, ${dataExtenso(dados.confirmadoEm)}`, W / 2, y, { align: "center" });
  y += 18;

  // Assinatura do presidente + linha
  const sigImgW = 50, sigImgH = 18;
  if (dados.assinaturaUrl) {
    try {
      const sigData = await imgToBase64(dados.assinaturaUrl);
      pdf.addImage(sigData, "PNG", (W - sigImgW) / 2, y + 4 - sigImgH, sigImgW, sigImgH);
    } catch {}
  }
  y += 4;
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.3);
  const sigW = 70;
  pdf.line((W - sigW) / 2, y, (W + sigW) / 2, y);

  return pdf.output("blob");
}
