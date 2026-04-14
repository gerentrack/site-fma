/**
 * NewsPage.jsx — Listagem completa de notícias.
 * Rota: /noticias
 * Suporte: ?categoria=xxx  ?tag=xxx  ?busca=xxx  ?pagina=N
 *
 * Funcionalidades:
 *  - Hero com título e barra de busca
 *  - Destaque (featured) como card principal quando nenhum filtro ativo
 *  - Abas de categoria com contagem
 *  - Filtro por tag (via ?tag= ou clique)
 *  - Busca em tempo real (título + excerpt + autor + tags)
 *  - Paginação (12 por página)
 *  - Zero dados fixos — tudo do NewsService (localStorage)
 */
import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";
import { NewsService } from "../../services/index";
import NewsCard from "../../components/ui/NewsCard";
import { NEWS_CATEGORIES } from "../../config/navigation";
import Icon from "../../utils/icons";

const PER_PAGE = 12;

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}
const catMap = Object.fromEntries(NEWS_CATEGORIES.filter(c => c.value).map(c => [c.value, c]));

// ── Featured hero card ────────────────────────────────────────────────────────
function FeaturedHero({ item }) {
  const cat = catMap[item.category] || { label: "Notícia", color: COLORS.primary, icon: "Newspaper" };
  const href = `/noticias/${item.slug || item.id}`;
  return (
    <Link to={href} style={{ textDecoration: "none", display: "block" }}>
      <div style={{
        borderRadius: 16, overflow: "hidden", position: "relative",
        background: item.image
          ? `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.75)), url(${item.image}) center/cover`
          : "linear-gradient(135deg,#990000 0%,#cc0000 100%)",
        minHeight: 400, display: "flex", alignItems: "flex-end",
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)", marginBottom: 48,
        transition: "transform 0.3s",
      }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.005)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
        <div style={{ padding: "40px 44px", color: "#fff", maxWidth: 760 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <span style={{ padding: "3px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: cat.color, color: "#fff", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name={cat.icon} size={12} /> {cat.label}</span>
            <span style={{ padding: "3px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: "#f59e0b", color: "#fff" }}>Destaque</span>
          </div>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: "clamp(1.6rem,3vw,2.4rem)", fontWeight: 900, margin: "0 0 12px", lineHeight: 1.2, textTransform: "uppercase" }}>{item.title}</h2>
          {item.excerpt && <p style={{ fontFamily: FONTS.body, fontSize: 15, margin: "0 0 20px", opacity: 0.88, lineHeight: 1.6 }}>{item.excerpt}</p>}
          <div style={{ fontFamily: FONTS.body, fontSize: 13, opacity: 0.75 }}>
            {fmt(item.date)}{item.author ? ` · ${item.author}` : ""}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Paginação ─────────────────────────────────────────────────────────────────
function Pagination({ current, total, onChange }) {
  if (total <= 1) return null;
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 48, flexWrap: "wrap" }}>
      <button onClick={() => onChange(current - 1)} disabled={current === 1}
        style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, cursor: current === 1 ? "not-allowed" : "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, opacity: current === 1 ? 0.4 : 1 }}>
        ← Anterior
      </button>
      {pages.map(p => (
        <button key={p} onClick={() => onChange(p)}
          style={{ padding: "8px 14px", borderRadius: 8, border: `2px solid ${p === current ? COLORS.primary : COLORS.grayLight}`, background: p === current ? COLORS.primary : "#fff", color: p === current ? "#fff" : COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, minWidth: 40 }}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(current + 1)} disabled={current === total}
        style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, cursor: current === total ? "not-allowed" : "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, opacity: current === total ? 0.4 : 1 }}>
        Próxima →
      </button>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function NewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado vindo da URL
  const activeCat  = searchParams.get("categoria") || "";
  const activeTag  = searchParams.get("tag") || "";
  const searchQ    = searchParams.get("busca") || "";
  const page       = parseInt(searchParams.get("pagina") || "1", 10);

  // Input de busca controlado localmente (aplica na URL com debounce)
  const [searchInput, setSearchInput] = useState(searchQ);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await NewsService.list({ publishedOnly: true });
    if (r.data) setAllItems(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Sincronizar input com param da URL ao navegar
  useEffect(() => { setSearchInput(searchQ); }, [searchQ]);

  const setParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set(key, val); else next.delete(key);
    next.delete("pagina"); // reset página ao filtrar
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setParam("busca", searchInput.trim());
  };

  // ── Filtragem ────────────────────────────────────────────────────────────────
  const hasFilter = activeCat || activeTag || searchQ;

  const filtered = allItems.filter(item => {
    if (activeCat && item.category !== activeCat) return false;
    if (activeTag) {
      const tags = Array.isArray(item.tags) ? item.tags : [];
      if (!tags.includes(activeTag)) return false;
    }
    if (searchQ) {
      const q = searchQ.toLowerCase();
      const tags = Array.isArray(item.tags) ? item.tags : [];
      if (!item.title?.toLowerCase().includes(q) &&
          !item.excerpt?.toLowerCase().includes(q) &&
          !item.author?.toLowerCase().includes(q) &&
          !tags.some(t => t.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  // Destaque: primeiro featured quando não há filtro
  const featured = !hasFilter ? (allItems.find(n => n.featured) || null) : null;
  const displayList = featured ? filtered.filter(n => n.id !== featured.id) : filtered;

  // Paginação
  const totalPages = Math.max(1, Math.ceil(displayList.length / PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageItems = displayList.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  // Contagens por categoria
  const catCounts = NEWS_CATEGORIES.filter(c => c.value).reduce((acc, c) => {
    acc[c.value] = allItems.filter(n => n.category === c.value).length;
    return acc;
  }, {});

  // Tags mais usadas
  const allTags = allItems.flatMap(n => Array.isArray(n.tags) ? n.tags : []);
  const tagFreq = allTags.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
  const topTags = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => t);

  return (
    <div style={{ background: "#f7f7f7", minHeight: "100vh" }}>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <div style={{ background: "linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%)", padding: "52px 24px 44px", color: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <nav style={{ fontSize: 12, marginBottom: 14, opacity: 0.65, fontFamily: FONTS.body }}>
            <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>Início</Link>{" / "}
            <span>Notícias</span>
            {activeCat && <>{" / "}<span style={{ color: catMap[activeCat]?.color || "#fff" }}>{catMap[activeCat]?.label}</span></>}
            {activeTag && <>{" / "}<span style={{ color: "#f59e0b" }}>#{activeTag}</span></>}
          </nav>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 20px" }}>
            {activeCat ? catMap[activeCat]?.label :
             activeTag  ? `#${activeTag}` :
             searchQ    ? `Busca: "${searchQ}"` :
             "Notícias"}
          </h1>

          {/* Barra de busca */}
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8, maxWidth: 520 }}>
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Buscar notícias..."
              style={{ flex: 1, padding: "11px 16px", borderRadius: 8, border: "none", fontFamily: FONTS.body, fontSize: 14, outline: "none" }}
            />
            <button type="submit" style={{ padding: "11px 20px", borderRadius: 8, background: COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
              Buscar
            </button>
            {(searchQ || searchInput) && (
              <button type="button" onClick={() => { setSearchInput(""); setParam("busca", ""); }}
                style={{ padding: "11px 14px", borderRadius: 8, background: "rgba(255,255,255,0.12)", color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13 }}>✕</button>
            )}
          </form>
        </div>
      </div>

      {/* ── Abas de categoria ───────────────────────────────────────────────── */}
      <div style={{ background: "#111", padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 0, overflowX: "auto" }}>
          <button
            onClick={() => setParam("categoria", "")}
            style={{ padding: "14px 20px", background: "transparent", border: "none", borderBottom: `3px solid ${!activeCat ? COLORS.primary : "transparent"}`, color: !activeCat ? "#fff" : "rgba(255,255,255,0.5)", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
            Todas ({allItems.length})
          </button>
          {NEWS_CATEGORIES.filter(c => c.value && catCounts[c.value] > 0).map(c => (
            <button key={c.value}
              onClick={() => setParam("categoria", activeCat === c.value ? "" : c.value)}
              style={{ padding: "14px 18px", background: activeCat === c.value ? `${c.color}30` : "transparent", border: "none", borderBottom: `3px solid ${activeCat === c.value ? c.color : "transparent"}`, color: activeCat === c.value ? "#fff" : "rgba(255,255,255,0.5)", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}>
              <Icon name={c.icon} size={12} /> {c.label} ({catCounts[c.value]})
            </button>
          ))}
        </div>
      </div>

      <div className="grid-stack-mobile" style={{ maxWidth: 1100, margin: "0 auto", padding: "44px 24px 80px", display: "grid", gridTemplateColumns: "1fr 280px", gap: 36, alignItems: "start" }}>

        {/* ── Coluna principal ─────────────────────────────────────────────── */}
        <div>
          {loading ? (
            <div style={{ padding: "80px 0", textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>Carregando notícias...</div>
          ) : (
            <>
              {/* Destaque */}
              {featured && <FeaturedHero item={featured} />}

              {/* Resultado de busca/filtro */}
              {hasFilter && (
                <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray }}>
                    {filtered.length === 0 ? "Nenhum resultado" : `${filtered.length} resultado(s)`}
                  </span>
                  {(activeCat || activeTag || searchQ) && (
                    <button onClick={() => setSearchParams({})}
                      style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, cursor: "pointer", fontFamily: FONTS.body, fontSize: 12 }}>
                      ✕ Limpar filtros
                    </button>
                  )}
                </div>
              )}

              {pageItems.length === 0 ? (
                <div style={{ padding: "80px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 14 }}></div>
                  <h2 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 800, color: COLORS.dark, textTransform: "uppercase" }}>Nenhuma notícia encontrada</h2>
                  <p style={{ fontFamily: FONTS.body, color: COLORS.gray, marginBottom: 20 }}>Tente outros filtros ou termos de busca.</p>
                  <button onClick={() => setSearchParams({})}
                    style={{ padding: "10px 22px", borderRadius: 8, background: COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
                    Ver todas as notícias
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 24 }}>
                  {pageItems.map(item => <NewsCard key={item.id} item={item} showTags />)}
                </div>
              )}

              <Pagination
                current={safePage}
                total={totalPages}
                onChange={p => { const n = new URLSearchParams(searchParams); n.set("pagina", p); setSearchParams(n); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              />
            </>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 80 }}>

          {/* Tags populares */}
          {topTags.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.dark, margin: "0 0 14px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>
                <Icon name="Tag" size={14} /> Tags populares
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {topTags.map(tag => (
                  <button key={tag}
                    onClick={() => setParam("tag", activeTag === tag ? "" : tag)}
                    style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, border: `2px solid ${activeTag === tag ? COLORS.primary : COLORS.grayLight}`, background: activeTag === tag ? COLORS.primary : "#fff", color: activeTag === tag ? "#fff" : COLORS.gray, cursor: "pointer", transition: "all 0.15s" }}>
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mais recentes */}
          <div style={{ background: "#fff", borderRadius: 12, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h3 style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.dark, margin: "0 0 14px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>
              <Icon name="Clock" size={14} /> Mais recentes
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {allItems.slice(0, 5).map(item => (
                <NewsCard key={item.id} item={item} size="compact" />
              ))}
            </div>
          </div>

          {/* Por categoria */}
          <div style={{ background: "#fff", borderRadius: 12, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h3 style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.dark, margin: "0 0 14px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>
              <Icon name="Folder" size={14} /> Por categoria
            </h3>
            {NEWS_CATEGORIES.filter(c => c.value && catCounts[c.value] > 0).map(c => (
              <button key={c.value} onClick={() => setParam("categoria", activeCat === c.value ? "" : c.value)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 0", background: "none", border: "none", cursor: "pointer", borderBottom: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body }}>
                <span style={{ fontSize: 13, color: activeCat === c.value ? c.color : COLORS.dark, fontWeight: activeCat === c.value ? 700 : 400 }}>
                  <Icon name={c.icon} size={12} /> {c.label}
                </span>
                <span style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: activeCat === c.value ? `${c.color}20` : COLORS.grayLight, color: activeCat === c.value ? c.color : COLORS.gray }}>
                  {catCounts[c.value]}
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
