/**
 * InstitutionalPage.jsx
 *
 * Renderer público universal para todas as páginas institucionais.
 * Rota: /institucional/:slug
 *
 * Lê o slug da URL → busca a página → carrega as seções publicadas → renderiza.
 * Nenhum conteúdo está fixo aqui: tudo vem do banco via InstitutionalPagesService.
 */

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";
import {
  InstitutionalPagesService,
  InstitutionalSectionsService,
} from "../../services/index";

// ─── Renderizador de Seção ────────────────────────────────────────────────────

function SectionRenderer({ section }) {
  const { title, subtitle, content, image, imagePosition, fileUrl, fileLabel, layout, bgColor } = section;

  const showText  = layout !== "file";
  const showImage = ["text-image", "text-image-file"].includes(layout);
  const showFile  = ["text-file", "file", "text-image-file"].includes(layout);
  const imgLeft   = imagePosition === "left";
  const imgTop    = imagePosition === "top";

  return (
    <section style={{
      background: bgColor || "transparent",
      padding: "52px 24px",
      borderBottom: `1px solid ${COLORS.grayLight}`,
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Cabeçalho da seção */}
        {(title || subtitle) && (
          <div style={{ marginBottom: 32 }}>
            {title && (
              <h2 style={{
                fontFamily: FONTS.heading,
                fontSize: "clamp(1.5rem, 3vw, 2.1rem)",
                fontWeight: 800,
                color: COLORS.dark,
                textTransform: "uppercase",
                letterSpacing: 1,
                margin: "0 0 8px",
              }}>{title}</h2>
            )}
            {subtitle && (
              <p style={{
                fontFamily: FONTS.body,
                fontSize: 16,
                color: COLORS.gray,
                margin: 0,
                lineHeight: 1.5,
                borderLeft: `3px solid ${COLORS.primary}`,
                paddingLeft: 14,
              }}>{subtitle}</p>
            )}
          </div>
        )}

        {/* Layout: imagem no topo */}
        {showImage && imgTop && image && (
          <div style={{ marginBottom: 28 }}>
            <img
              src={image}
              alt={title}
              style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 12 }}
            />
          </div>
        )}

        {/* Layout: texto + imagem lado a lado */}
        {showImage && !imgTop ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 40,
            alignItems: "start",
          }}>
            {imgLeft && image && (
              <img
                src={image}
                alt={title}
                style={{ width: "100%", borderRadius: 12, objectFit: "cover", maxHeight: 380 }}
              />
            )}
            <div>
              {showText && content && (
                <div
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 15,
                    lineHeight: 1.8,
                    color: COLORS.dark,
                  }}
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )}
              {showFile && fileUrl && (
                <DownloadButton url={fileUrl} label={fileLabel} />
              )}
            </div>
            {!imgLeft && image && (
              <img
                src={image}
                alt={title}
                style={{ width: "100%", borderRadius: 12, objectFit: "cover", maxHeight: 380 }}
              />
            )}
          </div>
        ) : (
          /* Layout: apenas texto (ou texto+arquivo sem imagem lateral) */
          !showImage && (
            <div>
              {showText && content && (
                <div
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: 15,
                    lineHeight: 1.8,
                    color: COLORS.dark,
                    maxWidth: 820,
                  }}
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )}
              {showFile && fileUrl && (
                <DownloadButton url={fileUrl} label={fileLabel} />
              )}
            </div>
          )
        )}

        {/* Arquivo quando há imagem em cima (top) */}
        {showImage && imgTop && showFile && fileUrl && (
          <DownloadButton url={fileUrl} label={fileLabel} />
        )}

        {/* Layout "file" — apenas download, sem texto */}
        {layout === "file" && fileUrl && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <DownloadButton url={fileUrl} label={fileLabel} centered />
          </div>
        )}
      </div>
    </section>
  );
}

function DownloadButton({ url, label, centered }) {
  return (
    <div style={{ marginTop: 24, textAlign: centered ? "center" : "left" }}>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          background: COLORS.primary,
          color: "#fff",
          textDecoration: "none",
          padding: "12px 24px",
          borderRadius: 8,
          fontFamily: FONTS.heading,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 0.5,
          transition: "background 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = COLORS.primaryDark || "#990000"}
        onMouseLeave={e => e.currentTarget.style.background = COLORS.primary}
      >
        <span style={{ fontSize: 18 }}>📥</span>
        {label || "Baixar Documento"}
      </a>
    </div>
  );
}

// ─── Hero da Página ───────────────────────────────────────────────────────────

function PageHero({ page }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${COLORS.primaryDark || "#990000"} 0%, ${COLORS.primary} 60%)`,
      color: "#fff",
      padding: "52px 24px 44px",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <nav style={{ fontSize: 12, marginBottom: 16, fontFamily: FONTS.body, opacity: 0.75 }}>
          <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>Início</Link>
          {" / "}
          {(() => {
            const slug = page.slug || "";
            if (slug === "como-se-filiar" || slug.startsWith("equipes/"))
              return <Link to="/equipes" style={{ color: "#fff", textDecoration: "none" }}>Equipes</Link>;
            if (slug.startsWith("atletismo/") || ["pistas","regras","normas","tabelas"].includes(slug))
              return <Link to="/atletismo/historia" style={{ color: "#fff", textDecoration: "none" }}>Atletismo</Link>;
            if (slug.startsWith("arbitros") || slug === "cadastro-arbitro")
              return <Link to="/arbitros" style={{ color: "#fff", textDecoration: "none" }}>Árbitros</Link>;
            if (slug.startsWith("atletas") || slug === "como-se-federar")
              return <Link to="/atletas" style={{ color: "#fff", textDecoration: "none" }}>Atletas</Link>;
            return <Link to="/institucional/sobre" style={{ color: "#fff", textDecoration: "none" }}>A FMA</Link>;
          })()}
          {" / "}
          <span>{page.menuLabel || page.title}</span>
        </nav>
        <h1 style={{
          fontFamily: FONTS.heading,
          fontSize: "clamp(2rem, 5vw, 3.2rem)",
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: 2,
          margin: "0 0 12px",
        }}>{page.title}</h1>
        {page.description && (
          <p style={{ fontFamily: FONTS.body, fontSize: 16, opacity: 0.85, margin: 0, maxWidth: 640 }}>
            {page.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Página Pública ───────────────────────────────────────────────────────────

export default function InstitutionalPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [sections, setSections] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | notfound

  useEffect(() => {
    setStatus("loading");
    setPage(null);
    setSections([]);

    InstitutionalPagesService.get(slug).then(async (r) => {
      if (!r.data || !r.data.published) { setStatus("notfound"); return; }
      setPage(r.data);

      const sr = await InstitutionalSectionsService.list({ pageId: r.data.id, publishedOnly: true });
      setSections(sr.data || []);
      setStatus("ok");
    });
  }, [slug]);

  if (status === "loading") {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center", fontFamily: FONTS.body }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <p style={{ color: COLORS.gray }}>Carregando...</p>
      </div>
    );
  }

  if (status === "notfound") {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center", fontFamily: FONTS.body }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
        <h1 style={{ fontFamily: FONTS.heading, color: COLORS.primary, fontSize: 28, textTransform: "uppercase" }}>
          Página não encontrada
        </h1>
        <p style={{ color: COLORS.gray }}>Esta página não existe ou ainda não foi publicada.</p>
        <Link to="/" style={{ color: COLORS.primary, fontWeight: 700 }}>← Voltar ao início</Link>
      </div>
    );
  }

  return (
    <div>
      <PageHero page={page} />

      {sections.length === 0 ? (
        <div style={{ padding: "64px 24px", textAlign: "center" }}>
          <p style={{ fontFamily: FONTS.body, color: COLORS.gray, fontSize: 15 }}>
            Conteúdo em elaboração. Em breve.
          </p>
        </div>
      ) : (
        sections.map(section => (
          <SectionRenderer key={section.id} section={section} />
        ))
      )}
    </div>
  );
}
