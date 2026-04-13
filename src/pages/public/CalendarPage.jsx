/**
 * CalendarPage.jsx
 * Página pública do calendário FMA.
 * Modos: lista | cards | mensal
 * Filtros: ano, mês, cidade, tipo
 */
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";
import { CalendarService } from "../../services/index";
import { CALENDAR_CATEGORIES, EVENT_STATUS } from "../../config/navigation";
import Icon from "../../utils/icons";

const catMap    = Object.fromEntries(CALENDAR_CATEGORIES.filter(c => c.value).map(c => [c.value, c]));
const statusMap = Object.fromEntries(EVENT_STATUS.map(s => [s.value, s]));

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const WEEKDAYS  = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function fmtShortDate(d) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Badge de status ─────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = statusMap[status] || statusMap.confirmado;
  return (
    <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, background: `${s.color}18`, color: s.color }}>
      {s.label}
    </span>
  );
}

// ─── Modo: Lista ──────────────────────────────────────────────────────────────

function ListView({ events }) {
  if (!events.length) return <EmptyState />;
  // Agrupar por mês
  const groups = {};
  events.forEach(e => {
    const key = e.date ? e.date.slice(0, 7) : "0000-00";
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {Object.entries(groups).map(([key, evs]) => {
        const [y, m] = key.split("-");
        return (
          <div key={key}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.primary, marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <span>{MONTHS_PT[parseInt(m) - 1]} {y}</span>
              <div style={{ flex: 1, height: 1, background: COLORS.grayLight }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {evs.map(ev => {
                const cat = catMap[ev.category] || {};
                const dt  = ev.date ? new Date(ev.date + "T12:00:00") : null;
                return (
                  <Link key={ev.id} to={`/eventos/${ev.id}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      background: "#fff", borderRadius: 10, padding: "16px 20px",
                      display: "flex", gap: 18, alignItems: "center",
                      boxShadow: ev.featured ? "0 2px 16px rgba(204,0,0,0.1)" : "0 1px 6px rgba(0,0,0,0.06)",
                      borderLeft: `4px solid ${cat.color || COLORS.primary}`,
                      border: ev.featured ? `1px solid ${COLORS.primary}30` : undefined,
                      transition: "box-shadow 0.2s, transform 0.2s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateX(4px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}
                    >
                      {/* Data */}
                      {dt && (
                        <div style={{ textAlign: "center", flexShrink: 0, minWidth: 50 }}>
                          <div style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, color: cat.color || COLORS.primary, lineHeight: 1 }}>{dt.getDate()}</div>
                          <div style={{ fontFamily: FONTS.body, fontSize: 10, color: COLORS.gray, textTransform: "uppercase" }}>
                            {dt.toLocaleDateString("pt-BR", { weekday: "short" })}
                          </div>
                        </div>
                      )}

                      {/* Detalhes */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          {ev.featured && <span style={{ fontSize: 13 }}><Icon name="Star" size={13} /></span>}
                          <span style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.dark }}>{ev.title}</span>
                        </div>
                        <div style={{ fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.gray, display: "flex", gap: 14, flexWrap: "wrap" }}>
                          {ev.time && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Icon name="Clock" size={12} /> {ev.time}</span>}
                          {ev.city && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Icon name="MapPin" size={12} /> {ev.city}</span>}
                          {ev.organizer && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Icon name="Users" size={12} /> {ev.organizer}</span>}
                        </div>
                        {ev.shortDescription && (
                          <div style={{ fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.gray, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ev.shortDescription}
                          </div>
                        )}
                      </div>

                      {/* Direita: tipo + status + docs */}
                      <div style={{ flexShrink: 0, textAlign: "right", display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: `${cat.color || COLORS.primary}18`, color: cat.color || COLORS.primary }}>
                          <Icon name={cat.icon} size={12} /> {cat.label || ev.category}
                        </span>
                        <StatusBadge status={ev.status} />
                        <div style={{ fontSize: 15, display: "flex", gap: 3 }}>
                          {(ev.permitFileUrl || ev.permitUrl) && <span title="Permit disponível"><Icon name="ClipboardList" size={14} /></span>}
                          {ev.chancelaFileUrl && <span title="Chancela disponível"><Icon name="Medal" size={14} /></span>}
                          {ev.resultsFileUrl && <span title="Resultados disponíveis"><Icon name="BarChart3" size={14} /></span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Modo: Cards ──────────────────────────────────────────────────────────────

function CardsView({ events }) {
  if (!events.length) return <EmptyState />;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
      {events.map(ev => {
        const cat = catMap[ev.category] || {};
        return (
          <Link key={ev.id} to={`/eventos/${ev.id}`} style={{ textDecoration: "none" }}>
            <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", transition: "transform 0.2s, box-shadow 0.2s", height: "100%", display: "flex", flexDirection: "column" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"; }}
            >
              {/* Cover */}
              <div style={{ height: 150, background: ev.coverImage ? `url(${ev.coverImage}) center/cover` : `linear-gradient(135deg, ${cat.color || COLORS.primary} 0%, ${COLORS.dark} 100%)`, position: "relative", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 10, left: 10 }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, background: "rgba(255,255,255,0.9)", color: cat.color || COLORS.primary }}>
                    <Icon name={cat.icon} size={11} /> {cat.label || ev.category}
                  </span>
                </div>
                {ev.featured && (
                  <div style={{ position: "absolute", top: 10, right: 10 }}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, background: "#f59e0b", color: "#fff" }}>Destaque</span>
                  </div>
                )}
                {ev.date && (
                  <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.65)", borderRadius: 8, padding: "6px 10px", textAlign: "center", minWidth: 44 }}>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1 }}>
                      {new Date(ev.date + "T12:00:00").getDate()}
                    </div>
                    <div style={{ fontFamily: FONTS.body, fontSize: 9, color: "rgba(255,255,255,0.8)", textTransform: "uppercase" }}>
                      {new Date(ev.date + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" })}
                    </div>
                  </div>
                )}
              </div>

              {/* Body */}
              <div style={{ padding: "16px 18px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <StatusBadge status={ev.status} />
                <div style={{ fontFamily: FONTS.heading, fontSize: 14.5, fontWeight: 700, color: COLORS.dark, lineHeight: 1.3 }}>{ev.title}</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
                  {ev.time && `${ev.time} · `}{ev.city}
                </div>
                {ev.shortDescription && (
                  <div style={{ fontFamily: FONTS.body, fontSize: 12.5, color: COLORS.gray, lineHeight: 1.5, marginTop: 4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {ev.shortDescription}
                  </div>
                )}
                <div style={{ marginTop: "auto", paddingTop: 10, display: "flex", gap: 4, fontSize: 14 }}>
                  {(ev.permitFileUrl || ev.permitUrl) && <span title="Permit"><Icon name="ClipboardList" size={14} /></span>}
                  {ev.chancelaFileUrl && <span title="Chancela"><Icon name="Medal" size={14} /></span>}
                  {ev.resultsFileUrl && <span title="Resultados"><Icon name="BarChart3" size={14} /></span>}
                  {ev.externalLink && <span title="Link externo"><Icon name="ExternalLink" size={14} /></span>}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Modo: Calendário Mensal ──────────────────────────────────────────────────

function MonthlyView({ events, year, month }) {
  const y = parseInt(year) || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1; // 1-based
  const firstDay = new Date(y, m - 1, 1).getDay(); // 0=Dom
  const daysInMonth = new Date(y, m, 0).getDate();

  // Index events by day
  const byDay = {};
  events.forEach(ev => {
    if (!ev.date) return;
    const [ey, em, ed] = ev.date.split("-").map(Number);
    if (ey === y && em === m) {
      if (!byDay[ed]) byDay[ed] = [];
      byDay[ed].push(ev);
    }
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date();
  const isToday = (d) => today.getFullYear() === y && today.getMonth() + 1 === m && today.getDate() === d;

  return (
    <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      {/* Header dias da semana */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", background: COLORS.dark }}>
        {WEEKDAYS.map(w => (
          <div key={w} style={{ padding: "10px 4px", textAlign: "center", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1 }}>{w}</div>
        ))}
      </div>

      {/* Grid de dias */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, background: COLORS.grayLight }}>
        {cells.map((day, i) => (
          <div key={i} style={{
            background: "#fff", minHeight: 90, padding: "6px 8px",
            position: "relative",
          }}>
            {day && (
              <>
                <div style={{
                  fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700,
                  color: isToday(day) ? "#fff" : COLORS.dark,
                  background: isToday(day) ? COLORS.primary : "transparent",
                  width: 26, height: 26, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 4,
                }}>{day}</div>

                {(byDay[day] || []).map(ev => {
                  const cat = catMap[ev.category] || {};
                  return (
                    <Link key={ev.id} to={`/eventos/${ev.id}`}
                      style={{ display: "block", background: cat.color || COLORS.primary, color: "#fff", borderRadius: 4, padding: "2px 5px", fontSize: 10, fontFamily: FONTS.heading, fontWeight: 600, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none" }}
                      title={ev.title}
                    >
                      {ev.title}
                    </Link>
                  );
                })}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ padding: "64px 0", textAlign: "center", fontFamily: FONTS.body }}>
      <div style={{ marginBottom: 12 }}></div>
      <p style={{ color: COLORS.gray, fontSize: 15 }}>Nenhum evento encontrado para os filtros selecionados.</p>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [allEvents, setAllEvents]   = useState([]);
  const [cities, setCities]         = useState([]);
  const [years, setYears]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [viewMode, setViewMode]     = useState("lista"); // lista | cards | mensal

  // Filtros
  const [filterYear, setFilterYear]   = useState(String(new Date().getFullYear()));
  const [filterMonth, setFilterMonth] = useState("");
  const [filterCity, setFilterCity]   = useState("");
  const [filterCat, setFilterCat]     = useState("");
  const [filterBusca, setFilterBusca] = useState("");

  // Para vista mensal: controle de mês exibido
  const [calYear, setCalYear]   = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);

  const load = useCallback(async () => {
    setLoading(true);
    const [evRes, citiesRes, yearsRes] = await Promise.all([
      CalendarService.list({ publishedOnly: true }),
      CalendarService.getCities(),
      CalendarService.getYears(),
    ]);
    if (evRes.data) setAllEvents(evRes.data);
    if (citiesRes.data) setCities(citiesRes.data);
    if (yearsRes.data) {
      setYears(yearsRes.data);
      if (yearsRes.data.length && !yearsRes.data.includes(new Date().getFullYear())) {
        setFilterYear(String(yearsRes.data[0]));
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = allEvents.filter(e => {
    if (filterCat && e.category !== filterCat) return false;
    if (filterYear && !e.date?.startsWith(filterYear)) return false;
    if (filterMonth) {
      const m = e.date?.split("-")[1];
      if (parseInt(m) !== parseInt(filterMonth)) return false;
    }
    if (filterCity && e.city !== filterCity) return false;
    if (filterBusca) {
      const q = filterBusca.toLowerCase();
      const match =
        (e.title || "").toLowerCase().includes(q) ||
        (e.city || "").toLowerCase().includes(q) ||
        (e.location || "").toLowerCase().includes(q) ||
        (e.shortDescription || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const prevMonth = () => {
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
    else setCalMonth(m => m + 1);
  };

  const clearFilters = () => {
    setFilterYear(String(new Date().getFullYear()));
    setFilterMonth("");
    setFilterCity("");
    setFilterCat("");
    setFilterBusca("");
  };

  const hasFilters = filterMonth || filterCity || filterCat || filterBusca || filterYear !== String(new Date().getFullYear());

  return (
    <div style={{ background: "#f7f7f7", minHeight: "80vh" }}>
      {/* Cabeçalho */}
      <div style={{ background: `linear-gradient(135deg, #990000 0%, ${COLORS.primary} 100%)`, color: "#fff", padding: "48px 24px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", opacity: 0.75, marginBottom: 6 }}>FMA</div>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>
            Calendário de Competições
          </h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 15, opacity: 0.85, margin: 0 }}>
            Corridas de rua homologadas, pista e campo, trail, marcha atlética e cross country em Minas Gerais.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${COLORS.grayLight}`, padding: "16px 24px", position: "sticky", top: 64, zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>

          {/* Busca textual */}
          <div style={{ position: "relative", flexGrow: 1, minWidth: 200 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: COLORS.gray, pointerEvents: "none" }}><Icon name="Search" size={14} /></span>
            <input
              type="search"
              value={filterBusca}
              onChange={e => setFilterBusca(e.target.value)}
              placeholder="Buscar evento, cidade…"
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px 8px 30px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", background: "#fff" }}
            />
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", background: "#fff" }}>
            <option value="">Todos os Tipos</option>
            {CALENDAR_CATEGORIES.filter(c => c.value).map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          {/* Ano */}
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", background: "#fff" }}>
            <option value="">Todos os Anos</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Mês */}
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", background: "#fff" }}>
            <option value="">Todos os Meses</option>
            {MONTHS_PT.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>

          {/* Cidade */}
          <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", background: "#fff" }}>
            <option value="">Todas as Cidades</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {hasFilters && (
            <button onClick={clearFilters}
              style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, background: "transparent", cursor: "pointer", fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
              ✕ Limpar Filtros
            </button>
          )}

          {/* Spacer + modos */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {[["lista","Lista"],["cards","Cards"],["mensal","Mensal"]].map(([mode, label]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                style={{ padding: "7px 13px", borderRadius: 7, border: `1px solid ${viewMode === mode ? COLORS.primary : COLORS.grayLight}`, background: viewMode === mode ? COLORS.primary : "#fff", color: viewMode === mode ? "#fff" : COLORS.gray, fontFamily: FONTS.heading, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contador */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 24px 0" }}>
        <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray }}>
          {loading ? "Carregando..." : `${filtered.length} evento(s) encontrado(s)`}
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 24px 56px" }}>

        {/* Navegação de mês (apenas modo mensal) */}
        {viewMode === "mensal" && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <button onClick={prevMonth}
              style={{ padding: "8px 16px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, background: "#fff", cursor: "pointer", fontFamily: FONTS.heading, fontWeight: 700, fontSize: 16, color: COLORS.dark }}>←</button>
            <h2 style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 800, color: COLORS.dark, margin: 0, flex: 1, textAlign: "center", textTransform: "uppercase" }}>
              {MONTHS_PT[calMonth - 1]} {calYear}
            </h2>
            <button onClick={nextMonth}
              style={{ padding: "8px 16px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, background: "#fff", cursor: "pointer", fontFamily: FONTS.heading, fontWeight: 700, fontSize: 16, color: COLORS.dark }}>→</button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: COLORS.gray, fontFamily: FONTS.body }}>Carregando eventos...</div>
        ) : viewMode === "lista"  ? <ListView events={filtered} />
          : viewMode === "cards"  ? <CardsView events={filtered} />
          : <MonthlyView events={allEvents} year={calYear} month={calMonth} />
        }
      </div>
    </div>
  );
}
