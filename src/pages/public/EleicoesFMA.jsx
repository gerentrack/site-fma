/**
 * EleicoesFMA.jsx — Portal da Transparência: Eleições FMA.
 *
 * Rota: /transparencia/eleicoes
 *
 * Lógica:
 *   - Busca documentos da categoria "eleicao" no DocumentsService
 *   - Agrupa automaticamente por ano (campo date → YYYY)
 *   - Exibe anos em ordem decrescente com separadores visuais
 *   - Cada documento: título, data, botão de download/link
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DocumentsService } from "../../services/index";
import { COLORS, FONTS } from "../../styles/colors";
import PdfModal, { usePdfModal } from "../../components/ui/PdfModal";

// ─── Utilitários ──────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function extBadge(url) {
  if (!url) return null;
  const ext = (url.split(".").pop() || "").toUpperCase().slice(0, 4);
  const colors = { PDF: "#cc0000", DOC: "#0066cc", DOCX: "#0066cc", XLS: "#007733", XLSX: "#007733" };
  return { label: ext || "ARQ", color: colors[ext] || "#6b7280" };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <>
      <style>{`@keyframes sh{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ height: 64, borderRadius: 10,
            background: "linear-gradient(135deg,#f0f0f0,#e8e8e8)",
            animation: "sh 1.5s ease-in-out infinite" }} />
        ))}
      </div>
    </>
  );
}

// ─── Item de documento ────────────────────────────────────────────────────────

function DocItem({ doc, onViewPdf }) {
  const [hov, setHov] = useState(false);
  const badge = extBadge(doc.fileUrl);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 18px", borderRadius: 10,
        background: hov ? "#fff8f8" : "#fff",
        border: `1.5px solid ${hov ? "#fecaca" : COLORS.grayLight}`,
        transition: "all 0.15s",
      }}
    >
      {/* Ícone */}
      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        background: badge ? `${badge.color}11` : "#f3f4f6",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18,
      }}>
        🗳️
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700,
          color: hov ? COLORS.primary : COLORS.dark,
          textTransform: "uppercase", letterSpacing: 0.3,
          transition: "color 0.15s",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {doc.title}
        </div>
        {(doc.description || doc.date) && (
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
            {doc.date && <span>📅 {fmtDate(doc.date)}</span>}
            {doc.description && <span> — {doc.description}</span>}
          </div>
        )}
      </div>

      {/* Badge + Botão */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {badge && (
          <span style={{
            padding: "2px 8px", borderRadius: 5,
            fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800,
            background: badge.color, color: "#fff",
          }}>
            {badge.label}
          </span>
        )}
        {doc.fileUrl ? (
          <button onClick={() => onViewPdf(doc.fileUrl, doc.title)}
            style={{
              padding: "7px 16px", borderRadius: 8,
              background: COLORS.primary, color: "#fff", border: "none",
              fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700,
              cursor: "pointer",
              textTransform: "uppercase", letterSpacing: 0.5,
            }}>
            📄 Visualizar
          </button>
        ) : (
          <span style={{
            padding: "7px 16px", borderRadius: 8,
            background: COLORS.grayLight, color: COLORS.gray,
            fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700,
            textTransform: "uppercase",
          }}>
            Em breve
          </span>
        )}
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function EleicoesFMA() {
  const [docs,    setDocs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const { pdfModal, openPdf, closePdf } = usePdfModal();

  useEffect(() => {
    document.title = "Eleições | Portal da Transparência FMA";
    DocumentsService.list({ publishedOnly: true }).then(r => {
      if (!r.error) {
        // Filtra categoria "eleicao"
        const eleicoes = r.data.filter(d => d.category === "eleicao");
        setDocs(eleicoes);
      }
      setLoading(false);
    });
  }, []);

  // Agrupa por ano (descendente)
  const porAno = docs.reduce((acc, doc) => {
    const ano = doc.date ? doc.date.slice(0, 4) : "Sem data";
    if (!acc[ano]) acc[ano] = [];
    acc[ano].push(doc);
    return acc;
  }, {});

  const anos = Object.keys(porAno).sort((a, b) => b.localeCompare(a));

  return (
    <>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 60%, #1a1a2e 100%)",
        padding: "52px 0 44px", marginBottom: 40,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 32px" }}>
          {/* Breadcrumb */}
          <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 2,
            color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
            <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>FMA</Link>
            {" › "}
            <span style={{ color: "rgba(255,255,255,0.6)" }}>Portal da Transparência</span>
            {" › "}
            <span style={{ color: COLORS.primaryLight }}>Eleições</span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 32, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                <span style={{ fontSize: 40 }}>🗳️</span>
                <h1 style={{
                  fontFamily: FONTS.heading, fontSize: "clamp(2rem,5vw,3rem)",
                  fontWeight: 900, color: "#fff", margin: 0,
                  textTransform: "uppercase", letterSpacing: 2,
                }}>
                  Eleições FMA
                </h1>
              </div>
              <p style={{ fontFamily: FONTS.body, fontSize: 15,
                color: "rgba(255,255,255,0.6)", margin: 0, maxWidth: 520 }}>
                Documentos relativos aos processos eleitorais da Federação Mineira de Atletismo,
                organizados por ano de realização.
              </p>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: "clamp(2.4rem,6vw,4rem)",
                fontWeight: 900, color: COLORS.primary, lineHeight: 1 }}>
                {docs.length}
              </div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 1.5,
                color: "rgba(255,255,255,0.4)" }}>
                documento{docs.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 32px 72px" }}>
        {loading ? (
          <Skeleton />
        ) : docs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 24px",
            background: "#fff", borderRadius: 16,
            border: `1.5px dashed ${COLORS.grayLight}` }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗳️</div>
            <p style={{ fontFamily: FONTS.heading, fontSize: 16,
              fontWeight: 700, color: COLORS.gray, margin: "0 0 8px" }}>
              Nenhum documento de eleição publicado ainda.
            </p>
            <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.grayMid, margin: 0 }}>
              Os documentos são disponibilizados conforme os processos eleitorais ocorrem.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {anos.map(ano => (
              <section key={ano}>
                {/* Separador de ano */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                  <div style={{
                    fontFamily: FONTS.heading,
                    fontSize: "clamp(2rem,5vw,3rem)",
                    fontWeight: 900, color: COLORS.primary,
                    lineHeight: 1, flexShrink: 0,
                  }}>
                    {ano}
                  </div>
                  <div style={{ flex: 1, height: 2,
                    background: `linear-gradient(to right, ${COLORS.primary}44, transparent)` }} />
                  <span style={{
                    fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: 1,
                    color: COLORS.gray,
                  }}>
                    {porAno[ano].length} doc{porAno[ano].length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Documentos do ano */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {porAno[ano].map(doc => <DocItem key={doc.id} doc={doc} onViewPdf={openPdf} />)}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Link para documentos gerais */}
        <div style={{ marginTop: 48, paddingTop: 24,
          borderTop: `1px solid ${COLORS.grayLight}` }}>
          <Link to="/documentos"
            style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700,
              color: COLORS.gray, textDecoration: "none" }}>
            ← Ver todos os documentos institucionais
          </Link>
        </div>
      </div>
      <PdfModal url={pdfModal.url} title={pdfModal.title} onClose={closePdf} />
    </>
  );
}
