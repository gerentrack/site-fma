/**
 * FMA — Geração de Declaração/Certificado de Árbitro em PDF.
 * Admin gera com dados do árbitro, nível e assinatura do presidente.
 */
import { jsPDF } from "jspdf";
import { fmaLogo } from "../assets/permits";

const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
function dataExtenso() { const d = new Date(); return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; }

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
 * @param {object} dados
 * @param {string} dados.nome
 * @param {string} dados.cpf
 * @param {string} dados.nivel
 * @param {string} dados.registroCbat
 * @param {string} [dados.assinaturaUrl]
 * @param {string} [dados.presidenteNome]
 * @param {string} [dados.presidenteCargo]
 */
export async function gerarDeclaracaoArbitroPdf(dados) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, ML = 25, MR = 25, CW = W - ML - MR;
  pdf.setFont("helvetica", "normal");

  let y = 20;

  // Logo
  try {
    const logoData = await imgToBase64(fmaLogo);
    pdf.addImage(logoData, "PNG", (W - 38) / 2, y, 38, 19);
    y += 24;
  } catch { y += 8; }

  // Header
  pdf.setFontSize(8); pdf.setTextColor(100);
  pdf.text("Federacao Mineira de Atletismo", W / 2, y, { align: "center" }); y += 3.5;
  pdf.text("CNPJ: 16.681.223/0001-00", W / 2, y, { align: "center" }); y += 3.5;
  pdf.text("Av. Olegario Maciel, 311 - Sala 205 - Centro - Belo Horizonte/MG - CEP 30.180-110", W / 2, y, { align: "center" }); y += 12;

  pdf.setDrawColor(180); pdf.setLineWidth(0.4); pdf.line(ML, y, W - MR, y); y += 14;

  // Título
  pdf.setFontSize(16); pdf.setTextColor(0); pdf.setFont("helvetica", "bold");
  pdf.text("DECLARACAO", W / 2, y, { align: "center" }); y += 14;

  // Corpo
  pdf.setFontSize(11); pdf.setFont("helvetica", "normal");
  const nivelLabel = { A: "Nivel A", B: "Nivel B", C: "Nivel C", NI: "NI" }[dados.nivel] || dados.nivel;

  const texto = `Declaramos, para os devidos fins, que ${dados.nome}, inscrito(a) no CPF sob o n. ${maskCpf(dados.cpf)}, e arbitro(a) registrado(a) junto a Federacao Mineira de Atletismo, classificado(a) no ${nivelLabel}${dados.registroCbat ? `, com registro CBAT n. ${dados.registroCbat}` : ""}.`;

  const lines = pdf.splitTextToSize(texto, CW);
  pdf.text(lines, ML, y); y += lines.length * 5.5 + 8;

  const texto2 = "O(a) referido(a) arbitro(a) encontra-se em situacao regular perante esta Federacao, apto(a) a atuar em competicoes oficiais de atletismo no ambito estadual e nacional.";
  const lines2 = pdf.splitTextToSize(texto2, CW);
  pdf.text(lines2, ML, y); y += lines2.length * 5.5 + 8;

  const texto3 = "Por ser verdade, firmamos a presente declaracao.";
  pdf.text(texto3, ML, y); y += 16;

  // Local e data
  pdf.text(`Belo Horizonte/MG, ${dataExtenso()}.`, W / 2, y, { align: "center" }); y += 24;

  // Assinatura + linha
  const sigImgW = 50, sigImgH = 18;
  if (dados.assinaturaUrl) {
    try {
      const sigData = await imgToBase64(dados.assinaturaUrl);
      pdf.addImage(sigData, "PNG", (W - sigImgW) / 2, y + 4 - sigImgH, sigImgW, sigImgH);
    } catch {}
  }
  y += 4;
  pdf.setDrawColor(0); pdf.setLineWidth(0.3);
  const sigW = 70;
  pdf.line((W - sigW) / 2, y, (W + sigW) / 2, y);

  return pdf.output("blob");
}
