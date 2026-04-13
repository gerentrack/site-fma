/**
 * PagamentosArbitragem.jsx — Diárias + Reembolsos unificados.
 * Rota: /intranet/admin/pagamentos
 */
import { useState, useEffect } from "react";
import IntranetLayout from "../IntranetLayout";
import { RefereeAssignmentsService, ReembolsosService, RefereesService } from "../../../services/index";
import { notificarReembolso, notificarDiariaPaga } from "../../../services/emailService";
import { COLORS, FONTS } from "../../../styles/colors";
import { REFEREE_FUNCTIONS } from "../../../config/navigation";
import PixModal from "../../../components/ui/PixModal";

const fnMap = Object.fromEntries((REFEREE_FUNCTIONS || []).map(f => [f.value, f.label]));
const CATS = { transporte: "Transporte", hospedagem: "Hospedagem", alimentacao: "Alimentacao", outro: "Outro" };
function fmt(v) { return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function PagamentosArbitragem() {
  const [assignments, setAssignments] = useState([]);
  const [reembolsos, setReembolsos] = useState([]);
  const [referees, setReferees] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("resumo");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [modalPagar, setModalPagar] = useState(null); // { type: "diaria"|"reembolso", id, callback }
  const [modalData, setModalData] = useState(new Date().toISOString().slice(0, 10));
  const [modalAprovar, setModalAprovar] = useState(null); // { id, valor }
  const [modalValor, setModalValor] = useState("");
  const [modalRejeitar, setModalRejeitar] = useState(null);
  const [modalMotivo, setModalMotivo] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [aRes, rRes, refRes] = await Promise.all([
      RefereeAssignmentsService.list(),
      ReembolsosService.list(),
      RefereesService.list(),
    ]);
    setAssignments((aRes.data || []).filter(a => a.event && (a.valorDiaria || 0) > 0));
    setReembolsos(rRes.data || []);
    setReferees(Object.fromEntries((refRes.data || []).map(r => [r.id, r])));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Totais diárias
  const diariasPagas = assignments.filter(a => a.diariaPaga);
  const diariasPendentes = assignments.filter(a => !a.diariaPaga);
  const totalDiariasPago = diariasPagas.reduce((s, a) => s + (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0), 0);
  const totalDiariasPend = diariasPendentes.reduce((s, a) => s + (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0), 0);

  // Totais reembolsos
  const reembPendentes = reembolsos.filter(r => r.status === "pendente");
  const reembAprovados = reembolsos.filter(r => r.status === "aprovado" || r.status === "aprovado_parcial");
  const reembPagos = reembolsos.filter(r => r.status === "pago");
  const totalReembPend = reembPendentes.reduce((s, r) => s + (r.valor || 0), 0);
  const totalReembAprov = reembAprovados.reduce((s, r) => s + ((r.valorAprovado ?? r.valor) || 0), 0);
  const totalReembPago = reembPagos.reduce((s, r) => s + ((r.valorAprovado ?? r.valor) || 0), 0);

  // Geral
  const totalPago = totalDiariasPago + totalReembPago;
  const totalPendente = totalDiariasPend + totalReembAprov;

  const confirmarPagamento = async (dataOverride) => {
    if (!modalPagar) return;
    const dataPgto = dataOverride || modalData;
    if (!dataPgto) return;
    setActionLoading(modalPagar.id);
    if (modalPagar.type === "diaria") {
      await RefereeAssignmentsService.update(modalPagar.id, { diariaPaga: true, diariaPagaEm: dataPgto });
      if (notifyEmail) {
        const a = assignments.find(x => x.id === modalPagar.id);
        const ref = a && referees[a.refereeId];
        if (ref?.email && a?.event) {
          const total = (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0);
          notificarDiariaPaga({ arbitroEmail: ref.email, arbitroNome: ref.name, evento: a.event.title, valor: total }).catch(() => {});
        }
      }
    } else {
      await ReembolsosService.update(modalPagar.id, { status: "pago", pagoEm: dataPgto });
      if (notifyEmail) {
        const r = reembolsos.find(x => x.id === modalPagar.id);
        if (r) { const ref = referees[r.refereeId]; if (ref?.email) notificarReembolso({ arbitroEmail: ref.email, arbitroNome: ref.name, status: "pago", categoria: CATS[r.categoria] || r.categoria, valor: r.valor, valorAprovado: r.valorAprovado }).catch(() => {}); }
      }
    }
    setActionLoading(null);
    setModalPagar(null);
    setModalData(new Date().toISOString().slice(0, 10));
    fetchData();
  };

  const confirmarAprovacao = async () => {
    if (!modalAprovar) return;
    const va = modalValor.trim() === "" ? modalAprovar.valor : Number(modalValor);
    if (isNaN(va) || va < 0) return;
    setActionLoading(modalAprovar.id);
    const parcial = va < modalAprovar.valor;
    const r = reembolsos.find(x => x.id === modalAprovar.id);
    await ReembolsosService.update(modalAprovar.id, { status: parcial ? "aprovado_parcial" : "aprovado", valorAprovado: va, aprovadoPor: "Admin", aprovadoEm: new Date().toISOString() });
    if (notifyEmail && r) { const ref = referees[r.refereeId]; if (ref?.email) notificarReembolso({ arbitroEmail: ref.email, arbitroNome: ref.name, status: parcial ? "aprovado_parcial" : "aprovado", categoria: CATS[r.categoria] || r.categoria, valor: r.valor, valorAprovado: va }).catch(() => {}); }
    setActionLoading(null);
    setModalAprovar(null); setModalValor("");
    fetchData();
  };

  const confirmarRejeicao = async () => {
    if (!modalRejeitar) return;
    setActionLoading(modalRejeitar.id);
    const r = reembolsos.find(x => x.id === modalRejeitar.id);
    await ReembolsosService.update(modalRejeitar.id, { status: "rejeitado", motivoRejeicao: modalMotivo });
    if (notifyEmail && r) { const ref = referees[r.refereeId]; if (ref?.email) notificarReembolso({ arbitroEmail: ref.email, arbitroNome: ref.name, status: "rejeitado", categoria: CATS[r.categoria] || r.categoria, valor: r.valor, motivo: modalMotivo }).catch(() => {}); }
    setActionLoading(null);
    setModalRejeitar(null); setModalMotivo("");
    fetchData();
  };

  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 16 };
  const TABS = [
    { key: "resumo", label: "Resumo" },
    { key: "diarias", label: `Diarias (${diariasPendentes.length})` },
    { key: "reembolsos", label: `Reembolsos (${reembPendentes.length + reembAprovados.length})` },
  ];

  return (
    <IntranetLayout requireRole="canManage">
      <div style={{ padding: 36, maxWidth: 950, margin: "0 auto" }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 24px" }}>
          Pagamentos da Arbitragem
        </h1>

        {/* Resumo geral */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 12, marginBottom: 20 }}>
          <div style={{ ...card, textAlign: "center", marginBottom: 0, borderTop: "3px solid #15803d" }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: "#15803d" }}>{fmt(totalPago)}</div>
            <div style={{ fontSize: 11, color: COLORS.gray }}>Total pago</div>
          </div>
          <div style={{ ...card, textAlign: "center", marginBottom: 0, borderTop: "3px solid #d97706" }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: "#d97706" }}>{fmt(totalPendente)}</div>
            <div style={{ fontSize: 11, color: COLORS.gray }}>Aguardando pagamento</div>
          </div>
          <div style={{ ...card, textAlign: "center", marginBottom: 0, borderTop: "3px solid #0066cc" }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: "#0066cc" }}>{fmt(totalReembPend)}</div>
            <div style={{ fontSize: 11, color: COLORS.gray }}>Reembolsos p/ aprovar</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: "8px 18px", borderRadius: 20, border: `2px solid ${tab === t.key ? COLORS.primary : COLORS.grayLight}`, background: tab === t.key ? COLORS.primary : "#fff", color: tab === t.key ? "#fff" : COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <div style={{ padding: 40, textAlign: "center", color: COLORS.gray }}>Carregando...</div>}

        {/* ── Resumo ── */}
        {!loading && tab === "resumo" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={card}>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, color: COLORS.dark, textTransform: "uppercase", margin: "0 0 10px" }}>Diarias</h3>
              <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Pagas ({diariasPagas.length})</span><strong style={{ color: "#15803d" }}>{fmt(totalDiariasPago)}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Pendentes ({diariasPendentes.length})</span><strong style={{ color: "#d97706" }}>{fmt(totalDiariasPend)}</strong></div>
              </div>
            </div>
            <div style={card}>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, color: COLORS.dark, textTransform: "uppercase", margin: "0 0 10px" }}>Reembolsos</h3>
              <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Aguardando aprovacao ({reembPendentes.length})</span><strong style={{ color: "#0066cc" }}>{fmt(totalReembPend)}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Aguardando pagamento ({reembAprovados.length})</span><strong style={{ color: "#d97706" }}>{fmt(totalReembAprov)}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Pagos ({reembPagos.length})</span><strong style={{ color: "#15803d" }}>{fmt(totalReembPago)}</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* ── Diárias ── */}
        {!loading && tab === "diarias" && (
          <div style={card}>
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, fontSize: 13 }}>
                <option value="">Todos</option>
                <option value="pendente">Pendentes</option>
                <option value="pago">Pagos</option>
              </select>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: COLORS.offWhite }}>
                {["Arbitro","Evento","Data","Funcao","Diaria","Extras","Total","Status",""].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: COLORS.grayDark, textTransform: "uppercase" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {assignments.filter(a => !filtroStatus || (filtroStatus === "pago" ? a.diariaPaga : !a.diariaPaga)).map(a => {
                  const ref = referees[a.refereeId] || a.referee || {};
                  const total = (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0);
                  return (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                      <td style={{ padding: "8px 10px", fontSize: 13 }}>{ref.name || a.refereeId}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13 }}>{a.event?.title || "—"}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13 }}>{a.event?.date ? new Date(a.event.date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13 }}>{fnMap[a.refereeFunction] || a.refereeFunction}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13 }}>{fmt(a.valorDiaria)}</td>
                      <td style={{ padding: "8px 10px", fontSize: 12, color: COLORS.gray }}>{fmt((a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0))}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 700 }}>{fmt(total)}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, color: a.diariaPaga ? "#15803d" : "#d97706", background: a.diariaPaga ? "#f0fdf4" : "#fffbeb" }}>
                          {a.diariaPaga ? `Pago ${a.diariaPagaEm ? a.diariaPagaEm.slice(0, 10).split("-").reverse().join("/") : ""}` : "Pendente"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        {a.diariaPaga ? (
                          <button onClick={async () => { await RefereeAssignmentsService.update(a.id, { diariaPaga: false, diariaPagaEm: "" }); fetchData(); }}
                            style={{ padding: "3px 8px", borderRadius: 4, border: "none", background: "transparent", color: "#dc2626", fontSize: 10, cursor: "pointer" }}>desfazer</button>
                        ) : (
                          <button onClick={() => setModalPagar({ type: "diaria", id: a.id })}
                            style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#15803d", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Pagar</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Reembolsos ── */}
        {!loading && tab === "reembolsos" && (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, fontSize: 13 }}>
                <option value="">Todos</option>
                <option value="pendente">Aguardando aprovacao</option>
                <option value="aprovado">Aguardando pagamento</option>
                <option value="pago">Pagos</option>
                <option value="rejeitado">Rejeitados</option>
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: COLORS.gray }}>
                <input type="checkbox" checked={notifyEmail} onChange={e => setNotifyEmail(e.target.checked)} style={{ accentColor: COLORS.primary }} />
                Notificar por e-mail
              </label>
            </div>

            {reembolsos.filter(r => {
              if (!filtroStatus) return true;
              if (filtroStatus === "aprovado") return r.status === "aprovado" || r.status === "aprovado_parcial";
              return r.status === filtroStatus;
            }).map(r => {
              const ST = { pendente: { l: "Aguardando", c: "#d97706", bg: "#fffbeb" }, aprovado: { l: "Aprovado", c: "#0066cc", bg: "#eff6ff" }, aprovado_parcial: { l: "Parcial", c: "#0066cc", bg: "#eff6ff" }, pago: { l: "Pago", c: "#15803d", bg: "#f0fdf4" }, rejeitado: { l: "Rejeitado", c: "#dc2626", bg: "#fef2f2" } };
              const st = ST[r.status] || ST.pendente;
              return (
                <div key={r.id} style={{ ...card, borderLeft: `4px solid ${st.c}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{r.refereeName}</span>
                        <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, color: st.c, background: st.bg }}>{st.l}</span>
                      </div>
                      <div style={{ fontSize: 13 }}><strong>{CATS[r.categoria] || r.categoria}</strong> — {fmt((r.valorAprovado ?? r.valor) || 0)}{r.valorAprovado != null && r.valorAprovado < r.valor ? ` (de ${fmt(r.valor)})` : ""}</div>
                      {r.descricao && <div style={{ fontSize: 12, color: COLORS.gray }}>{r.descricao}</div>}
                      <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 4 }}>{r.eventTitle} — {r.eventDate ? new Date(r.eventDate + "T12:00:00").toLocaleDateString("pt-BR") : ""}</div>
                      {r.motivoRejeicao && <div style={{ marginTop: 4, padding: "4px 8px", borderRadius: 6, background: "#fef2f2", fontSize: 11, color: "#dc2626" }}>Motivo: {r.motivoRejeicao}</div>}
                      {r.pagoEm && <div style={{ fontSize: 11, color: "#15803d", marginTop: 4 }}>Pago em {r.pagoEm.length === 10 ? r.pagoEm.split("-").reverse().join("/") : new Date(r.pagoEm).toLocaleDateString("pt-BR")}</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, alignItems: "flex-end" }}>
                      {r.notaUrl && <a href={r.notaUrl} target="_blank" rel="noreferrer" style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: COLORS.offWhite, color: COLORS.primary, textDecoration: "none" }}>Ver nota</a>}
                      {r.status === "pendente" && (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => { setModalAprovar({ id: r.id, valor: r.valor }); setModalValor(String(r.valor)); }}
                            disabled={actionLoading === r.id} style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: "#0066cc", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Aprovar</button>
                          <button onClick={() => { setModalRejeitar({ id: r.id }); setModalMotivo(""); }}
                            disabled={actionLoading === r.id} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #dc2626", background: "transparent", color: "#dc2626", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Rejeitar</button>
                        </div>
                      )}
                      {(r.status === "aprovado" || r.status === "aprovado_parcial") && (
                        <button onClick={() => setModalPagar({ type: "reembolso", id: r.id })}
                          disabled={actionLoading === r.id} style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: "#15803d", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Pagar</button>
                      )}
                      {r.status === "pago" && (
                        <button onClick={async () => { setActionLoading(r.id); await ReembolsosService.update(r.id, { status: "aprovado", pagoEm: "" }); setActionLoading(null); fetchData(); }}
                          disabled={actionLoading === r.id} style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "transparent", color: "#dc2626", fontSize: 10, cursor: "pointer" }}>desfazer</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Modal PIX + confirmacao de pagamento */}
      {modalPagar && (() => {
        let ref = null, valor = 0, desc = "";
        if (modalPagar.type === "diaria") {
          const a = assignments.find(x => x.id === modalPagar.id);
          ref = a && referees[a.refereeId];
          valor = a ? (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0) : 0;
          desc = a?.event?.title ? `Diaria ${a.event.title}` : "Diaria";
        } else {
          const r = reembolsos.find(x => x.id === modalPagar.id);
          ref = r && referees[r.refereeId];
          valor = r ? (r.valorAprovado ?? r.valor) || 0 : 0;
          desc = r ? `Reembolso ${CATS[r.categoria] || ""}` : "Reembolso";
        }
        return (
          <PixModal
            referee={ref}
            valor={valor}
            descricao={desc}
            loading={!!actionLoading}
            onClose={() => setModalPagar(null)}
            onConfirm={(data) => confirmarPagamento(data)}
          />
        );
      })()}

      {/* Modal aprovar reembolso */}
      {modalAprovar && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setModalAprovar(null)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: 340 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, color: COLORS.dark, margin: "0 0 12px" }}>Aprovar Reembolso</h3>
            <p style={{ fontSize: 13, color: COLORS.gray, margin: "0 0 12px" }}>Valor solicitado: <strong>{fmt(modalAprovar.valor)}</strong></p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.grayDark, display: "block", marginBottom: 4 }}>Valor aprovado (R$)</label>
              <input type="number" min="0" step="0.01" value={modalValor} onChange={e => setModalValor(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setModalAprovar(null)} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={confirmarAprovacao} disabled={actionLoading} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#0066cc", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Aprovar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rejeitar reembolso */}
      {modalRejeitar && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setModalRejeitar(null)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: 380 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, color: COLORS.dark, margin: "0 0 12px" }}>Rejeitar Reembolso</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.grayDark, display: "block", marginBottom: 4 }}>Motivo da rejeicao</label>
              <textarea value={modalMotivo} onChange={e => setModalMotivo(e.target.value)} placeholder="Descreva o motivo..."
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 13, minHeight: 60, resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setModalRejeitar(null)} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={confirmarRejeicao} disabled={actionLoading} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Rejeitar</button>
            </div>
          </div>
        </div>
      )}
    </IntranetLayout>
  );
}
