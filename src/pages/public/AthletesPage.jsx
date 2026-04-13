/**
 * AthletesPage.jsx
 * Página pública da central de informações para Atletas.
 * Rota: /atletas  (+ ?categoria=xxx via URL para filtro direto)
 *
 * Inclui:
 *  - Hero/banner interno
 *  - Filtro por categoria (tabs)
 *  - Grid de cards com destaque visual para featured
 *  - Cards com indicadores de arquivo/link/imagem
 */
import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";
import { AthleteContentService } from "../../services/index";
import { ATHLETE_CONTENT_CATEGORIES } from "../../config/navigation";
import Icon from "../../utils/icons";

const catMap = Object.fromEntries(
  ATHLETE_CONTENT_CATEGORIES.filter(c => c.value).map(c => [c.value, c])
);

// ─── Card de conteúdo ─────────────────────────────────────────────────────────

function ContentCard({ item }) {
  const cat = catMap[item.category] || { color: COLORS.primary, icon: "ClipboardList", label: item.category };

  return (
    <Link
      to={`/atletas/conteudo/${item.id}`}
      style={{ textDecoration: "none", display: "flex", flexDirection: "column" }}
    >
      <div style={{
        background: "#fff",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: item.featured
          ? `0 4px 24px rgba(204,0,0,0.12), 0 0 0 2px ${COLORS.primary}25`
          : "0 2px 10px rgba(0,0,0,0.07)",
        transition: "transform 0.2s, box-shadow 0.2s",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderTop: `3px solid ${cat.color}`,
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.12)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = item.featured
            ? `0 4px 24px rgba(204,0,0,0.12), 0 0 0 2px ${COLORS.primary}25`
            : "0 2px 10px rgba(0,0,0,0.07)";
        }}
      >
        {/* Imagem (opcional) */}
        {item.image && (
          <div style={{ height: 140, background: `url(${item.image}) center/cover`, flexShrink: 0 }} />
        )}

        {/* Corpo */}
        <div style={{ padding: "18px 20px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Cabeçalho da categoria + destaque */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{
              padding: "2px 10px", borderRadius: 20, fontSize: 10,
              fontFamily: FONTS.heading, fontWeight: 700,
              background: `${cat.color}15`, color: cat.color,
            }}>
              <Icon name={cat.icon} size={11} /> {cat.label}
            </span>
            {item.featured && (
              <span style={{ color: "#f59e0b" }} title="Destaque"><Icon name="Star" size={14} /></span>
            )}
          </div>

          {/* Título */}
          <div style={{ fontFamily: FONTS.heading, fontSize: 15.5, fontWeight: 700, color: COLORS.dark, lineHeight: 1.3 }}>
            {item.title}
          </div>

          {/* Resumo */}
          {item.summary && (
            <div style={{
              fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, lineHeight: 1.55,
              overflow: "hidden", display: "-webkit-box",
              WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
            }}>
              {item.summary}
            </div>
          )}

          {/* Rodapé do card: indicadores + data */}
          <div style={{ marginTop: "auto", paddingTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 4, fontSize: 14 }}>
              {item.content && <span title="Conteúdo detalhado disponível"><Icon name="Pencil" size={14} /></span>}
              {item.fileUrl && <span title="Arquivo para download"><Icon name="Download" size={14} /></span>}
              {item.externalLink && <span title="Link externo"><Icon name="ExternalLink" size={14} /></span>}
            </div>
            {item.publishedAt && (
              <span style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>
                {new Date(item.publishedAt + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Chamadas rápidas (quick actions) ────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    icon: "Pencil",
    label: "Cadastrar Atleta",
    desc: "Formulários e orientações para nova filiação",
    category: "cadastro",
    color: COLORS.primary,
  },
  {
    icon: "X",
    label: "Cancelar Registro",
    desc: "Procedimento de cancelamento ou transferência",
    category: "cancelamento",
    color: "#884400",
  },
  {
    icon: "Users",
    label: "Lista de Atletas",
    desc: "Consulte os atletas federados 2026",
    category: "lista",
    color: "#0066cc",
  },
  {
    icon: "FileText",
    label: "Documentos",
    desc: "Regulamentos, formulários e normas",
    category: "documento",
    color: "#5a3e00",
  },
  {
    icon: "Megaphone",
    label: "Comunicados",
    desc: "Informes e avisos oficiais da FMA",
    category: "comunicado",
    color: "#7c3aed",
  },
  {
    icon: "ExternalLink",
    label: "Links Úteis",
    desc: "Portais e recursos externos",
    category: "link",
    color: "#0891b2",
  },
];

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AthletesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = searchParams.get("categoria") || "";

  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState(initialCat);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await AthleteContentService.list({ publishedOnly: true });
    if (r.data) setItems(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Sincroniza aba com URL
  const setTab = (cat) => {
    setActiveTab(cat);
    if (cat) setSearchParams({ categoria: cat });
    else setSearchParams({});
  };

  const filtered = activeTab
    ? items.filter(i => i.category === activeTab)
    : items;

  const featured = items.filter(i => i.featured);

  return (
    <div style={{ background: "#f7f7f7", minHeight: "80vh" }}>

      {/* ── Hero ── */}
      <div style={{
        background: `linear-gradient(135deg, #990000 0%, ${COLORS.primary} 100%)`,
        color: "#fff",
        padding: "52px 24px 44px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <nav style={{ fontSize: 12, marginBottom: 14, opacity: 0.75, fontFamily: FONTS.body }}>
            <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>Início</Link>
            {" / "}
            <span>Atletas</span>
          </nav>
          <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", opacity: 0.75, marginBottom: 8 }}>FMA</div>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px" }}>
            Central do Atleta
          </h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 15, opacity: 0.88, margin: 0, maxWidth: 580 }}>
            Formulários, documentos, orientações e comunicados para atletas federados e em processo de filiação à FMA.
          </p>
        </div>
      </div>

      {/* ── Chamadas rápidas ── */}
      <div style={{ background: COLORS.dark, padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 0 }}>
            {QUICK_ACTIONS.map(qa => (
              <button
                key={qa.category}
                onClick={() => setTab(activeTab === qa.category ? "" : qa.category)}
                style={{
                  background: activeTab === qa.category ? qa.color : "transparent",
                  border: "none",
                  borderBottom: activeTab === qa.category ? `3px solid ${qa.color}` : "3px solid transparent",
                  color: activeTab === qa.category ? "#fff" : "rgba(255,255,255,0.65)",
                  padding: "16px 12px",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s",
                  fontFamily: FONTS.heading,
                }}
                onMouseEnter={e => { if (activeTab !== qa.category) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={e => { if (activeTab !== qa.category) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ marginBottom: 4 }}><Icon name={qa.icon} size={20} /></div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1.2 }}>{qa.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 60px" }}>

        {/* ── Destaques (somente quando não há filtro ativo) ── */}
        {!activeTab && featured.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Icon name="Star" size={20} />
              <h2 style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.dark, margin: 0 }}>
                Destaques
              </h2>
              <div style={{ flex: 1, height: 1, background: COLORS.grayLight }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
              {featured.slice(0, 3).map(item => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* ── Filtros em tabs ── */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
          <button
            onClick={() => setTab("")}
            style={{
              padding: "7px 16px", borderRadius: 20, cursor: "pointer",
              border: `2px solid ${!activeTab ? COLORS.primary : COLORS.grayLight}`,
              background: !activeTab ? COLORS.primary : "#fff",
              color: !activeTab ? "#fff" : COLORS.gray,
              fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, transition: "all 0.15s",
            }}
          >
            <Icon name="ClipboardList" size={12} /> Todos ({items.length})
          </button>
          {ATHLETE_CONTENT_CATEGORIES.filter(c => c.value).map(c => {
            const count = items.filter(i => i.category === c.value).length;
            if (!count) return null;
            return (
              <button
                key={c.value}
                onClick={() => setTab(activeTab === c.value ? "" : c.value)}
                style={{
                  padding: "7px 16px", borderRadius: 20, cursor: "pointer",
                  border: `2px solid ${activeTab === c.value ? c.color : COLORS.grayLight}`,
                  background: activeTab === c.value ? c.color : "#fff",
                  color: activeTab === c.value ? "#fff" : COLORS.gray,
                  fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, transition: "all 0.15s",
                }}
              >
                <Icon name={c.icon} size={12} /> {c.label} ({count})
              </button>
            );
          })}
        </div>

        {/* ── Grid de cards ── */}
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: COLORS.gray, fontFamily: FONTS.body }}>
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div style={{ marginBottom: 12 }}></div>
            <p style={{ fontFamily: FONTS.body, color: COLORS.gray, fontSize: 15 }}>
              Nenhum conteúdo encontrado para esta categoria.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
            {filtered.map(item => <ContentCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  );
}
