/**
 * RefereeDetailPage.jsx — Página interna de conteúdo público de árbitro.
 * Rota: /arbitros/conteudo/:id
 */
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";
import { RefereeContentService } from "../../services/index";
import { REFEREE_CONTENT_CATEGORIES } from "../../config/navigation";

const catMap = Object.fromEntries(
  REFEREE_CONTENT_CATEGORIES.filter(c => c.value).map(c => [c.value, c])
);

export default function RefereeDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    setStatus("loading");
    RefereeContentService.get(id).then(async r => {
      if (!r.data || r.data.status !== "published") { setStatus("notfound"); return; }
      setItem(r.data);
      setStatus("ok");
      const rel = await RefereeContentService.list({ publishedOnly: true, category: r.data.category });
      if (rel.data) setRelated(rel.data.filter(i => i.id !== r.data.id).slice(0, 4));
    });
  }, [id]);

  if (status === "loading") return <div style={{ padding: "80px 24px", textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>⏳ Carregando...</div>;
  if (status === "notfound") return (
    <div style={{ padding: "80px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>⚖️</div>
      <h1 style={{ fontFamily: FONTS.heading, fontSize: 28, color: COLORS.primary, textTransform: "uppercase" }}>Conteúdo não encontrado</h1>
      <p style={{ fontFamily: FONTS.body, color: COLORS.gray, marginBottom: 24 }}>Este item foi removido ou não está publicado.</p>
      <Link to="/arbitros" style={{ color: COLORS.primary, fontFamily: FONTS.heading, fontWeight: 700, textDecoration: "none" }}>← Voltar à Central do Árbitro</Link>
    </div>
  );

  const cat = catMap[item.category] || { color: COLORS.primary, icon: "📋", label: item.category };

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: item.image
          ? `linear-gradient(rgba(0,0,0,0.6),rgba(0,0,0,0.6)) ,url(${item.image}) center/cover`
          : "linear-gradient(135deg,#1a1a1a 0%,#3a3a3a 100%)",
        color: "#fff", padding: "52px 24px 44px", minHeight: 200, display: "flex", alignItems: "flex-end",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
          <nav style={{ fontSize: 12, marginBottom: 14, opacity: 0.75, fontFamily: FONTS.body }}>
            <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>Início</Link>{" / "}
            <Link to="/arbitros" style={{ color: "#fff", textDecoration: "none" }}>Árbitros</Link>{" / "}
            <Link to={`/arbitros?categoria=${item.category}`} style={{ color: "#fff", textDecoration: "none" }}>{cat.label}</Link>{" / "}
            <span style={{ opacity: 0.7 }}>{item.title}</span>
          </nav>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: `${cat.color}cc`, color: "#fff" }}>{cat.icon} {cat.label}</span>
            {item.featured && <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: "#f59e0b", color: "#fff" }}>⭐ Destaque</span>}
          </div>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px", lineHeight: 1.15 }}>{item.title}</h1>
          {item.summary && <p style={{ fontFamily: FONTS.body, fontSize: 15, opacity: 0.88, margin: 0, maxWidth: 640 }}>{item.summary}</p>}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 60px", display: "grid", gridTemplateColumns: "1fr 290px", gap: 40, alignItems: "start" }}>
        <div>
          {item.content && (
            <div style={{ fontFamily: FONTS.body, fontSize: 15.5, lineHeight: 1.85, color: COLORS.dark, marginBottom: 32 }}
              dangerouslySetInnerHTML={{ __html: item.content }} />
          )}
          {(item.fileUrl || item.externalLink) && (
            <div style={{ background: "#f7f7f7", borderRadius: 12, padding: "22px 26px", marginBottom: 28, borderLeft: `4px solid ${cat.color}` }}>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: "0 0 14px" }}>
                {item.fileUrl && item.externalLink ? "Documentos & Links" : item.fileUrl ? "Documento" : "Link"}
              </h3>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {item.fileUrl && (
                  <a href={item.fileUrl} target="_blank" rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 8, background: COLORS.primary, color: "#fff", textDecoration: "none", fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700 }}>
                    📎 {item.fileLabel || "Baixar Documento"}
                  </a>
                )}
                {item.externalLink && (
                  <a href={item.externalLink} target="_blank" rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 8, border: `2px solid ${COLORS.primary}`, color: COLORS.primary, textDecoration: "none", fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700 }}>
                    🔗 Acessar Link Externo
                  </a>
                )}
              </div>
            </div>
          )}
          <div style={{ paddingTop: 20, borderTop: `1px solid ${COLORS.grayLight}` }}>
            <Link to={`/arbitros?categoria=${item.category}`} style={{ color: COLORS.primary, fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              ← Ver todos em "{cat.label}"
            </Link>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 80 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "18px 16px", boxShadow: "0 2px 14px rgba(0,0,0,0.07)" }}>
            <h3 style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: "0 0 14px", paddingBottom: 8, borderBottom: `1px solid ${COLORS.grayLight}` }}>Informações</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 4 }}>Categoria</div>
                <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontFamily: FONTS.heading, fontWeight: 700, background: `${cat.color}15`, color: cat.color }}>{cat.icon} {cat.label}</span>
              </div>
              {item.publishedAt && (
                <div>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 4 }}>Publicado em</div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark }}>{new Date(item.publishedAt + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</div>
                </div>
              )}
              {(item.fileUrl || item.externalLink) && (
                <div>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 6 }}>Acesso Rápido</div>
                  {item.fileUrl && <a href={item.fileUrl} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 7, background: `${COLORS.primary}10`, color: COLORS.primary, textDecoration: "none", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📎 {item.fileLabel || "Baixar"}</a>}
                  {item.externalLink && <a href={item.externalLink} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 7, background: COLORS.grayLight, color: COLORS.dark, textDecoration: "none", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>🔗 Link Externo</a>}
                </div>
              )}
            </div>
          </div>

          {related.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: "18px 16px", boxShadow: "0 2px 14px rgba(0,0,0,0.07)" }}>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: "0 0 12px", paddingBottom: 8, borderBottom: `1px solid ${COLORS.grayLight}` }}>{cat.icon} Outros em "{cat.label}"</h3>
              {related.map(r => (
                <Link key={r.id} to={`/arbitros/conteudo/${r.id}`} style={{ textDecoration: "none", display: "block", marginBottom: 8 }}>
                  <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, transition: "border-color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = cat.color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.grayLight}>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: COLORS.dark, lineHeight: 1.3 }}>{r.title}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <Link to="/arbitros" style={{ display: "block", textAlign: "center", padding: "10px 0", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, color: COLORS.gray, textDecoration: "none", fontFamily: FONTS.heading, fontSize: 13, background: "#fff" }}>
            ← Central do Árbitro
          </Link>
          <Link to="/intranet" style={{ display: "block", textAlign: "center", padding: "10px 0", borderRadius: 8, background: COLORS.dark, color: "#fff", textDecoration: "none", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
            🔐 Acessar Intranet
          </Link>
        </div>
      </div>
    </div>
  );
}
