/**
 * FMA — Geração de Credencial/Carteirinha de Árbitro em PDF.
 * Página A4 landscape com cartão (frente + verso) centralizado em tamanho real.
 * Imprimir em 100%, recortar, dobrar e plastificar.
 */
import { jsPDF } from "jspdf";
import { fmaLogo } from "../assets/permits";

const CW = 85.6; // largura do cartão (mm) — padrão ISO 7810 (cartão de crédito)
const CH = 54;    // altura do cartão (mm)
const GAP = 0.5;  // espaço para linha de dobra (mínimo)

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

export async function gerarCredencialPdf(dados) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  pdf.setFont("helvetica", "normal");

  const A4W = 297, A4H = 210;
  const totalW = CW * 2 + GAP;
  const ox = (A4W - totalW) / 2; // offset X para centralizar
  const oy = (A4H - CH) / 2;     // offset Y para centralizar

  // Instrução
  pdf.setFontSize(8); pdf.setTextColor(150);
  pdf.text("Imprima em tamanho real (100%), sem ajustar a pagina. Recorte, dobre e plastifique.", A4W / 2, oy - 8, { align: "center" });

  // Bordas de corte
  pdf.setDrawColor(200); pdf.setLineWidth(0.2);
  pdf.rect(ox, oy, CW, CH);
  pdf.rect(ox + CW + GAP, oy, CW, CH);

  // Linha de dobra tracejada
  pdf.setDrawColor(180); pdf.setLineWidth(0.15);
  pdf.setLineDashPattern([1.5, 1], 0);
  pdf.line(ox + CW + GAP / 2, oy + 2, ox + CW + GAP / 2, oy + CH - 2);
  pdf.setLineDashPattern([], 0);
  pdf.setFontSize(3); pdf.setTextColor(180);
  pdf.text("dobrar aqui", ox + CW + GAP / 2, oy + CH + 3, { align: "center" });

  // Pré-carregar logo
  let logoData = null;
  try { logoData = await imgToBase64(fmaLogo); } catch {}

  // ═══ FRENTE (esquerda) ═══
  const fx = ox, fy = oy;

  // Header escuro
  pdf.setFillColor(26, 26, 26);
  pdf.rect(fx, fy, CW, 18, "F");

  if (logoData) pdf.addImage(logoData, "PNG", fx + 3, fy + 2, 14, 7);
  pdf.setFontSize(5.5); pdf.setTextColor(255); pdf.setFont("helvetica", "bold");
  pdf.text("FEDERACAO MINEIRA DE ATLETISMO", fx + (logoData ? 19 : 3), fy + 6);
  pdf.setFontSize(4); pdf.setFont("helvetica", "normal");
  pdf.text("CNPJ: 16.681.223/0001-00", fx + (logoData ? 19 : 3), fy + 9.5);

  // Título
  pdf.setFontSize(7); pdf.setFont("helvetica", "bold"); pdf.setTextColor(204, 0, 0);
  pdf.text("CREDENCIAL DE ARBITRO", fx + 3, fy + 15.5);

  // Barra vermelha
  pdf.setFillColor(204, 0, 0);
  pdf.rect(fx, fy + 17.5, CW, 0.8, "F");

  // Foto
  const fotoX = fx + 3, fotoY = fy + 20, fotoW = 16, fotoH = 21;
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

  // Dados ao lado da foto
  const dataX = fx + 22;
  pdf.setTextColor(26, 26, 26);
  pdf.setFontSize(8); pdf.setFont("helvetica", "bold");
  const nomeLines = pdf.splitTextToSize(dados.nome || "", CW - 22 - 3);
  pdf.text(nomeLines, dataX, fy + 23);

  let dy = fy + 23 + nomeLines.length * 3.5 + 1;

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
  pdf.text(`Validade: 12/${dados.validadeAno || new Date().getFullYear()}`, fx + 3, fy + CH - 2);

  // Barra inferior frente
  pdf.setFillColor(204, 0, 0);
  pdf.rect(fx, fy + CH - 1, CW, 1, "F");

  // ═══ VERSO (direita) ═══
  const vx = ox + CW + GAP, vy0 = oy;

  // Header
  pdf.setFillColor(26, 26, 26);
  pdf.rect(vx, vy0, CW, 6, "F");
  pdf.setFontSize(5); pdf.setTextColor(255); pdf.setFont("helvetica", "bold");
  pdf.text("FEDERACAO MINEIRA DE ATLETISMO", vx + CW / 2, vy0 + 4, { align: "center" });

  // Dados pessoais
  let vy = vy0 + 10;
  pdf.setTextColor(26, 26, 26); pdf.setFontSize(5.5);
  for (const [label, value] of [["CPF:", formatCpf(dados.cpf)], ["RG:", dados.rg || "\u2014"]]) {
    pdf.setFont("helvetica", "bold"); pdf.text(label, vx + 3, vy);
    pdf.setFont("helvetica", "normal"); pdf.text(value, vx + 13, vy);
    vy += 4;
  }

  vy += 2;
  pdf.setFontSize(4.5); pdf.setTextColor(100);
  pdf.text("Federacao Mineira de Atletismo", vx + 3, vy); vy += 3;
  pdf.text("CNPJ: 16.681.223/0001-00", vx + 3, vy); vy += 3;
  pdf.text("Av. Olegario Maciel, 311 - Sala 205", vx + 3, vy); vy += 3;
  pdf.text("Centro - Belo Horizonte/MG", vx + 3, vy);

  // QR Code
  const qrUrl = `${dados.siteUrl || "https://fma.org.br"}/arbitros/${dados.refereeId}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}`;
  try {
    const qrData = await imgToBase64(qrApiUrl);
    if (qrData) {
      const qrSize = 18;
      pdf.addImage(qrData, "PNG", vx + CW - qrSize - 3, vy0 + 9, qrSize, qrSize);
      pdf.setFontSize(3.5); pdf.setTextColor(100);
      pdf.text("Validar credencial", vx + CW - qrSize / 2 - 3, vy0 + 9 + qrSize + 2.5, { align: "center" });
    }
  } catch {}

  // Assinatura
  if (dados.assinaturaUrl) {
    try {
      const sigData = await imgToBase64(dados.assinaturaUrl);
      if (sigData) pdf.addImage(sigData, "PNG", vx + 3, vy0 + CH - 18, 25, 10);
    } catch {}
  }

  pdf.setDrawColor(0); pdf.setLineWidth(0.15);
  pdf.line(vx + 3, vy0 + CH - 6, vx + 35, vy0 + CH - 6);
  pdf.setFontSize(4); pdf.setTextColor(0); pdf.setFont("helvetica", "normal");
  pdf.text(dados.presidenteNome || "Presidente", vx + 3, vy0 + CH - 3.5);
  pdf.setFontSize(3.5); pdf.setTextColor(100);
  pdf.text("Presidente - FMA", vx + 3, vy0 + CH - 1.5);

  // Barra inferior verso
  pdf.setFillColor(204, 0, 0);
  pdf.rect(vx, vy0 + CH - 1, CW, 1, "F");

  return { blob: pdf.output("blob") };
}
