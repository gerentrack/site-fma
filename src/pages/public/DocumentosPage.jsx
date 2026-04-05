/**
 * DocumentosPage.jsx — Página pública de documentos institucionais.
 * Rota: /documentos
 *
 * Funcionalidades:
 *   - Listagem completa de documentos publicados (DocumentsService)
 *   - Filtro por categoria via abas (DOCUMENT_CATEGORIES)
 *   - Busca em tempo real por título e descrição
 *   - Ordenação: mais recente, mais antigo, A→Z, Z→A
 *   - Download direto (link no fileUrl)
 *   - Zero dados fixos — 100% do DocumentsService (localStorage / API futura)
 *   - Layout institucional consistente com o restante do site
 */

import { useState, useEffect, useCallback } from "react";
import { COLORS, FONTS } from "../../styles/colors";
import { DocumentsService } from "../../services/index";
import { DOCUMENT_CATEGORIES } from "../../config/navigation";
import PdfModal, { usePdfModal } from "../../components/ui/PdfModal";

// ─── Config de categorias com ícone e cor ────────────────────────────────────

const CAT_META = {
  "":          { icon: "📂", color: COLORS.dark,        bg: "#f1f5f9", border: "#e2e8f0" },
  estatuto:    { icon: "📜", color: "#7c3aed",          bg: "#f5f3ff", border: "#ddd6fe" },
  nota:        { icon: "📢", color: COLORS.primary,     bg: "#fff0f0", border: "#fecaca" },
  regimento:   { icon: "⚖️", color: "#0066cc",          bg: "#eff6ff", border: "#bfdbfe" },
  formulario:  { icon: "📝", color: "#15803d",          bg: "#f0fdf4", border: "#86efac" },
  outro:       { icon: "📄", color: "#92400e",          bg: "#fffbeb", border: "#fde68a" },
};

const ORDENACAO_OPTS = [
  { value: "data_desc",   label: "Mais recente" },
  { value: "data_asc",    label: "Mais antigo"  },
  { value: "titulo_asc",  label: "A → Z"        },
  { value: "titulo_desc", label: "Z → A"        },
];

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

// ─── Skeleton loading ────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
        .sk {
          background: linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 50%, #f0f0f0 75%);
          background-size: 600px 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: 8px;
        }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[180, 140, 160, 140, 180, 140].map((h, i) => (
          <div key={i} className="sk" style={{ height: h }} />
        ))}
      </div>
    </>
  );
}

// ─── Card de documento ────────────────────────────────────────────────────────

function DocCard({ doc, onViewPdf }) {
  const catLabel = DOCUMENT_CATEGORIES.find(c => c.value === doc.category)?.label || "Outro";
  const meta     = CAT_META[doc.category] || CAT_META.outro;
  const [hov, setHov] = useState(false);

  const hasLink = doc.fileUrl && doc.fileUrl !== "#";

  return (
    <article
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff",
        borderRadius: 14,
        border: `1.5px solid ${hov ? meta.border : COLORS.grayLight}`,
        boxShadow: hov
          ? `0 6px 28px rgba(0,0,0,0.09), inset 3px 0 0 ${meta.color}`
          : `0 1px 5px rgba(0,0,0,0.05), inset 3px 0 0 ${meta.color}33`,
        transition: "box-shadow 0.2s, border-color 0.2s",
        overflow: "hidden",
        display: "flex",
      }}
    >
      {/* Ícone lateral */}
      <div style={{
        width: 64, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: meta.bg,
        borderRight: `1px solid ${meta.border}`,
        fontSize: 26,
      }}>
        {meta.icon}
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        {/* Categoria + data */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{
            padding: "2px 10px", borderRadius: 20,
            fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: 1,
            background: meta.bg, color: meta.color,
            border: `1px solid ${meta.border}`,
          }}>
            {catLabel}
          </span>
          <span style={{
            fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray,
          }}>
            📅 {fmtDateShort(doc.date)}
          </span>
        </div>

        {/* Título */}
        <h2 style={{
          fontFamily: FONTS.heading,
          fontSize: 16,
          fontWeight: 800,
          color: hov ? meta.color : COLORS.dark,
          margin: 0,
          lineHeight: 1.3,
          textTransform: "uppercase",
          letterSpacing: 0.3,
          transition: "color 0.15s",
        }}>
          {doc.title}
        </h2>

        {/* Descrição */}
        {doc.description && (
          <p style={{
            fontFamily: FONTS.body,
            fontSize: 13,
            color: "#4b5563",
            margin: 0,
            lineHeight: 1.6,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {doc.description}
          </p>
        )}

        {/* Rodapé: botão de acesso */}
        <div style={{ marginTop: 4 }}>
          {hasLink ? (
            <button
              onClick={() => onViewPdf(doc.fileUrl, doc.title)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "7px 16px", borderRadius: 8,
                background: hov ? meta.bg : "#f8fafc",
                border: `1.5px solid ${hov ? meta.border : COLORS.grayLight}`,
                color: meta.color,
                fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: 0.5,
                transition: "all 0.15s", cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.82"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              <span style={{ fontSize: 13 }}>📄</span>
              Visualizar documento
            </button>
          ) : (
            <span style={{
              fontFamily: FONTS.body, fontSize: 12,
              color: COLORS.grayMid, fontStyle: "italic",
            }}>
              Disponível em breve
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Componente de abas de categoria ─────────────────────────────────────────

function CategoryTabs({ categoria, onChange, counts }) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 6,
      background: "#fff", borderRadius: 12, padding: 5,
      boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
      border: `1px solid ${COLORS.grayLight}`,
    }}>
      {DOCUMENT_CATEGORIES.map(cat => {
        const active = cat.value === categoria;
        const meta   = CAT_META[cat.value] || CAT_META.outro;
        const count  = counts[cat.value] ?? 0;
        const showCount = cat.value !== "";

        return (
          <button
            key={cat.value}
            onClick={() => onChange(cat.value)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 9, border: "none",
              background: active
                ? (cat.value ? meta.color : COLORS.dark)
                : "transparent",
              color: active ? "#fff" : COLORS.gray,
              fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: 0.5,
              cursor: "pointer", transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {cat.value ? meta.icon : "📂"} {cat.label}
            {showCount && (
              <span style={{
                padding: "1px 7px", borderRadius: 20, fontSize: 10,
                background: active ? "rgba(255,255,255,0.25)" : COLORS.grayLight,
                color: active ? "#fff" : COLORS.gray,
                fontWeight: 700,
              }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Barra de controles (busca + ordenação) ──────────────────────────────────

function ControlBar({ busca, ordenacao, onBusca, onOrdenacao, total, filtrado }) {
  const inp = {
    padding: "9px 13px 9px 38px", borderRadius: 9,
    border: `1.5px solid ${COLORS.grayLight}`,
    fontFamily: FONTS.body, fontSize: 13,
    background: "#fff", color: COLORS.dark,
    outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto",
      gap: 10, alignItems: "center",
      background: "#fff", borderRadius: 12, padding: "12px 16px",
      boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
      border: `1px solid ${COLORS.grayLight}`,
      marginBottom: 20,
    }}>
      {/* Busca */}
      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute", left: 12, top: "50%",
          transform: "translateY(-50%)", fontSize: 15, color: COLORS.gray,
          pointerEvents: "none",
        }}>🔍</span>
        <input
          type="search"
          value={busca}
          onChange={e => onBusca(e.target.value)}
          placeholder="Buscar por título ou descrição…"
          style={inp}
        />
      </div>

      {/* Ordenação */}
      <select
        value={ordenacao}
        onChange={e => onOrdenacao(e.target.value)}
        style={{
          padding: "9px 13px", borderRadius: 9,
          border: `1.5px solid ${COLORS.grayLight}`,
          fontFamily: FONTS.body, fontSize: 13,
          background: "#fff", color: COLORS.dark,
          outline: "none", cursor: "pointer",
          minWidth: 150,
        }}
      >
        {ORDENACAO_OPTS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Contador (span pleno da grid) */}
      {busca && (
        <div style={{
          gridColumn: "1 / -1",
          fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray,
        }}>
          {filtrado} resultado{filtrado !== 1 ? "s" : ""} encontrado{filtrado !== 1 ? "s" : ""} de {total}
          {" "}—{" "}
          <button
            onClick={() => onBusca("")}
            style={{
              background: "none", border: "none", color: COLORS.primary,
              cursor: "pointer", fontFamily: FONTS.body, fontSize: 12, padding: 0,
            }}
          >
            limpar busca
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Hero da página ───────────────────────────────────────────────────────────

function PageHero({ total }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 55%, #1a1a2e 100%)",
      padding: "52px 0 44px",
      marginBottom: 40,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decoração fundo */}
      <div style={{
        position: "absolute", right: -40, top: "50%",
        transform: "translateY(-50%)",
        fontFamily: FONTS.heading, fontWeight: 900,
        fontSize: "clamp(7rem, 15vw, 12rem)",
        color: "rgba(255,255,255,0.03)",
        letterSpacing: -8, lineHeight: 1,
        userSelect: "none", pointerEvents: "none",
      }}>
        DOCS
      </div>
      <div style={{
        position: "absolute", right: 60, bottom: -30,
        width: 240, height: 240, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(204,0,0,0.08) 0%, transparent 70%)",
      }} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
        {/* Breadcrumb */}
        <div style={{
          fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: 2,
          color: "rgba(255,255,255,0.4)", marginBottom: 20,
        }}>
          FMA › <span style={{ color: "#cc6666" }}>Documentos</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 32, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
              <span style={{ fontSize: 44 }}>📂</span>
              <h1 style={{
                fontFamily: FONTS.heading,
                fontSize: "clamp(2rem, 5vw, 3rem)",
                fontWeight: 900, color: "#fff",
                margin: 0, textTransform: "uppercase",
                letterSpacing: 2, lineHeight: 1,
              }}>
                Documentos Institucionais
              </h1>
            </div>
            <p style={{
              fontFamily: FONTS.body, fontSize: 15,
              color: "rgba(255,255,255,0.6)",
              margin: 0, maxWidth: 520, lineHeight: 1.6,
            }}>
              Estatutos, regimentos, notas oficiais, formulários e demais documentos
              da Federação Mineira de Atletismo disponíveis para download.
            </p>
          </div>

          {/* Contador */}
          <div style={{ marginLeft: "auto", textAlign: "right", flexShrink: 0 }}>
            <div style={{
              fontFamily: FONTS.heading,
              fontSize: "clamp(2.4rem, 6vw, 4rem)",
              fontWeight: 900, color: COLORS.primary,
              lineHeight: 1,
            }}>
              {total}
            </div>
            <div style={{
              fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: 1.5,
              color: "rgba(255,255,255,0.4)",
            }}>
              documento{total !== 1 ? "s" : ""} publicado{total !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Estado vazio ─────────────────────────────────────────────────────────────

function EmptyState({ busca, categoria, onReset }) {
  const catLabel = DOCUMENT_CATEGORIES.find(c => c.value === categoria)?.label;
  return (
    <div style={{
      textAlign: "center", padding: "64px 24px",
      background: "#fff", borderRadius: 16,
      border: `1.5px dashed ${COLORS.grayLight}`,
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🗂️</div>
      <p style={{
        fontFamily: FONTS.heading, fontSize: 16, fontWeight: 700,
        color: COLORS.gray, margin: "0 0 8px",
      }}>
        {busca
          ? `Nenhum documento encontrado para "${busca}"`
          : `Nenhum documento em ${catLabel || "nenhuma categoria"}.`}
      </p>
      <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.grayMid, margin: "0 0 20px" }}>
        Tente ajustar os filtros ou o termo de busca.
      </p>
      <button
        onClick={onReset}
        style={{
          padding: "9px 22px", borderRadius: 9,
          border: "none", background: COLORS.dark,
          color: "#fff", fontFamily: FONTS.heading,
          fontSize: 12, fontWeight: 700,
          textTransform: "uppercase", cursor: "pointer",
        }}
      >
        Ver todos os documentos
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DocumentosPage() {
  const [todos,      setTodos]      = useState([]);
  const [categoria,  setCategoria]  = useState("");
  const [busca,      setBusca]      = useState("");
  const [ordenacao,  setOrdenacao]  = useState("data_desc");
  const [loading,    setLoading]    = useState(true);
  const { pdfModal, openPdf, closePdf } = usePdfModal();

  // Contagens por categoria (para badges nas abas)
  const counts = {};
  DOCUMENT_CATEGORIES.forEach(cat => {
    counts[cat.value] = cat.value === ""
      ? todos.length
      : todos.filter(d => d.category === cat.value).length;
  });

  // Carrega todos os docs publicados uma única vez
  useEffect(() => {
    setLoading(true);
    DocumentsService.list({ ordenacao: "data_desc" }).then(r => {
      if (!r.error) setTodos(r.data);
      setLoading(false);
    });
  }, []);

  // Filtro + ordenação client-side
  const filtrados = (() => {
    let items = categoria
      ? todos.filter(d => d.category === categoria)
      : todos;

    if (busca) {
      const q = busca.toLowerCase();
      items = items.filter(d =>
        d.title.toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q)
      );
    }

    return [...items].sort((a, b) => {
      if (ordenacao === "data_asc")    return new Date(a.date) - new Date(b.date);
      if (ordenacao === "titulo_asc")  return a.title.localeCompare(b.title, "pt-BR");
      if (ordenacao === "titulo_desc") return b.title.localeCompare(a.title, "pt-BR");
      return new Date(b.date) - new Date(a.date);
    });
  })();

  useEffect(() => {
    document.title = "Documentos Institucionais | FMA";
  }, []);

  const resetFiltros = () => { setCategoria(""); setBusca(""); setOrdenacao("data_desc"); };

  return (
    <>
      <PageHero total={todos.length} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 72px" }}>
        {loading ? (
          <Skeleton />
        ) : (
          <>
            {/* Abas de categoria */}
            <div style={{ marginBottom: 16 }}>
              <CategoryTabs
                categoria={categoria}
                onChange={cat => { setCategoria(cat); setBusca(""); }}
                counts={counts}
              />
            </div>

            {/* Busca + ordenação */}
            <ControlBar
              busca={busca}
              ordenacao={ordenacao}
              onBusca={setBusca}
              onOrdenacao={setOrdenacao}
              total={categoria ? counts[categoria] : todos.length}
              filtrado={filtrados.length}
            />

            {/* Lista */}
            {filtrados.length === 0 ? (
              <EmptyState busca={busca} categoria={categoria} onReset={resetFiltros} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filtrados.map(doc => (
                  <DocCard key={doc.id} doc={doc} onViewPdf={openPdf} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <PdfModal url={pdfModal.url} title={pdfModal.title} onClose={closePdf} />
    </>
  );
}
