import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";
import HeroBanner from "../../components/ui/HeroBanner";
import NewsCard from "../../components/ui/NewsCard";
import GalleryCard from "../../components/ui/GalleryCard";
import {
  NewsService, GalleryService, BannersService,
  PartnersService, SocialLinksService, FooterConfigService,
} from "../../services/index";
import { QUICK_ACCESS } from "../../config/navigation";

// ─── Bloco de Parceiros ───────────────────────────────────────────────────────

function PartnersBlock({ partners }) {
  if (!partners.length) return null;
  return (
    <section style={{ background: "#fff", padding: "48px 24px", borderTop: `1px solid ${COLORS.grayLight}` }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: COLORS.primary, marginBottom: 6 }}>Institucional</div>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, color: COLORS.dark, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Parceiros</h2>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 28 }}>
          {partners.map(p => (
            <a
              key={p.id}
              href={p.link || "#"}
              target={p.link && p.link !== "#" ? "_blank" : "_self"}
              rel="noreferrer"
              title={p.name}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "12px 16px", borderRadius: 10,
                border: `1px solid ${COLORS.grayLight}`,
                background: "#fff", textDecoration: "none",
                transition: "box-shadow 0.2s, transform 0.2s",
                minWidth: 140, minHeight: 72,
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {p.logo
                ? <img src={p.logo} alt={p.name} style={{ maxHeight: 52, maxWidth: 140, objectFit: "contain" }} />
                : <span style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.grayDark, textAlign: "center" }}>{p.name}</span>
              }
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Bloco de Redes Sociais ───────────────────────────────────────────────────

function SocialBlock({ socialLinks }) {
  if (!socialLinks.length) return null;
  return (
    <section style={{ background: COLORS.grayLight, padding: "48px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontFamily: FONTS.heading, fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, color: COLORS.dark, margin: "0 0 28px", textTransform: "uppercase", letterSpacing: 1 }}>Redes Sociais</h2>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
          {socialLinks.map(s => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: "#fff", borderRadius: 14,
                width: 110, height: 90,
                textDecoration: "none", overflow: "hidden",
                color: COLORS.dark, fontFamily: FONTS.heading,
                fontSize: 13, fontWeight: 600, gap: 8,
                boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                border: `1px solid ${COLORS.grayLight}`,
                transition: "background 0.2s, transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(204,0,0,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)"; }}
            >
              {s.icon && (s.icon.startsWith("http") || s.icon.startsWith("data:"))
                ? <img src={s.icon} alt={s.label} title={s.label} style={{ maxWidth: "85%", maxHeight: "85%", objectFit: "contain" }} />
                : <><span style={{ fontSize: 30 }}>{s.icon}</span>{s.label}</>}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Bloco de Notícias em Destaque ────────────────────────────────────────────

function FeaturedNewsBlock({ featured, regular }) {
  if (!featured && !regular.length) return null;

  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: COLORS.primary, marginBottom: 6 }}>FMA Notícias</div>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, color: COLORS.dark, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Últimas Notícias</h2>
        </div>
        <Link to="/noticias"
          style={{ fontFamily: FONTS.heading, fontSize: 13.5, fontWeight: 700, color: COLORS.primary, textDecoration: "none", textTransform: "uppercase", letterSpacing: 1, border: `2px solid ${COLORS.primary}`, padding: "7px 18px", borderRadius: 6 }}
          onMouseEnter={e => { e.currentTarget.style.background = COLORS.primary; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = COLORS.primary; }}
        >
          Todas as Notícias
        </Link>
      </div>

      {/* Destaque + grade */}
      <div style={{ display: "grid", gridTemplateColumns: featured ? "1fr 1fr" : "1fr", gap: 28 }}>
        {/* Notícia em destaque */}
        {featured && (
          <Link to={`/noticias/${featured.slug || featured.id}`} style={{ textDecoration: "none", display: "block", borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.1)", gridRow: "1 / 3", transition: "transform 0.3s" }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            <div style={{ position: "relative" }}>
              <img src={featured.image || "https://placehold.co/800x500/cc0000/fff?text=Notícia"} alt={featured.title} style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", top: 14, left: 14, background: COLORS.primary, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 20, fontFamily: FONTS.heading, letterSpacing: 1, textTransform: "uppercase" }}>Destaque</div>
            </div>
            <div style={{ padding: "22px 24px 26px", background: "#fff" }}>
              <p style={{ fontFamily: FONTS.body, fontSize: 11.5, color: COLORS.gray, margin: "0 0 8px" }}>
                {featured.date ? new Date(featured.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : ""}
              </p>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 800, color: COLORS.dark, margin: "0 0 10px", lineHeight: 1.3 }}>{featured.title}</h3>
              <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: "0 0 16px", lineHeight: 1.6 }}>{featured.excerpt}</p>
              <span style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.primary, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `2px solid ${COLORS.primaryLight}` }}>Leia Mais →</span>
            </div>
          </Link>
        )}

        {/* Grade das demais */}
        {regular.map(item => <NewsCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [banners, setBanners] = useState([]);
  const [news, setNews] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [partners, setPartners] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);
  const [footerConfig, setFooterConfig] = useState(null);

  useEffect(() => {
    BannersService.list({ activeOnly: true }).then(r => r.data && setBanners(r.data));
    NewsService.list({ publishedOnly: true, limit: 7 }).then(r => r.data && setNews(r.data));
    GalleryService.list({ publishedOnly: true }).then(r => r.data && setGallery(r.data.slice(0, 4)));
    PartnersService.list({ activeOnly: true }).then(r => r.data && setPartners(r.data));
    SocialLinksService.list({ activeOnly: true }).then(r => r.data && setSocialLinks(r.data));
    FooterConfigService.get().then(r => r.data && setFooterConfig(r.data));
  }, []);

  // Separa destaque das demais notícias
  const featured = news.find(n => n.featured) || null;
  const regularNews = news.filter(n => !featured || n.id !== featured.id).slice(0, 6);

  return (
    <div>
      {/* 1. Banner principal editável */}
      <HeroBanner banners={banners} />

      {/* 2. Últimas notícias com destaque */}
      <FeaturedNewsBlock featured={featured} regular={regularNews} />

      {/* 3. Galeria */}
      {gallery.length > 0 && (
        <section style={{ background: COLORS.grayLight, padding: "56px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: COLORS.primary, marginBottom: 6 }}>Fotos e Eventos</div>
              <h2 style={{ fontFamily: FONTS.heading, fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, color: COLORS.dark, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Galeria de Fotos</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
              {gallery.map(item => <GalleryCard key={item.id} item={item} />)}
            </div>
          </div>
        </section>
      )}

      {/* 4. Acesso rápido */}
      <section style={{ background: COLORS.primary, padding: "48px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: 1, marginBottom: 32 }}>Acesso Rápido</h2>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
            {QUICK_ACCESS.map((b, i) => (
              <Link key={i} to={b.to}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "20px 28px", textDecoration: "none", color: "#fff", fontFamily: FONTS.heading, fontSize: 14, fontWeight: 600, letterSpacing: 0.5, gap: 8, minWidth: 110, border: "1px solid rgba(255,255,255,0.15)", transition: "background 0.2s, transform 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {b.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Redes Sociais */}
      {footerConfig?.showSocialLinks !== false && <SocialBlock socialLinks={socialLinks} />}

      {/* 6. Parceiros */}
      {footerConfig?.showPartners !== false && <PartnersBlock partners={partners} />}
    </div>
  );
}
