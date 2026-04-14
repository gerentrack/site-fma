/**
 * NewsDetailPage.jsx — Página interna completa de uma notícia.
 * Rota: /noticias/:slug
 *
 * Funcionalidades:
 *  - SEO: document.title + meta description (via useEffect sobre <head>)
 *  - Hero com imagem de capa em parallax leve e gradiente
 *  - Metadados: data, autor, categoria, tempo de leitura
 *  - Conteúdo HTML completo renderizado com dangerouslySetInnerHTML
 *  - Tags clicáveis (redirecionam para listagem filtrada)
 *  - Galeria de fotos com lightbox inline
 *  - Botão de compartilhamento (copia link)
 *  - Bloco de notícias relacionadas (3 cards, algoritmo de relevância via newsAPI.getRelated)
 *  - Breadcrumb estruturado
 *  - 404 elegante quando slug não encontrado
 */
import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";
import { NewsService } from "../../services/index";
import NewsCard from "../../components/ui/NewsCard";
import { NEWS_CATEGORIES } from "../../config/navigation";
import Icon from "../../utils/icons";
import DOMPurify from "dompurify";

const catMap = Object.fromEntries(NEWS_CATEGORIES.filter(c => c.value).map(c => [c.value, c]));

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function readingTime(html = "") {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text.split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// ── SEO: injeta/atualiza title e meta description no <head> ──────────────────
function useSEO({ title, description, image }) {
  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = `${title} — FMA Notícias`;

    // meta description
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); }
    const prevMeta = meta.content;
    if (description) meta.content = description;

    // og:title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) { ogTitle = document.createElement("meta"); ogTitle.setAttribute("property", "og:title"); document.head.appendChild(ogTitle); }
    ogTitle.content = title;

    // og:description
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) { ogDesc = document.createElement("meta"); ogDesc.setAttribute("property", "og:description"); document.head.appendChild(ogDesc); }
    if (description) ogDesc.content = description;

    // og:image
    let ogImg = document.querySelector('meta[property="og:image"]');
    if (!ogImg) { ogImg = document.createElement("meta"); ogImg.setAttribute("property", "og:image"); document.head.appendChild(ogImg); }
    if (image) ogImg.content = image;

    return () => {
      document.title = prev;
      if (meta) meta.content = prevMeta;
    };
  }, [title, description, image]);
}

// ── Estilos de prosa para conteúdo HTML do CMS ─────────────────────────────────
// Injeta via <style> no mount para aplicar sobre o HTML dinâmico do artigo.
const PROSE_CSS = `
  .fma-prose { font-family: 'Barlow', sans-serif; font-size: 16px; line-height: 1.9; color: #1a1a1a; }
  .fma-prose h2 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.6rem; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.5px; margin: 2.2em 0 0.8em;
    padding-bottom: 10px; border-bottom: 2px solid #e8e8e8; color: #1a1a1a; }
  .fma-prose h3 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.25rem; font-weight: 700;
    margin: 1.8em 0 0.6em; color: #1a1a1a; }
  .fma-prose p { margin: 0 0 1.2em; }
  .fma-prose strong { font-weight: 700; color: #1a1a1a; }
  .fma-prose em { font-style: italic; }
  .fma-prose a { color: #cc0000; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
  .fma-prose a:hover { color: #990000; }
  .fma-prose ul, .fma-prose ol { margin: 0 0 1.4em 0; padding-left: 1.6em; }
  .fma-prose li { margin-bottom: 0.5em; }
  .fma-prose ul li { list-style-type: disc; }
  .fma-prose ol li { list-style-type: decimal; }
  .fma-prose blockquote { margin: 1.8em 0; padding: 18px 24px; border-left: 4px solid #cc0000;
    background: #fff5f5; border-radius: 0 8px 8px 0; font-style: italic; color: #3a3a3a; }
  .fma-prose blockquote p { margin: 0; }
  .fma-prose img { max-width: 100%; border-radius: 10px; margin: 1.4em 0; }
  .fma-prose table { width: 100%; border-collapse: collapse; margin: 1.4em 0; font-size: 14px; }
  .fma-prose th { background: #cc0000; color: #fff; padding: 10px 14px; text-align: left;
    font-family: 'Barlow Condensed', sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .fma-prose td { padding: 9px 14px; border-bottom: 1px solid #e8e8e8; }
  .fma-prose tr:nth-child(even) td { background: #fafafa; }
  .fma-prose hr { border: none; border-top: 2px solid #e8e8e8; margin: 2.4em 0; }
`;

function useProseStyles() {
  useEffect(() => {
    const id = "fma-prose-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = PROSE_CSS;
    document.head.appendChild(style);
    return () => { const el = document.getElementById(id); if (el) el.remove(); };
  }, []);
}

// ── Galeria com lightbox ──────────────────────────────────────────────────────
function Gallery({ images }) {
  const [open, setOpen] = useState(null); // índice da imagem aberta

  if (!images || images.length === 0) return null;
  return (
    <div style={{ marginTop: 48 }}>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.dark, margin: "0 0 16px", paddingBottom: 12, borderBottom: `2px solid ${COLORS.primary}` }}>
        <Icon name="Camera" size={14} /> Galeria de Fotos ({images.length})
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
        {images.map((src, i) => (
          <div key={i} onClick={() => setOpen(i)}
            style={{ height: 150, borderRadius: 10, overflow: "hidden", cursor: "zoom-in", background: COLORS.grayLight, transition: "transform 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.16)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
            <img src={src} alt={`Foto ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {open !== null && (
        <div onClick={() => setOpen(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <button onClick={e => { e.stopPropagation(); setOpen(o => (o - 1 + images.length) % images.length); }}
            style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", borderRadius: 8, padding: "10px 16px" }}>‹</button>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: "88vw", maxHeight: "88vh" }}>
            <img src={images[open]} alt={`Foto ${open + 1}`} style={{ maxWidth: "100%", maxHeight: "88vh", objectFit: "contain", borderRadius: 10 }} />
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", fontFamily: FONTS.body, fontSize: 12, marginTop: 10 }}>{open + 1} / {images.length}</div>
          </div>
          <button onClick={e => { e.stopPropagation(); setOpen(o => (o + 1) % images.length); }}
            style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", borderRadius: 8, padding: "10px 16px" }}>›</button>
          <button onClick={() => setOpen(null)} style={{ position: "absolute", top: 16, right: 20, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", borderRadius: 8, padding: "8px 12px" }}>✕</button>
        </div>
      )}
    </div>
  );
}

// ── Bloco de relacionadas ─────────────────────────────────────────────────────
function RelatedNews({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginTop: 64, paddingTop: 40, borderTop: `2px solid ${COLORS.grayLight}` }}>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.dark, margin: "0 0 24px" }}>
        <Icon name="Newspaper" size={14} /> Notícias Relacionadas
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 22 }}>
        {items.map(item => <NewsCard key={item.id} item={item} showTags />)}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function NewsDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [news, setNews] = useState(null);
  const [related, setRelated] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | notfound
  const [copied, setCopied] = useState(false);
  useProseStyles();

  const load = useCallback(async () => {
    setStatus("loading");
    const r = await NewsService.get(slug);
    if (r.error || !r.data) { setStatus("notfound"); return; }
    if (!r.data.published) { setStatus("notfound"); return; }
    setNews(r.data);
    setStatus("ok");
    // Carregar relacionadas
    const rel = await NewsService.getRelated({ excludeId: r.data.id, category: r.data.category, tags: r.data.tags, limit: 3 });
    if (rel.data) setRelated(rel.data);
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  // SEO
  const seoTitle = news?.title || "";
  const seoDesc  = news?.metaDescription || news?.excerpt || "";
  useSEO({ title: seoTitle, description: seoDesc, image: news?.image || "" });

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f7f7" }}>
        <div style={{ textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>
          <div style={{ marginBottom: 12 }}></div>
          Carregando notícia...
        </div>
      </div>
    );
  }

  // ── 404 ──────────────────────────────────────────────────────────────────────
  if (status === "notfound") {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f7f7" }}>
        <div style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ marginBottom: 16 }}></div>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 32, fontWeight: 900, textTransform: "uppercase", color: COLORS.primary, margin: "0 0 12px" }}>
            Notícia não encontrada
          </h1>
          <p style={{ fontFamily: FONTS.body, color: COLORS.gray, marginBottom: 28 }}>
            Esta notícia não existe ou foi removida.
          </p>
          <Link to="/noticias" style={{ display: "inline-block", padding: "12px 26px", borderRadius: 8, background: COLORS.primary, color: "#fff", textDecoration: "none", fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700 }}>
            ← Ver todas as notícias
          </Link>
        </div>
      </div>
    );
  }

  const cat = catMap[news.category] || { label: "Notícia", color: COLORS.primary, icon: "Newspaper" };
  const gallery = Array.isArray(news.gallery) ? news.gallery : [];
  const tags = Array.isArray(news.tags) ? news.tags : [];
  const mins = readingTime(news.content || "");

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: news.title, url }); }
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    } catch { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); }
  };

  return (
    <div style={{ background: "#f7f7f7", minHeight: "100vh" }}>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div style={{
        background: news.image
          ? `linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.78)), url(${news.image}) center/cover fixed`
          : `linear-gradient(135deg, ${cat.color} 0%, #1a1a1a 100%)`,
        color: "#fff", padding: "60px 24px 52px", minHeight: 360, display: "flex", alignItems: "flex-end",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
          {/* Breadcrumb */}
          <nav style={{ fontSize: 12, marginBottom: 16, opacity: 0.7, fontFamily: FONTS.body }}>
            <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>Início</Link>{" / "}
            <Link to="/noticias" style={{ color: "#fff", textDecoration: "none" }}>Notícias</Link>{" / "}
            <Link to={`/noticias?categoria=${news.category}`} style={{ color: cat.color, textDecoration: "none" }}>{cat.label}</Link>{" / "}
            <span style={{ opacity: 0.65 }}>{news.title.slice(0, 48)}{news.title.length > 48 ? "…" : ""}</span>
          </nav>

          {/* Badges */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <Link to={`/noticias?categoria=${news.category}`} style={{ padding: "4px 14px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: cat.color, color: "#fff", textDecoration: "none", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon name={cat.icon} size={12} /> {cat.label}
            </Link>
            {news.featured && (
              <span style={{ padding: "4px 14px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: "#f59e0b", color: "#fff" }}>Destaque</span>
            )}
          </div>

          {/* Título */}
          <h1 style={{ fontFamily: FONTS.heading, fontSize: "clamp(1.8rem,3.5vw,3rem)", fontWeight: 900, margin: "0 0 18px", lineHeight: 1.15, textTransform: "uppercase", maxWidth: 900 }}>
            {news.title}
          </h1>

          {/* Metadados */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontFamily: FONTS.body, fontSize: 13, opacity: 0.85, alignItems: "center" }}>
            {news.date && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Calendar" size={14} /> {fmt(news.date)}</span>}
            {news.author && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Pencil" size={14} /> {news.author}</span>}
            {news.content && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Clock" size={14} /> {mins} min de leitura</span>}
            {gallery.length > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Camera" size={14} /> {gallery.length} foto{gallery.length > 1 ? "s" : ""}</span>}
          </div>
        </div>
      </div>

      {/* ── Corpo ──────────────────────────────────────────────────────────── */}
      <div className="grid-stack-mobile" style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px", display: "grid", gridTemplateColumns: "1fr 300px", gap: 44, alignItems: "start" }}>

        {/* ── Artigo ────────────────────────────────────────────────────────── */}
        <article>
          {/* Excerpt destacado */}
          {news.excerpt && (
            <p style={{ fontFamily: FONTS.body, fontSize: 18, lineHeight: 1.7, color: COLORS.grayDark, borderLeft: `4px solid ${cat.color}`, paddingLeft: 20, margin: "0 0 36px", fontStyle: "italic" }}>
              {news.excerpt}
            </p>
          )}

          {/* Conteúdo HTML */}
          {news.content ? (
            <div
              className="fma-prose"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(news.content) }}
            />
          ) : (
            <p style={{ fontFamily: FONTS.body, color: COLORS.gray, fontStyle: "italic" }}>Esta notícia não tem conteúdo completo.</p>
          )}

          {/* Galeria */}
          <Gallery images={gallery} />

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${COLORS.grayLight}` }}>
              <span style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, marginRight: 12 }}>Tags:</span>
              {tags.map(tag => (
                <Link key={tag} to={`/noticias?tag=${encodeURIComponent(tag)}`}
                  style={{ display: "inline-block", margin: "4px 6px 4px 0", padding: "4px 12px", borderRadius: 20, background: COLORS.grayLight, color: COLORS.grayDark, fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textDecoration: "none", transition: "background 0.15s, color 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = cat.color; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = COLORS.grayLight; e.currentTarget.style.color = COLORS.grayDark; }}>
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Share */}
          <div style={{ marginTop: 32, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray }}>Compartilhar:</span>
            <button onClick={share}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, background: copied ? "#007733" : COLORS.dark, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, transition: "background 0.2s" }}>
              {copied ? "Link copiado!" : "Copiar link"}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(news.title + " — " + window.location.href)}`} target="_blank" rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, background: "#25d366", color: "#fff", textDecoration: "none", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
              WhatsApp
            </a>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(news.title)}&url=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, background: "#000", color: "#fff", textDecoration: "none", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
              𝕏 Twitter
            </a>
          </div>

          {/* Relacionadas */}
          <RelatedNews items={related} />
        </article>

        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <aside style={{ position: "sticky", top: 80, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Info da notícia */}
          <div style={{ background: "#fff", borderRadius: 12, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <h3 style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.dark, margin: "0 0 16px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>
              Sobre esta notícia
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Categoria", value: <Link to={`/noticias?categoria=${news.category}`} style={{ color: cat.color, textDecoration: "none", fontWeight: 700, fontFamily: FONTS.heading, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name={cat.icon} size={13} /> {cat.label}</Link> },
                { label: "Publicado em", value: news.date ? new Date(news.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "—" },
                { label: "Autor", value: news.author || "Redação FMA" },
                { label: "Leitura", value: `~${mins} minuto${mins > 1 ? "s" : ""}` },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Navegação */}
          <div style={{ background: "#fff", borderRadius: 12, padding: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", gap: 8 }}>
            <Link to="/noticias" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: COLORS.grayLight, color: COLORS.dark, textDecoration: "none", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
              ← Todas as notícias
            </Link>
            {news.category && (
              <Link to={`/noticias?categoria=${news.category}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: `${cat.color}12`, color: cat.color, textDecoration: "none", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
                <Icon name={cat.icon} size={14} /> Mais em {cat.label}
              </Link>
            )}
          </div>

          {/* Tags da notícia */}
          {tags.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}><Icon name="Tag" size={12} /> Tags</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {tags.map(tag => (
                  <Link key={tag} to={`/noticias?tag=${encodeURIComponent(tag)}`}
                    style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: COLORS.grayLight, color: COLORS.gray, textDecoration: "none" }}
                    onMouseEnter={e => { e.currentTarget.style.background = cat.color; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = COLORS.grayLight; e.currentTarget.style.color = COLORS.gray; }}>
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
