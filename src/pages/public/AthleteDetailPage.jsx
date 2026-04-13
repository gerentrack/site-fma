/**
 * AthleteDetailPage.jsx
 * Página interna de um item de conteúdo da Central do Atleta.
 * Rota: /atletas/conteudo/:id
 *
 * Renderiza:
 *  - Hero com categoria + destaque + breadcrumb
 *  - Conteúdo HTML completo
 *  - Botão de download (se houver arquivo)
 *  - Botão/link externo (se houver)
 *  - Imagem (se houver)
 *  - Sidebar com metadados + navegação
 *  - Bloco de chamada para outros conteúdos da mesma categoria
 */
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";
import { AthleteContentService } from "../../services/index";
import { ATHLETE_CONTENT_CATEGORIES } from "../../config/navigation";
import PdfModal, { usePdfModal } from "../../components/ui/PdfModal";
import Icon from "../../utils/icons";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const catMap = Object.fromEntries(
  ATHLETE_CONTENT_CATEGORIES.filter(c => c.value).map(c => [c.value, c])
);

function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

// ─── Botão de download ────────────────────────────────────────────────────────

function DownloadButton({ href, label, onView }) {
  if (!href) return null;
  return (
    <button
      onClick={() => onView(href, label || "Documento")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "13px 24px",
        borderRadius: 8,
        background: COLORS.primary,
        color: "#fff",
        border: "none",
        cursor: "pointer",
        fontFamily: FONTS.heading,
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: 0.5,
        transition: "background 0.2s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "#990000")}
      onMouseLeave={e => (e.currentTarget.style.background = COLORS.primary)}
    >
      <Icon name="Download" size={18} />
      {label || "Visualizar Documento"}
    </button>
  );
}

// ─── Botão de link externo ────────────────────────────────────────────────────

function ExternalButton({ href }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "13px 24px",
        borderRadius: 8,
        border: `2px solid ${COLORS.primary}`,
        color: COLORS.primary,
        textDecoration: "none",
        fontFamily: FONTS.heading,
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: 0.5,
        background: "transparent",
        transition: "all 0.2s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = COLORS.primary;
        e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = COLORS.primary;
      }}
    >
      <Icon name="ExternalLink" size={18} />
      Acessar Link Externo
    </a>
  );
}

// ─── Card lateral de item relacionado ────────────────────────────────────────

function RelatedCard({ item }) {
  const cat = catMap[item.category] || {};
  return (
    <Link
      to={`/atletas/conteudo/${item.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 8,
          border: `1px solid ${COLORS.grayLight}`,
          background: "#fff",
          transition: "border-color 0.2s, box-shadow 0.2s",
          marginBottom: 8,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = cat.color || COLORS.primary;
          e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = COLORS.grayLight;
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.dark, lineHeight: 1.3 }}>
          {item.featured && <span style={{ color: "#f59e0b", marginRight: 4 }}><Icon name="Star" size={12} /></span>}
          {item.title}
        </div>
        {item.summary && (
          <div style={{
            fontFamily: FONTS.body, fontSize: 11.5, color: COLORS.gray, marginTop: 4, lineHeight: 1.4,
            overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>
            {item.summary}
          </div>
        )}
        <div style={{ marginTop: 6, display: "flex", gap: 4, fontSize: 12 }}>
          {item.fileUrl && <span title="Arquivo disponível"><Icon name="Download" size={12} /></span>}
          {item.externalLink && <span title="Link externo"><Icon name="ExternalLink" size={12} /></span>}
        </div>
      </div>
    </Link>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AthleteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem]       = useState(null);
  const [related, setRelated] = useState([]);
  const [status, setStatus]   = useState("loading"); // loading | ok | notfound
  const { pdfModal, openPdf, closePdf } = usePdfModal();

  useEffect(() => {
    setStatus("loading");
    setRelated([]);

    AthleteContentService.get(id).then(async (r) => {
      if (!r.data || r.data.status !== "published") {
        setStatus("notfound");
        return;
      }

      setItem(r.data);
      setStatus("ok");

      // Carrega outros itens da mesma categoria como relacionados
      const relResult = await AthleteContentService.list({
        publishedOnly: true,
        category: r.data.category,
      });

      if (relResult.data) {
        setRelated(relResult.data.filter(i => i.id !== r.data.id).slice(0, 4));
      }
    });
  }, [id]);

  // ── Loading ──
  if (status === "loading") {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>
        Carregando...
      </div>
    );
  }

  // ── Not found ──
  if (status === "notfound") {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <div style={{ marginBottom: 14 }}></div>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 28, color: COLORS.primary, textTransform: "uppercase", margin: "0 0 10px" }}>
          Conteúdo não encontrado
        </h1>
        <p style={{ fontFamily: FONTS.body, color: COLORS.gray, marginBottom: 24 }}>
          Este item pode ter sido removido ou ainda não foi publicado.
        </p>
        <Link
          to="/atletas"
          style={{ color: COLORS.primary, fontFamily: FONTS.heading, fontWeight: 700, textDecoration: "none" }}
        >
          ← Voltar à Central do Atleta
        </Link>
      </div>
    );
  }

  const cat = catMap[item.category] || { color: COLORS.primary, icon: "ClipboardList", label: item.category };

  return (
    <div>
      {/* ── Hero ── */}
      <div
        style={{
          background: item.image
            ? `linear-gradient(rgba(0,0,0,0.58), rgba(0,0,0,0.58)), url(${item.image}) center/cover`
            : `linear-gradient(135deg, #990000 0%, ${COLORS.primary} 100%)`,
          color: "#fff",
          padding: "52px 24px 44px",
          minHeight: 220,
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
          {/* Breadcrumb */}
          <nav style={{ fontSize: 12, marginBottom: 16, opacity: 0.8, fontFamily: FONTS.body }}>
            <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>Início</Link>
            {" / "}
            <Link to="/atletas" style={{ color: "#fff", textDecoration: "none" }}>Central do Atleta</Link>
            {" / "}
            <Link
              to={`/atletas?categoria=${item.category}`}
              style={{ color: "#fff", textDecoration: "none" }}
            >
              {cat.label}
            </Link>
            {" / "}
            <span style={{ opacity: 0.7 }}>{item.title}</span>
          </nav>

          {/* Badges */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{
              padding: "4px 13px", borderRadius: 20, fontSize: 11,
              fontFamily: FONTS.heading, fontWeight: 700,
              background: `${cat.color}cc`, color: "#fff",
            }}>
              <Icon name={cat.icon} size={12} /> {cat.label}
            </span>
            {item.featured && (
              <span style={{
                padding: "4px 13px", borderRadius: 20, fontSize: 11,
                fontFamily: FONTS.heading, fontWeight: 700,
                background: "#f59e0b", color: "#fff",
              }}>
                Destaque
              </span>
            )}
          </div>

          <h1 style={{
            fontFamily: FONTS.heading,
            fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 1,
            margin: "0 0 12px",
            lineHeight: 1.15,
          }}>
            {item.title}
          </h1>

          {item.summary && (
            <p style={{ fontFamily: FONTS.body, fontSize: 15, opacity: 0.88, margin: 0, maxWidth: 640 }}>
              {item.summary}
            </p>
          )}
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "48px 24px 60px",
        display: "grid",
        gridTemplateColumns: "1fr 300px",
        gap: 40,
        alignItems: "start",
      }}>

        {/* ── Coluna principal ── */}
        <div>

          {/* Texto completo */}
          {item.content && (
            <div style={{ marginBottom: 36 }}>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 15.5,
                  lineHeight: 1.85,
                  color: COLORS.dark,
                }}
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            </div>
          )}

          {/* Bloco de ações: download + link externo */}
          {(item.fileUrl || item.externalLink) && (
            <div style={{
              background: "#f7f7f7",
              borderRadius: 12,
              padding: "24px 28px",
              marginBottom: 32,
              borderLeft: `4px solid ${cat.color}`,
            }}>
              <h3 style={{
                fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark,
                margin: "0 0 16px",
              }}>
                {item.fileUrl && item.externalLink ? "Documentos & Links" : item.fileUrl ? "Documento" : "Link"}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {item.fileUrl && (
                  <DownloadButton href={item.fileUrl} label={item.fileLabel || "Visualizar Documento"} onView={openPdf} />
                )}
                {item.externalLink && (
                  <ExternalButton href={item.externalLink} />
                )}
              </div>
            </div>
          )}

          {/* Imagem standalone (quando não há conteúdo de texto) */}
          {item.image && !item.content && (
            <div style={{ marginBottom: 32 }}>
              <img
                src={item.image}
                alt={item.title}
                style={{ width: "100%", borderRadius: 12, boxShadow: "0 2px 16px rgba(0,0,0,0.1)" }}
              />
            </div>
          )}

          {/* Link de volta */}
          <div style={{ paddingTop: 24, borderTop: `1px solid ${COLORS.grayLight}` }}>
            <Link
              to={`/atletas?categoria=${item.category}`}
              style={{
                color: COLORS.primary,
                fontFamily: FONTS.heading,
                fontWeight: 700,
                fontSize: 13,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ← Ver todos os itens de "{cat.label}"
            </Link>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 80 }}>

          {/* Metadados */}
          <div style={{
            background: "#fff",
            borderRadius: 12,
            padding: "20px 18px",
            boxShadow: "0 2px 14px rgba(0,0,0,0.07)",
          }}>
            <h3 style={{
              fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: 1.5,
              color: COLORS.dark, margin: "0 0 16px",
              paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}`,
            }}>
              Informações
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Categoria */}
              <div>
                <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 4 }}>
                  Categoria
                </div>
                <span style={{
                  display: "inline-block",
                  padding: "3px 12px", borderRadius: 20, fontSize: 12,
                  fontFamily: FONTS.heading, fontWeight: 700,
                  background: `${cat.color}15`, color: cat.color,
                }}>
                  <Icon name={cat.icon} size={12} /> {cat.label}
                </span>
              </div>

              {/* Data de publicação */}
              {item.publishedAt && (
                <div>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 4 }}>
                    Publicado em
                  </div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark }}>
                    {fmtDate(item.publishedAt)}
                  </div>
                </div>
              )}

              {/* Links rápidos */}
              {(item.fileUrl || item.externalLink) && (
                <div>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 8 }}>
                    Acesso Rápido
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {item.fileUrl && (
                      <button
                        onClick={() => openPdf(item.fileUrl, item.fileLabel || "Documento")}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 7, background: `${COLORS.primary}10`, color: COLORS.primary, border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, width: "100%" }}
                      >
                        <Icon name="Download" size={14} /> {item.fileLabel || "Visualizar Documento"}
                      </button>
                    )}
                    {item.externalLink && (
                      <a
                        href={item.externalLink}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 7, background: `${COLORS.grayLight}`, color: COLORS.dark, textDecoration: "none", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}
                      >
                        <Icon name="ExternalLink" size={14} /> Acessar Link Externo
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Itens relacionados da mesma categoria */}
          {related.length > 0 && (
            <div style={{
              background: "#fff",
              borderRadius: 12,
              padding: "20px 18px",
              boxShadow: "0 2px 14px rgba(0,0,0,0.07)",
            }}>
              <h3 style={{
                fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: 1.5,
                color: COLORS.dark, margin: "0 0 14px",
                paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}`,
              }}>
                <Icon name={cat.icon} size={12} /> Outros em "{cat.label}"
              </h3>
              {related.map(r => (
                <RelatedCard key={r.id} item={r} />
              ))}
            </div>
          )}

          {/* CTA: voltar ao hub */}
          <Link
            to="/atletas"
            style={{
              display: "block",
              textAlign: "center",
              padding: "11px 0",
              borderRadius: 8,
              border: `1px solid ${COLORS.grayLight}`,
              color: COLORS.gray,
              textDecoration: "none",
              fontFamily: FONTS.heading,
              fontSize: 13,
              fontWeight: 600,
              background: "#fff",
            }}
          >
            ← Central do Atleta
          </Link>
        </div>
      </div>
      <PdfModal url={pdfModal.url} title={pdfModal.title} onClose={closePdf} />
    </div>
  );
}
