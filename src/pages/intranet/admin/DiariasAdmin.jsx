/**
 * DiariasAdmin.jsx — Controle de diárias pagas a árbitros por evento.
 * Rota: /intranet/admin/diarias
 */
import { useState, useEffect } from "react";
import IntranetLayout from "../IntranetLayout";
import { DiariasService, RefereeAssignmentsService, RefereesService } from "../../../services/index";
import { TABELA_ARBITRAGEM } from "../../../utils/taxaCalculator";
import { COLORS, FONTS } from "../../../styles/colors";

const CATEGORIAS = [
  { value: "pista", label: "Pista e Campo" },
  { value: "corrida6h", label: "Corrida de Rua (ate 6h)" },
  { value: "corrida12h", label: "Corrida de Rua (ate 12h)" },
];

function getFuncoes(categoria) {
  if (categoria === "pista") return [
    ...TABELA_ARBITRAGEM.pistaECampo.porNivel.map(n => ({ value: `nivel_${n.nivel}`, label: `Nivel ${n.nivel}`, diaria: n.diaria })),
    ...TABELA_ARBITRAGEM.pistaECampo.porFuncao.map(f => ({ value: f.funcao, label: f.funcao, diaria: f.diaria })),
  ];
  if (categoria === "corrida6h") return TABELA_ARBITRAGEM.corridaDeRua6h.map(f => ({ value: f.funcao, label: f.funcao, diaria: f.diaria }));
  if (categoria === "corrida12h") return TABELA_ARBITRAGEM.corridaDeRua12h.map(f => ({ value: f.funcao, label: f.funcao, diaria: f.diaria }));
  return [];
}

function formatMoeda(v) { return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function DiariasAdmin() {
  const [diarias, setDiarias] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ categoria: "pista", funcaoDiaria: "", valorDiaria: 0, transporte: 0, hospedagem: 0, alimentacao: 0, observacao: "" });
  const [saving, setSaving] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroArbitro, setFiltroArbitro] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [dRes, aRes, rRes] = await Promise.all([
      DiariasService.list(),
      RefereeAssignmentsService.list(),
      RefereesService.list(),
    ]);
    setDiarias(dRes.data || []);
    const past = (aRes.data || []).filter(a => a.event?.date < new Date().toISOString().slice(0, 10));
    setAssignments(past);
    setReferees(rRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const refMap = Object.fromEntries(referees.map(r => [r.id, r]));
  const diariaAssignIds = new Set(diarias.map(d => d.assignmentId));
  const semDiaria = assignments.filter(a => !diariaAssignIds.has(a.id));

  const funcoes = getFuncoes(form.categoria);
  const funcaoSel = funcoes.find(f => f.value === form.funcaoDiaria);
  const valorTotal = (form.valorDiaria || 0) + (form.transporte || 0) + (form.hospedagem || 0) + (form.alimentacao || 0);

  const handleSelectFuncao = (val) => {
    const fn = funcoes.find(f => f.value === val);
    setForm(f => ({ ...f, funcaoDiaria: val, valorDiaria: fn?.diaria || 0 }));
  };

  const handleSave = async () => {
    if (!selected || !form.funcaoDiaria) return;
    setSaving(true);
    const ref = refMap[selected.refereeId] || {};
    await DiariasService.create({
      assignmentId: selected.id,
      eventId: selected.eventId,
      refereeId: selected.refereeId,
      refereeName: ref.name || "",
      eventTitle: selected.event?.title || "",
      eventDate: selected.event?.date || "",
      categoria: form.categoria,
      funcaoDiaria: form.funcaoDiaria,
      valorDiaria: form.valorDiaria,
      transporte: form.transporte,
      hospedagem: form.hospedagem,
      alimentacao: form.alimentacao,
      valorTotal,
      status: "pendente",
      observacao: form.observacao,
    });
    setSaving(false);
    setView("list"); setSelected(null);
    fetchData();
  };

  const handleMarcarPago = async (id) => {
    await DiariasService.update(id, { status: "pago", pagoEm: new Date().toISOString() });
    fetchData();
  };

  const filtered = diarias
    .filter(d => !filtroStatus || d.status === filtroStatus)
    .filter(d => !filtroArbitro || d.refereeId === filtroArbitro);

  const totalPago = diarias.filter(d => d.status === "pago").reduce((s, d) => s + (d.valorTotal || 0), 0);
  const totalPendente = diarias.filter(d => d.status === "pendente").reduce((s, d) => s + (d.valorTotal || 0), 0);

  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 20 };
  const inp = { width: "100%", padding: "8px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 14, fontFamily: FONTS.body, boxSizing: "border-box" };
  const lbl = { display: "block", fontWeight: 600, fontSize: 11, marginBottom: 4, color: COLORS.grayDark, textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <IntranetLayout requireRole="canManage">
      <div style={{ padding: 36, maxWidth: 950, margin: "0 auto" }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>
          Diarias de Arbitragem
        </h1>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 24px" }}>
          Controle de diarias pagas aos arbitros (Art. 6 — Regimento de Taxas).
        </p>

        {view === "list" && (
          <>
            {/* Resumo */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
              <div style={{ ...card, textAlign: "center", marginBottom: 0 }}>
                <div style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 900, color: "#15803d" }}>{formatMoeda(totalPago)}</div>
                <div style={{ fontSize: 12, color: COLORS.gray }}>Total pago</div>
              </div>
              <div style={{ ...card, textAlign: "center", marginBottom: 0 }}>
                <div style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 900, color: "#d97706" }}>{formatMoeda(totalPendente)}</div>
                <div style={{ fontSize: 12, color: COLORS.gray }}>Total pendente</div>
              </div>
              <div style={{ ...card, textAlign: "center", marginBottom: 0 }}>
                <div style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 900, color: COLORS.dark }}>{diarias.length}</div>
                <div style={{ fontSize: 12, color: COLORS.gray }}>Registros</div>
              </div>
              <div style={{ ...card, textAlign: "center", marginBottom: 0 }}>
                <div style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 900, color: COLORS.primary }}>{semDiaria.length}</div>
                <div style={{ fontSize: 12, color: COLORS.gray }}>Sem diaria registrada</div>
              </div>
            </div>

            {/* Sem diária */}
            {semDiaria.length > 0 && (
              <div style={card}>
                <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, color: "#d97706", margin: "0 0 10px", textTransform: "uppercase" }}>
                  Escalacoes sem diaria ({semDiaria.length})
                </h3>
                {semDiaria.slice(0, 8).map(a => {
                  const ref = refMap[a.refereeId];
                  return (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${COLORS.grayLight}`, fontSize: 13 }}>
                      <span><strong>{ref?.name || a.refereeId}</strong> — {a.event?.title} ({a.event?.date ? new Date(a.event.date + "T12:00:00").toLocaleDateString("pt-BR") : ""})</span>
                      <button onClick={() => {
                        setSelected(a);
                        setForm({ categoria: "pista", funcaoDiaria: "", valorDiaria: 0, transporte: 0, hospedagem: 0, alimentacao: 0, observacao: "" });
                        setView("form");
                      }} style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: COLORS.primary, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        Registrar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Filtros */}
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, fontSize: 13 }}>
                <option value="">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
              <select value={filtroArbitro} onChange={e => setFiltroArbitro(e.target.value)}
                style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, fontSize: 13 }}>
                <option value="">Todos os arbitros</option>
                {referees.filter(r => r.status === "ativo").sort((a, b) => a.name.localeCompare(b.name)).map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Tabela */}
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: COLORS.gray }}>Carregando...</div>
            ) : (
              <div style={{ ...card, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}>
                  <thead>
                    <tr style={{ background: COLORS.offWhite }}>
                      {["Arbitro", "Evento", "Data", "Diaria", "Extras", "Total", "Status", ""].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: COLORS.grayDark, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: COLORS.gray, fontSize: 14 }}>Nenhuma diaria registrada.</td></tr>
                    ) : filtered.map(d => (
                      <tr key={d.id} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                        <td style={{ padding: "8px 10px", fontSize: 13 }}>{d.refereeName}</td>
                        <td style={{ padding: "8px 10px", fontSize: 13 }}>{d.eventTitle}</td>
                        <td style={{ padding: "8px 10px", fontSize: 13 }}>{d.eventDate ? new Date(d.eventDate + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                        <td style={{ padding: "8px 10px", fontSize: 13 }}>{formatMoeda(d.valorDiaria)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: COLORS.gray }}>{formatMoeda((d.transporte || 0) + (d.hospedagem || 0) + (d.alimentacao || 0))}</td>
                        <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 700 }}>{formatMoeda(d.valorTotal)}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{
                            padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700,
                            color: d.status === "pago" ? "#15803d" : "#d97706",
                            background: d.status === "pago" ? "#f0fdf4" : "#fffbeb",
                          }}>{d.status === "pago" ? "Pago" : "Pendente"}</span>
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          {d.status === "pendente" && (
                            <button onClick={() => handleMarcarPago(d.id)}
                              style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#15803d", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                              Pagar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Formulário */}
        {view === "form" && selected && (
          <div style={card}>
            <h3 style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, color: COLORS.dark, margin: "0 0 4px" }}>
              Registrar Diaria — {refMap[selected.refereeId]?.name}
            </h3>
            <p style={{ fontSize: 13, color: COLORS.gray, margin: "0 0 20px" }}>
              {selected.event?.title} — {selected.event?.date ? new Date(selected.event.date + "T12:00:00").toLocaleDateString("pt-BR") : ""}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <span style={lbl}>Categoria do evento</span>
                <select style={inp} value={form.categoria} onChange={e => { setForm(f => ({ ...f, categoria: e.target.value, funcaoDiaria: "", valorDiaria: 0 })); }}>
                  {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <span style={lbl}>Funcao / Nivel (Art. 6)</span>
                <select style={inp} value={form.funcaoDiaria} onChange={e => handleSelectFuncao(e.target.value)}>
                  <option value="">Selecione...</option>
                  {funcoes.map(f => <option key={f.value} value={f.value}>{f.label} — {formatMoeda(f.diaria)}</option>)}
                </select>
              </div>
              <div>
                <span style={lbl}>Valor da diaria (R$)</span>
                <input type="number" min="0" step="0.01" style={inp} value={form.valorDiaria} onChange={e => setForm(f => ({ ...f, valorDiaria: Number(e.target.value) || 0 }))} />
              </div>
              <div>
                <span style={lbl}>Transporte (R$)</span>
                <input type="number" min="0" step="0.01" style={inp} value={form.transporte} onChange={e => setForm(f => ({ ...f, transporte: Number(e.target.value) || 0 }))} />
              </div>
              <div>
                <span style={lbl}>Hospedagem (R$)</span>
                <input type="number" min="0" step="0.01" style={inp} value={form.hospedagem} onChange={e => setForm(f => ({ ...f, hospedagem: Number(e.target.value) || 0 }))} />
              </div>
              <div>
                <span style={lbl}>Alimentacao (R$)</span>
                <input type="number" min="0" step="0.01" style={inp} value={form.alimentacao} onChange={e => setForm(f => ({ ...f, alimentacao: Number(e.target.value) || 0 }))} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={lbl}>Observacao</span>
                <input style={inp} value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginTop: 16, padding: 12, background: COLORS.offWhite, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: COLORS.gray }}>Diaria + Transporte + Hospedagem + Alimentacao</span>
              <span style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 900, color: COLORS.dark }}>{formatMoeda(valorTotal)}</span>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => { setView("list"); setSelected(null); }}
                style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.funcaoDiaria}
                style={{ padding: "8px 24px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {saving ? "Salvando..." : "Registrar Diaria"}
              </button>
            </div>
          </div>
        )}
      </div>
    </IntranetLayout>
  );
}
