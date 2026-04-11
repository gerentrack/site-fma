/**
 * AvaliacaoArbitro.jsx — Avaliação pós-evento de árbitros (admin).
 * Rota: /intranet/admin/avaliacoes
 */
import { useState, useEffect } from "react";
import IntranetLayout from "../IntranetLayout";
import { AvaliacoesService, RefereeAssignmentsService, RefereesService } from "../../../services/index";
import { notificarAvaliacaoRecebida } from "../../../services/emailService";
import { COLORS, FONTS } from "../../../styles/colors";

const CONCEITO = [
  { value: "otima", label: "Otima" }, { value: "boa", label: "Boa" },
  { value: "regular", label: "Regular" }, { value: "ruim", label: "Ruim" },
];

export default function AvaliacaoArbitro() {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" | "form"
  const [selected, setSelected] = useState(null); // assignment selecionado
  const [form, setForm] = useState({ nota: 5, pontualidade: "boa", postura: "boa", conhecimento: "bom", observacoes: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [filtroArbitro, setFiltroArbitro] = useState("");
  const [referees, setReferees] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    const [avRes, asRes, rRes] = await Promise.all([
      AvaliacoesService.list(),
      RefereeAssignmentsService.list(),
      RefereesService.list(),
    ]);
    setAvaliacoes(avRes.data || []);
    const past = (asRes.data || []).filter(a => a.event?.date < new Date().toISOString().slice(0, 10));
    setAssignments(past);
    setReferees(rRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const avaliadosIds = new Set(avaliacoes.map(a => a.assignmentId));
  const refMap = Object.fromEntries(referees.map(r => [r.id, r]));
  const pendentes = assignments.filter(a => !avaliadosIds.has(a.id));

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const ref = refMap[selected.refereeId] || {};
    await AvaliacoesService.create({
      assignmentId: selected.id,
      eventId: selected.eventId,
      refereeId: selected.refereeId,
      refereeName: ref.name || "",
      eventTitle: selected.event?.title || "",
      eventDate: selected.event?.date || "",
      ...form,
      avaliadoPor: "Admin",
    });
    // Notificar árbitro: avaliação recebida
    if (ref.email) {
      notificarAvaliacaoRecebida({
        arbitroEmail: ref.email,
        arbitroNome: ref.name || "Árbitro",
        evento: selected.event?.title || "Evento",
        avaliador: "Admin",
      }).catch(() => {});
    }
    setSaving(false);
    setView("list");
    setSelected(null);
    fetchData();
  };

  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 20 };
  const inp = { width: "100%", padding: "8px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 14, fontFamily: FONTS.body, boxSizing: "border-box" };
  const lbl = { display: "block", fontWeight: 600, fontSize: 11, marginBottom: 4, color: COLORS.grayDark, textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <IntranetLayout requireRole="canManage">
      <div style={{ padding: 36, maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>
          Avaliacoes de Arbitros
        </h1>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 24px" }}>
          Avalie o desempenho dos arbitros apos cada evento.
        </p>

        {view === "list" && (
          <>
            {/* Pendentes */}
            {pendentes.length > 0 && (
              <div style={card}>
                <h3 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, color: "#d97706", margin: "0 0 12px", textTransform: "uppercase" }}>
                  Pendentes de Avaliacao ({pendentes.length})
                </h3>
                {pendentes.slice(0, 10).map(a => {
                  const ref = refMap[a.refereeId];
                  return (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.grayLight}` }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{ref?.name || a.refereeId}</span>
                        <span style={{ fontSize: 12, color: COLORS.gray, marginLeft: 8 }}>{a.event?.title} — {a.event?.date ? new Date(a.event.date + "T12:00:00").toLocaleDateString("pt-BR") : ""}</span>
                      </div>
                      <button onClick={() => { setSelected(a); setForm({ nota: 5, pontualidade: "boa", postura: "boa", conhecimento: "bom", observacoes: "" }); setView("form"); }}
                        style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: COLORS.primary, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        Avaliar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Realizadas */}
            <div style={card}>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, color: COLORS.dark, margin: "0 0 12px", textTransform: "uppercase" }}>
                Avaliacoes Realizadas ({avaliacoes.length})
              </h3>
              {avaliacoes.length === 0 ? (
                <div style={{ color: COLORS.gray, fontSize: 14 }}>Nenhuma avaliacao realizada.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: COLORS.offWhite }}>
                      <th style={thS}>Arbitro</th>
                      <th style={thS}>Evento</th>
                      <th style={thS}>Data</th>
                      <th style={thS}>Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {avaliacoes.map(a => (
                      <tr key={a.id} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                        <td style={tdS}>{a.refereeName}</td>
                        <td style={tdS}>{a.eventTitle}</td>
                        <td style={tdS}>{a.eventDate ? new Date(a.eventDate + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                        <td style={tdS}><span style={{ fontWeight: 700, color: a.nota >= 4 ? "#15803d" : a.nota >= 3 ? "#d97706" : "#dc2626" }}>{a.nota}/5</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {view === "form" && selected && (
          <div style={card}>
            <h3 style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, color: COLORS.dark, margin: "0 0 4px" }}>
              Avaliar: {refMap[selected.refereeId]?.name}
            </h3>
            <p style={{ fontSize: 13, color: COLORS.gray, margin: "0 0 20px" }}>
              {selected.event?.title} — {selected.event?.date ? new Date(selected.event.date + "T12:00:00").toLocaleDateString("pt-BR") : ""}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <span style={lbl}>Nota Geral (1-5)</span>
                <input type="number" min="1" max="5" style={inp} value={form.nota} onChange={e => setForm(f => ({ ...f, nota: Number(e.target.value) }))} />
              </div>
              <div>
                <span style={lbl}>Pontualidade</span>
                <select style={inp} value={form.pontualidade} onChange={e => setForm(f => ({ ...f, pontualidade: e.target.value }))}>
                  {CONCEITO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <span style={lbl}>Postura</span>
                <select style={inp} value={form.postura} onChange={e => setForm(f => ({ ...f, postura: e.target.value }))}>
                  {CONCEITO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <span style={lbl}>Conhecimento Tecnico</span>
                <select style={inp} value={form.conhecimento} onChange={e => setForm(f => ({ ...f, conhecimento: e.target.value }))}>
                  {CONCEITO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={lbl}>Observacoes</span>
                <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>

            {msg && <div style={{ marginTop: 12, color: "#dc2626", fontSize: 13 }}>{msg}</div>}

            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => { setView("list"); setSelected(null); }}
                style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: "8px 24px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {saving ? "Salvando..." : "Salvar Avaliacao"}
              </button>
            </div>
          </div>
        )}
      </div>
    </IntranetLayout>
  );
}

const thS = { textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 700, color: COLORS.grayDark, textTransform: "uppercase" };
const tdS = { padding: "8px 12px", fontSize: 13, fontFamily: FONTS.body };
