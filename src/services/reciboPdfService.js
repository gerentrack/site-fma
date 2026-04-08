/**
 * FMA — Geração de PDF de Recibo de Pagamento
 *
 * Gera recibo formal com dados da FMA, pagador, evento, valor e número sequencial.
 * Usa jsPDF client-side.
 */

import { jsPDF } from "jspdf";
import { fmaLogo, calibriUrl, calibriBoldUrl } from "../assets/permits";

const MESES = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function dataExtenso(dateStr) {
  if (!dateStr) {
    const d = new Date();
    return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
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

  if (inteiro === 0) {
    // skip
  } else if (inteiro === 100) {
    partes.push("cem");
  } else {
    const milhar = Math.floor(inteiro / 1000);
    const resto = inteiro % 1000;
    if (milhar > 0) {
      if (milhar === 1) partes.push("mil");
      else partes.push(unidades[milhar] + " mil");
    }
    const c = Math.floor(resto / 100);
    const d = Math.floor((resto % 100) / 10);
    const u = resto % 10;
    if (c > 0) partes.push(centenas[c]);
    if (d === 1) partes.push(teens[u]);
    else {
      if (d > 0) partes.push(dezenas[d]);
      if (u > 0 && d !== 1) partes.push(unidades[u]);
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

/**
 * Gera PDF do recibo.
 * @param {object} dados
 * @param {string} dados.reciboNumero — ex: "REC-001/2026"
 * @param {number} dados.valor
 * @param {string} dados.tipo — "taxa_solicitacao" | "taxa_arbitragem" | "complemento"
 * @param {string} dados.natureza — "total" | "parcial" | "complemento"
 * @param {string} dados.pagadorNome
 * @param {string} dados.pagadorCpfCnpj
 * @param {string} dados.pagadorEndereco
 * @param {string} dados.nomeEvento
 * @param {string} dados.dataEvento
 * @param {string} dados.protocoloFMA
 * @param {string} dados.organizadorNome — titular do permit
 * @param {string} [dados.tipoSolicitacao] — "permit" | "chancela"
 * @param {string} [dados.assinaturaUrl] — URL da imagem da assinatura do presidente
 * @param {string} [dados.presidenteNome]
 * @param {string} [dados.presidenteCargo]
 * @returns {Promise<Blob>}
 */
export async function gerarReciboPdf(dados) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const ML = 25; // margin left
  const MR = 25;
  const CW = W - ML - MR; // content width

  // Fontes
  try {
    const [calibriData, calibriBoldData] = await Promise.all([
      imgToBase64(calibriUrl).then(d => d.split(",")[1]),
      imgToBase64(calibriBoldUrl).then(d => d.split(",")[1]),
    ]);
    pdf.addFileToVFS("calibri.ttf", calibriData);
    pdf.addFont("calibri.ttf", "Calibri", "normal");
    pdf.addFileToVFS("calibri-bold.ttf", calibriBoldData);
    pdf.addFont("calibri-bold.ttf", "Calibri", "bold");
    pdf.setFont("Calibri", "normal");
  } catch {
    pdf.setFont("helvetica", "normal");
  }

  let y = 20;

  // Logo
  try {
    const logoData = await imgToBase64(fmaLogo);
    const logoW = 40, logoH = 20;
    pdf.addImage(logoData, "PNG", (W - logoW) / 2, y, logoW, logoH);
    y += logoH + 5;
  } catch {
    y += 10;
  }

  // Header
  pdf.setFontSize(8);
  pdf.setTextColor(100);
  pdf.text("Federacao Mineira de Atletismo", W / 2, y, { align: "center" });
  y += 4;
  pdf.text("CNPJ: 16.681.223/0001-00", W / 2, y, { align: "center" });
  y += 4;
  pdf.text("Av. Olegario Maciel, 311 - Sala 205 - Centro - Belo Horizonte/MG - CEP 30.180-110", W / 2, y, { align: "center" });
  y += 12;

  // Linha separadora
  pdf.setDrawColor(200);
  pdf.setLineWidth(0.5);
  pdf.line(ML, y, W - MR, y);
  y += 10;

  // Titulo
  pdf.setFontSize(16);
  pdf.setTextColor(0);
  pdf.setFont(pdf.getFont().fontName, "bold");
  pdf.text("RECIBO DE PAGAMENTO", W / 2, y, { align: "center" });
  y += 8;

  // Numero
  pdf.setFontSize(12);
  pdf.setTextColor(180, 0, 0);
  pdf.text(dados.reciboNumero, W / 2, y, { align: "center" });
  y += 12;

  // Corpo
  pdf.setTextColor(0);
  pdf.setFont(pdf.getFont().fontName, "normal");
  pdf.setFontSize(11);

  const tipoLabels = {
    taxa_solicitacao: `Taxa de Solicitacao de ${dados.tipoSolicitacao === "chancela" ? "Chancela" : "Permit"} (Art. 7 - Regimento de Taxas 2026)`,
    taxa_arbitragem: "Taxa de Arbitragem (Art. 6 - Regimento de Taxas 2026)",
    complemento: "Complemento de pagamento",
  };

  const naturezaLabels = {
    total: "Pagamento integral",
    parcial: "Pagamento parcial",
    complemento: "Pagamento complementar",
  };

  const valorStr = formatarMoeda(dados.valor);
  const extenso = valorPorExtenso(dados.valor);

  // Texto principal
  const texto = `Recebemos de ${dados.pagadorNome}, inscrito no ${dados.pagadorCpfCnpj?.length > 11 ? "CNPJ" : "CPF"} sob o n. ${dados.pagadorCpfCnpj || "—"}, com endereco em ${dados.pagadorEndereco || "—"}, a importancia de ${valorStr} (${extenso}), referente a:`;

  const lines = pdf.splitTextToSize(texto, CW);
  pdf.text(lines, ML, y);
  y += lines.length * 5.5 + 8;

  // Detalhes em tabela
  pdf.setFont(pdf.getFont().fontName, "bold");
  const detalhes = [
    ["Referente a:", tipoLabels[dados.tipo] || dados.tipo],
    ["Natureza:", naturezaLabels[dados.natureza] || dados.natureza],
    ["Evento:", dados.nomeEvento || "—"],
    ["Data do evento:", dados.dataEvento ? dataExtenso(dados.dataEvento) : "—"],
    ["Protocolo FMA:", dados.protocoloFMA || "—"],
    ["Organizador:", dados.organizadorNome || "—"],
  ];

  for (const [label, value] of detalhes) {
    pdf.setFont(pdf.getFont().fontName, "bold");
    pdf.text(label, ML, y);
    pdf.setFont(pdf.getFont().fontName, "normal");
    pdf.text(value, ML + 38, y);
    y += 6;
  }

  y += 6;

  // Valor destaque
  pdf.setFillColor(245, 245, 245);
  pdf.roundedRect(ML, y - 4, CW, 14, 3, 3, "F");
  pdf.setFont(pdf.getFont().fontName, "bold");
  pdf.setFontSize(14);
  pdf.text(`Valor: ${valorStr}`, W / 2, y + 5, { align: "center" });
  y += 20;

  // Natureza parcial/complemento
  if (dados.natureza !== "total") {
    pdf.setFontSize(10);
    pdf.setTextColor(180, 100, 0);
    pdf.setFont(pdf.getFont().fontName, "bold");
    const aviso = dados.natureza === "parcial"
      ? "Este recibo refere-se a pagamento parcial. O saldo remanescente devera ser quitado para conclusao do processo."
      : "Este recibo refere-se a pagamento complementar, referente ao saldo remanescente de pagamento anterior.";
    const avisoLines = pdf.splitTextToSize(aviso, CW);
    pdf.text(avisoLines, ML, y);
    y += avisoLines.length * 4.5 + 8;
    pdf.setTextColor(0);
  }

  // Declaração
  pdf.setFontSize(10);
  pdf.setFont(pdf.getFont().fontName, "normal");
  const declaracao = "Para maior clareza, firmamos o presente recibo, que passa a ter validade apos a confirmacao do credito na conta da Federacao Mineira de Atletismo.";
  const declLines = pdf.splitTextToSize(declaracao, CW);
  pdf.text(declLines, ML, y);
  y += declLines.length * 4.5 + 14;

  // Local e data
  pdf.setFontSize(11);
  pdf.text(`Belo Horizonte/MG, ${dataExtenso()}`, W / 2, y, { align: "center" });
  y += 20;

  // Assinatura do presidente
  if (dados.assinaturaUrl) {
    try {
      const sigData = await imgToBase64(dados.assinaturaUrl);
      if (sigData) {
        pdf.addImage(sigData, "PNG", (W - 50) / 2, y - 8, 50, 20);
        y += 14;
      }
    } catch {}
  }

  // Linha para assinatura
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.3);
  const sigW = 70;
  pdf.line((W - sigW) / 2, y, (W + sigW) / 2, y);
  y += 5;
  pdf.setFontSize(9);
  pdf.setFont(pdf.getFont().fontName, "bold");
  pdf.text(dados.presidenteNome || "Federacao Mineira de Atletismo", W / 2, y, { align: "center" });
  y += 4;
  pdf.setFont(pdf.getFont().fontName, "normal");
  pdf.text(dados.presidenteCargo || "CNPJ: 16.681.223/0001-00", W / 2, y, { align: "center" });
  y += 4;
  pdf.text("CNPJ: 16.681.223/0001-00", W / 2, y, { align: "center" });

  return pdf.output("blob");
}
