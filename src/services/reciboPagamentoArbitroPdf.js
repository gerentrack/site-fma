/**
 * FMA — Recibo de Pagamento ao Árbitro (diária + reembolsos).
 * PDF leve com Helvetica + logo.
 */
import { jsPDF } from "jspdf";
import { fmaLogo } from "../assets/permits";

const MESES = ["janeiro","fevereiro","marco","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
function dataExtenso() { const d = new Date(); return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; }
function fmt(v) { return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function maskCpf(cpf) {
  const d = (cpf || "").replace(/\D/g, "");
  if (d.length !== 11) return cpf || "";
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

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

/**
 * @param {object} dados
 * @param {string} dados.arbitroNome
 * @param {string} dados.arbitroCpf
 * @param {string} dados.funcao — ex: "Árbitro Chefe"
 * @param {string} dados.evento — nome do evento
 * @param {string} dados.dataEvento — YYYY-MM-DD
 * @param {string} dados.cidade
 * @param {number} dados.valorDiaria
 * @param {number} dados.transporte
 * @param {number} dados.hospedagem
 * @param {number} dados.alimentacao
 * @param {Array} dados.reembolsos — [{ categoria, descricao, valor }]
 * @param {string} [dados.assinaturaUrl] — assinatura do presidente FMA
 * @param {string} [dados.reciboAssinatura] — assinatura digital do árbitro (dataURL PNG)
 * @param {object} [dados.reciboEvidencia] — evidência da assinatura { refereeName, assinadoEm, baseLegal }
 */
export async function gerarReciboPagamentoArbitroPdf(dados) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, ML = 25, MR = 25, CW = W - ML - MR;
  pdf.setFont("helvetica", "normal");

  let y = 20;

  // Logo
  try {
    const logoData = await imgToBase64(fmaLogo);
    if (logoData) { pdf.addImage(logoData, "PNG", (W - 38) / 2, y, 38, 19); y += 24; }
    else y += 8;
  } catch { y += 8; }

  // Header
  pdf.setFontSize(8); pdf.setTextColor(100);
  pdf.text("Federacao Mineira de Atletismo", W / 2, y, { align: "center" }); y += 3.5;
  pdf.text("CNPJ: 16.681.223/0001-00", W / 2, y, { align: "center" }); y += 10;

  pdf.setDrawColor(180); pdf.setLineWidth(0.4); pdf.line(ML, y, W - MR, y); y += 10;

  // Título
  pdf.setFontSize(14); pdf.setTextColor(0); pdf.setFont("helvetica", "bold");
  pdf.text("RECIBO DE PAGAMENTO — ARBITRAGEM", W / 2, y, { align: "center" }); y += 12;

  // Dados do árbitro
  pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
  const campos = [
    ["Arbitro:", dados.arbitroNome],
    ["CPF:", maskCpf(dados.arbitroCpf)],
    ["Funcao:", dados.funcao || "—"],
    ["Evento:", dados.evento || "—"],
    ["Data:", dados.dataEvento ? new Date(dados.dataEvento + "T12:00:00").toLocaleDateString("pt-BR") : "—"],
    ["Local:", dados.cidade || "—"],
  ];
  for (const [label, value] of campos) {
    pdf.setFont("helvetica", "bold"); pdf.text(label, ML, y);
    pdf.setFont("helvetica", "normal"); pdf.text(value, ML + 25, y);
    y += 5.5;
  }
  y += 6;

  // Tabela de pagamentos
  pdf.setFillColor(245, 245, 245);
  pdf.rect(ML, y - 4, CW, 8, "F");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
  pdf.text("DESCRICAO", ML + 2, y);
  pdf.text("VALOR", W - MR - 2, y, { align: "right" });
  y += 8;

  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
  let total = 0;

  const linhas = [];
  if ((dados.valorDiaria || 0) > 0) linhas.push({ desc: `Diaria — ${dados.funcao || "Arbitragem"}`, valor: dados.valorDiaria });
  if ((dados.transporte || 0) > 0) linhas.push({ desc: "Transporte", valor: dados.transporte });
  if ((dados.hospedagem || 0) > 0) linhas.push({ desc: "Hospedagem", valor: dados.hospedagem });
  if ((dados.alimentacao || 0) > 0) linhas.push({ desc: "Alimentacao", valor: dados.alimentacao });

  // Reembolsos
  const CATS = { transporte: "Transporte", hospedagem: "Hospedagem", alimentacao: "Alimentacao", outro: "Outro" };
  (dados.reembolsos || []).forEach(r => {
    linhas.push({ desc: `Reembolso — ${CATS[r.categoria] || r.categoria}${r.descricao ? `: ${r.descricao}` : ""}`, valor: r.valor });
  });

  for (const l of linhas) {
    pdf.text(l.desc, ML + 2, y);
    pdf.text(fmt(l.valor), W - MR - 2, y, { align: "right" });
    total += l.valor;
    y += 6;
    pdf.setDrawColor(230); pdf.setLineWidth(0.2); pdf.line(ML, y - 2, W - MR, y - 2);
  }

  // Total
  y += 4;
  pdf.setFillColor(240, 253, 244);
  pdf.rect(ML, y - 5, CW, 10, "F");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
  pdf.text("TOTAL", ML + 2, y);
  pdf.text(fmt(total), W - MR - 2, y, { align: "right" });
  y += 16;

  // Declaração
  pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
  const decl = "Para maior clareza, firmamos o presente recibo referente aos servicos de arbitragem prestados no evento acima identificado.";
  const declLines = pdf.splitTextToSize(decl, CW);
  pdf.text(declLines, ML, y);
  y += declLines.length * 4 + 10;

  // Local e data
  pdf.setFontSize(10);
  pdf.text(`Belo Horizonte/MG, ${dataExtenso()}.`, W / 2, y, { align: "center" });
  y += 20;

  // Assinaturas — lado a lado
  const sigImgW = 45, sigImgH = 16;
  const colL = ML + 10; // centro coluna esquerda (presidente)
  const colR = W - MR - 10; // centro coluna direita (árbitro)
  const sigLineW = 60;

  // Assinatura do presidente (esquerda)
  if (dados.assinaturaUrl) {
    try {
      const sigData = await imgToBase64(dados.assinaturaUrl);
      if (sigData) pdf.addImage(sigData, "PNG", colL + (sigLineW - sigImgW) / 2 - sigLineW / 2, y + 4 - sigImgH, sigImgW, sigImgH);
    } catch {}
  }

  // Assinatura do árbitro (direita)
  if (dados.reciboAssinatura) {
    try {
      const arbSig = dados.reciboAssinatura.startsWith("data:") ? dados.reciboAssinatura : await imgToBase64(dados.reciboAssinatura);
      if (arbSig) pdf.addImage(arbSig, "PNG", colR - sigLineW / 2 + (sigLineW - sigImgW) / 2, y + 4 - sigImgH, sigImgW, sigImgH);
    } catch {}
  }

  y += 4;
  pdf.setDrawColor(0); pdf.setLineWidth(0.3);
  // Linha esquerda
  pdf.line(colL - sigLineW / 2, y, colL + sigLineW / 2, y);
  // Linha direita
  pdf.line(colR - sigLineW / 2, y, colR + sigLineW / 2, y);

  y += 4;
  pdf.setFontSize(8); pdf.setFont("helvetica", "normal"); pdf.setTextColor(80);
  pdf.text("Federacao Mineira de Atletismo", colL, y, { align: "center" });
  pdf.text(dados.arbitroNome || "Arbitro", colR, y, { align: "center" });

  // Evidência da assinatura digital
  if (dados.reciboEvidencia?.assinadoEm) {
    y += 12;
    pdf.setFontSize(7); pdf.setTextColor(150);
    pdf.text(`Assinatura eletronica simples (Lei 14.063/2020). Assinado em ${new Date(dados.reciboEvidencia.assinadoEm).toLocaleString("pt-BR")}.`, W / 2, y, { align: "center" });
  }

  return pdf.output("blob");
}
