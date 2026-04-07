/**
 * EscalasVisaoAdmin.jsx
 * Visão das escalas de arbitragem dentro do painel admin.
 * Mostra próximos eventos com status de disponibilidade e escalação.
 */
import { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/Badge";
import { refereeEventsAPI, refereeAvailabilityAPI, refereeAssignmentsAPI, refereesAPI } from "../../data/api";
import { COLORS, FONTS } from "../../styles/colors";

const EVENT_STATUS_MAP = {
  aberto:     { label: "Aberto",     bg: "#dbeafe", color: "#1e40af" },
  escalado:   { label: "Escalado",   bg: "#e6f9ee", color: "#007733" },
  realizado:  { label: "Realizado",  bg: "#f5f5f5", color: "#6b7280" },
  cancelado:  { label: "Cancelado",  bg: "#fff0f0", color: "#cc0000" },
};

export default function EscalasVisaoAdmin() {
  const [events, setEvents] = useState([]);
  const [enriched, setEnriched] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [evRes, refRes] = await Promise.all([
        refereeEventsAPI.list({ upcoming: false }),
        refereesAPI.list(),
      ]);

      const evts = evRes.data || [];
      const refs = refRes.data || [];
      const refMap = Object.fromEntries(refs.map(r => [r.id, r]));

      // Enriquecer cada evento com dados de disponibilidade e escalação
      const enrichedEvts = await Promise.all(evts.map(async (ev) => {
        const [availRes, assignRes] = await Promise.all([
          refereeAvailabilityAPI.getForEvent(ev.id),
          refereeAssignmentsAPI.getByEvent(ev.id),
        ]);
        const avails = availRes.data || [];
        const assigns = assignRes.data || [];

        return {
          ...ev,
          disponiveis: avails.filter(a => a.available !== false).length,
          indisponiveis: avails.filter(a => a.available === false).length,
          escalados: assigns.filter(a => a.status !== "cancelado").length,
          refereesNeeded: ev.refereesNeeded || 1,
          assignDetails: assigns.map(a => ({
            ...a,
            refereeName: refMap[a.refereeId]?.name || "Desconhecido",
          })),
        };
      }));

      // Ordenar: próximos primeiro
      enrichedEvts.sort((a, b) => new Date(a.date) - new Date(b.date));
      setEnriched(enrichedEvts);
      setLoading(false);
    }
    load();
  }, []);

  const upcoming = enriched.filter(e => e.date >= new Date().toISOString().slice(0, 10));
  const past = enriched.filter(e => e.date < new Date().toISOString().slice(0, 10));

  const stats = {
    total: enriched.length,
    abertos: enriched.filter(e => e.status === "aberto").length,
    semArbitro: upcoming.filter(e => e.escalados < e.refereesNeeded).length,
  };

  return (
    <AdminLayout minLevel="admin">
      <div style={{ padding: 40 }}>
        <PageHeader
          title="Escalas de Arbitragem"
          subtitle="Visão geral dos eventos e escalação de árbitros"
        />

        {/* Resumo */}
        <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
          {[
            { label: "Eventos", value: stats.total, color: COLORS.dark },
            { label: "Em aberto", value: stats.abertos, color: "#1e40af" },
            { label: "Precisam de árbitros", value: stats.semArbitro, color: stats.semArbitro > 0 ? "#cc0000" : "#007733" },
          ].map(s => (
            <div key={s.label} style={{
              background: "#fff", borderRadius: 10, padding: "16px 24px",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)", minWidth: 140, textAlign: "center",
            }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>Carregando...</div>
        ) : (
          <>
            {/* Próximos eventos */}
            {upcoming.length > 0 && (
              <>
                <h3 style={{ fontFamily: FONTS.heading, fontSize: 16, color: COLORS.dark, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 1 }}>
                  Próximos Eventos ({upcoming.length})
                </h3>
                <div style={{ display: "grid", gap: 16, marginBottom: 40 }}>
                  {upcoming.map(ev => <EventCard key={ev.id} event={ev} />)}
                </div>
              </>
            )}

            {/* Eventos passados */}
            {past.length > 0 && (
              <>
                <h3 style={{ fontFamily: FONTS.heading, fontSize: 16, color: COLORS.gray, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 1 }}>
                  Eventos Passados ({past.length})
                </h3>
                <div style={{ display: "grid", gap: 12 }}>
                  {past.slice(0, 10).map(ev => <EventCard key={ev.id} event={ev} compact />)}
                </div>
                {past.length > 10 && (
                  <div style={{ marginTop: 12, fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
                    e mais {past.length - 10} eventos anteriores...
                  </div>
                )}
              </>
            )}

            {enriched.length === 0 && (
              <div style={{ padding: 48, textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>
                Nenhum evento de arbitragem encontrado.
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 24, fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
          Para escalar árbitros e gerenciar eventos, acesse a <a href="/intranet" style={{ color: COLORS.primary }}>Intranet</a>.
        </div>
      </div>
    </AdminLayout>
  );
}

// ── Card de Evento ───────────────────────────────────────────────────────────

function EventCard({ event, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const ev = event;
  const statusInfo = EVENT_STATUS_MAP[ev.status] || EVENT_STATUS_MAP.aberto;
  const needsMore = ev.escalados < ev.refereesNeeded;

  const dateStr = ev.date
    ? new Date(ev.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  return (
    <div style={{
      background: "#fff", borderRadius: 10, padding: compact ? "14px 20px" : "20px 24px",
      boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
      borderLeft: `4px solid ${needsMore && ev.status === "aberto" ? "#cc0000" : statusInfo.color}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: compact ? 14 : 16, fontWeight: 700, color: COLORS.dark }}>
            {ev.title}
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 4, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span>{dateStr}</span>
            {ev.city && <span>{ev.city}</span>}
            {ev.category && <span>{ev.category}</span>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Badge label={statusInfo.label} bg={statusInfo.bg} color={statusInfo.color} />
          <span style={{
            fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700,
            color: needsMore && ev.status === "aberto" ? "#cc0000" : "#007733",
          }}>
            {ev.escalados}/{ev.refereesNeeded} escalados
          </span>
          <span style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>
            ({ev.disponiveis} disponíveis)
          </span>
        </div>
      </div>

      {/* Detalhes expandíveis */}
      {!compact && ev.assignDetails?.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: FONTS.body, fontSize: 12, color: COLORS.primary,
              padding: 0, marginTop: 10,
            }}
          >
            {expanded ? "▲ Ocultar escalação" : "▼ Ver escalação"}
          </button>
          {expanded && (
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ev.assignDetails.map(a => (
                <span key={a.id} style={{
                  display: "inline-block", padding: "4px 10px", borderRadius: 6,
                  background: a.status === "cancelado" ? "#fff0f0" : "#f0f8ff",
                  fontFamily: FONTS.body, fontSize: 12,
                  color: a.status === "cancelado" ? "#cc0000" : COLORS.dark,
                  textDecoration: a.status === "cancelado" ? "line-through" : "none",
                }}>
                  {a.refereeName} <span style={{ fontSize: 10, color: COLORS.gray }}>({a.refereeFunction})</span>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
