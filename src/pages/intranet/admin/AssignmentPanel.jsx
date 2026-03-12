/**
 * AssignmentPanel.jsx — Escalação de árbitros por evento.
 * Rota: /intranet/admin/escalacao           → lista de eventos para escalar
 *       /intranet/admin/escalacao/:eventId  → painel de escalação do evento
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import IntranetLayout from "../IntranetLayout";
import {
  RefereeEventsService,
  RefereeAvailabilityService,
  RefereeAssignmentsService,
  RefereesService,
} from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";
import { notificarEscalacaoArbitro } from "../../../services/emailService";
import { CALENDAR_CATEGORIES, REFEREE_FUNCTIONS } from "../../../config/navigation";

const catMap = Object.fromEntries((CALENDAR_CATEGORIES || []).filter(c => c.value).map(c => [c.value, c]));
const fnOpts = REFEREE_FUNCTIONS || [];

// ─── Sub-componente: linha de árbitro disponível/todos ────────────────────────
// Precisa ser componente separado pois tem useState (regras de hooks)
function RefereeRow({ ref_, tab, isAssigned, assign, saving }) {
  const [selFn, setSelFn] = useState("percurso");
  const alreadyAssigned = isAssigned(ref_.id);
  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: "14px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 14, borderLeft: alreadyAssigned ? "3px solid #007733" : "3px solid transparent", opacity: alreadyAssigned ? 0.7 : 1 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, color: COLORS.dark }}>{ref_.name}</div>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{ref_.city} • {ref_.email}</div>
        {tab === "available" && ref_.availability?.notes && (
          <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, fontStyle: "italic" }}>💬 {ref_.availability.notes}</div>
        )}
      </div>
      {alreadyAssigned ? (
        <span style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: "#e6f9ee", color: "#007733" }}>✓ Já escalado</span>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={selFn} onChange={e => setSelFn(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 7, border: `1.5px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", cursor: "pointer" }}>
            {fnOpts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <button onClick={() => assign(ref_.id, selFn)} disabled={saving === ref_.id}
            style={{ padding: "8px 16px", borderRadius: 7, background: saving === ref_.id ? COLORS.gray : "#007733", color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
            {saving === ref_.id ? "..." : "⚖️ Escalar"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Lista de eventos para escalar ───────────────────────────────────────────
export function AssignmentList() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    Promise.all([
      RefereeEventsService.list({ upcoming: true }),
      RefereeAssignmentsService.list(),
    ]).then(([evR, asR]) => {
      if (evR.data) setEvents(evR.data);
      if (asR.data) setAssignments(asR.data);
      setLoading(false);
    });
  }, []);

  const countAssigned = (eventId) => assignments.filter(a => a.eventId === eventId).length;

  return (
    <IntranetLayout requireRole="canManage">
      <div style={{ padding: 36 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>📋 Escalação</h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: 0 }}>Selecione um evento para visualizar disponibilidades e escalar árbitros.</p>
        </div>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: COLORS.gray, fontFamily: FONTS.body }}>⏳ Carregando...</div>
        ) : events.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗓️</div>
            <p style={{ fontFamily: FONTS.body, color: COLORS.gray }}>Nenhum evento futuro cadastrado.</p>
            <Link to="/intranet/admin/eventos" style={{ color: COLORS.primary, fontFamily: FONTS.heading, fontWeight: 700, textDecoration: "none" }}>Ir para Eventos →</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {events.map(evt => {
              const cat = catMap[evt.category] || { color: COLORS.gray, icon: "📅", label: evt.category };
              const assigned = countAssigned(evt.id);
              const needed = evt.refereesNeeded || 0;
              const pct = needed > 0 ? Math.min(100, Math.round(assigned / needed * 100)) : 0;
              return (
                <div key={evt.id} style={{ background: "#fff", borderRadius: 12, padding: "18px 22px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 18, cursor: "pointer", transition: "box-shadow 0.2s" }}
                  onClick={() => navigate(`/intranet/admin/escalacao/${evt.id}`)}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)"}>
                  {/* Data */}
                  <div style={{ width: 56, flexShrink: 0, textAlign: "center", background: `${cat.color}12`, borderRadius: 8, padding: "8px 4px" }}>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: cat.color, lineHeight: 1 }}>{new Date(evt.date + "T12:00:00").getDate()}</div>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 9, fontWeight: 700, color: cat.color, textTransform: "uppercase" }}>{new Date(evt.date + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" })}</div>
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{evt.title}</div>
                    <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 2 }}>{evt.city}{evt.time ? ` • ${evt.time}` : ""}</div>
                  </div>
                  {/* Progresso de escalação */}
                  <div style={{ flexShrink: 0, textAlign: "right", minWidth: 120 }}>
                    <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginBottom: 4 }}>
                      {assigned}/{needed} árbitros escalados
                    </div>
                    <div style={{ height: 6, background: COLORS.grayLight, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#007733" : pct > 50 ? "#f59e0b" : COLORS.primary, borderRadius: 3, transition: "width 0.3s" }} />
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.primary }}>Escalar →</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </IntranetLayout>
  );
}

// ─── Painel de escalação de um evento ────────────────────────────────────────
export function AssignmentEditor() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [available, setAvailable] = useState([]);
  const [allRefs, setAllRefs] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [tab, setTab] = useState("available"); // available | all | assigned

  const load = useCallback(async () => {
    setLoading(true);
    const [evR, avR, asR, refR] = await Promise.all([
      RefereeEventsService.get(eventId),
      RefereeAvailabilityService.getAvailableForEvent(eventId),
      RefereeAssignmentsService.getByEvent(eventId),
      RefereesService.list({ status: "ativo" }),
    ]);
    if (evR.data) setEvent(evR.data);
    else { navigate("/intranet/admin/escalacao"); return; }
    if (avR.data) setAvailable(avR.data);
    if (asR.data) setAssignments(asR.data);
    if (refR.data) setAllRefs(refR.data);
    setLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const isAssigned = (refereeId) => assignments.some(a => a.refereeId === refereeId);
  const getAssignment = (refereeId) => assignments.find(a => a.refereeId === refereeId);

  const assign = async (refereeId, refFn) => {
    setSaving(refereeId);
    await RefereeAssignmentsService.assign({ eventId, refereeId, refereeFunction: refFn, status: "confirmado" });
    // Notificar árbitro por email
    const referee = [...available, ...allRefs].find(r => r.id === refereeId);
    if (referee?.email && event) {
      const dataFormatada = event.date
        ? new Date(event.date + "T12:00:00").toLocaleDateString("pt-BR")
        : "A confirmar";
      notificarEscalacaoArbitro({
        arbitroEmail: referee.email,
        arbitroNome:  referee.name,
        evento:       event.title,
        data:         dataFormatada,
        local:        event.city || event.location || "A confirmar",
        funcao:       refFn,
        observacao:   event.description || "",
      }).catch(e => console.warn("Email escalação:", e));
    }
    await load();
    setSaving(null);
  };

  const updateFunction = async (assignmentId, refFn) => {
    setSaving(assignmentId);
    await RefereeAssignmentsService.update(assignmentId, { refereeFunction: refFn });
    await load();
    setSaving(null);
  };

  const removeAssignment = async (assignmentId) => {
    if (!confirm("Remover este árbitro da escalação?")) return;
    setSaving(assignmentId);
    await RefereeAssignmentsService.remove(assignmentId);
    await load();
    setSaving(null);
  };

  if (loading) return <IntranetLayout><div style={{ padding: 40, fontFamily: FONTS.body, color: COLORS.gray }}>⏳ Carregando...</div></IntranetLayout>;
  if (!event) return null;

  const cat = catMap[event.category] || { color: COLORS.gray, icon: "📅", label: event.category };
  const tabList = tab === "available" ? available : allRefs.filter(r => !isAssigned(r.id) || tab === "all");
  const displayList = tab === "assigned" ? assignments : tabList;

  return (
    <IntranetLayout requireRole="canManage">
      <div style={{ padding: 36 }}>
        {/* Event header */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 24, borderLeft: `4px solid ${cat.color}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, background: `${cat.color}15`, color: cat.color }}>{cat.icon} {cat.label}</span>
                {event.source === "calendar" && <span style={{ fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, color: COLORS.gray, background: COLORS.grayLight, padding: "2px 8px", borderRadius: 20 }}>📅 Calendário FMA</span>}
              </div>
              <h2 style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 900, color: COLORS.dark, margin: "0 0 6px", textTransform: "uppercase" }}>{event.title}</h2>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray }}>
                📅 {new Date(event.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                {event.time && ` • ${event.time}`}
                {" — "}📍 {event.city}{event.location ? `, ${event.location}` : ""}
              </div>
              {event.notes && <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 6, fontStyle: "italic" }}>{event.notes}</div>}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: 28, fontWeight: 900, color: assignments.length >= (event.refereesNeeded || 0) ? "#007733" : COLORS.primary }}>{assignments.length}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>de {event.refereesNeeded || "?"} escalados</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[
            { key: "available", label: `✅ Disponíveis (${available.length})` },
            { key: "all",       label: `👥 Todos os Ativos (${allRefs.length})` },
            { key: "assigned",  label: `📋 Escalados (${assignments.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: "9px 18px", borderRadius: 20, border: `2px solid ${tab === t.key ? COLORS.primary : COLORS.grayLight}`, background: tab === t.key ? COLORS.primary : "#fff", color: tab === t.key ? "#fff" : COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {displayList.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <p style={{ fontFamily: FONTS.body, color: COLORS.gray }}>
              {tab === "available" ? "Nenhum árbitro registrou disponibilidade para este evento." :
               tab === "assigned"  ? "Nenhum árbitro escalado ainda." : "Nenhum árbitro ativo."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Escalados */}
            {tab === "assigned" && assignments.map(asgn => {
              const ref = asgn.referee || {};
              return (
                <div key={asgn.id} style={{ background: "#fff", borderRadius: 10, padding: "16px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 14, borderLeft: "3px solid #007733" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, color: COLORS.dark }}>{ref.name}</div>
                    <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{ref.city} • {ref.email}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <select
                      value={asgn.refereeFunction}
                      onChange={e => updateFunction(asgn.id, e.target.value)}
                      disabled={saving === asgn.id}
                      style={{ padding: "7px 10px", borderRadius: 7, border: `1.5px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", cursor: "pointer" }}>
                      {fnOpts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                    <button onClick={() => removeAssignment(asgn.id)} disabled={saving === asgn.id}
                      style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid #fca5a5", background: "#fff5f5", color: "#cc0000", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
                      Remover
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Disponíveis / Todos */}
            {tab !== "assigned" && displayList.map(ref => (
              <RefereeRow
                key={ref.id}
                ref_={ref}
                tab={tab}
                isAssigned={isAssigned}
                assign={assign}
                saving={saving}
              />
            ))}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <Link to="/intranet/admin/escalacao" style={{ color: COLORS.primary, fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>← Voltar à lista de escalação</Link>
        </div>
      </div>
    </IntranetLayout>
  );
}
