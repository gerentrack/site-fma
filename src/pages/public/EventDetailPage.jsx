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
import Icon from "../../utils/icons";
import PdfModal, { usePdfModal } from "../../components/ui/PdfModal";

const catMap    = Object.fromEntries(CALENDAR_CATEGORIES.filter(c => c.value).map(c => [c.value, c]));
const statusMap = Object.fromEntries(EVENT_STATUS.map(s => [s.value, s]));

const SvgCalendar = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const SvgClock = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const SvgPin = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const SvgUser = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const SvgTag = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function DownloadBtn({ href, label, icon, onView }) {
  if (!href || href === "#demo") return null;
  return (
    <button
      onClick={() => onView(href, label)}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 8, background: COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, transition: "background 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.background = "#990000"}
      onMouseLeave={e => e.currentTarget.style.background = COLORS.primary}
    >
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}{label}
    </button>
  );
}

function InfoRow({ icon, label, value, href }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: 12, borderBottom: `1px solid ${COLORS.grayLight}` }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
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
  const { pdfModal, openPdf, closePdf } = usePdfModal();

  useEffect(() => {
    setStatus("loading");
    CalendarService.get(id).then(r => {
      if (!r.data || !r.data.published) { setStatus("notfound"); return; }
      setEvent(r.data);
      setStatus("ok");
    });
  }, [id]);

  if (status === "loading") {
    return <div style={{ padding: "80px 24px", textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>Carregando...</div>;
  }
  if (status === "notfound") {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <div style={{ marginBottom: 12 }}></div>
        <h1 style={{ fontFamily: FONTS.heading, color: COLORS.primary, fontSize: 26, textTransform: "uppercase" }}>Evento não encontrado</h1>
        <Link to="/calendario" style={{ color: COLORS.primary, fontWeight: 700 }}>← Voltar ao Calendário</Link>
      </div>
    );
  }

  const cat    = catMap[event.category] || {};
  const stat   = statusMap[event.status] || statusMap.confirmado;
  const dt     = event.date ? new Date(event.date + "T12:00:00") : null;
  const hasFiles = event.permitFileUrl || event.chancelaFileUrl || event.resultsFileUrl || event.permitUrl || event.modalidadesDetalhes?.some(m => m.permitFileUrl || m.regulamentoUrl || m.resultsFileUrl);

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
            <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: `${cat.color || COLORS.primary}cc`, color: "#fff", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon name={cat.icon} size={12} /> {cat.label || event.category}
            </span>
            <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: `${stat.color}cc`, color: "#fff" }}>
              {stat.label}
            </span>
            {event.featured && (
              <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: "#f59e0b", color: "#fff" }}>
                Destaque
              </span>
            )}
          </div>

          <h1 style={{ fontFamily: FONTS.heading, fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>
            {event.title}
          </h1>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontFamily: FONTS.body, fontSize: 15, opacity: 0.9 }}>
            {dt && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><SvgCalendar size={16} color="#fff" /> {fmtDate(event.date)}</span>}
            {event.time && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><SvgClock size={16} color="#fff" /> {event.time}</span>}
            {event.city && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><SvgPin size={16} color="#fff" /> {event.location ? `${event.location}, ` : ""}{event.city}</span>}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="grid-stack-mobile" style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 40, alignItems: "start" }}>

        {/* Coluna principal */}
        <div>

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

          {/* Downloads — por modalidade ou geral */}
          {(hasFiles || event.modalidadesDetalhes?.some(m => m.permitFileUrl || m.regulamentoUrl || m.resultsFileUrl)) && (
            <div style={{ background: "#f7f7f7", borderRadius: 12, padding: "24px 28px", marginBottom: 32 }}>
              <h2 style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, margin: "0 0 16px" }}>Downloads</h2>

              {/* Com modalidades detalhadas — agrupa por modalidade */}
              {event.modalidadesDetalhes?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* Regulamento único para todas as modalidades */}
                  {(() => {
                    const reg = event.regulamentoUrl || event.modalidadesDetalhes.find(m => m.regulamentoUrl)?.regulamentoUrl;
                    return reg ? (
                      <div style={{ background: "#fff", borderRadius: 8, padding: "14px 16px", border: `1px solid ${COLORS.grayLight}` }}>
                        <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 13, color: COLORS.dark, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                          <Icon name="FileText" size={14} /> Regulamento
                        </div>
                        <DownloadBtn href={reg} label="Regulamento Geral" icon="" onView={openPdf} />
                      </div>
                    ) : null;
                  })()}

                  {/* Permit por modalidade */}
                  {event.modalidadesDetalhes.some(m => m.permitFileUrl || m.resultsFileUrl) && (
                    <div style={{ background: "#fff", borderRadius: 8, padding: "14px 16px", border: `1px solid ${COLORS.grayLight}` }}>
                      <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 13, color: COLORS.dark, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Permits por Modalidade
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {event.modalidadesDetalhes.map((mod, i) => {
                          if (!mod.permitFileUrl && !mod.resultsFileUrl) return null;
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                              <span style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, color: COLORS.dark, minWidth: 60, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="PersonStanding" size={12} /> {mod.nome}</span>
                              {mod.permitFileUrl  && <DownloadBtn href={mod.permitFileUrl}  label={mod.permitNumero ? `Permit N\u00BA ${mod.permitNumero}` : "Permit"} icon="" onView={openPdf} />}
                              {mod.resultsFileUrl && <DownloadBtn href={mod.resultsFileUrl} label="Resultados" icon="" onView={openPdf} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Chancela geral */}
                  {(event.chancelaFileUrl || event.permitFileUrl || event.permitUrl) && (
                    <div style={{ background: "#fff", borderRadius: 8, padding: "14px 16px", border: `1px solid ${COLORS.grayLight}` }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {(event.permitFileUrl || event.permitUrl) && <DownloadBtn href={event.permitFileUrl || event.permitUrl} label="Permit do Evento" icon="" onView={openPdf} />}
                        {event.chancelaFileUrl && <DownloadBtn href={event.chancelaFileUrl} label="Chancela FMA" icon="" onView={openPdf} />}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Sem modalidades — exibe arquivos gerais */
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {(event.permitFileUrl || event.permitUrl) && <DownloadBtn href={event.permitFileUrl || event.permitUrl} label="Permit do Evento" icon="" onView={openPdf} />}
                  {event.chancelaFileUrl && <DownloadBtn href={event.chancelaFileUrl} label="Chancela FMA" icon="" onView={openPdf} />}
                  {event.resultsFileUrl  && <DownloadBtn href={event.resultsFileUrl}  label="Resultados"   icon="" onView={openPdf} />}
                </div>
              )}
            </div>
          )}

          {/* Link externo */}
          {event.externalLink && (
            <a href={event.externalLink} target="_blank" rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 8, border: `2px solid ${COLORS.primary}`, color: COLORS.primary, textDecoration: "none", fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700 }}
              onMouseEnter={e => { e.currentTarget.style.background = COLORS.primary; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = COLORS.primary; }}
            >
              <Icon name="ExternalLink" size={14} /> Acessar Site do Organizador
            </a>
          )}
        </div>

        {/* Sidebar com detalhes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 80 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "22px 20px", boxShadow: "0 2px 16px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, margin: 0 }}>Detalhes</h3>
            <InfoRow icon={<SvgCalendar />} label="Data" value={fmtDate(event.date)} />
            <InfoRow icon={<SvgClock />} label="Horario" value={event.time} />
            <InfoRow icon={<SvgPin />} label="Local" value={[event.location, event.city].filter(Boolean).join(", ")} />
            <InfoRow icon={<SvgTag />} label="Tipo" value={cat.label || event.category} />
            <InfoRow icon={<SvgUser />} label="Organizador" value={event.organizer} href={event.externalLink || undefined} />
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

      <PdfModal url={pdfModal.url} title={pdfModal.title} onClose={closePdf} />
    </div>
  );
}
