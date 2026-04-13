/**
 * MyAvailability.jsx — O árbitro marca disponibilidade por evento.
 * Rota: /intranet/disponibilidade
 */
import { useState, useEffect, useCallback } from "react";
import IntranetLayout from "../IntranetLayout";
import { useIntranet } from "../../../context/IntranetContext";
import { RefereeEventsService, RefereeAvailabilityService } from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";
import Icon from "../../../utils/icons";
import { CALENDAR_CATEGORIES } from "../../../config/navigation";

const catMap = Object.fromEntries((CALENDAR_CATEGORIES || []).filter(c => c.value).map(c => [c.value, c]));

function AvailCard({ event, avail, onToggle, saving }) {
  const cat = catMap[event.category] || { color: COLORS.gray, icon: "Calendar", label: event.category };
  const isAvail = avail?.available;
  const hasResponse = avail !== null && avail !== undefined;
  const [notes, setNotes] = useState(avail?.notes || "");
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", borderLeft: `4px solid ${hasResponse ? (isAvail ? "#007733" : "#cc0000") : COLORS.grayLight}` }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {/* Data */}
        <div style={{ width: 52, flexShrink: 0, textAlign: "center", background: `${cat.color}12`, borderRadius: 8, padding: "8px 4px" }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: cat.color, lineHeight: 1 }}>
            {new Date(event.date + "T12:00:00").getDate()}
          </div>
          <div style={{ fontFamily: FONTS.heading, fontSize: 9, fontWeight: 700, color: cat.color, textTransform: "uppercase" }}>
            {new Date(event.date + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" })}
          </div>
          <div style={{ fontFamily: FONTS.heading, fontSize: 9, color: COLORS.gray }}>
            {new Date(event.date + "T12:00:00").getFullYear()}
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 9, fontFamily: FONTS.heading, fontWeight: 700, background: `${cat.color}15`, color: cat.color }}><Icon name={cat.icon} size={9} /> {cat.label}</span>
            {event.source === "calendar" && <span style={{ fontSize: 9, fontFamily: FONTS.heading, fontWeight: 700, color: COLORS.gray, background: COLORS.grayLight, padding: "2px 6px", borderRadius: 20 }}>Calendário FMA</span>}
          </div>
          <div style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.dark, lineHeight: 1.3 }}>{event.title}</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 4 }}>
            {event.city} {event.location && `— ${event.location}`} {event.time && `• ${event.time}`}
          </div>
          {event.refereesNeeded && (
            <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 2 }}>
              {event.refereesNeeded} árbitros necessários
            </div>
          )}
        </div>

        {/* Botões */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => onToggle(event.id, true, notes)}
              disabled={saving}
              style={{ padding: "8px 14px", borderRadius: 7, border: `2px solid ${isAvail === true ? "#007733" : COLORS.grayLight}`, background: isAvail === true ? "#007733" : "#fff", color: isAvail === true ? "#fff" : COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, transition: "all 0.15s" }}
            >✓ Disponível</button>
            <button
              onClick={() => onToggle(event.id, false, notes)}
              disabled={saving}
              style={{ padding: "8px 14px", borderRadius: 7, border: `2px solid ${isAvail === false ? COLORS.primary : COLORS.grayLight}`, background: isAvail === false ? COLORS.primary : "#fff", color: isAvail === false ? "#fff" : COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, transition: "all 0.15s" }}
            >✗ Indisponível</button>
          </div>
          <button onClick={() => setShowNotes(!showNotes)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>
            {showNotes ? "▲ Ocultar obs." : "▼ Adicionar observação"}
          </button>
        </div>
      </div>

      {showNotes && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.grayLight}` }}>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Observação opcional (ex: disponível a partir das 06h)..."
            rows={2}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box" }}
          />
          {hasResponse && (
            <button onClick={() => onToggle(event.id, isAvail, notes)} disabled={saving}
              style={{ marginTop: 6, padding: "7px 14px", borderRadius: 7, background: COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
              Salvar observação
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyAvailability() {
  const { refereeId } = useIntranet();
  const [events, setEvents] = useState([]);
  const [avails, setAvails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("todos"); // todos | pendente | disponivel | indisponivel

  const load = useCallback(async () => {
    setLoading(true);
    const [evR, avR] = await Promise.all([
      RefereeEventsService.list({ upcoming: true }),
      RefereeAvailabilityService.list({ refereeId }),
    ]);
    if (evR.data) setEvents(evR.data);
    if (avR.data) setAvails(avR.data);
    setLoading(false);
  }, [refereeId]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (eventId, available, notes) => {
    setSaving(true);
    await RefereeAvailabilityService.setAvailability({ refereeId, eventId, available, notes });
    const r = await RefereeAvailabilityService.list({ refereeId });
    if (r.data) setAvails(r.data);
    setSaving(false);
  };

  const getAvail = (eventId) => avails.find(a => a.eventId === eventId) || null;

  const filtered = events.filter(evt => {
    const a = getAvail(evt.id);
    if (filter === "pendente") return !a;
    if (filter === "disponivel") return a?.available === true;
    if (filter === "indisponivel") return a?.available === false;
    return true;
  });

  const counts = {
    total: events.length,
    pendente: events.filter(e => !getAvail(e.id)).length,
    disponivel: events.filter(e => getAvail(e.id)?.available === true).length,
    indisponivel: events.filter(e => getAvail(e.id)?.available === false).length,
  };

  return (
    <IntranetLayout>
      <div style={{ padding: 36 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>Minha Disponibilidade</h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: 0 }}>Marque sua disponibilidade para os próximos eventos. O prazo padrão é 10 dias antes da prova.</p>
        </div>

        {/* Resumo */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { key: "total", label: "Total", color: COLORS.gray, icon: "Calendar" },
            { key: "pendente", label: "Pendente", color: "#884400", icon: "Hourglass" },
            { key: "disponivel", label: "Disponível", color: "#007733", icon: "CircleCheck" },
            { key: "indisponivel", label: "Indisponível", color: COLORS.primary, icon: "CircleX" },
          ].map(s => (
            <button key={s.key} onClick={() => setFilter(s.key)}
              style={{ padding: "14px 16px", borderRadius: 10, border: `2px solid ${filter === s.key ? s.color : COLORS.grayLight}`, background: filter === s.key ? `${s.color}10` : "#fff", cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: s.color }}>{counts[s.key]}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, display: "flex", alignItems: "center", gap: 4 }}><Icon name={s.icon} size={12} /> {s.label}</div>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: COLORS.gray, fontFamily: FONTS.body }}>Carregando eventos...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <p style={{ fontFamily: FONTS.body, color: COLORS.gray }}>
              {filter === "pendente" ? "Nenhuma disponibilidade pendente. Tudo em dia!" : "Nenhum evento encontrado com este filtro."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map(evt => (
              <AvailCard key={evt.id} event={evt} avail={getAvail(evt.id)} onToggle={handleToggle} saving={saving} />
            ))}
          </div>
        )}
      </div>
    </IntranetLayout>
  );
}
