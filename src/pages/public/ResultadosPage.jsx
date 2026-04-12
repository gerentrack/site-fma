/**
 * ResultadosPage.jsx
 * Páginas públicas de resultados por categoria.
 *
 * Exports:
 *   ResultadosCorridas  →  /resultados/corridas
 *   ResultadosPista     →  /resultados/pista
 *   ResultadosTrail     →  /resultados/trail
 *   ResultadoDetalhe    →  /resultados/:id
 *
 * Cada página instancia <ResultadosListagem categoria="corrida|pista|trail" />
 * que carrega dados de ResultadosService e aplica filtros client-side.
 *
 * Arquitetura:
 *   - Sem dados fixos — 100% do ResultadosService (localStorage / API futura)
 *   - Filtros: busca textual, ano, cidade — aplicados em tempo real
 *   - Acesso a arquivo: download (pdf/xlsx) ou link externo
 *   - Detalhe: /resultados/:id com todas as informações + integração calendário
 */

import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ResultadosService, CalendarService } from "../../services/index";
import { COLORS, FONTS } from "../../styles/colors";
import PdfModal, { usePdfModal } from "../../components/ui/PdfModal";

// ─── Config por categoria ─────────────────────────────────────────────────────

const CATEGORIA_CONFIG = {
  corrida: {
    title:       "Corridas de Rua",
    subtitle:    "Resultados de provas de corrida de rua homologadas pela FMA",
    icon:        "🏅",
    color:       "#cc0000",
    colorLight:  "#fff0f0",
    colorBorder: "#fecaca",
    breadcrumb:  "Corridas de Rua",
    emptyMsg:    "Nenhum resultado de corrida de rua publicado ainda.",
  },
  pista: {
    title:       "Pista e Campo",
    subtitle:    "Resultados de competições de atletismo em pista e campo",
    icon:        "🏟️",
    color:       "#0066cc",
    colorLight:  "#eff6ff",
    colorBorder: "#bfdbfe",
    breadcrumb:  "Pista e Campo",
    emptyMsg:    "Nenhum resultado de pista e campo publicado ainda.",
  },
  trail: {
    title:       "Trail Run",
    subtitle:    "Resultados de provas de trail run e montanha chanceladas pela FMA",
    icon:        "🏔️",
    color:       "#15803d",
    colorLight:  "#f0fdf4",
    colorBorder: "#86efac",
    breadcrumb:  "Trail Run",
    emptyMsg:    "Nenhum resultado de trail publicado ainda.",
  },
};

// ─── Utilitários ──────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}
function fmtDateShort(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const FILE_CONFIG = {
  pdf:   { icon: "📄", label: "PDF",   color: "#dc2626", bg: "#fff5f5", border: "#fecaca" },
  xlsx:  { icon: "📊", label: "Excel", color: "#15803d", bg: "#f0fdf4", border: "#86efac" },
  link:  { icon: "🔗", label: "Link",  color: "#0066cc", bg: "#eff6ff", border: "#bfdbfe" },
};

// ─── Componente de acesso ao resultado (download / link externo) ──────────────

function AcessoBotao({ resultado, size = "normal", style: extraStyle = {}, onViewPdf }) {
  const { tipoArquivo, fileUrl, externalLink } = resultado;
  const fc = FILE_CONFIG[tipoArquivo] || FILE_CONFIG.link;

  const hasFile = tipoArquivo !== "link" && fileUrl;
  const hasLink = externalLink && externalLink.trim() !== "";

  if (!hasFile && !hasLink) {
    return (
      <span style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, fontStyle: "italic" }}>
        Resultado em breve
      </span>
    );
  }

  const btnBase = {
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: size === "sm" ? "5px 12px" : "9px 18px",
    borderRadius: 8,
    fontFamily: FONTS.heading,
    fontSize: size === "sm" ? 11 : 13,
    fontWeight: 800,
    textDecoration: "none",
    cursor: "pointer",
    transition: "opacity 0.15s, transform 0.1s",
    letterSpacing: 0.5,
    whiteSpace: "nowrap",
    ...extraStyle,
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {hasFile && (
        <button
          onClick={() => onViewPdf && onViewPdf(fileUrl, resultado.title || fc.label)}
          style={{
            ...btnBase,
            background: fc.bg,
            border: `1.5px solid ${fc.border}`,
            color: fc.color,
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.82"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <span style={{ fontSize: size === "sm" ? 13 : 15 }}>{fc.icon}</span>
          Visualizar {fc.label}
        </button>
      )}
      {hasLink && (
        <a
          href={externalLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...btnBase,
            background: "#eff6ff",
            border: "1.5px solid #bfdbfe",
            color: "#0066cc",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.82"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <span style={{ fontSize: size === "sm" ? 13 : 15 }}>🔗</span>
          Ver online
        </a>
      )}
    </div>
  );
}

// ─── Card de resultado na listagem ───────────────────────────────────────────

function ResultadoCard({ resultado, cfg, onViewPdf }) {
  const { id, nomeEvento, dataEvento, cidade, modalidade, descricao, tipoArquivo } = resultado;
  const fc = FILE_CONFIG[tipoArquivo] || FILE_CONFIG.link;
  const [hov, setHov] = useState(false);

  return (
    <article
      style={{
        background: "#fff",
        borderRadius: 14,
        border: `1.5px solid ${hov ? cfg.colorBorder : COLORS.grayLight}`,
        boxShadow: hov ? "0 6px 28px rgba(0,0,0,0.10)" : "0 1px 6px rgba(0,0,0,0.05)",
        overflow: "hidden",
        transition: "box-shadow 0.2s, border-color 0.2s, transform 0.18s",
        transform: hov ? "translateY(-2px)" : "none",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Faixa de categoria */}
      <div style={{
        height: 5,
        background: `linear-gradient(90deg, ${cfg.color} 0%, ${cfg.color}88 100%)`,
      }} />

      <div style={{ padding: "18px 20px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Badges topo */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
          <span style={{
            padding: "3px 10px", borderRadius: 20,
            fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: 1,
            background: fc.bg, color: fc.color, border: `1px solid ${fc.border}`,
          }}>
            {fc.icon} {fc.label}
          </span>
          {modalidade && (
            <span style={{
              padding: "3px 10px", borderRadius: 20,
              fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700,
              background: cfg.colorLight, color: cfg.color,
              border: `1px solid ${cfg.colorBorder}`,
            }}>
              {modalidade}
            </span>
          )}
        </div>

        {/* Título — clicável para detalhe */}
        <Link
          to={`/resultados/${id}`}
          style={{ textDecoration: "none" }}
        >
          <h2 style={{
            fontFamily: FONTS.heading, fontSize: 17, fontWeight: 900,
            color: hov ? cfg.color : COLORS.dark,
            margin: "0 0 10px", lineHeight: 1.25,
            textTransform: "uppercase", letterSpacing: 0.4,
            transition: "color 0.15s",
          }}>
            {nomeEvento}
          </h2>
        </Link>

        {/* Meta */}
        <div style={{
          display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 10,
          fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray,
        }}>
          <span>📅 {fmtDateShort(dataEvento)}</span>
          <span>📍 {cidade}</span>
        </div>

        {/* Descrição */}
        {descricao && (
          <p style={{
            fontFamily: FONTS.body, fontSize: 13, color: "#4b5563",
            margin: "0 0 14px", lineHeight: 1.55, flex: 1,
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {descricao}
          </p>
        )}

        {/* Rodapé do card */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: "auto", paddingTop: 12,
          borderTop: `1px solid ${COLORS.grayLight}`,
          flexWrap: "wrap", gap: 8,
        }}>
          <AcessoBotao resultado={resultado} size="sm" onViewPdf={onViewPdf} />
          <Link
            to={`/resultados/${id}`}
            style={{
              fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
              color: COLORS.gray, textDecoration: "none", letterSpacing: 0.5,
            }}
          >
            Ver detalhes →
          </Link>
        </div>
      </div>
    </article>
  );
}

// ─── Filtros ──────────────────────────────────────────────────────────────────

function FiltrosBar({ anos, cidades, filtros, onChange, cfg }) {
  const inp = {
    padding: "9px 13px", borderRadius: 9,
    border: `1.5px solid ${COLORS.grayLight}`,
    fontFamily: FONTS.body, fontSize: 13,
    background: "#fff", color: COLORS.dark,
    outline: "none", cursor: "pointer",
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr auto auto",
      gap: 10,
      marginBottom: 28,
      background: "#fff",
      borderRadius: 12,
      padding: "14px 18px",
      boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
      border: `1px solid ${COLORS.grayLight}`,
    }}>
      {/* Busca textual */}
      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute", left: 12, top: "50%",
          transform: "translateY(-50%)", color: COLORS.gray, fontSize: 15,
        }}>🔍</span>
        <input
          type="search"
          value={filtros.busca}
          onChange={e => onChange({ ...filtros, busca: e.target.value })}
          placeholder="Buscar por nome, cidade ou modalidade…"
          style={{ ...inp, width: "100%", paddingLeft: 36, boxSizing: "border-box" }}
        />
      </div>

      {/* Ano */}
      <select
        value={filtros.ano}
        onChange={e => onChange({ ...filtros, ano: e.target.value })}
        style={{ ...inp, minWidth: 110 }}
      >
        <option value="">Todos os anos</option>
        {anos.map(a => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      {/* Cidade */}
      <select
        value={filtros.cidade}
        onChange={e => onChange({ ...filtros, cidade: e.target.value })}
        style={{ ...inp, minWidth: 160 }}
      >
        <option value="">Todas as cidades</option>
        {cidades.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Header da página ─────────────────────────────────────────────────────────

function PageHero({ cfg, totalVisible, totalAll }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 60%, ${cfg.color}33 100%)`,
      padding: "52px 0 40px",
      marginBottom: 40,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Padrão decorativo de fundo */}
      <div style={{
        position: "absolute", right: -60, top: -60,
        width: 320, height: 320,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${cfg.color}20 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", right: 40, bottom: -40,
        fontFamily: FONTS.heading,
        fontSize: "clamp(6rem, 14vw, 11rem)",
        fontWeight: 900,
        color: `${cfg.color}12`,
        lineHeight: 1,
        userSelect: "none",
        pointerEvents: "none",
        letterSpacing: -4,
      }}>
        {cfg.icon}
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
        {/* Breadcrumb */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: 2,
          color: "rgba(255,255,255,0.45)",
          marginBottom: 18,
        }}>
          <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>FMA</Link>
          <span>›</span>
          <span>Resultados</span>
          <span>›</span>
          <span style={{ color: cfg.color }}>{cfg.breadcrumb}</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
              <span style={{
                fontSize: 42,
                filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))",
              }}>
                {cfg.icon}
              </span>
              <h1 style={{
                fontFamily: FONTS.heading,
                fontSize: "clamp(2rem, 5vw, 3.2rem)",
                fontWeight: 900,
                color: "#fff",
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: 2,
                lineHeight: 1,
              }}>
                {cfg.title}
              </h1>
            </div>
            <p style={{
              fontFamily: FONTS.body,
              fontSize: 15,
              color: "rgba(255,255,255,0.65)",
              margin: 0,
              lineHeight: 1.5,
              maxWidth: 500,
            }}>
              {cfg.subtitle}
            </p>
          </div>

          {/* Contador */}
          <div style={{
            marginLeft: "auto",
            textAlign: "right",
            flexShrink: 0,
          }}>
            <div style={{
              fontFamily: FONTS.heading,
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
              fontWeight: 900,
              color: cfg.color,
              lineHeight: 1,
            }}>
              {totalVisible}
            </div>
            <div style={{
              fontFamily: FONTS.heading,
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: "rgba(255,255,255,0.45)",
            }}>
              resultado{totalVisible !== 1 ? "s" : ""}
              {totalAll !== totalVisible ? ` de ${totalAll}` : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tabs de navegação entre categorias ──────────────────────────────────────

function CategoriaTabs({ atual }) {
  const tabs = [
    { cat: "corrida", label: "🏅 Corridas de Rua", path: "/resultados/corridas" },
    { cat: "pista",   label: "🏟️ Pista e Campo",   path: "/resultados/pista" },
    { cat: "trail",   label: "🏔️ Trail Run",        path: "/resultados/trail" },
  ];

  return (
    <div style={{
      maxWidth: 1100, margin: "-20px auto 0",
      padding: "0 32px 32px",
    }}>
      <div style={{
        display: "flex",
        gap: 6,
        background: "#fff",
        borderRadius: 12,
        padding: 5,
        boxShadow: "0 2px 12px rgba(0,0,0,0.09)",
        width: "fit-content",
      }}>
        {tabs.map(t => {
          const active = t.cat === atual;
          const cfg = CATEGORIA_CONFIG[t.cat];
          return (
            <Link
              key={t.cat}
              to={t.path}
              style={{
                padding: "9px 20px",
                borderRadius: 9,
                textDecoration: "none",
                fontFamily: FONTS.heading,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                transition: "all 0.15s",
                background: active ? cfg.color : "transparent",
                color: active ? "#fff" : COLORS.gray,
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Lista de resultados agrupada por ano ────────────────────────────────────

function ResultadosGrid({ resultados, cfg, onViewPdf }) {
  if (resultados.length === 0) {
    return (
      <div style={{
        textAlign: "center",
        padding: "64px 24px",
        background: "#fff",
        borderRadius: 16,
        border: `1.5px dashed ${COLORS.grayLight}`,
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
        <p style={{
          fontFamily: FONTS.heading, fontSize: 16, fontWeight: 700,
          color: COLORS.gray, margin: 0,
        }}>
          {cfg.emptyMsg}
        </p>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.grayMid, marginTop: 8 }}>
          Tente ajustar os filtros de busca.
        </p>
      </div>
    );
  }

  // Agrupar por anoCompetitivo
  const grupos = {};
  resultados.forEach(r => {
    const y = r.anoCompetitivo || "—";
    if (!grupos[y]) grupos[y] = [];
    grupos[y].push(r);
  });
  const anosOrdenados = Object.keys(grupos).sort((a, b) => b - a);

  return (
    <div>
      {anosOrdenados.map(ano => (
        <div key={ano} style={{ marginBottom: 40 }}>
          {/* Separador de ano */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            marginBottom: 20,
          }}>
            <div style={{
              fontFamily: FONTS.heading, fontSize: 13, fontWeight: 900,
              textTransform: "uppercase", letterSpacing: 3,
              color: cfg.color,
              background: cfg.colorLight,
              border: `1.5px solid ${cfg.colorBorder}`,
              padding: "5px 16px",
              borderRadius: 20,
              whiteSpace: "nowrap",
            }}>
              {cfg.icon} {ano}
            </div>
            <div style={{
              flex: 1, height: 1,
              background: `linear-gradient(90deg, ${cfg.colorBorder}, transparent)`,
            }} />
            <span style={{
              fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
              color: COLORS.gray, letterSpacing: 1,
            }}>
              {grupos[ano].length} evento{grupos[ano].length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Grid de cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 18,
          }}>
            {grupos[ano].map(r => (
              <ResultadoCard key={r.id} resultado={r} cfg={cfg} onViewPdf={onViewPdf} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal de listagem ────────────────────────────────────────

function ResultadosListagem({ categoria }) {
  const cfg = CATEGORIA_CONFIG[categoria];
  const [resultados, setResultados] = useState([]);
  const [anos,    setAnos]    = useState([]);
  const [cidades, setCidades] = useState([]);
  const [filtros, setFiltros] = useState({ busca: "", ano: "", cidade: "" });
  const [loading, setLoading] = useState(true);
  const { pdfModal, openPdf, closePdf } = usePdfModal();

  useEffect(() => {
    setLoading(true);
    setFiltros({ busca: "", ano: "", cidade: "" });

    Promise.all([
      ResultadosService.list({ categoria }),
      ResultadosService.getAnos(categoria),
      ResultadosService.getCidades(categoria),
    ]).then(([rList, rAnos, rCidades]) => {
      if (!rList.error)    setResultados(rList.data);
      if (!rAnos.error)    setAnos(rAnos.data);
      if (!rCidades.error) setCidades(rCidades.data);
      setLoading(false);
    });
  }, [categoria]);

  // Filtro client-side em tempo real (os dados já chegam filtrados por categoria)
  const visíveis = resultados.filter(r => {
    if (filtros.ano    && String(r.anoCompetitivo) !== filtros.ano) return false;
    if (filtros.cidade && r.cidade !== filtros.cidade)              return false;
    if (filtros.busca) {
      const q = filtros.busca.toLowerCase();
      return (
        r.nomeEvento.toLowerCase().includes(q) ||
        r.cidade.toLowerCase().includes(q)     ||
        (r.modalidade || "").toLowerCase().includes(q) ||
        (r.descricao  || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Título da aba do browser
  useEffect(() => {
    document.title = `Resultados ${cfg.title} | FMA`;
  }, [cfg]);

  return (
    <>
      <PageHero cfg={cfg} totalVisible={visíveis.length} totalAll={resultados.length} />

      <CategoriaTabs atual={categoria} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 64px" }}>
        {loading ? (
          <LoadingState cfg={cfg} />
        ) : (
          <>
            <FiltrosBar
              anos={anos}
              cidades={cidades}
              filtros={filtros}
              onChange={setFiltros}
              cfg={cfg}
            />
            <ResultadosGrid resultados={visíveis} cfg={cfg} onViewPdf={openPdf} />
          </>
        )}
      </div>
      <PdfModal url={pdfModal.url} title={pdfModal.title} onClose={closePdf} />
    </>
  );
}

function LoadingState({ cfg }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 140, borderRadius: 14,
          background: "linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)",
          animation: "pulse 1.5s ease-in-out infinite",
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }`}</style>
    </div>
  );
}

// ─── Página de Detalhe ────────────────────────────────────────────────────────

export function ResultadoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resultado, setResultado] = useState(null);
  const [evento,    setEvento]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [erro,      setErro]      = useState("");
  const { pdfModal, openPdf, closePdf } = usePdfModal();

  useEffect(() => {
    ResultadosService.get(id).then(async r => {
      if (r.error) { setErro(r.error); setLoading(false); return; }
      setResultado(r.data);
      document.title = `${r.data.nomeEvento} | Resultados FMA`;

      // Tentar carregar evento de calendário vinculado
      if (r.data.eventoId) {
        const ev = await CalendarService.get(r.data.eventoId);
        if (!ev.error) setEvento(ev.data);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return (
    <div style={{ maxWidth: 820, margin: "60px auto", padding: "0 32px", textAlign: "center" }}>
      <div style={{ fontFamily: FONTS.heading, fontSize: 14, color: COLORS.gray }}>Carregando resultado…</div>
    </div>
  );

  if (erro || !resultado) return (
    <div style={{ maxWidth: 820, margin: "60px auto", padding: "0 32px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
      <h2 style={{ fontFamily: FONTS.heading, fontSize: 22, color: COLORS.dark, margin: "0 0 8px" }}>
        Resultado não encontrado
      </h2>
      <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray }}>
        O resultado solicitado não existe ou foi removido.
      </p>
      <button
        onClick={() => navigate(-1)}
        style={{
          marginTop: 20, padding: "10px 22px", borderRadius: 9,
          border: "none", background: COLORS.dark, color: "#fff",
          fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}
      >
        ← Voltar
      </button>
    </div>
  );

  const cfg = CATEGORIA_CONFIG[resultado.categoria] || CATEGORIA_CONFIG.corrida;
  const catPath = resultado.categoria === "corrida" ? "corridas" : resultado.categoria;

  return (
    <>
      {/* Banner do detalhe */}
      <div style={{
        background: `linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 60%, ${cfg.color}33 100%)`,
        padding: "44px 0 36px",
        marginBottom: 40,
      }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 32px" }}>
          {/* Breadcrumb */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 1.5,
            color: "rgba(255,255,255,0.45)", marginBottom: 20,
          }}>
            <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>FMA</Link>
            <span>›</span>
            <Link to={`/resultados/${catPath}`} style={{ color: "inherit", textDecoration: "none" }}>
              {cfg.breadcrumb}
            </Link>
            <span>›</span>
            <span style={{ color: cfg.color }}>Detalhe</span>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{
              padding: "4px 14px", borderRadius: 20,
              fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: 1,
              background: cfg.color, color: "#fff",
            }}>
              {cfg.icon} {cfg.breadcrumb}
            </span>
            {resultado.modalidade && (
              <span style={{
                padding: "4px 14px", borderRadius: 20,
                fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700,
                background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)",
              }}>
                {resultado.modalidade}
              </span>
            )}
          </div>

          <h1 style={{
            fontFamily: FONTS.heading,
            fontSize: "clamp(1.6rem, 4vw, 2.6rem)",
            fontWeight: 900, color: "#fff",
            margin: "0 0 16px",
            textTransform: "uppercase", lineHeight: 1.15, letterSpacing: 1,
          }}>
            {resultado.nomeEvento}
          </h1>

          <div style={{
            display: "flex", gap: 20, flexWrap: "wrap",
            fontFamily: FONTS.body, fontSize: 14, color: "rgba(255,255,255,0.65)",
          }}>
            <span>📅 {fmtDate(resultado.dataEvento)}</span>
            <span>📍 {resultado.cidade}</span>
            <span>📆 Temporada {resultado.anoCompetitivo}</span>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 32px 64px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}>
          {/* Coluna principal */}
          <div>
            {/* Descrição */}

            {/* Evento vinculado do calendário */}
            {evento && (
              <div style={{
                background: "#fff", borderRadius: 14, padding: "20px 24px",
                boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
                border: `1px solid #bfdbfe`,
                marginBottom: 20,
              }}>
                <h3 style={{
                  fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800,
                  textTransform: "uppercase", letterSpacing: 2, color: "#0066cc",
                  margin: "0 0 12px",
                }}>
                  📅 Evento no Calendário FMA
                </h3>
                <div style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 800, color: COLORS.dark, marginBottom: 6 }}>
                  {evento.title}
                </div>
                <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginBottom: 12 }}>
                  {fmtDate(evento.date)}{evento.city ? ` · ${evento.city}` : ""}
                </div>
                <Link
                  to={`/calendario/${evento.id}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "7px 14px", borderRadius: 8,
                    background: "#eff6ff", border: "1.5px solid #bfdbfe",
                    color: "#0066cc", textDecoration: "none",
                    fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800,
                    textTransform: "uppercase", letterSpacing: 0.5,
                  }}
                >
                  Ver no calendário →
                </Link>
              </div>
            )}

            {/* Navegar de volta */}
            <Link
              to={`/resultados/${catPath}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700,
                color: COLORS.gray, textDecoration: "none",
              }}
            >
              ← Todos os resultados de {cfg.breadcrumb}
            </Link>
          </div>

          {/* Coluna lateral — acesso ao resultado */}
          <div>
            <div style={{
              background: "#fff", borderRadius: 14, padding: "22px 20px",
              boxShadow: "0 2px 14px rgba(0,0,0,0.09)",
              border: `1.5px solid ${cfg.colorBorder}`,
              position: "sticky", top: 24,
            }}>
              <h3 style={{
                fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: 2,
                color: cfg.color, margin: "0 0 16px",
                paddingBottom: 12, borderBottom: `1px solid ${cfg.colorBorder}`,
              }}>
                📁 Acessar Resultado
              </h3>

              <AcessoBotao resultado={resultado} size="normal" style={{ width: "100%", justifyContent: "center" }} onViewPdf={openPdf} />

              <div style={{
                marginTop: 16, paddingTop: 14,
                borderTop: `1px solid ${COLORS.grayLight}`,
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                {[
                  ["Evento",     resultado.nomeEvento],
                  ["Data",       fmtDate(resultado.dataEvento)],
                  ["Cidade",     resultado.cidade],
                  ["Modalidade", resultado.modalidade || "—"],
                  ["Formato",    (FILE_CONFIG[resultado.tipoArquivo] || FILE_CONFIG.link).label],
                  ["Temporada",  resultado.anoCompetitivo],
                ].map(([lbl, val]) => (
                  <div key={lbl}>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray }}>{lbl}</div>
                    <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark, marginTop: 1 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <PdfModal url={pdfModal.url} title={pdfModal.title} onClose={closePdf} />
    </>
  );
}

// ─── Exports das 3 páginas de listagem ───────────────────────────────────────

export function ResultadosCorridas() {
  return <ResultadosListagem categoria="corrida" />;
}

export function ResultadosPista() {
  return <ResultadosListagem categoria="pista" />;
}

export function ResultadosTrail() {
  return <ResultadosListagem categoria="trail" />;
}
