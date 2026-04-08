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
  ReembolsosService,
  AvaliacoesService,
} from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";
import { notificarEscalacaoArbitro, notificarRemocaoEscalacao } from "../../../services/emailService";
import { CALENDAR_CATEGORIES, REFEREE_FUNCTIONS } from "../../../config/navigation";
import { TABELA_ARBITRAGEM } from "../../../utils/taxaCalculator";

const catMap = Object.fromEntries((CALENDAR_CATEGORIES || []).filter(c => c.value).map(c => [c.value, c]));
const fnOpts = REFEREE_FUNCTIONS || [];

// ─── Sub-componente: linha de árbitro disponível/todos ────────────────────────
// Precisa ser componente separado pois tem useState (regras de hooks)
// Helper: buscar valor da diária por função na tabela Art. 6
function getDiariaByFunction(fn, nivel) {
  // Pista e campo — por nível
  const pistaByNivel = TABELA_ARBITRAGEM.pistaECampo.porNivel.find(n => n.nivel === nivel);
  // Pista e campo — por função especial
  const pistaByFn = TABELA_ARBITRAGEM.pistaECampo.porFuncao.find(f => f.funcao.toLowerCase().includes(fn.toLowerCase()));
  // Corrida de rua
  const corrida6h = TABELA_ARBITRAGEM.corridaDeRua6h.find(f => f.funcao.toLowerCase().includes(fn.toLowerCase()));
  const corrida12h = TABELA_ARBITRAGEM.corridaDeRua12h.find(f => f.funcao.toLowerCase().includes(fn.toLowerCase()));
  if (pistaByFn) return pistaByFn.diaria;
  if (corrida6h) return corrida6h.diaria;
  if (pistaByNivel) return pistaByNivel.diaria;
  return 0;
}

const smallInp = { padding: "5px 8px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, fontSize: 12, fontFamily: FONTS.body, width: 80, boxSizing: "border-box" };

const FUNCOES_CUMULAVEIS = ["coordenador_ev", "representante"];

function RefereeRow({ ref_, tab, isAssigned, assign, saving }) {
  const [selFn, setSelFn] = useState("auxiliar");
  const [selFnExtra, setSelFnExtra] = useState("");
  const initValor = getDiariaByFunction("auxiliar", ref_.nivel);
  const [diaria, setDiaria] = useState({ valorDiaria: initValor, transporte: 0, hospedagem: 0, alimentacao: 0 });
  const [showDiaria, setShowDiaria] = useState(false);
  const alreadyAssigned = isAssigned(ref_.id);

  const handleFnChange = (fn) => {
    setSelFn(fn);
    const valor = getDiariaByFunction(fn, ref_.nivel);
    setDiaria(d => ({ ...d, valorDiaria: valor }));
    if (!FUNCOES_CUMULAVEIS.includes(fn)) setSelFnExtra("");
  };

  const total = (diaria.valorDiaria || 0) + (diaria.transporte || 0) + (diaria.hospedagem || 0) + (diaria.alimentacao || 0);

  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: "14px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderLeft: alreadyAssigned ? "3px solid #007733" : "3px solid transparent", opacity: alreadyAssigned ? 0.7 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, color: COLORS.dark }}>{ref_.name}</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{ref_.city} • {ref_.nivel || "—"}</div>
          {tab === "available" && ref_.availability?.notes && (
            <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, fontStyle: "italic" }}>{ref_.availability.notes}</div>
          )}
        </div>
        {alreadyAssigned ? (
          <span style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: "#e6f9ee", color: "#007733" }}>Ja escalado</span>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select value={selFn} onChange={e => handleFnChange(e.target.value)}
              style={{ padding: "7px 10px", borderRadius: 7, border: `1.5px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", cursor: "pointer" }}>
              {fnOpts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            {FUNCOES_CUMULAVEIS.includes(selFn) && (
              <select value={selFnExtra} onChange={e => setSelFnExtra(e.target.value)}
                style={{ padding: "7px 10px", borderRadius: 7, border: `1.5px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 12, outline: "none", cursor: "pointer" }}>
                <option value="">+ Cumular com...</option>
                {fnOpts.filter(f => f.value !== selFn && (f.value === "chefe" || FUNCOES_CUMULAVEIS.includes(f.value))).map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            )}
            <button onClick={() => setShowDiaria(!showDiaria)}
              style={{ padding: "7px 10px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, background: showDiaria ? COLORS.offWhite : "transparent", cursor: "pointer", fontSize: 11, fontFamily: FONTS.heading, fontWeight: 600, color: COLORS.gray }}>
              R$
            </button>
            <button onClick={() => assign(ref_.id, selFn, diaria, selFnExtra)} disabled={saving === ref_.id}
              style={{ padding: "8px 16px", borderRadius: 7, background: saving === ref_.id ? COLORS.gray : "#007733", color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
              {saving === ref_.id ? "..." : "Escalar"}
            </button>
          </div>
        )}
      </div>
      {showDiaria && !alreadyAssigned && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center", paddingLeft: 2 }}>
          <label style={{ fontSize: 11, color: COLORS.gray }}>Diaria: <input type="number" min="0" step="0.01" style={smallInp} value={diaria.valorDiaria} onChange={e => setDiaria(d => ({ ...d, valorDiaria: Number(e.target.value) || 0 }))} /></label>
          <label style={{ fontSize: 11, color: COLORS.gray }}>Transp: <input type="number" min="0" step="0.01" style={smallInp} value={diaria.transporte} onChange={e => setDiaria(d => ({ ...d, transporte: Number(e.target.value) || 0 }))} /></label>
          <label style={{ fontSize: 11, color: COLORS.gray }}>Hosp: <input type="number" min="0" step="0.01" style={smallInp} value={diaria.hospedagem} onChange={e => setDiaria(d => ({ ...d, hospedagem: Number(e.target.value) || 0 }))} /></label>
          <label style={{ fontSize: 11, color: COLORS.gray }}>Alim: <input type="number" min="0" step="0.01" style={smallInp} value={diaria.alimentacao} onChange={e => setDiaria(d => ({ ...d, alimentacao: Number(e.target.value) || 0 }))} /></label>
          <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.dark }}>= R$ {total.toFixed(2)}</span>
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
    if (asR.data) setAssignments(asR.data);
    const refs = refR.data || [];
    if (refR.data) setAllRefs(refs);
    // Enriquecer disponíveis com dados do árbitro
    if (avR.data) {
      const refMap = Object.fromEntries(refs.map(r => [r.id, r]));
      setAvailable(avR.data.map(a => ({ ...refMap[a.refereeId], availability: a, id: a.refereeId })).filter(a => a.name));
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const isAssigned = (refereeId) => assignments.some(a => a.refereeId === refereeId);
  const getAssignment = (refereeId) => assignments.find(a => a.refereeId === refereeId);

  const assign = async (refereeId, refFn, diariaData = {}, funcaoExtra = "") => {
    setSaving(refereeId);
    await RefereeAssignmentsService.assign({
      eventId, refereeId, refereeFunction: refFn, funcaoExtra: funcaoExtra || "",
      status: "confirmado",
      valorDiaria: diariaData.valorDiaria || 0,
      transporte: diariaData.transporte || 0,
      hospedagem: diariaData.hospedagem || 0,
      alimentacao: diariaData.alimentacao || 0,
      diariaPaga: false,
    });
    await load();
    setSaving(null);
  };

  const [notificando, setNotificando] = useState(false);
  const [notificadoMsg, setNotificadoMsg] = useState("");

  const notificarTodos = async () => {
    if (assignments.length === 0) return;
    setNotificando(true); setNotificadoMsg("");
    const dataFormatada = event.date ? new Date(event.date + "T12:00:00").toLocaleDateString("pt-BR") : "A confirmar";
    let enviados = 0;
    for (const asgn of assignments) {
      const ref = asgn.referee;
      if (!ref?.email) continue;
      const fnLabel = fnOpts.find(f => f.value === asgn.refereeFunction)?.label || asgn.refereeFunction;
      const fnExtraLabel = asgn.funcaoExtra ? fnOpts.find(f => f.value === asgn.funcaoExtra)?.label : "";
      const funcaoTexto = fnExtraLabel ? `${fnLabel} / ${fnExtraLabel}` : fnLabel;
      await notificarEscalacaoArbitro({
        arbitroEmail: ref.email, arbitroNome: ref.name,
        evento: event.title, data: dataFormatada,
        local: event.city || event.location || "A confirmar",
        funcao: funcaoTexto, observacao: event.description || "",
      }).catch(() => {});
      enviados++;
    }
    setNotificando(false);
    setNotificadoMsg(`${enviados} email(s) enviado(s).`);
    setTimeout(() => setNotificadoMsg(""), 5000);
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
    const asgn = assignments.find(a => a.id === assignmentId);
    // Remover reembolsos e avaliações vinculados
    const [reembRes, avalRes] = await Promise.all([
      ReembolsosService.list({ assignmentId }),
      AvaliacoesService.list({ assignmentId }),
    ]);
    await Promise.all([
      ...(reembRes.data || []).map(r => ReembolsosService.delete(r.id)),
      ...(avalRes.data || []).map(a => AvaliacoesService.delete(a.id)),
    ]);
    await RefereeAssignmentsService.remove(assignmentId);
    if (asgn?.referee?.email && event) {
      const dataFormatada = event.date ? new Date(event.date + "T12:00:00").toLocaleDateString("pt-BR") : "A confirmar";
      notificarRemocaoEscalacao({
        arbitroEmail: asgn.referee.email,
        arbitroNome: asgn.referee.name,
        evento: event.title,
        data: dataFormatada,
      }).catch(() => {});
    }
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
            {tab === "assigned" && assignments.length > 0 && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, padding: "10px 14px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                <button onClick={notificarTodos} disabled={notificando}
                  style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: "#007733", color: "#fff", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: notificando ? "not-allowed" : "pointer" }}>
                  {notificando ? "Enviando..." : `Notificar ${assignments.length} escalado(s) por e-mail`}
                </button>
                {notificadoMsg && <span style={{ fontSize: 12, color: "#15803d", fontFamily: FONTS.body }}>{notificadoMsg}</span>}
              </div>
            )}
            {tab === "assigned" && assignments.map(asgn => {
              const ref = asgn.referee || {};
              const totalDiaria = (asgn.valorDiaria || 0) + (asgn.transporte || 0) + (asgn.hospedagem || 0) + (asgn.alimentacao || 0);
              return (
                <div key={asgn.id} style={{ background: "#fff", borderRadius: 10, padding: "16px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderLeft: "3px solid #007733" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, color: COLORS.dark }}>{ref.name}</div>
                      <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{ref.city} • {ref.email}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                  {totalDiaria > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, fontSize: 12, fontFamily: FONTS.body, color: COLORS.gray }}>
                      <span>Diaria: R$ {(asgn.valorDiaria || 0).toFixed(2)}</span>
                      {(asgn.transporte || 0) > 0 && <span>Transp: R$ {asgn.transporte.toFixed(2)}</span>}
                      {(asgn.hospedagem || 0) > 0 && <span>Hosp: R$ {asgn.hospedagem.toFixed(2)}</span>}
                      {(asgn.alimentacao || 0) > 0 && <span>Alim: R$ {asgn.alimentacao.toFixed(2)}</span>}
                      <span style={{ fontWeight: 700, color: COLORS.dark }}>Total: R$ {totalDiaria.toFixed(2)}</span>
                      {asgn.diariaPaga ? (
                        <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, background: "#f0fdf4", color: "#15803d" }}>Pago</span>
                      ) : (
                        <button onClick={async () => {
                          setSaving(asgn.id);
                          await RefereeAssignmentsService.update(asgn.id, { diariaPaga: true, diariaPagaEm: new Date().toISOString() });
                          await load();
                          setSaving(null);
                        }} disabled={saving === asgn.id}
                          style={{ padding: "3px 10px", borderRadius: 6, border: "none", background: "#15803d", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                          Marcar pago
                        </button>
                      )}
                    </div>
                  )}
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
