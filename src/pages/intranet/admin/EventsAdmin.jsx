/**
 * EventsAdmin.jsx — Gerenciamento de eventos da intranet (admin/coordenador).
 * Exporta: IntranetEventList, IntranetEventEditor
 * Rotas: /intranet/admin/eventos  |  /intranet/admin/eventos/:id
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import IntranetLayout from "../IntranetLayout";
import { RefereeEventsService, RefereeAssignmentsService, RefereesService } from "../../../services/index";
import { uploadFile } from "../../../services/storageService";
import { notificarEventoCancelado } from "../../../services/emailService";
import { COLORS, FONTS } from "../../../styles/colors";
import { CALENDAR_CATEGORIES } from "../../../config/navigation";

const catOpts = (CALENDAR_CATEGORIES || []).filter(c => c.value);
const catMap = Object.fromEntries(catOpts.map(c => [c.value, c]));

const STATUS_COLORS = {
  aberto:    { bg: "#e6f9ee", color: "#007733", label: "Aberto" },
  escalado:  { bg: "#eff6ff", color: "#0066cc", label: "Escalado" },
  realizado: { bg: "#f3f4f6", color: "#6b7280", label: "Realizado" },
  cancelado: { bg: "#fff5f5", color: "#cc0000", label: "Cancelado" },
};

function inp(extra={}) { return { width:"100%", padding:"10px 13px", borderRadius:8, border:`1.5px solid #e8e8e8`, fontFamily:"'Barlow',sans-serif", fontSize:14, outline:"none", boxSizing:"border-box", ...extra }; }
function sel(extra={}) { return { ...inp(), appearance:"none", cursor:"pointer", ...extra }; }

// ─── Lista ────────────────────────────────────────────────────────────────────
export function IntranetEventList() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [upcoming, setUpcoming] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await RefereeEventsService.list({ upcoming, status: filterStatus || null });
    if (r.data) setEvents(r.data);
    setLoading(false);
  }, [upcoming, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleImport = async () => {
    if (!confirm("Importar todos os eventos futuros do Calendário FMA que ainda não foram importados?")) return;
    setImporting(true); setImportMsg("");
    const r = await RefereeEventsService.importFromCalendar();
    setImporting(false);
    if (r.data) {
      setImportMsg(r.data.imported > 0 ? `✅ ${r.data.imported} evento(s) importado(s) com sucesso!` : "ℹ️ Nenhum evento novo para importar.");
      load();
    } else setImportMsg("❌ Erro ao importar.");
  };

  const handleDelete = async (evt) => {
    if (!confirm(`Excluir o evento "${evt.title}"?`)) return;
    // Notificar árbitros escalados antes de excluir
    RefereeAssignmentsService.getByEvent(evt.id).then(async (aRes) => {
      const assignments = aRes.data || [];
      for (const a of assignments) {
        if (a.refereeId) {
          const refRes = await RefereesService.get(a.refereeId).catch(() => ({}));
          if (refRes.data?.email) {
            notificarEventoCancelado({
              arbitroEmail: refRes.data.email,
              arbitroNome: refRes.data.name || "Árbitro",
              evento: evt.title || "Evento",
              data: evt.date || "",
              cidade: evt.city || "",
            }).catch(() => {});
          }
        }
      }
    }).catch(() => {});
    await RefereeEventsService.delete(evt.id);
    load();
  };

  const filtered = events.filter(e => !filterCat || e.category === filterCat);

  return (
    <IntranetLayout requireRole="canManage">
      <div style={{ padding: 36 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>🗓️ Eventos</h1>
            <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: 0 }}>Gerencie provas e importe do Calendário FMA.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleImport} disabled={importing}
              style={{ padding: "11px 18px", borderRadius: 8, background: importing ? COLORS.gray : COLORS.dark, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
              {importing ? "Importando..." : "📥 Importar do Calendário FMA"}
            </button>
            <button onClick={() => navigate("/intranet/admin/eventos/novo")}
              style={{ padding: "11px 22px", borderRadius: 8, background: COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
              + Novo Evento
            </button>
          </div>
        </div>

        {importMsg && (
          <div style={{ background: importMsg.startsWith("✅") ? "#e6f9ee" : importMsg.startsWith("ℹ") ? "#eff6ff" : "#fff5f5", border: `1px solid ${importMsg.startsWith("✅") ? "#86efac" : importMsg.startsWith("ℹ") ? "#93c5fd" : "#fca5a5"}`, borderRadius: 8, padding: "10px 16px", marginBottom: 20, fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark }}>
            {importMsg}
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => setUpcoming(true)} style={{ padding: "8px 16px", borderRadius: 20, border: `2px solid ${upcoming ? COLORS.primary : COLORS.grayLight}`, background: upcoming ? COLORS.primary : "#fff", color: upcoming ? "#fff" : COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>Próximos</button>
          <button onClick={() => setUpcoming(false)} style={{ padding: "8px 16px", borderRadius: 20, border: `2px solid ${!upcoming ? COLORS.primary : COLORS.grayLight}`, background: !upcoming ? COLORS.primary : "#fff", color: !upcoming ? "#fff" : COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>Todos</button>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none" }}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_COLORS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </select>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none" }}>
            <option value="">Todos os tipos</option>
            {catOpts.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
          <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginLeft: "auto" }}>{filtered.length} evento(s)</span>
        </div>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: COLORS.gray, fontFamily: FONTS.body }}>⏳ Carregando...</div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.grayLight}` }}>
                  {["Data", "Evento", "Tipo", "Status", "Origem", "Árbitros", ""].map(h => (
                    <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: "40px 14px", textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>Nenhum evento encontrado.</td></tr>
                ) : filtered.map(evt => {
                  const cat = catMap[evt.category] || { color: COLORS.gray, icon: "📅", label: evt.category };
                  const st = STATUS_COLORS[evt.status] || STATUS_COLORS.aberto;
                  return (
                    <tr key={evt.id} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ padding: "14px 14px", flexShrink: 0 }}>
                        <div style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 900, color: cat.color }}>
                          {new Date(evt.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </div>
                        {evt.time && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>{evt.time}</div>}
                      </td>
                      <td style={{ padding: "14px 14px" }}>
                        <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, color: COLORS.dark }}>{evt.title}</div>
                        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{evt.city}{evt.location ? ` — ${evt.location}` : ""}</div>
                      </td>
                      <td style={{ padding: "14px 14px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, background: `${cat.color}15`, color: cat.color }}>{cat.icon} {cat.label}</span>
                      </td>
                      <td style={{ padding: "14px 14px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                      </td>
                      <td style={{ padding: "14px 14px" }}>
                        <span style={{ fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, color: COLORS.gray }}>{evt.source === "calendar" ? "📅 FMA" : "✋ Manual"}</span>
                      </td>
                      <td style={{ padding: "14px 14px", textAlign: "center" }}>
                        <span style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.dark }}>{evt.refereesNeeded || "—"}</span>
                      </td>
                      <td style={{ padding: "14px 14px" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button onClick={() => navigate(`/intranet/admin/escalacao/${evt.id}`)}
                            style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #93c5fd", background: "#eff6ff", color: "#0066cc", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>
                            ⚖️ Escalar
                          </button>
                          <button onClick={() => navigate(`/intranet/admin/eventos/${evt.id}`)}
                            style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.dark, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>
                            Editar
                          </button>
                          <button onClick={() => handleDelete(evt)}
                            style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fff5f5", color: "#cc0000", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </IntranetLayout>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────
const emptyEvt = { title:"", date:"", time:"", city:"", location:"", category:"corrida", organizer:"", refereesNeeded:3, notes:"", status:"aberto", source:"manual", calendarRef:null, horarioApresentacao:"", contatoCoordenador:"", regulamentoUrl:"", mapaPercursoUrl:"", observacoesArbitro:"" };

export function IntranetEventEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "novo";
  const [form, setForm] = useState({ ...emptyEvt });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew) return;
    RefereeEventsService.get(id).then(r => {
      if (r.data) setForm({ ...emptyEvt, ...r.data });
      else navigate("/intranet/admin/eventos");
      setLoading(false);
    });
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title || !form.date) { setError("Título e data são obrigatórios."); return; }
    setSaving(true); setError("");
    const r = isNew ? await RefereeEventsService.create(form) : await RefereeEventsService.update(id, form);
    setSaving(false);
    if (r.error) { setError(r.error); return; }
    navigate("/intranet/admin/eventos");
  };

  const card = { background: "#fff", borderRadius: 12, padding: "24px 26px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20 };
  const section = (label) => <h2 style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.primary, margin: "0 0 18px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>{label}</h2>;
  const lbl = (txt, req) => <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, display: "block", marginBottom: 6 }}>{txt}{req && <span style={{ color: COLORS.primary }}> *</span>}</label>;

  if (loading) return <IntranetLayout><div style={{ padding: 40, fontFamily: FONTS.body, color: COLORS.gray }}>Carregando...</div></IntranetLayout>;

  return (
    <IntranetLayout requireRole="canManage">
      <div style={{ padding: 36, maxWidth: 800 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: 0 }}>
            {isNew ? "Novo Evento" : `Editando: ${form.title || "..."}`}
          </h1>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => navigate("/intranet/admin/eventos")} style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>Cancelar</button>
            <button onClick={save} disabled={saving} style={{ padding: "10px 22px", borderRadius: 8, background: saving ? COLORS.gray : COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
              {saving ? "Salvando..." : isNew ? "Criar Evento" : "Salvar"}
            </button>
          </div>
        </div>

        {error && <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 16px", marginBottom: 16, color: "#991b1b", fontFamily: FONTS.body, fontSize: 13 }}>{error}</div>}

        <div style={card}>
          {section("Identificação do Evento")}
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              {lbl("Título", true)}
              <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ex: Corrida de Rua – 10km BH" style={inp()} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div>
                {lbl("Data", true)}
                <input type="date" value={form.date} onChange={e => set("date", e.target.value)} style={inp()} />
              </div>
              <div>
                {lbl("Horário")}
                <input type="time" value={form.time} onChange={e => set("time", e.target.value)} style={inp()} />
              </div>
              <div>
                {lbl("Tipo")}
                <select value={form.category} onChange={e => set("category", e.target.value)} style={sel()}>
                  {catOpts.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                {lbl("Cidade")}
                <input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Belo Horizonte" style={inp()} />
              </div>
              <div>
                {lbl("Local")}
                <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Praça da Liberdade" style={inp()} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div>
                {lbl("Organizador")}
                <input value={form.organizer} onChange={e => set("organizer", e.target.value)} placeholder="FMA" style={inp()} />
              </div>
              <div>
                {lbl("Árbitros necessários")}
                <input type="number" min={1} value={form.refereesNeeded} onChange={e => set("refereesNeeded", Number(e.target.value))} style={inp()} />
              </div>
              <div>
                {lbl("Status")}
                <select value={form.status} onChange={e => set("status", e.target.value)} style={sel()}>
                  {Object.entries(STATUS_COLORS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              {lbl("Observações internas")}
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} placeholder="Notas internas da coordenação..."
                style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: `1.5px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            </div>

            {/* Informações para o árbitro */}
            <div style={{ borderTop: `1px solid ${COLORS.grayLight}`, paddingTop: 16, marginTop: 8 }}>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.primary, margin: "0 0 12px" }}>Informacoes para o Arbitro</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  {lbl("Regulamento")}
                  {form.regulamentoUrl && <div style={{ marginBottom: 4 }}><a href={form.regulamentoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: COLORS.primary }}>Ver regulamento atual</a></div>}
                  <input type="file" accept=".pdf" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const r = await uploadFile(file, "eventos/regulamentos");
                    if (r.url) set("regulamentoUrl", r.url);
                    e.target.value = "";
                  }} style={{ fontSize: 12 }} />
                </div>
                <div>
                  {lbl("Mapa do percurso")}
                  {form.mapaPercursoUrl && <div style={{ marginBottom: 4 }}><a href={form.mapaPercursoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: COLORS.primary }}>Ver mapa atual</a></div>}
                  <input type="file" accept=".pdf,image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const r = await uploadFile(file, "eventos/mapas");
                    if (r.url) set("mapaPercursoUrl", r.url);
                    e.target.value = "";
                  }} style={{ fontSize: 12 }} />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                {lbl("Observacoes para os arbitros")}
                <textarea value={form.observacoesArbitro || ""} onChange={e => set("observacoesArbitro", e.target.value)} rows={2} placeholder="Uniforme, material necessario, ponto de encontro..."
                  style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: `1.5px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </IntranetLayout>
  );
}
