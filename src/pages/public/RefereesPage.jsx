/**
 * RefereesPage.jsx — Hub público da Central do Árbitro.
 * Rota: /arbitros  (?categoria=xxx para filtro direto)
 */
import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";
import { RefereeContentService } from "../../services/index";
import { REFEREE_CONTENT_CATEGORIES } from "../../config/navigation";
import Icon from "../../utils/icons";

const catMap = Object.fromEntries(
  REFEREE_CONTENT_CATEGORIES.filter(c => c.value).map(c => [c.value, c])
);

const QUICK_ACTIONS = [
  { icon: "Pencil", label: "Cadastro", category: "cadastro", color: "#cc0000" },
  { icon: "Calendar", label: "Disponibilidade", category: "disponibilidade", color: "#0066cc" },
  { icon: "FileText", label: "Formulários", category: "formulario", color: "#007733" },
  { icon: "FolderOpen", label: "Documentos", category: "documento", color: "#5a3e00" },
  { icon: "Megaphone", label: "Comunicados", category: "comunicado", color: "#7c3aed" },
  { icon: "BarChart3", label: "Materiais", category: "material", color: "#0891b2" },
];

function ContentCard({ item }) {
  const cat = catMap[item.category] || { color: COLORS.primary, icon: "ClipboardList", label: item.category };
  return (
    <Link to={`/arbitros/conteudo/${item.id}`} style={{ textDecoration: "none", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          background: "#fff", borderRadius: 12, overflow: "hidden", height: "100%",
          display: "flex", flexDirection: "column",
          boxShadow: item.featured ? `0 4px 24px rgba(204,0,0,0.12), 0 0 0 2px ${COLORS.primary}25` : "0 2px 10px rgba(0,0,0,0.07)",
          borderTop: `3px solid ${cat.color}`, transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.12)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = item.featured ? `0 4px 24px rgba(204,0,0,0.12), 0 0 0 2px ${COLORS.primary}25` : "0 2px 10px rgba(0,0,0,0.07)"; }}
      >
        {item.image && <div style={{ height: 130, background: `url(${item.image}) center/cover`, flexShrink: 0 }} />}
        <div style={{ padding: "16px 18px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, background: `${cat.color}15`, color: cat.color }}>
              <Icon name={cat.icon} size={11} /> {cat.label}
            </span>
            {item.featured && <span style={{ color: "#f59e0b" }}><Icon name="Star" size={13} /></span>}
          </div>
          <div style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.dark, lineHeight: 1.3 }}>{item.title}</div>
          {item.summary && (
            <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, lineHeight: 1.55, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
              {item.summary}
            </div>
          )}
          <div style={{ marginTop: "auto", paddingTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 4, fontSize: 13 }}>
              {item.content && <span title="Conteúdo detalhado"><Icon name="Pencil" size={13} /></span>}
              {item.fileUrl && <span title="Arquivo para download"><Icon name="Download" size={13} /></span>}
              {item.externalLink && <span title="Link externo"><Icon name="ExternalLink" size={13} /></span>}
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

export default function RefereesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("categoria") || "");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await RefereeContentService.list({ publishedOnly: true });
    if (r.data) setItems(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setTab = (cat) => {
    setActiveTab(cat);
    cat ? setSearchParams({ categoria: cat }) : setSearchParams({});
  };

  const filtered = activeTab ? items.filter(i => i.category === activeTab) : items;
  const featured = items.filter(i => i.featured);

  return (
    <div style={{ background: "#f7f7f7", minHeight: "80vh" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #3a3a3a 100%)", color: "#fff", padding: "52px 24px 44px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <nav style={{ fontSize: 12, marginBottom: 14, opacity: 0.7, fontFamily: FONTS.body }}>
            <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>Início</Link>{" / "}
            <span>Árbitros</span>
          </nav>
          <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", opacity: 0.6, marginBottom: 8 }}>FMA</div>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px" }}>
            Central do Árbitro
          </h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 15, opacity: 0.85, margin: "0 0 24px", maxWidth: 580 }}>
            Documentos, formulários, orientações e informações para árbitros credenciados pela FMA.
          </p>
          <Link
            to="/intranet"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 8, background: COLORS.primary, color: "#fff", textDecoration: "none", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}
          >
            <Icon name="Lock" size={14} /> Acessar Intranet (Área Restrita)
          </Link>
        </div>
      </div>

      {/* Quick actions bar */}
      <div style={{ background: "#111", padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(6,1fr)" }}>
          {QUICK_ACTIONS.map(qa => (
            <button
              key={qa.category}
              onClick={() => setTab(activeTab === qa.category ? "" : qa.category)}
              style={{
                background: activeTab === qa.category ? qa.color : "transparent",
                border: "none", borderBottom: `3px solid ${activeTab === qa.category ? qa.color : "transparent"}`,
                color: activeTab === qa.category ? "#fff" : "rgba(255,255,255,0.6)",
                padding: "15px 10px", cursor: "pointer", textAlign: "center",
                fontFamily: FONTS.heading, transition: "all 0.2s",
              }}
              onMouseEnter={e => { if (activeTab !== qa.category) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
              onMouseLeave={e => { if (activeTab !== qa.category) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ marginBottom: 3 }}><Icon name={qa.icon} size={18} /></div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{qa.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 60px" }}>
        {/* Destaques */}
        {!activeTab && featured.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Icon name="Star" size={18} />
              <h2 style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.dark, margin: 0 }}>Destaques</h2>
              <div style={{ flex: 1, height: 1, background: COLORS.grayLight }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 18 }}>
              {featured.slice(0, 3).map(item => <ContentCard key={item.id} item={item} />)}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 26 }}>
          <button
            onClick={() => setTab("")}
            style={{ padding: "7px 16px", borderRadius: 20, cursor: "pointer", border: `2px solid ${!activeTab ? COLORS.primary : COLORS.grayLight}`, background: !activeTab ? COLORS.primary : "#fff", color: !activeTab ? "#fff" : COLORS.gray, fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}
          >
            <Icon name="ClipboardList" size={12} /> Todos ({items.length})
          </button>
          {REFEREE_CONTENT_CATEGORIES.filter(c => c.value).map(c => {
            const count = items.filter(i => i.category === c.value).length;
            if (!count) return null;
            return (
              <button key={c.value} onClick={() => setTab(activeTab === c.value ? "" : c.value)}
                style={{ padding: "7px 16px", borderRadius: 20, cursor: "pointer", border: `2px solid ${activeTab === c.value ? c.color : COLORS.grayLight}`, background: activeTab === c.value ? c.color : "#fff", color: activeTab === c.value ? "#fff" : COLORS.gray, fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
                <Icon name={c.icon} size={12} /> {c.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: COLORS.gray, fontFamily: FONTS.body }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div style={{ marginBottom: 10 }}></div>
            <p style={{ fontFamily: FONTS.body, color: COLORS.gray }}>Nenhum conteúdo encontrado para esta categoria.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 18 }}>
            {filtered.map(item => <ContentCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  );
}
