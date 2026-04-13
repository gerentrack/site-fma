/**
 * PagamentosArbitragem.jsx — Diárias + Reembolsos unificados.
 * Rota: /intranet/admin/pagamentos
 */
import { useState, useEffect } from "react";
import IntranetLayout from "../IntranetLayout";
import { RefereeAssignmentsService, ReembolsosService, RefereesService, TaxasConfigService } from "../../../services/index";
import { notificarReembolso, notificarDiariaPaga } from "../../../services/emailService";
import { COLORS, FONTS } from "../../../styles/colors";
import { REFEREE_FUNCTIONS } from "../../../config/navigation";
import PixModal from "../../../components/ui/PixModal";
import { gerarReciboPagamentoArbitroPdf } from "../../../services/reciboPagamentoArbitroPdf";

const fnMap = Object.fromEntries((REFEREE_FUNCTIONS || []).map(f => [f.value, f.label]));
const CATS = { transporte: "Transporte", hospedagem: "Hospedagem", alimentacao: "Alimentacao", outro: "Outro" };
function fmt(v) { return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function PagamentosArbitragem() {
  const [assignments, setAssignments] = useState([]);
  const [reembolsos, setReembolsos] = useState([]);
  const [referees, setReferees] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("unificado");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [modalPagar, setModalPagar] = useState(null); // { type: "diaria"|"reembolso", id, callback }
  const [modalData, setModalData] = useState(new Date().toISOString().slice(0, 10));
  const [modalAprovar, setModalAprovar] = useState(null); // { id, valor }
  const [modalValor, setModalValor] = useState("");
  const [modalRejeitar, setModalRejeitar] = useState(null);
  const [modalMotivo, setModalMotivo] = useState("");
  const [config, setConfig] = useState({});
  const [gerandoRecibo, setGerandoRecibo] = useState(false);
  const [reciboPreview, setReciboPreview] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    const [aRes, rRes, refRes, cfgRes] = await Promise.all([
      RefereeAssignmentsService.list(),
      ReembolsosService.list(),
      RefereesService.list(),
      TaxasConfigService.get().catch(() => ({ data: {} })),
    ]);
    setAssignments((aRes.data || []).filter(a => a.event && (a.valorDiaria || 0) > 0));
    setReembolsos(rRes.data || []);
    setReferees(Object.fromEntries((refRes.data || []).map(r => [r.id, r])));
    setConfig(cfgRes.data || cfgRes || {});
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

  // ── Agrupamento unificado por árbitro+evento ──
  const grupos = (() => {
    const map = {};
    for (const a of assignments) {
      const key = `${a.refereeId}__${a.eventId}`;
      if (!map[key]) map[key] = { refereeId: a.refereeId, eventId: a.eventId, event: a.event, assigns: [], reembs: [] };
      map[key].assigns.push(a);
    }
    for (const r of reembolsos) {
      const key = `${r.refereeId}__${r.eventId}`;
      if (!map[key]) map[key] = { refereeId: r.refereeId, eventId: r.eventId, event: { title: r.eventTitle, date: r.eventDate }, assigns: [], reembs: [] };
      map[key].reembs.push(r);
    }
    return Object.values(map).map(g => {
      const ref = referees[g.refereeId] || {};
      const totalDiaria = g.assigns.reduce((s, a) => s + (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0), 0);
      const reembAprov = g.reembs.filter(r => r.status === "aprovado" || r.status === "aprovado_parcial");
      const totalReemb = reembAprov.reduce((s, r) => s + ((r.valorAprovado ?? r.valor) || 0), 0);
      const reembPagos = g.reembs.filter(r => r.status === "pago");
      const totalReembPago = reembPagos.reduce((s, r) => s + ((r.valorAprovado ?? r.valor) || 0), 0);
      const diariaPaga = g.assigns.length > 0 && g.assigns.every(a => a.diariaPaga);
      const todoPago = diariaPaga && reembAprov.length === 0;
      const temPendente = g.assigns.some(a => !a.diariaPaga) || reembAprov.length > 0;
      const totalPagar = g.assigns.filter(a => !a.diariaPaga).reduce((s, a) => s + (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0), 0) + totalReemb;
      return { ...g, ref, totalDiaria, totalReemb, totalReembPago, reembAprov, diariaPaga, todoPago, temPendente, totalPagar };
    }).sort((a, b) => {
      if (a.temPendente && !b.temPendente) return -1;
      if (!a.temPendente && b.temPendente) return 1;
      return new Date(b.event?.date || 0) - new Date(a.event?.date || 0);
    });
  })();

  const [modalPagarUnificado, setModalPagarUnificado] = useState(null); // grupo
  const confirmarPagamentoUnificado = async (dataPgto) => {
    if (!modalPagarUnificado || !dataPgto) return;
    const g = modalPagarUnificado;
    setActionLoading("unificado");
    // Marcar diárias como pagas
    for (const a of g.assigns.filter(a => !a.diariaPaga)) {
      await RefereeAssignmentsService.update(a.id, { diariaPaga: true, diariaPagaEm: dataPgto });
    }
    // Marcar reembolsos aprovados como pagos
    for (const r of g.reembAprov) {
      await ReembolsosService.update(r.id, { status: "pago", pagoEm: dataPgto });
    }
    // Notificar
    if (notifyEmail && g.ref?.email && g.event) {
      notificarDiariaPaga({ arbitroEmail: g.ref.email, arbitroNome: g.ref.name, evento: g.event.title, valor: g.totalPagar }).catch(() => {});
    }
    setActionLoading(null);
    setModalPagarUnificado(null);
    fetchData();
  };

  const gerarReciboDirecto = async (cfg) => {
    setGerandoRecibo(true);
    try {
      const blob = await gerarReciboPagamentoArbitroPdf({ ...cfg.dados, reciboNumero: "" });
      setReciboPreview({ url: URL.createObjectURL(blob), nome: `Recibo_${(cfg.dados.arbitroNome || "arbitro").replace(/\s+/g, "_")}_${(cfg.dados.evento || "evento").replace(/\s+/g, "_")}.pdf` });
      // Salvar data de emissão do recibo
      if (cfg.assignmentId) {
        await RefereeAssignmentsService.update(cfg.assignmentId, { reciboData: new Date().toISOString().slice(0, 10) });
        fetchData();
      }
    } catch (e) { console.error("Erro ao gerar recibo:", e); }
    setGerandoRecibo(false);
  };

  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 16 };
  const TABS = [
    { key: "unificado", label: "Por Evento" },
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

        {/* ── Unificado por Evento ── */}
        {!loading && tab === "unificado" && (
          <div>
            {grupos.length === 0 ? (
              <div style={{ ...card, textAlign: "center", padding: "40px 24px", color: COLORS.gray }}>Nenhum pagamento encontrado.</div>
            ) : grupos.map((g, i) => {
              const statusColor = g.todoPago ? "#15803d" : g.temPendente ? "#d97706" : COLORS.gray;
              const statusLabel = g.todoPago ? "Pago" : "Pendente";
              return (
                <div key={i} style={{ ...card, borderLeft: `4px solid ${statusColor}` }}>
                  {/* Cabeçalho */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 800, color: COLORS.dark }}>{g.ref.name || g.refereeId}</span>
                        <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, color: statusColor, background: g.todoPago ? "#f0fdf4" : "#fffbeb" }}>{statusLabel}</span>
                      </div>
                      <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray }}>
                        {g.event?.title || "—"} — {g.event?.date ? new Date(g.event.date + "T12:00:00").toLocaleDateString("pt-BR") : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                      {g.temPendente && g.totalPagar > 0 && (
                        <button onClick={() => setModalPagarUnificado(g)}
                          style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#15803d", color: "#fff", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Pagar {fmt(g.totalPagar)}
                        </button>
                      )}
                      {g.todoPago && g.assigns.length > 0 && (() => {
                        const a = g.assigns[0];
                        const reembsPagos = g.reembs.filter(r => r.status === "pago");
                        return (<>
                          <button disabled={gerandoRecibo} onClick={() => gerarReciboDirecto({
                            assignmentId: a.id,
                            dados: {
                              arbitroNome: g.ref.name, arbitroCpf: g.ref.cpf,
                              funcao: fnMap[a.refereeFunction] || a.refereeFunction,
                              evento: g.event?.title, dataEvento: g.event?.date, cidade: g.event?.city,
                              valorDiaria: a.valorDiaria, transporte: a.transporte,
                              hospedagem: a.hospedagem, alimentacao: a.alimentacao,
                              reembolsos: reembsPagos.map(r => ({ categoria: r.categoria, descricao: r.descricao, valor: (r.valorAprovado ?? r.valor) || 0 })),
                              assinaturaUrl: config.assinaturaPresidenteUrl || "",
                              reciboAssinatura: a.reciboAssinatura || "",
                              reciboEvidencia: a.reciboEvidencia || null,
                            },
                          })} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: a.reciboData ? "#15803d" : COLORS.primary, color: "#fff", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: gerandoRecibo ? "not-allowed" : "pointer" }}>
                            {gerandoRecibo ? "Gerando..." : a.reciboData ? `Recibo ${a.reciboData.split("-").reverse().join("/")}` : "Gerar Recibo"}
                          </button>
                          {a.reciboData && (
                            <button onClick={async (ev) => {
                              ev.stopPropagation();
                              if (!confirm("Excluir registro do recibo?")) return;
                              await RefereeAssignmentsService.update(a.id, { reciboNumero: "", reciboData: "" });
                              fetchData();
                            }} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #dc2626", background: "transparent", color: "#dc2626", fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                              Excluir
                            </button>
                          )}
                        </>);
                      })()}
                    </div>
                  </div>

                  {/* Detalhes */}
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
                    {/* Diárias */}
                    {g.assigns.map(a => {
                      const total = (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0);
                      return (
                        <div key={a.id} style={{ padding: "8px 14px", borderRadius: 8, background: a.diariaPaga ? "#f0fdf4" : "#fffbeb", border: `1px solid ${a.diariaPaga ? "#bbf7d0" : "#fde68a"}`, minWidth: 160 }}>
                          <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 2 }}>
                            Diaria — {fnMap[a.refereeFunction] || a.refereeFunction}
                          </div>
                          <div style={{ fontWeight: 700, color: COLORS.dark }}>{fmt(total)}</div>
                          {(a.transporte || a.hospedagem || a.alimentacao) ? (
                            <div style={{ fontSize: 11, color: COLORS.gray }}>
                              {a.transporte ? `Transp: ${fmt(a.transporte)} ` : ""}
                              {a.hospedagem ? `Hosp: ${fmt(a.hospedagem)} ` : ""}
                              {a.alimentacao ? `Alim: ${fmt(a.alimentacao)}` : ""}
                            </div>
                          ) : null}
                          <div style={{ fontSize: 10, marginTop: 2, color: a.diariaPaga ? "#15803d" : "#d97706" }}>
                            {a.diariaPaga ? `Pago ${a.diariaPagaEm ? a.diariaPagaEm.slice(0,10).split("-").reverse().join("/") : ""}` : "Pendente"}
                          </div>
                        </div>
                      );
                    })}

                    {/* Reembolsos aprovados */}
                    {g.reembAprov.map(r => (
                      <div key={r.id} style={{ padding: "8px 14px", borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", minWidth: 160 }}>
                        <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 2 }}>
                          Reembolso — {CATS[r.categoria] || r.categoria}
                        </div>
                        <div style={{ fontWeight: 700, color: COLORS.dark }}>{fmt((r.valorAprovado ?? r.valor) || 0)}</div>
                        {r.descricao && <div style={{ fontSize: 11, color: COLORS.gray }}>{r.descricao}</div>}
                        <div style={{ fontSize: 10, marginTop: 2, color: "#d97706" }}>Aguardando pagamento</div>
                      </div>
                    ))}

                    {/* Reembolsos pagos */}
                    {g.reembs.filter(r => r.status === "pago").map(r => (
                      <div key={r.id} style={{ padding: "8px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", minWidth: 160 }}>
                        <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 2 }}>
                          Reembolso — {CATS[r.categoria] || r.categoria}
                        </div>
                        <div style={{ fontWeight: 700, color: COLORS.dark }}>{fmt((r.valorAprovado ?? r.valor) || 0)}</div>
                        <div style={{ fontSize: 10, marginTop: 2, color: "#15803d" }}>Pago {r.pagoEm ? (r.pagoEm.length === 10 ? r.pagoEm.split("-").reverse().join("/") : new Date(r.pagoEm).toLocaleDateString("pt-BR")) : ""}</div>
                      </div>
                    ))}
                  </div>

                  {/* Total do evento */}
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${COLORS.grayLight}`, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: COLORS.gray }}>Total do evento</span>
                    <strong style={{ color: COLORS.dark }}>{fmt(g.totalDiaria + g.totalReemb + g.totalReembPago)}</strong>
                  </div>
                </div>
              );
            })}
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
      {/* Modal PIX unificado (por evento) */}
      {modalPagarUnificado && (
        <PixModal
          referee={modalPagarUnificado.ref}
          valor={modalPagarUnificado.totalPagar}
          descricao={modalPagarUnificado.event?.title || "Evento"}
          loading={actionLoading === "unificado"}
          onClose={() => setModalPagarUnificado(null)}
          onConfirm={(data) => confirmarPagamentoUnificado(data)}
        />
      )}

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

      {/* Modal preview recibo */}
      {reciboPreview && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => { URL.revokeObjectURL(reciboPreview.url); setReciboPreview(null); }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 900, width: "95%", height: "90vh", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexShrink: 0 }}>
              <span style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, color: COLORS.dark }}>Recibo de Pagamento</span>
              <button onClick={() => { URL.revokeObjectURL(reciboPreview.url); setReciboPreview(null); }}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: COLORS.gray }}>X</button>
            </div>
            <iframe src={`${reciboPreview.url}#page=1&zoom=page-fit`} style={{ width: "100%", flex: 1, border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, background: "#f4f4f4" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button onClick={() => { URL.revokeObjectURL(reciboPreview.url); setReciboPreview(null); }}
                style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", fontSize: 13, cursor: "pointer" }}>Fechar</button>
              <button onClick={() => { const win = window.open(reciboPreview.url); if (win) { win.onload = () => { win.focus(); win.print(); }; } }}
                style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${COLORS.primary}`, background: "transparent", color: COLORS.primary, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.heading }}>Imprimir</button>
              <a href={reciboPreview.url} download={reciboPreview.nome}
                style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: FONTS.heading }}>Baixar PDF</a>
            </div>
          </div>
        </div>
      )}
    </IntranetLayout>
  );
}
