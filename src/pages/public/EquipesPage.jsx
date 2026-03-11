/**
 * EquipesPage.jsx — Clubes e Equipes filiadas à FMA.
 *
 * Exports:
 *   EquipesListagem  → /equipes
 *   EquipeDetalhe    → /equipes/:slug
 */

import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { EquipesService } from "../../services/index";
import { COLORS, FONTS } from "../../styles/colors";

// ─── Utilitários ──────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

const SOCIAL_ICONS = {
  instagram: "📸",
  facebook:  "👍",
  youtube:   "▶️",
  whatsapp:  "💬",
  twitter:   "✖️",
  tiktok:    "🎵",
  linkedin:  "💼",
  site:      "🌐",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <>
      <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 20 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ height: 260, borderRadius: 14,
            background: "linear-gradient(135deg,#f0f0f0,#e4e4e4)",
            animation: "shimmer 1.5s ease-in-out infinite" }} />
        ))}
      </div>
    </>
  );
}

// ─── Card de equipe ───────────────────────────────────────────────────────────

function EquipeCard({ equipe }) {
  const [hov, setHov] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  return (
    <Link
      to={`/equipes/${equipe.slug}`}
      style={{ textDecoration: "none", display: "block" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <article style={{
        borderRadius: 14, overflow: "hidden", background: "#fff",
        boxShadow: hov ? "0 10px 36px rgba(0,0,0,0.14)" : "0 2px 10px rgba(0,0,0,0.07)",
        border: `1.5px solid ${hov ? "#fecaca" : COLORS.grayLight}`,
        transform: hov ? "translateY(-3px)" : "none",
        transition: "all 0.22s",
      }}>
        {/* Capa */}
        <div style={{ position: "relative", paddingBottom: "48%", overflow: "hidden", background: "#1a1a1a" }}>
          {equipe.coverImage && !imgErr ? (
            <img src={equipe.coverImage} alt={equipe.title} onError={() => setImgErr(true)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
                transform: hov ? "scale(1.06)" : "scale(1)", transition: "transform 0.4s" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0,
              background: "linear-gradient(135deg, #cc000044, #cc000022)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>
              🏃
            </div>
          )}
          <div style={{ position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />

          {/* Logo */}
          {equipe.logo && (
            <div style={{ position: "absolute", bottom: 12, left: 14,
              width: 48, height: 48, borderRadius: 10, overflow: "hidden",
              border: "2px solid rgba(255,255,255,0.8)",
              background: "#fff" }}>
              <img src={equipe.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div style={{ padding: "14px 16px 16px" }}>
          <h2 style={{
            fontFamily: FONTS.heading, fontSize: 17, fontWeight: 900,
            color: hov ? COLORS.primary : COLORS.dark,
            margin: "0 0 6px", textTransform: "uppercase",
            letterSpacing: 0.3, lineHeight: 1.2,
            transition: "color 0.15s",
          }}>
            {equipe.title}
          </h2>

          {equipe.cidade && (
            <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginBottom: 8 }}>
              📍 {equipe.cidade}{equipe.fundacao ? ` · Fundado em ${equipe.fundacao}` : ""}
            </div>
          )}

          {equipe.excerpt && (
            <p style={{
              fontFamily: FONTS.body, fontSize: 13, color: "#4b5563",
              margin: 0, lineHeight: 1.5,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {equipe.excerpt}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}

// ─── LISTAGEM ─────────────────────────────────────────────────────────────────

export function EquipesListagem() {
  const [equipes, setEquipes] = useState([]);
  const [busca,   setBusca]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Clubes e Equipes | FMA";
    EquipesService.list().then(r => {
      if (!r.error) setEquipes(r.data);
      setLoading(false);
    });
  }, []);

  const filtradas = equipes.filter(e => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      (e.cidade || "").toLowerCase().includes(q) ||
      (e.excerpt || "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 60%, #1a1a2e 100%)",
        padding: "52px 0 44px", marginBottom: 40,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", right: -10, top: "50%", transform: "translateY(-50%)",
          fontFamily: FONTS.heading, fontWeight: 900,
          fontSize: "clamp(5rem,12vw,9rem)",
          color: "rgba(255,255,255,0.03)", userSelect: "none",
        }}>🏃</div>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 2,
            color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
            FMA ›{" "}
            <Link to="/equipes" style={{ color: COLORS.primaryLight, textDecoration: "none" }}>Equipes</Link>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 32, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                <span style={{ fontSize: 40 }}>🏃</span>
                <h1 style={{ fontFamily: FONTS.heading,
                  fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 900,
                  color: "#fff", margin: 0, textTransform: "uppercase", letterSpacing: 2 }}>
                  Clubes e Equipes
                </h1>
              </div>
              <p style={{ fontFamily: FONTS.body, fontSize: 15,
                color: "rgba(255,255,255,0.6)", margin: 0, maxWidth: 480 }}>
                Conheça os clubes e equipes filiados à Federação Mineira de Atletismo.
              </p>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: FONTS.heading,
                fontSize: "clamp(2.4rem,6vw,4rem)", fontWeight: 900,
                color: COLORS.primary, lineHeight: 1 }}>
                {equipes.length}
              </div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 1.5,
                color: "rgba(255,255,255,0.4)" }}>
                equipe{equipes.length !== 1 ? "s" : ""} filiada{equipes.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 72px" }}>
        {loading ? <Skeleton /> : (
          <>
            {/* Busca */}
            <div style={{ position: "relative", marginBottom: 28 }}>
              <span style={{ position: "absolute", left: 14, top: "50%",
                transform: "translateY(-50%)", fontSize: 14,
                color: COLORS.gray, pointerEvents: "none" }}>🔍</span>
              <input
                type="search"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar equipe ou cidade…"
                style={{ width: "100%", boxSizing: "border-box",
                  padding: "11px 14px 11px 40px", borderRadius: 10,
                  border: `1.5px solid ${COLORS.grayLight}`,
                  fontFamily: FONTS.body, fontSize: 14, outline: "none", background: "#fff" }}
              />
            </div>

            {filtradas.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 24px",
                background: "#fff", borderRadius: 16,
                border: `1.5px dashed ${COLORS.grayLight}` }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                <p style={{ fontFamily: FONTS.heading, fontSize: 16,
                  fontWeight: 700, color: COLORS.gray, margin: 0 }}>
                  Nenhuma equipe encontrada.
                </p>
                <button onClick={() => setBusca("")}
                  style={{ marginTop: 16, padding: "9px 22px", borderRadius: 9,
                    border: "none", background: COLORS.dark, color: "#fff",
                    fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700,
                    cursor: "pointer" }}>
                  Ver todas
                </button>
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(290px,1fr))",
                gap: 22,
              }}>
                {filtradas.map(e => <EquipeCard key={e.id} equipe={e} />)}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── DETALHE ──────────────────────────────────────────────────────────────────

export function EquipeDetalhe() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [equipe,  setEquipe]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro,    setErro]    = useState("");

  useEffect(() => {
    EquipesService.get(slug).then(r => {
      if (r.error) { setErro(r.error); setLoading(false); return; }
      setEquipe(r.data);
      document.title = `${r.data.title} | Equipes FMA`;
      setLoading(false);
    });
  }, [slug]);

  if (loading) return (
    <div style={{ maxWidth: 860, margin: "60px auto", padding: "0 32px" }}>
      <Skeleton />
    </div>
  );

  if (erro || !equipe) return (
    <div style={{ maxWidth: 700, margin: "60px auto", padding: "0 32px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
      <h2 style={{ fontFamily: FONTS.heading, fontSize: 22, color: COLORS.dark }}>Equipe não encontrada</h2>
      <button onClick={() => navigate("/equipes")} style={{
        marginTop: 16, padding: "10px 22px", borderRadius: 9,
        border: "none", background: COLORS.dark, color: "#fff",
        fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        ← Equipes
      </button>
    </div>
  );

  return (
    <>
      {/* Banner */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: "#1a1a1a", minHeight: 300,
        display: "flex", alignItems: "flex-end",
      }}>
        {equipe.coverImage && (
          <img src={equipe.coverImage} alt={equipe.title} style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%", objectFit: "cover", opacity: 0.35,
          }} />
        )}
        <div style={{ position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.2) 100%)" }} />

        <div style={{ position: "relative", maxWidth: 860,
          margin: "0 auto", padding: "0 32px 40px", width: "100%" }}>
          {/* Breadcrumb */}
          <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 2,
            color: "rgba(255,255,255,0.45)", marginBottom: 20 }}>
            <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>FMA</Link>
            {" › "}
            <Link to="/equipes" style={{ color: "inherit", textDecoration: "none" }}>Equipes</Link>
            {" › "}
            <span style={{ color: COLORS.primaryLight }}>{equipe.title}</span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
            {equipe.logo && (
              <div style={{ width: 72, height: 72, borderRadius: 14, overflow: "hidden",
                border: "3px solid rgba(255,255,255,0.6)",
                background: "#fff", flexShrink: 0 }}>
                <img src={equipe.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            <div>
              <h1 style={{ fontFamily: FONTS.heading,
                fontSize: "clamp(1.8rem,5vw,2.8rem)", fontWeight: 900,
                color: "#fff", margin: "0 0 8px",
                textTransform: "uppercase", letterSpacing: 1, lineHeight: 1.15 }}>
                {equipe.title}
              </h1>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap",
                fontFamily: FONTS.body, fontSize: 14,
                color: "rgba(255,255,255,0.65)" }}>
                {equipe.cidade && <span>📍 {equipe.cidade}</span>}
                {equipe.fundacao && <span>🗓️ Fundado em {equipe.fundacao}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: 860, margin: "40px auto 72px", padding: "0 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 32, alignItems: "start" }}>

          {/* Texto principal */}
          <div>
            {equipe.excerpt && (
              <p style={{ fontFamily: FONTS.body, fontSize: 16,
                color: COLORS.gray, margin: "0 0 24px",
                lineHeight: 1.7, fontStyle: "italic",
                borderLeft: `3px solid ${COLORS.primary}`,
                paddingLeft: 16 }}>
                {equipe.excerpt}
              </p>
            )}
            {equipe.content ? (
              <div
                style={{ fontFamily: FONTS.body, fontSize: 15, lineHeight: 1.8, color: COLORS.dark }}
                dangerouslySetInnerHTML={{ __html: equipe.content }}
              />
            ) : (
              <p style={{ fontFamily: FONTS.body, color: COLORS.gray }}>
                Sem conteúdo disponível ainda.
              </p>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ position: "sticky", top: 80 }}>
            <div style={{ background: "#fff", borderRadius: 14,
              border: `1.5px solid ${COLORS.grayLight}`,
              padding: "20px 20px 24px" }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: 1,
                color: COLORS.dark, marginBottom: 16 }}>
                Informações
              </div>

              {[
                equipe.cidade    && { icon: "📍", label: "Cidade",       val: equipe.cidade },
                equipe.fundacao  && { icon: "🗓️", label: "Fundação",     val: equipe.fundacao },
                equipe.contato   && { icon: "✉️",  label: "Contato",     val: equipe.contato, href: equipe.contato.includes("@") ? `mailto:${equipe.contato}` : equipe.contato },
              ].filter(Boolean).map((item, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: 1,
                    color: COLORS.gray, marginBottom: 2 }}>
                    {item.icon} {item.label}
                  </div>
                  {item.href ? (
                    <a href={item.href} style={{ fontFamily: FONTS.body, fontSize: 13,
                      color: "#0066cc", textDecoration: "none" }}>
                      {item.val}
                    </a>
                  ) : (
                    <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark }}>
                      {item.val}
                    </div>
                  )}
                </div>
              ))}

              {/* Redes sociais */}
              {(equipe.redesSociais || []).length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16,
                  borderTop: `1px solid ${COLORS.grayLight}` }}>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: 1,
                    color: COLORS.gray, marginBottom: 10 }}>
                    Redes Sociais
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {equipe.redesSociais.map((rs, i) => (
                      <a key={i} href={rs.url} target="_blank" rel="noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 4,
                          padding: "6px 12px", borderRadius: 20,
                          background: COLORS.offWhite, border: `1px solid ${COLORS.grayLight}`,
                          fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
                          color: COLORS.dark, textDecoration: "none",
                          textTransform: "capitalize" }}>
                        <span>{SOCIAL_ICONS[rs.rede] || "🔗"}</span>
                        {rs.rede}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Voltar */}
            <div style={{ marginTop: 16 }}>
              <Link to="/equipes"
                style={{ display: "inline-flex", alignItems: "center", gap: 6,
                  fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700,
                  color: COLORS.gray, textDecoration: "none" }}>
                ← Todas as equipes
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
