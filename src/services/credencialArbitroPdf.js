/**
 * FMA — Geração de Credencial/Carteirinha de Árbitro em PDF.
 * Formato cartão de crédito (85.6 x 54mm), frente e verso.
 * Usa jsPDF com Helvetica (sem fontes externas) + logo + foto + QR code.
 */
import { jsPDF } from "jspdf";
import { fmaLogo } from "../assets/permits";

const CARD_W = 85.6;
const CARD_H = 54;

const _cache = {};
async function imgToBase64(url) {
  if (!url) return null;
  if (_cache[url]) return _cache[url];
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => { _cache[url] = reader.result; resolve(reader.result); };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

function maskCpf(cpf) {
  const d = (cpf || "").replace(/\D/g, "");
  if (d.length !== 11) return cpf || "";
  return `${d.slice(0, 3)}.***.**-${d.slice(9)}`;
}

/**
 * @param {object} dados
 * @param {string} dados.nome
 * @param {string} dados.cpf
 * @param {string} dados.rg
 * @param {string} dados.nivel — "A" | "B" | "C" | "NI"
 * @param {string} dados.registroCbat
 * @param {string} dados.fotoUrl — URL da foto 3x4
 * @param {string} dados.refereeId — ID para QR code
 * @param {string} dados.siteUrl — base URL do site (ex: "https://fma.org.br")
 * @param {number} dados.validadeAno — ex: 2026
 * @param {string} [dados.assinaturaUrl]
 * @param {string} [dados.presidenteNome]
 */
export async function gerarCredencialPdf(dados) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [CARD_H, CARD_W] });
  pdf.setFont("helvetica", "normal");

  // ─── FRENTE ────────────────────────────────────────────────────────────────

  // Fundo
  pdf.setFillColor(26, 26, 26);
  pdf.rect(0, 0, CARD_W, 18, "F");

  // Logo no header
  let logoLoaded = false;
  try {
    const logoData = await imgToBase64(fmaLogo);
    if (logoData) {
      pdf.addImage(logoData, "PNG", 3, 2, 14, 7);
      logoLoaded = true;
    }
  } catch {}

  // Texto header
  pdf.setFontSize(5.5);
  pdf.setTextColor(255);
  pdf.setFont("helvetica", "bold");
  pdf.text("FEDERACAO MINEIRA DE ATLETISMO", logoLoaded ? 19 : 3, 6);
  pdf.setFontSize(4);
  pdf.setFont("helvetica", "normal");
  pdf.text("CNPJ: 16.681.223/0001-00", logoLoaded ? 19 : 3, 9.5);

  // Título
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(204, 0, 0);
  pdf.text("CREDENCIAL DE ARBITRO", 3, 15.5);

  // Barra vermelha
  pdf.setFillColor(204, 0, 0);
  pdf.rect(0, 17.5, CARD_W, 0.8, "F");

  // Foto
  const fotoX = 3, fotoY = 20, fotoW = 16, fotoH = 21;
  pdf.setFillColor(230, 230, 230);
  pdf.rect(fotoX, fotoY, fotoW, fotoH, "F");

  if (dados.fotoUrl) {
    try {
      const fotoData = await imgToBase64(dados.fotoUrl);
      if (fotoData) pdf.addImage(fotoData, "JPEG", fotoX, fotoY, fotoW, fotoH);
    } catch {}
  } else {
    pdf.setFontSize(4);
    pdf.setTextColor(150);
    pdf.text("SEM FOTO", fotoX + 3, fotoY + 11);
  }

  // Dados ao lado da foto
  const dataX = 22;
  pdf.setTextColor(26, 26, 26);

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  const nomeLines = pdf.splitTextToSize(dados.nome || "", CARD_W - dataX - 3);
  pdf.text(nomeLines, dataX, 23);

  let dataY = 23 + nomeLines.length * 3.5 + 1;

  pdf.setFontSize(6);
  pdf.setFont("helvetica", "normal");

  const nivelLabel = { A: "Nivel A", B: "Nivel B", C: "Nivel C", NI: "NI" }[dados.nivel] || dados.nivel;
  const nivelColor = { A: [204, 0, 0], B: [0, 102, 204], C: [0, 119, 51], NI: [107, 114, 128] }[dados.nivel] || [0, 0, 0];

  // Badge nível
  pdf.setFillColor(...nivelColor);
  pdf.roundedRect(dataX, dataY - 2.5, 14, 4, 1, 1, "F");
  pdf.setFontSize(5.5);
  pdf.setTextColor(255);
  pdf.setFont("helvetica", "bold");
  pdf.text(nivelLabel, dataX + 7, dataY, { align: "center" });

  dataY += 5;
  pdf.setTextColor(26, 26, 26);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(5.5);

  if (dados.registroCbat) {
    pdf.setFont("helvetica", "bold");
    pdf.text("CBAT:", dataX, dataY);
    pdf.setFont("helvetica", "normal");
    pdf.text(dados.registroCbat, dataX + 10, dataY);
    dataY += 3.5;
  }

  // Validade
  pdf.setFontSize(5);
  pdf.setTextColor(100);
  pdf.text(`Validade: 12/${dados.validadeAno || new Date().getFullYear()}`, 3, CARD_H - 2);

  // Barra inferior
  pdf.setFillColor(204, 0, 0);
  pdf.rect(0, CARD_H - 1, CARD_W, 1, "F");

  // ─── VERSO ─────────────────────────────────────────────────────────────────

  pdf.addPage([CARD_H, CARD_W], "landscape");

  // Fundo header
  pdf.setFillColor(26, 26, 26);
  pdf.rect(0, 0, CARD_W, 6, "F");
  pdf.setFontSize(5);
  pdf.setTextColor(255);
  pdf.setFont("helvetica", "bold");
  pdf.text("FEDERACAO MINEIRA DE ATLETISMO", CARD_W / 2, 4, { align: "center" });

  // Dados pessoais
  let vy = 10;
  pdf.setTextColor(26, 26, 26);
  pdf.setFontSize(5.5);

  const versoFields = [
    ["CPF:", maskCpf(dados.cpf)],
    ["RG:", dados.rg || "—"],
  ];

  for (const [label, value] of versoFields) {
    pdf.setFont("helvetica", "bold");
    pdf.text(label, 3, vy);
    pdf.setFont("helvetica", "normal");
    pdf.text(value, 13, vy);
    vy += 4;
  }

  vy += 2;

  // Info institucional
  pdf.setFontSize(4.5);
  pdf.setTextColor(100);
  pdf.text("Federacao Mineira de Atletismo", 3, vy);
  vy += 3;
  pdf.text("CNPJ: 16.681.223/0001-00", 3, vy);
  vy += 3;
  pdf.text("Av. Olegario Maciel, 311 - Sala 205", 3, vy);
  vy += 3;
  pdf.text("Centro - Belo Horizonte/MG", 3, vy);

  // QR Code (lado direito do verso)
  const qrUrl = `${dados.siteUrl || "https://fma.org.br"}/arbitros/${dados.refereeId}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}`;

  try {
    const qrData = await imgToBase64(qrApiUrl);
    if (qrData) {
      const qrSize = 18;
      pdf.addImage(qrData, "PNG", CARD_W - qrSize - 3, 9, qrSize, qrSize);
      pdf.setFontSize(3.5);
      pdf.setTextColor(100);
      pdf.text("Validar credencial", CARD_W - qrSize / 2 - 3, 9 + qrSize + 2.5, { align: "center" });
    }
  } catch {}

  // Assinatura
  if (dados.assinaturaUrl) {
    try {
      const sigData = await imgToBase64(dados.assinaturaUrl);
      if (sigData) pdf.addImage(sigData, "PNG", 3, CARD_H - 18, 25, 10);
    } catch {}
  }

  // Linha assinatura
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.15);
  pdf.line(3, CARD_H - 6, 35, CARD_H - 6);
  pdf.setFontSize(4);
  pdf.setTextColor(0);
  pdf.setFont("helvetica", "normal");
  pdf.text(dados.presidenteNome || "Presidente", 3, CARD_H - 3.5);
  pdf.setFontSize(3.5);
  pdf.setTextColor(100);
  pdf.text("Presidente - FMA", 3, CARD_H - 1.5);

  // Barra inferior
  pdf.setFillColor(204, 0, 0);
  pdf.rect(0, CARD_H - 1, CARD_W, 1, "F");

  return pdf.output("blob");
}
