/**
 * GaleriaPage.jsx — Galeria pública de fotos FMA.
 *
 * Exports:
 *   GaleriaListagem  →  /galeria
 *   GaleriaAlbum     →  /galeria/:id
 *
 * Funcionalidades da listagem:
 *   - Grid masonry-ish de álbuns com cover, título, descrição, contagem, data
 *   - Filtro por categoria (abas dinâmicas geradas da API)
 *   - Busca em tempo real por título e descrição
 *   - Skeleton de carregamento
 *
 * Funcionalidades do álbum:
 *   - Grade responsiva de fotos (3 colunas → 2 → 1)
 *   - Lightbox modal: abrir foto, navegar prev/next, fechar (ESC / botão / clique fora)
 *   - Caption de cada foto
 *   - Retrocompatibilidade: images[] pode ser array de strings ou de { url, caption }
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { GalleryService } from "../../services/index";
import { COLORS, FONTS } from "../../styles/colors";
import Icon from "../../utils/icons";

// ─── Config de categorias ─────────────────────────────────────────────────────

const CAT_META = {
  corrida:       { icon: "Medal", label: "Corridas de Rua", color: "#cc0000",  bg: "#fff0f0",  border: "#fecaca" },
  pista:         { icon: "Building", label: "Pista e Campo",   color: "#0066cc",  bg: "#eff6ff",  border: "#bfdbfe" },
  trail:         { icon: "Mountain", label: "Trail Run",       color: "#15803d",  bg: "#f0fdf4",  border: "#86efac" },
  institucional: { icon: "Landmark", label: "Institucional",   color: "#7c3aed",  bg: "#f5f3ff",  border: "#ddd6fe" },
  outro:         { icon: "Camera", label: "Outros",           color: "#92400e",  bg: "#fffbeb",  border: "#fde68a" },
};

function catMeta(cat) {
  return CAT_META[cat] || CAT_META.outro;
}

// ─── Normalizar imagem (string ou { url, caption }) ──────────────────────────

function normalizeImage(img) {
  if (!img) return { url: "", caption: "" };
  if (typeof img === "string") return { url: img, caption: "" };
  return { url: img.url || "", caption: img.caption || "" };
}

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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <>
      <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:.55}}`}</style>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 20,
      }}>
        {[320, 260, 300, 260, 320, 280].map((h, i) => (
          <div key={i} style={{
            height: h, borderRadius: 14,
            background: "linear-gradient(135deg, #f0f0f0, #e4e4e4)",
            animation: "shimmer 1.5s ease-in-out infinite",
          }} />
        ))}
      </div>
    </>
  );
}

// ─── Hero da listagem ─────────────────────────────────────────────────────────

function ListagemHero({ total }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a2e 100%)",
      padding: "52px 0 44px",
      marginBottom: 40,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", right: -20, top: "50%", transform: "translateY(-50%)",
        fontFamily: FONTS.heading, fontWeight: 900,
        fontSize: "clamp(6rem, 13vw, 10rem)",
        color: "rgba(255,255,255,0.03)", letterSpacing: -6,
        userSelect: "none", pointerEvents: "none", lineHeight: 1,
      }}></div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
        <div style={{
          fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: 2,
          color: "rgba(255,255,255,0.4)", marginBottom: 20,
        }}>
          FMA › <span style={{ color: COLORS.primaryLight }}>Galeria de Fotos</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 32, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <span><Icon name="Camera" size={42} /></span>
              <h1 style={{
                fontFamily: FONTS.heading,
                fontSize: "clamp(2rem, 5vw, 3rem)",
                fontWeight: 900, color: "#fff",
                margin: 0, textTransform: "uppercase",
                letterSpacing: 2, lineHeight: 1,
              }}>
                Galeria de Fotos
              </h1>
            </div>
            <p style={{
              fontFamily: FONTS.body, fontSize: 15,
              color: "rgba(255,255,255,0.6)",
              margin: 0, maxWidth: 480, lineHeight: 1.6,
            }}>
              Registros fotográficos dos eventos de atletismo e corridas de rua
              organizados ou chancelados pela Federação Mineira de Atletismo.
            </p>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right", flexShrink: 0 }}>
            <div style={{
              fontFamily: FONTS.heading,
              fontSize: "clamp(2.4rem, 6vw, 4rem)",
              fontWeight: 900, color: COLORS.primary, lineHeight: 1,
            }}>
              {total}
            </div>
            <div style={{
              fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: 1.5,
              color: "rgba(255,255,255,0.4)",
            }}>
              álbum{total !== 1 ? "ns" : ""} publicado{total !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Abas de categoria ────────────────────────────────────────────────────────

function CategoriasBar({ categorias, ativa, onChange }) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 6,
      background: "#fff", borderRadius: 12, padding: 5,
      boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
      border: `1px solid ${COLORS.grayLight}`,
      marginBottom: 16,
    }}>
      {/* "Todos" */}
      {[{ value: "", label: "Todos", icon: "Camera" }, ...categorias.map(c => ({ value: c, ...catMeta(c) }))].map(cat => {
        const active = cat.value === ativa;
        const meta   = cat.value ? catMeta(cat.value) : { color: COLORS.dark };
        return (
          <button
            key={cat.value}
            onClick={() => onChange(cat.value)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 9, border: "none",
              background: active ? (cat.value ? meta.color : COLORS.dark) : "transparent",
              color: active ? "#fff" : COLORS.gray,
              fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: 0.5,
              cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
            }}
          >
            <Icon name={cat.icon} size={14} /> {cat.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Barra de busca ───────────────────────────────────────────────────────────

function BuscaBar({ busca, onChange }) {
  return (
    <div style={{
      position: "relative", marginBottom: 28,
    }}>
      <span style={{
        position: "absolute", left: 14, top: "50%",
        transform: "translateY(-50%)", fontSize: 15, color: COLORS.gray,
        pointerEvents: "none",
      }}><Icon name="Search" size={14} /></span>
      <input
        type="search"
        value={busca}
        onChange={e => onChange(e.target.value)}
        placeholder="Buscar álbuns por título ou descrição…"
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "11px 14px 11px 40px", borderRadius: 10,
          border: `1.5px solid ${COLORS.grayLight}`,
          fontFamily: FONTS.body, fontSize: 14,
          background: "#fff", color: COLORS.dark, outline: "none",
        }}
      />
    </div>
  );
}

// ─── Card de álbum ────────────────────────────────────────────────────────────

function AlbumCard({ album }) {
  const [hov, setHov] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const meta  = catMeta(album.category);
  const count = (album.images || []).length;

  return (
    <Link
      to={`/galeria/${album.id}`}
      style={{ textDecoration: "none", display: "block" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <article style={{
        borderRadius: 14, overflow: "hidden",
        boxShadow: hov
          ? "0 12px 40px rgba(0,0,0,0.18)"
          : "0 2px 12px rgba(0,0,0,0.08)",
        transform: hov ? "translateY(-4px)" : "none",
        transition: "box-shadow 0.25s, transform 0.22s",
        background: "#fff",
        border: `1.5px solid ${hov ? meta.border : COLORS.grayLight}`,
      }}>
        {/* Capa */}
        <div style={{
          position: "relative", paddingBottom: "62%",
          overflow: "hidden", background: "#1a1a1a",
        }}>
          {album.cover && !imgErr ? (
            <img
              src={album.cover}
              alt={album.title}
              onError={() => setImgErr(true)}
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%", objectFit: "cover",
                transform: hov ? "scale(1.07)" : "scale(1)",
                transition: "transform 0.4s ease",
              }}
            />
          ) : (
            <div style={{
              position: "absolute", inset: 0,
              background: `linear-gradient(135deg, ${meta.color}cc, ${meta.color}55)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 52,
            }}>
              <Icon name={meta.icon} size={52} />
            </div>
          )}

          {/* Overlay escuro no hover */}
          <div style={{
            position: "absolute", inset: 0,
            background: hov ? "rgba(0,0,0,0.25)" : "transparent",
            transition: "background 0.25s",
          }} />

          {/* Badge contagem de fotos */}
          {count > 0 && (
            <div style={{
              position: "absolute", top: 10, right: 10,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
              color: "#fff", borderRadius: 20,
              padding: "3px 10px",
              fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800,
              letterSpacing: 0.5,
            }}>
              <Icon name="Camera" size={12} /> {count} foto{count !== 1 ? "s" : ""}
            </div>
          )}

          {/* Badge categoria */}
          <div style={{
            position: "absolute", top: 10, left: 10,
            background: meta.color,
            color: "#fff", borderRadius: 20,
            padding: "3px 10px",
            fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: 1,
          }}>
            <Icon name={meta.icon} size={12} /> {meta.label}
          </div>

          {/* Ícone "ver álbum" no hover */}
          {hov && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                background: "rgba(255,255,255,0.92)", borderRadius: 50,
                width: 52, height: 52,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              }}>
                <Icon name="Play" size={22} />
              </div>
            </div>
          )}
        </div>

        {/* Texto */}
        <div style={{ padding: "14px 16px 16px" }}>
          <h2 style={{
            fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800,
            color: hov ? meta.color : COLORS.dark,
            margin: "0 0 6px", lineHeight: 1.25,
            textTransform: "uppercase", letterSpacing: 0.3,
            transition: "color 0.15s",
          }}>
            {album.title}
          </h2>

          {album.description && (
            <p style={{
              fontFamily: FONTS.body, fontSize: 13, color: "#4b5563",
              margin: "0 0 10px", lineHeight: 1.5,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {album.description}
            </p>
          )}

          <div style={{
            fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Icon name="Calendar" size={12} /> {fmtDateShort(album.date)}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

// ─── Estado vazio ─────────────────────────────────────────────────────────────

function EmptyState({ onReset }) {
  return (
    <div style={{
      textAlign: "center", padding: "64px 24px",
      background: "#fff", borderRadius: 16,
      border: `1.5px dashed ${COLORS.grayLight}`,
    }}>
      <div style={{ marginBottom: 16 }}></div>
      <p style={{
        fontFamily: FONTS.heading, fontSize: 16, fontWeight: 700,
        color: COLORS.gray, margin: "0 0 8px",
      }}>
        Nenhum álbum encontrado
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
        Ver todos os álbuns
      </button>
    </div>
  );
}

// ─── LISTAGEM ─────────────────────────────────────────────────────────────────

export function GaleriaListagem() {
  const [albums,     setAlbums]     = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoria,  setCategoria]  = useState("");
  const [busca,      setBusca]      = useState("");
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      GalleryService.list(),
      GalleryService.getCategorias(),
    ]).then(([rList, rCats]) => {
      if (!rList.error) setAlbums(rList.data);
      if (!rCats.error) setCategorias(rCats.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { document.title = "Galeria de Fotos | FMA"; }, []);

  const filtrados = albums.filter(a => {
    if (categoria && a.category !== categoria) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        (a.description || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const reset = () => { setCategoria(""); setBusca(""); };

  return (
    <>
      <ListagemHero total={albums.length} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 72px" }}>
        {loading ? <Skeleton /> : (
          <>
            <CategoriasBar categorias={categorias} ativa={categoria} onChange={c => { setCategoria(c); setBusca(""); }} />
            <BuscaBar busca={busca} onChange={setBusca} />

            {filtrados.length === 0 ? (
              <EmptyState onReset={reset} />
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 22,
              }}>
                {filtrados.map(album => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── LIGHTBOX ─────────────────────────────────────────────────────────────────

function Lightbox({ images, index, onClose, onPrev, onNext, onJump }) {
  const img = normalizeImage(images[index]);
  const total = images.length;

  // Fechar com ESC, navegar com setas
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowLeft")  onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.94)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      {/* Fechar */}
      <button
        onClick={onClose}
        style={{
          position: "fixed", top: 18, right: 18,
          width: 44, height: 44, borderRadius: "50%",
          background: "rgba(255,255,255,0.12)", border: "none",
          color: "#fff", fontSize: 20, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s", zIndex: 10,
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
      >✕</button>

      {/* Contador */}
      <div style={{
        position: "fixed", top: 22, left: "50%", transform: "translateX(-50%)",
        fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700,
        color: "rgba(255,255,255,0.6)", letterSpacing: 1, zIndex: 10,
      }}>
        {index + 1} / {total}
      </div>

      {/* Prev */}
      {total > 1 && (
        <button
          onClick={e => { e.stopPropagation(); onPrev(); }}
          style={{
            position: "fixed", left: 14, top: "50%", transform: "translateY(-50%)",
            width: 48, height: 48, borderRadius: "50%",
            background: "rgba(255,255,255,0.12)", border: "none",
            color: "#fff", fontSize: 20, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s", zIndex: 10,
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
        >‹</button>
      )}

      {/* Next */}
      {total > 1 && (
        <button
          onClick={e => { e.stopPropagation(); onNext(); }}
          style={{
            position: "fixed", right: 14, top: "50%", transform: "translateY(-50%)",
            width: 48, height: 48, borderRadius: "50%",
            background: "rgba(255,255,255,0.12)", border: "none",
            color: "#fff", fontSize: 20, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s", zIndex: 10,
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
        >›</button>
      )}

      {/* Imagem principal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", maxWidth: "90vw", maxHeight: "90vh",
        }}
      >
        <img
          key={img.url}
          src={img.url}
          alt={img.caption || ""}
          style={{
            maxWidth: "85vw", maxHeight: "78vh",
            objectFit: "contain", borderRadius: 8,
            boxShadow: "0 8px 60px rgba(0,0,0,0.5)",
          }}
        />
        {img.caption && (
          <div style={{
            marginTop: 14, textAlign: "center",
            fontFamily: FONTS.body, fontSize: 14,
            color: "rgba(255,255,255,0.75)", maxWidth: 600,
            lineHeight: 1.5,
          }}>
            {img.caption}
          </div>
        )}
      </div>

      {/* Miniaturas — rodapé */}
      {total > 1 && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          padding: "12px 20px", zIndex: 10,
          display: "flex", gap: 6, overflowX: "auto",
          justifyContent: "center",
          background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
        }}>
          {images.map((raw, i) => {
            const { url } = normalizeImage(raw);
            return (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); onJump(i); }}
                style={{
                  width: 52, height: 38, borderRadius: 5, overflow: "hidden",
                  border: i === index ? "2px solid #fff" : "2px solid transparent",
                  padding: 0, cursor: "pointer", flexShrink: 0,
                  opacity: i === index ? 1 : 0.55,
                  transition: "opacity 0.15s, border-color 0.15s",
                }}
              >
                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ÁLBUM (detalhe) ──────────────────────────────────────────────────────────

export function GaleriaAlbum() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album,   setAlbum]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro,    setErro]    = useState("");
  const [lbIndex, setLbIndex] = useState(null); // null = fechado

  useEffect(() => {
    GalleryService.get(id).then(r => {
      if (r.error) { setErro(r.error); setLoading(false); return; }
      setAlbum(r.data);
      document.title = `${r.data.title} | Galeria FMA`;
      setLoading(false);
    });
  }, [id]);

  const images = album ? (album.images || []) : [];
  const total  = images.length;
  const meta   = album ? catMeta(album.category) : catMeta("outro");

  const openLightbox = useCallback((i) => setLbIndex(i), []);
  const closeLightbox = useCallback(() => setLbIndex(null), []);
  const prevPhoto = useCallback(() =>
    setLbIndex(i => (i - 1 + total) % total), [total]);
  const nextPhoto = useCallback(() =>
    setLbIndex(i => (i + 1) % total), [total]);
  const jumpPhoto = useCallback((i) => setLbIndex(i), []);

  if (loading) return (
    <div style={{ maxWidth: 1000, margin: "60px auto", padding: "0 32px", textAlign: "center" }}>
      <Skeleton />
    </div>
  );

  if (erro || !album) return (
    <div style={{ maxWidth: 700, margin: "60px auto", padding: "0 32px", textAlign: "center" }}>
      <div style={{ marginBottom: 16 }}></div>
      <h2 style={{ fontFamily: FONTS.heading, fontSize: 22, color: COLORS.dark }}>Álbum não encontrado</h2>
      <button onClick={() => navigate("/galeria")} style={{
        marginTop: 16, padding: "10px 22px", borderRadius: 9,
        border: "none", background: COLORS.dark, color: "#fff",
        fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer",
      }}>← Galeria</button>
    </div>
  );

  return (
    <>
      {/* Lightbox */}
      {lbIndex !== null && (
        <Lightbox
          images={images}
          index={lbIndex}
          onClose={closeLightbox}
          onPrev={prevPhoto}
          onNext={nextPhoto}
          onJump={jumpPhoto}
        />
      )}

      {/* Banner do álbum */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: "#1a1a1a",
        minHeight: 320,
        display: "flex", alignItems: "flex-end",
      }}>
        {album.cover && (
          <img
            src={album.cover}
            alt={album.title}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%", objectFit: "cover",
              opacity: 0.38,
            }}
          />
        )}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.2) 100%)",
        }} />

        <div style={{
          position: "relative", maxWidth: 1000,
          margin: "0 auto", padding: "0 32px 40px", width: "100%",
        }}>
          {/* Breadcrumb */}
          <div style={{
            fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 2,
            color: "rgba(255,255,255,0.45)", marginBottom: 20,
          }}>
            <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>FMA</Link>
            {" › "}
            <Link to="/galeria" style={{ color: "inherit", textDecoration: "none" }}>Galeria</Link>
            {" › "}
            <span style={{ color: meta.color }}>{album.title}</span>
          </div>

          {/* Badge categoria */}
          <div style={{ marginBottom: 12 }}>
            <span style={{
              padding: "4px 14px", borderRadius: 20,
              fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: 1,
              background: meta.color, color: "#fff",
            }}>
              <Icon name={meta.icon} size={12} /> {meta.label}
            </span>
          </div>

          <h1 style={{
            fontFamily: FONTS.heading,
            fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
            fontWeight: 900, color: "#fff",
            margin: "0 0 12px", textTransform: "uppercase",
            letterSpacing: 1, lineHeight: 1.15,
          }}>
            {album.title}
          </h1>

          <div style={{
            display: "flex", gap: 20, flexWrap: "wrap",
            fontFamily: FONTS.body, fontSize: 14,
            color: "rgba(255,255,255,0.65)",
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Calendar" size={14} /> {fmtDate(album.date)}</span>
            {total > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Camera" size={14} /> {total} foto{total !== 1 ? "s" : ""}</span>}
          </div>

          {album.description && (
            <p style={{
              fontFamily: FONTS.body, fontSize: 15,
              color: "rgba(255,255,255,0.75)", margin: "14px 0 0",
              maxWidth: 640, lineHeight: 1.6,
            }}>
              {album.description}
            </p>
          )}
        </div>
      </div>

      {/* Grade de fotos */}
      <div style={{ maxWidth: 1000, margin: "40px auto 72px", padding: "0 32px" }}>
        {total === 0 ? (
          <div style={{
            textAlign: "center", padding: "64px 24px",
            background: "#fff", borderRadius: 16,
            border: `1.5px dashed ${COLORS.grayLight}`,
          }}>
            <div style={{ marginBottom: 16 }}></div>
            <p style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 700, color: COLORS.gray, margin: 0 }}>
              Nenhuma foto neste álbum ainda.
            </p>
          </div>
        ) : (
          <>
            {/* Instrução */}
            <div style={{
              fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray,
              marginBottom: 20, display: "flex", alignItems: "center", gap: 8,
            }}>
              <Icon name="Info" size={14} /> Clique em qualquer foto para ampliar
            </div>

            {/* Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 12,
            }}>
              {images.map((raw, i) => {
                const { url, caption } = normalizeImage(raw);
                return (
                  <PhotoThumb
                    key={i}
                    url={url}
                    caption={caption}
                    index={i}
                    onClick={openLightbox}
                    color={meta.color}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* Voltar */}
        <div style={{ marginTop: 40 }}>
          <Link
            to="/galeria"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700,
              color: COLORS.gray, textDecoration: "none",
            }}
          >
            ← Todos os álbuns
          </Link>
        </div>
      </div>
    </>
  );
}

// ─── Miniatura de foto ────────────────────────────────────────────────────────

function PhotoThumb({ url, caption, index, onClick, color }) {
  const [hov, setHov]     = useState(false);
  const [err, setErr]     = useState(false);

  return (
    <button
      onClick={() => onClick(index)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "block", padding: 0, border: "none",
        borderRadius: 10, overflow: "hidden", cursor: "zoom-in",
        position: "relative", paddingBottom: "72%",
        background: "#1a1a1a",
        boxShadow: hov
          ? `0 8px 28px rgba(0,0,0,0.22), inset 0 0 0 2px ${color}`
          : "0 1px 6px rgba(0,0,0,0.1)",
        transition: "box-shadow 0.2s, transform 0.18s",
        transform: hov ? "scale(1.025)" : "scale(1)",
      }}
    >
      {url && !err ? (
        <img
          src={url}
          alt={caption || `Foto ${index + 1}`}
          onError={() => setErr(true)}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%", objectFit: "cover",
            transform: hov ? "scale(1.06)" : "scale(1)",
            transition: "transform 0.35s ease",
          }}
        />
      ) : (
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(135deg, ${color}44, ${color}22)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32,
        }}>
          <Icon name="Camera" size={32} />
        </div>
      )}

      {/* Overlay + ícone de zoom */}
      <div style={{
        position: "absolute", inset: 0,
        background: hov ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0)",
        transition: "background 0.2s",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {hov && (
          <div style={{
            background: "rgba(255,255,255,0.9)", borderRadius: "50%",
            width: 36, height: 36,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>
            <Icon name="Search" size={16} />
          </div>
        )}
      </div>

      {/* Caption mini */}
      {caption && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "18px 8px 6px",
          background: "linear-gradient(transparent, rgba(0,0,0,0.65))",
          fontFamily: FONTS.body, fontSize: 11, color: "rgba(255,255,255,0.9)",
          lineHeight: 1.3, textAlign: "left",
          opacity: hov ? 1 : 0,
          transition: "opacity 0.2s",
        }}>
          {caption}
        </div>
      )}
    </button>
  );
}
