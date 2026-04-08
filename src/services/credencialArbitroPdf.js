/**
 * FMA — Geração de Credencial/Carteirinha de Árbitro em PDF.
 * Página única: frente (esquerda) + verso (direita) com linha de dobra.
 * Imprimir, recortar, dobrar ao meio e plastificar.
 */
import { jsPDF } from "jspdf";
import { fmaLogo } from "../assets/permits";

const CW = 85.6; // largura do cartão
const CH = 54;    // altura do cartão
const GAP = 2;    // espaço entre frente e verso
const PAGE_W = CW * 2 + GAP;
const PAGE_H = CH;
const MARGIN = 0;

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

function formatCpf(cpf) {
  const d = (cpf || "").replace(/\D/g, "");
  if (d.length !== 11) return cpf || "";
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/**
 * @param {object} dados
 * @param {string} dados.nome
 * @param {string} dados.cpf
 * @param {string} dados.rg
 * @param {string} dados.nivel
 * @param {string} dados.registroCbat
 * @param {string} dados.fotoUrl
 * @param {string} dados.refereeId
 * @param {string} dados.siteUrl
 * @param {number} dados.validadeAno
 * @param {string} [dados.assinaturaUrl]
 * @param {string} [dados.presidenteNome]
 */
export async function gerarCredencialPdf(dados) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [PAGE_H, PAGE_W] });
  pdf.setFont("helvetica", "normal");

  // Borda de corte (linha fina cinza ao redor de tudo)
  pdf.setDrawColor(200);
  pdf.setLineWidth(0.2);
  pdf.rect(0, 0, CW, CH);
  pdf.rect(CW + GAP, 0, CW, CH);

  // Linha de dobra (tracejada no meio)
  pdf.setDrawColor(180);
  pdf.setLineWidth(0.15);
  pdf.setLineDashPattern([1.5, 1], 0);
  pdf.line(CW + GAP / 2, 2, CW + GAP / 2, CH - 2);
  pdf.setLineDashPattern([], 0);

  // Tesoura / instrução de dobra
  pdf.setFontSize(3);
  pdf.setTextColor(180);
  pdf.text("dobrar aqui", CW + GAP / 2, CH - 0.5, { align: "center" });

  // ════════════════════════════════════════════════════════════════════════════
  // FRENTE (lado esquerdo: 0 a CW)
  // ════════════════════════════════════════════════════════════════════════════
  const FL = 0; // frente left offset

  // Header escuro
  pdf.setFillColor(26, 26, 26);
  pdf.rect(FL, 0, CW, 18, "F");

  // Logo
  let logoData = null;
  try { logoData = await imgToBase64(fmaLogo); } catch {}
  if (logoData) pdf.addImage(logoData, "PNG", FL + 3, 2, 14, 7);

  pdf.setFontSize(5.5); pdf.setTextColor(255); pdf.setFont("helvetica", "bold");
  pdf.text("FEDERACAO MINEIRA DE ATLETISMO", FL + (logoData ? 19 : 3), 6);
  pdf.setFontSize(4); pdf.setFont("helvetica", "normal");
  pdf.text("CNPJ: 16.681.223/0001-00", FL + (logoData ? 19 : 3), 9.5);

  // Título
  pdf.setFontSize(7); pdf.setFont("helvetica", "bold"); pdf.setTextColor(204, 0, 0);
  pdf.text("CREDENCIAL DE ARBITRO", FL + 3, 15.5);

  // Barra vermelha
  pdf.setFillColor(204, 0, 0);
  pdf.rect(FL, 17.5, CW, 0.8, "F");

  // Foto
  const fotoX = FL + 3, fotoY = 20, fotoW = 16, fotoH = 21;
  pdf.setFillColor(230, 230, 230);
  pdf.rect(fotoX, fotoY, fotoW, fotoH, "F");
  if (dados.fotoUrl) {
    try {
      const fotoData = await imgToBase64(dados.fotoUrl);
      if (fotoData) pdf.addImage(fotoData, "JPEG", fotoX, fotoY, fotoW, fotoH);
    } catch {}
  } else {
    pdf.setFontSize(4); pdf.setTextColor(150);
    pdf.text("SEM FOTO", fotoX + 3, fotoY + 11);
  }

  // Dados
  const dataX = FL + 22;
  pdf.setTextColor(26, 26, 26);
  pdf.setFontSize(8); pdf.setFont("helvetica", "bold");
  const nomeLines = pdf.splitTextToSize(dados.nome || "", CW - 22 - 3);
  pdf.text(nomeLines, dataX, 23);

  let dy = 23 + nomeLines.length * 3.5 + 1;

  const nivelLabel = { A: "Nivel A", B: "Nivel B", C: "Nivel C", NI: "NI" }[dados.nivel] || dados.nivel;
  const nivelColor = { A: [204, 0, 0], B: [0, 102, 204], C: [0, 119, 51], NI: [107, 114, 128] }[dados.nivel] || [0, 0, 0];

  pdf.setFillColor(...nivelColor);
  pdf.roundedRect(dataX, dy - 2.5, 14, 4, 1, 1, "F");
  pdf.setFontSize(5.5); pdf.setTextColor(255); pdf.setFont("helvetica", "bold");
  pdf.text(nivelLabel, dataX + 7, dy, { align: "center" });

  dy += 5;
  pdf.setTextColor(26, 26, 26); pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.5);
  if (dados.registroCbat) {
    pdf.setFont("helvetica", "bold"); pdf.text("CBAT:", dataX, dy);
    pdf.setFont("helvetica", "normal"); pdf.text(dados.registroCbat, dataX + 10, dy);
  }

  // Validade
  pdf.setFontSize(5); pdf.setTextColor(100);
  pdf.text(`Validade: 12/${dados.validadeAno || new Date().getFullYear()}`, FL + 3, CH - 2);

  // Barra inferior frente
  pdf.setFillColor(204, 0, 0);
  pdf.rect(FL, CH - 1, CW, 1, "F");

  // ════════════════════════════════════════════════════════════════════════════
  // VERSO (lado direito: CW + GAP a PAGE_W)
  // ════════════════════════════════════════════════════════════════════════════
  const VL = CW + GAP; // verso left offset

  // Header
  pdf.setFillColor(26, 26, 26);
  pdf.rect(VL, 0, CW, 6, "F");
  pdf.setFontSize(5); pdf.setTextColor(255); pdf.setFont("helvetica", "bold");
  pdf.text("FEDERACAO MINEIRA DE ATLETISMO", VL + CW / 2, 4, { align: "center" });

  // Dados pessoais
  let vy = 10;
  pdf.setTextColor(26, 26, 26); pdf.setFontSize(5.5);
  for (const [label, value] of [["CPF:", formatCpf(dados.cpf)], ["RG:", dados.rg || "\u2014"]]) {
    pdf.setFont("helvetica", "bold"); pdf.text(label, VL + 3, vy);
    pdf.setFont("helvetica", "normal"); pdf.text(value, VL + 13, vy);
    vy += 4;
  }

  vy += 2;
  pdf.setFontSize(4.5); pdf.setTextColor(100);
  pdf.text("Federacao Mineira de Atletismo", VL + 3, vy); vy += 3;
  pdf.text("CNPJ: 16.681.223/0001-00", VL + 3, vy); vy += 3;
  pdf.text("Av. Olegario Maciel, 311 - Sala 205", VL + 3, vy); vy += 3;
  pdf.text("Centro - Belo Horizonte/MG", VL + 3, vy);

  // QR Code
  const qrUrl = `${dados.siteUrl || "https://fma.org.br"}/arbitros/${dados.refereeId}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}`;
  try {
    const qrData = await imgToBase64(qrApiUrl);
    if (qrData) {
      const qrSize = 18;
      pdf.addImage(qrData, "PNG", VL + CW - qrSize - 3, 9, qrSize, qrSize);
      pdf.setFontSize(3.5); pdf.setTextColor(100);
      pdf.text("Validar credencial", VL + CW - qrSize / 2 - 3, 9 + qrSize + 2.5, { align: "center" });
    }
  } catch {}

  // Assinatura
  if (dados.assinaturaUrl) {
    try {
      const sigData = await imgToBase64(dados.assinaturaUrl);
      if (sigData) pdf.addImage(sigData, "PNG", VL + 3, CH - 18, 25, 10);
    } catch {}
  }

  pdf.setDrawColor(0); pdf.setLineWidth(0.15);
  pdf.line(VL + 3, CH - 6, VL + 35, CH - 6);
  pdf.setFontSize(4); pdf.setTextColor(0); pdf.setFont("helvetica", "normal");
  pdf.text(dados.presidenteNome || "Presidente", VL + 3, CH - 3.5);
  pdf.setFontSize(3.5); pdf.setTextColor(100);
  pdf.text("Presidente - FMA", VL + 3, CH - 1.5);

  // Barra inferior verso
  pdf.setFillColor(204, 0, 0);
  pdf.rect(VL, CH - 1, CW, 1, "F");

  return {
    blob: pdf.output("blob"),
  };
}
