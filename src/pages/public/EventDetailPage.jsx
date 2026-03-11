/**
 * EventDetailPage.jsx
 * Página pública de detalhe de um evento do calendário FMA.
 * Rota: /eventos/:id
 */
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";
import { CalendarService } from "../../services/index";
import { CALENDAR_CATEGORIES, EVENT_STATUS } from "../../config/navigation";

const catMap    = Object.fromEntries(CALENDAR_CATEGORIES.filter(c => c.value).map(c => [c.value, c]));
const statusMap = Object.fromEntries(EVENT_STATUS.map(s => [s.value, s]));

function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function DownloadBtn({ href, label, icon }) {
  if (!href || href === "#demo") return null;
  return (
    <a href={href} target="_blank" rel="noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 8, background: COLORS.primary, color: "#fff", textDecoration: "none", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, transition: "background 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.background = "#990000"}
      onMouseLeave={e => e.currentTarget.style.background = COLORS.primary}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>{label}
    </a>
  );
}

function InfoRow({ icon, label, value, href }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: 12, borderBottom: `1px solid ${COLORS.grayLight}` }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 2 }}>{label}</div>
        {href
          ? <a href={href} target="_blank" rel="noreferrer" style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.primary }}>{value}</a>
          : <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.dark }}>{value}</div>}
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    setStatus("loading");
    CalendarService.get(id).then(r => {
      if (!r.data || !r.data.published) { setStatus("notfound"); return; }
      setEvent(r.data);
      setStatus("ok");
    });
  }, [id]);

  if (status === "loading") {
    return <div style={{ padding: "80px 24px", textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>⏳ Carregando...</div>;
  }
  if (status === "notfound") {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
        <h1 style={{ fontFamily: FONTS.heading, color: COLORS.primary, fontSize: 26, textTransform: "uppercase" }}>Evento não encontrado</h1>
        <Link to="/calendario" style={{ color: COLORS.primary, fontWeight: 700 }}>← Voltar ao Calendário</Link>
      </div>
    );
  }

  const cat    = catMap[event.category] || {};
  const stat   = statusMap[event.status] || statusMap.confirmado;
  const dt     = event.date ? new Date(event.date + "T12:00:00") : null;
  const hasFiles = event.permitFileUrl || event.chancelaFileUrl || event.resultsFileUrl || event.permitUrl;

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: event.coverImage
          ? `linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.55)), url(${event.coverImage}) center/cover`
          : `linear-gradient(135deg, #990000 0%, ${COLORS.primary} 100%)`,
        color: "#fff",
        padding: "56px 24px 48px",
        minHeight: 280,
        display: "flex",
        alignItems: "flex-end",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
          {/* Breadcrumb */}
          <nav style={{ fontSize: 12, marginBottom: 16, opacity: 0.75, fontFamily: FONTS.body }}>
            <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>Início</Link>
            {" / "}
            <Link to="/calendario" style={{ color: "#fff", textDecoration: "none" }}>Calendário</Link>
            {" / "}
            <span>{event.title}</span>
          </nav>

          {/* Badges */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: `${cat.color || COLORS.primary}cc`, color: "#fff" }}>
              {cat.icon} {cat.label || event.category}
            </span>
            <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: `${stat.color}cc`, color: "#fff" }}>
              {stat.label}
            </span>
            {event.featured && (
              <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: "#f59e0b", color: "#fff" }}>
                ⭐ Destaque
              </span>
            )}
          </div>

          <h1 style={{ fontFamily: FONTS.heading, fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>
            {event.title}
          </h1>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontFamily: FONTS.body, fontSize: 15, opacity: 0.9 }}>
            {dt && <span>📅 {fmtDate(event.date)}</span>}
            {event.time && <span>🕐 {event.time}</span>}
            {event.city && <span>📍 {event.location ? `${event.location}, ` : ""}{event.city}</span>}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 40, alignItems: "start" }}>

        {/* Coluna principal */}
        <div>
          {/* Descrição */}
          {(event.fullDescription || event.shortDescription || event.description) && (
            <div style={{ marginBottom: 36 }}>
              <h2 style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, marginBottom: 16 }}>Sobre o Evento</h2>
              {event.fullDescription ? (
                <div
                  style={{ fontFamily: FONTS.body, fontSize: 15, lineHeight: 1.8, color: COLORS.dark }}
                  dangerouslySetInnerHTML={{ __html: event.fullDescription }}
                />
              ) : (
                <p style={{ fontFamily: FONTS.body, fontSize: 15, lineHeight: 1.8, color: COLORS.dark }}>
                  {event.shortDescription || event.description}
                </p>
              )}
            </div>
          )}

          {/* Modalidades */}
          {event.modalities?.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, marginBottom: 14 }}>Modalidades / Categorias</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {event.modalities.map((m, i) => (
                  <span key={i} style={{ padding: "6px 16px", borderRadius: 20, background: `${cat.color || COLORS.primary}15`, color: cat.color || COLORS.primary, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Downloads */}
          {hasFiles && (
            <div style={{ background: "#f7f7f7", borderRadius: 12, padding: "24px 28px", marginBottom: 32 }}>
              <h2 style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, margin: "0 0 16px" }}>Downloads</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <DownloadBtn href={event.permitFileUrl || event.permitUrl} label="Permit do Evento" icon="📋" />
                <DownloadBtn href={event.chancelaFileUrl} label="Chancela FMA" icon="🏅" />
                <DownloadBtn href={event.resultsFileUrl} label="Resultados" icon="📊" />
              </div>
            </div>
          )}

          {/* Link externo */}
          {event.externalLink && (
            <a href={event.externalLink} target="_blank" rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 8, border: `2px solid ${COLORS.primary}`, color: COLORS.primary, textDecoration: "none", fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700 }}
              onMouseEnter={e => { e.currentTarget.style.background = COLORS.primary; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = COLORS.primary; }}
            >
              🔗 Acessar Site do Organizador
            </a>
          )}
        </div>

        {/* Sidebar com detalhes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 80 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "22px 20px", boxShadow: "0 2px 16px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, margin: 0 }}>Detalhes</h3>
            <InfoRow icon="📅" label="Data" value={fmtDate(event.date)} />
            <InfoRow icon="🕐" label="Horário" value={event.time} />
            <InfoRow icon="📍" label="Local" value={[event.location, event.city].filter(Boolean).join(", ")} />
            <InfoRow icon="🎽" label="Tipo" value={cat.label || event.category} />
            <InfoRow icon="👤" label="Organizador" value={event.organizer} href={event.externalLink || undefined} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
              <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontFamily: FONTS.heading, fontWeight: 700, background: `${stat.color}18`, color: stat.color }}>{stat.label}</span>
            </div>
          </div>

          <Link to="/calendario"
            style={{ textAlign: "center", padding: "11px 0", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, color: COLORS.gray, textDecoration: "none", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 600 }}>
            ← Ver Todos os Eventos
          </Link>
        </div>
      </div>
    </div>
  );
}
