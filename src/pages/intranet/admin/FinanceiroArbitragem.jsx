/**
 * FinanceiroArbitragem.jsx — Relatório financeiro consolidado da arbitragem.
 * Rota: /intranet/admin/financeiro
 */
import { useState, useEffect } from "react";
import IntranetLayout from "../IntranetLayout";
import { RefereeAssignmentsService, AnuidadesService, ReembolsosService, RefereesService, TaxasConfigService } from "../../../services/index";
import { gerarReciboPagamentoArbitroPdf } from "../../../services/reciboPagamentoArbitroPdf";
import { REFEREE_FUNCTIONS } from "../../../config/navigation";
import { COLORS, FONTS } from "../../../styles/colors";

const fnMap = Object.fromEntries((REFEREE_FUNCTIONS || []).map(f => [f.value, f.label]));

async function gerarEMostrarRecibo(dados, setPreview) {
  const blob = await gerarReciboPagamentoArbitroPdf(dados);
  const url = URL.createObjectURL(blob);
  const nome = `Recibo_${(dados.arbitroNome || "arbitro").replace(/\s+/g, "_")}_${(dados.evento || "evento").replace(/\s+/g, "_")}.pdf`;
  setPreview({ url, nome });
}

function fmt(v) { return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function exportCSV(rows, headers, filename) {
  const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function FinanceiroArbitragem() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("resumo");
  const [ano, setAno] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [rawAssignments, setRawAssignments] = useState([]);
  const [rawReembolsos, setRawReembolsos] = useState([]);
  const [refMap, setRefMap] = useState({});
  const [config, setConfig] = useState({});
  const [expandido, setExpandido] = useState(null);
  const [reciboPreview, setReciboPreview] = useState(null); // { url, nome }

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [asgRes, anRes, reembRes, refRes, cfgRes] = await Promise.all([
        RefereeAssignmentsService.list(),
        AnuidadesService.list({ ano }),
        ReembolsosService.list(),
        RefereesService.list(),
        TaxasConfigService.get(),
      ]);

      const assignments = (asgRes.data || []).filter(a => a.event);
      const anuidades = anRes.data || [];
      const allReembolsos = reembRes.data || [];
      const reembolsos = allReembolsos.filter(r => r.status === "aprovado" || r.status === "aprovado_parcial" || r.status === "pago");
      const rm = Object.fromEntries((refRes.data || []).map(r => [r.id, r]));
      setRawAssignments(assignments);
      setRawReembolsos(allReembolsos);
      setRefMap(rm);
      setConfig(cfgRes.data || {});
      const refMap = rm;

      // Receitas
      const anuidadesPagas = anuidades.filter(a => a.status === "pago");
      const totalAnuidades = anuidadesPagas.reduce((s, a) => s + (a.valor || 0), 0);

      // Despesas — Diárias
      const comDiaria = assignments.filter(a => (a.valorDiaria || 0) > 0 && a.diariaPaga);
      const totalDiarias = comDiaria.reduce((s, a) => s + (a.valorDiaria || 0), 0);
      const totalExtras = comDiaria.reduce((s, a) => s + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0), 0);

      // Despesas — Reembolsos
      const totalReembolsos = reembolsos.reduce((s, r) => s + ((r.valorAprovado ?? r.valor) || 0), 0);
      const reembPorCategoria = {};
      reembolsos.forEach(r => {
        const cat = r.categoria || "outro";
        reembPorCategoria[cat] = (reembPorCategoria[cat] || 0) + ((r.valorAprovado ?? r.valor) || 0);
      });

      // Pendentes
      const diariasPendentes = assignments.filter(a => (a.valorDiaria || 0) > 0 && !a.diariaPaga);
      const totalDiariasPend = diariasPendentes.reduce((s, a) => s + (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0), 0);
      const anuidadesPend = anuidades.filter(a => a.status === "pendente" || a.status === "vencido");
      const totalAnuidadesPend = anuidadesPend.reduce((s, a) => s + (a.valor || 0), 0);

      // Por mês
      const porMes = Array.from({ length: 12 }, (_, m) => {
        const mesStr = String(m + 1).padStart(2, "0");
        const diariasMes = comDiaria.filter(a => a.diariaPagaEm?.startsWith(`${ano}-${mesStr}`));
        const reembMes = reembolsos.filter(r => r.aprovadoEm?.startsWith(`${ano}-${mesStr}`));
        const anuidMes = anuidadesPagas.filter(a => (a.confirmadoEm || a.pagamentoEm || "").startsWith(`${ano}-${mesStr}`));
        return {
          mes: MESES[m],
          receita: anuidMes.reduce((s, a) => s + (a.valor || 0), 0),
          diarias: diariasMes.reduce((s, a) => s + (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0), 0),
          reembolsos: reembMes.reduce((s, r) => s + ((r.valorAprovado ?? r.valor) || 0), 0),
        };
      });

      // Por evento
      const eventosMap = {};
      assignments.filter(a => (a.valorDiaria || 0) > 0).forEach(a => {
        const key = a.eventId;
        if (!eventosMap[key]) eventosMap[key] = { eventId: key, title: a.event?.title || "—", date: a.event?.date || "", diarias: 0, extras: 0, reembolsos: 0, arbitros: 0 };
        eventosMap[key].diarias += (a.valorDiaria || 0);
        eventosMap[key].extras += (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0);
        eventosMap[key].arbitros++;
      });
      reembolsos.forEach(r => {
        if (eventosMap[r.eventId]) eventosMap[r.eventId].reembolsos += ((r.valorAprovado ?? r.valor) || 0);
      });
      const porEvento = Object.values(eventosMap).sort((a, b) => b.date.localeCompare(a.date));

      // Por árbitro
      const arbitrosMap = {};
      comDiaria.forEach(a => {
        const id = a.refereeId;
        if (!arbitrosMap[id]) arbitrosMap[id] = { refereeId: id, nome: refMap[id]?.name || id, diarias: 0, extras: 0, reembolsos: 0, eventos: 0 };
        arbitrosMap[id].diarias += (a.valorDiaria || 0);
        arbitrosMap[id].extras += (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0);
        arbitrosMap[id].eventos++;
      });
      reembolsos.forEach(r => {
        if (!arbitrosMap[r.refereeId]) arbitrosMap[r.refereeId] = { refereeId: r.refereeId, nome: refMap[r.refereeId]?.name || r.refereeName || r.refereeId, diarias: 0, extras: 0, reembolsos: 0, eventos: 0 };
        arbitrosMap[r.refereeId].reembolsos += ((r.valorAprovado ?? r.valor) || 0);
      });
      const porArbitro = Object.values(arbitrosMap).sort((a, b) => a.nome.localeCompare(b.nome));

      setData({
        totalAnuidades, totalDiarias, totalExtras, totalReembolsos,
        totalDiariasPend, totalAnuidadesPend,
        totalDespesas: totalDiarias + totalExtras + totalReembolsos,
        saldo: totalAnuidades - (totalDiarias + totalExtras + totalReembolsos),
        reembPorCategoria, porMes, porEvento, porArbitro,
        anuidadesPagas: anuidadesPagas.length, anuidadesPendentes: anuidadesPend.length,
      });
      setLoading(false);
    };
    fetch();
  }, [ano]);

  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 20 };
  const th = { textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: COLORS.grayDark, textTransform: "uppercase" };
  const td = { padding: "8px 10px", fontSize: 13, fontFamily: FONTS.body };

  const TABS = [
    { key: "resumo", label: "Resumo" },
    { key: "mensal", label: "Mensal" },
    { key: "evento", label: "Por Evento" },
    { key: "arbitro", label: "Por Arbitro" },
  ];

  return (
    <IntranetLayout requireRole="canManage">
      <div style={{ padding: 36, maxWidth: 950, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: 0 }}>
              Financeiro da Arbitragem
            </h1>
            <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "4px 0 0" }}>Visao consolidada de receitas e despesas.</p>
          </div>
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontSize: 14 }}>
            {[0, 1, 2].map(offset => { const y = new Date().getFullYear() - 1 + offset; return <option key={y} value={y}>{y}</option>; })}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.gray }}>Carregando...</div>
        ) : data && (
          <>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ padding: "8px 18px", borderRadius: 20, border: `2px solid ${tab === t.key ? COLORS.primary : COLORS.grayLight}`, background: tab === t.key ? COLORS.primary : "#fff", color: tab === t.key ? "#fff" : COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Resumo ── */}
            {tab === "resumo" && (
              <>
                {/* Cards principais */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
                  <div style={{ ...card, textAlign: "center", marginBottom: 0, borderTop: "3px solid #15803d" }}>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: "#15803d" }}>{fmt(data.totalAnuidades)}</div>
                    <div style={{ fontSize: 11, color: COLORS.gray }}>Receita (Anuidades)</div>
                  </div>
                  <div style={{ ...card, textAlign: "center", marginBottom: 0, borderTop: "3px solid #dc2626" }}>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: "#dc2626" }}>{fmt(data.totalDespesas)}</div>
                    <div style={{ fontSize: 11, color: COLORS.gray }}>Despesas Totais</div>
                  </div>
                  <div style={{ ...card, textAlign: "center", marginBottom: 0, borderTop: `3px solid ${data.saldo >= 0 ? "#15803d" : "#dc2626"}` }}>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: data.saldo >= 0 ? "#15803d" : "#dc2626" }}>{fmt(data.saldo)}</div>
                    <div style={{ fontSize: 11, color: COLORS.gray }}>Saldo</div>
                  </div>
                </div>

                {/* Detalhamento */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {/* Receitas */}
                  <div style={card}>
                    <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, color: "#15803d", textTransform: "uppercase", margin: "0 0 12px" }}>Receitas</h3>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${COLORS.grayLight}` }}>
                      <span>Anuidades pagas ({data.anuidadesPagas})</span><strong>{fmt(data.totalAnuidades)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", color: "#d97706" }}>
                      <span>Anuidades pendentes ({data.anuidadesPendentes})</span><span>{fmt(data.totalAnuidadesPend)}</span>
                    </div>
                  </div>

                  {/* Despesas */}
                  <div style={card}>
                    <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, color: "#dc2626", textTransform: "uppercase", margin: "0 0 12px" }}>Despesas</h3>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${COLORS.grayLight}` }}>
                      <span>Diarias pagas</span><strong>{fmt(data.totalDiarias)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${COLORS.grayLight}` }}>
                      <span>Extras (transp/hosp/alim)</span><strong>{fmt(data.totalExtras)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${COLORS.grayLight}` }}>
                      <span>Reembolsos aprovados</span><strong>{fmt(data.totalReembolsos)}</strong>
                    </div>
                    {Object.entries(data.reembPorCategoria).map(([cat, val]) => (
                      <div key={cat} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0 4px 16px", color: COLORS.gray }}>
                        <span>{cat}</span><span>{fmt(val)}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", color: "#d97706", marginTop: 4 }}>
                      <span>Diarias pendentes pagamento</span><span>{fmt(data.totalDiariasPend)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Mensal ── */}
            {tab === "mensal" && (
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, color: COLORS.dark, margin: 0, textTransform: "uppercase" }}>Movimentacao Mensal — {ano}</h3>
                  <button onClick={() => exportCSV(
                    data.porMes.map(m => [m.mes, m.receita.toFixed(2), m.diarias.toFixed(2), m.reembolsos.toFixed(2), (m.receita - m.diarias - m.reembolsos).toFixed(2)]),
                    ["Mes", "Receita", "Diarias", "Reembolsos", "Saldo"], `financeiro_mensal_${ano}.csv`
                  )} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#007733", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Exportar CSV</button>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: COLORS.offWhite }}>
                    <th style={th}>Mes</th><th style={th}>Receita</th><th style={th}>Diarias</th><th style={th}>Reembolsos</th><th style={th}>Saldo</th>
                  </tr></thead>
                  <tbody>
                    {data.porMes.map(m => {
                      const saldo = m.receita - m.diarias - m.reembolsos;
                      return (
                        <tr key={m.mes} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                          <td style={td}>{m.mes}</td>
                          <td style={{ ...td, color: "#15803d" }}>{fmt(m.receita)}</td>
                          <td style={{ ...td, color: "#dc2626" }}>{fmt(m.diarias)}</td>
                          <td style={{ ...td, color: "#dc2626" }}>{fmt(m.reembolsos)}</td>
                          <td style={{ ...td, fontWeight: 700, color: saldo >= 0 ? "#15803d" : "#dc2626" }}>{fmt(saldo)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Por Evento ── */}
            {tab === "evento" && (
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, color: COLORS.dark, margin: 0, textTransform: "uppercase" }}>Custo por Evento</h3>
                  <button onClick={() => exportCSV(
                    data.porEvento.map(e => [e.title, e.arbitros, e.diarias.toFixed(2), e.extras.toFixed(2), e.reembolsos.toFixed(2), (e.diarias + e.extras + e.reembolsos).toFixed(2)]),
                    ["Evento", "Arbitros", "Diarias", "Extras", "Reembolsos", "Total"], `financeiro_eventos_${ano}.csv`
                  )} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#007733", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Exportar CSV</button>
                </div>
                {data.porEvento.length === 0 ? (
                  <div style={{ textAlign: "center", color: COLORS.gray, fontSize: 14, padding: 20 }}>Nenhum evento com custos registrados.</div>
                ) : data.porEvento.map((e, i) => {
                  const isOpen = expandido === `ev_${i}`;
                  const evtAssigns = rawAssignments.filter(a => a.eventId === e.eventId && (a.valorDiaria || 0) > 0);
                  const evtReemb = rawReembolsos.filter(r => r.eventId === e.eventId && (r.status === "aprovado" || r.status === "aprovado_parcial" || r.status === "pago"));
                  return (
                    <div key={i} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                      <div onClick={() => setExpandido(isOpen ? null : `ev_${i}`)}
                        style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", cursor: "pointer", alignItems: "center" }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{e.title}</span>
                          <span style={{ fontSize: 12, color: COLORS.gray, marginLeft: 8 }}>{e.arbitros} arbitro(s)</span>
                        </div>
                        <div style={{ display: "flex", gap: 16, fontSize: 13, alignItems: "center" }}>
                          <span style={{ color: COLORS.gray }}>D: {fmt(e.diarias)}</span>
                          <span style={{ color: COLORS.gray }}>R: {fmt(e.reembolsos)}</span>
                          <strong>{fmt(e.diarias + e.extras + e.reembolsos)}</strong>
                          <span style={{ fontSize: 10, color: COLORS.gray }}>{isOpen ? "▲" : "▼"}</span>
                        </div>
                      </div>
                      {isOpen && (
                        <div style={{ padding: "0 0 14px 14px" }}>
                          {evtAssigns.map(a => {
                            const ref = refMap[a.refereeId] || {};
                            const reembs = evtReemb.filter(r => r.refereeId === a.refereeId);
                            const totalRef = (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0) + reembs.reduce((s, r) => s + ((r.valorAprovado ?? r.valor) || 0), 0);
                            return (
                              <div key={a.id} style={{ background: COLORS.offWhite, borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                  <span style={{ fontWeight: 600, fontSize: 13 }}>{ref.name || a.refereeId}</span>
                                  <button onClick={(ev) => {
                                    ev.stopPropagation();
                                    gerarEMostrarRecibo({
                                      arbitroNome: ref.name, arbitroCpf: ref.cpf,
                                      funcao: fnMap[a.refereeFunction] || a.refereeFunction,
                                      evento: e.title, dataEvento: a.event?.date, cidade: a.event?.city,
                                      valorDiaria: a.valorDiaria, transporte: a.transporte,
                                      hospedagem: a.hospedagem, alimentacao: a.alimentacao,
                                      reembolsos: reembs.map(r => ({ categoria: r.categoria, descricao: r.descricao, valor: (r.valorAprovado ?? r.valor) || 0 })),
                                      assinaturaUrl: config.assinaturaPresidenteUrl || "",
                                    }, setReciboPreview);
                                  }} style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: COLORS.primary, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                    Recibo
                                  </button>
                                </div>
                                <div style={{ fontSize: 12, color: COLORS.gray, display: "flex", flexDirection: "column", gap: 2 }}>
                                  {(a.valorDiaria || 0) > 0 && <div>Diaria ({fnMap[a.refereeFunction] || a.refereeFunction}): <strong>{fmt(a.valorDiaria)}</strong></div>}
                                  {(a.transporte || 0) > 0 && <div>Transporte: {fmt(a.transporte)}</div>}
                                  {(a.hospedagem || 0) > 0 && <div>Hospedagem: {fmt(a.hospedagem)}</div>}
                                  {(a.alimentacao || 0) > 0 && <div>Alimentacao: {fmt(a.alimentacao)}</div>}
                                  {reembs.map((r, ri) => (
                                    <div key={ri} style={{ color: "#0066cc" }}>Reembolso — {r.categoria}{r.descricao ? `: ${r.descricao}` : ""}: {fmt((r.valorAprovado ?? r.valor) || 0)}</div>
                                  ))}
                                  <div style={{ marginTop: 4, fontWeight: 700, color: COLORS.dark }}>Total: {fmt(totalRef)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Por Árbitro ── */}
            {tab === "arbitro" && (
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, color: COLORS.dark, margin: 0, textTransform: "uppercase" }}>Pagamentos por Arbitro</h3>
                  <button onClick={() => exportCSV(
                    data.porArbitro.map(a => [a.nome, a.eventos, a.diarias.toFixed(2), a.extras.toFixed(2), a.reembolsos.toFixed(2), (a.diarias + a.extras + a.reembolsos).toFixed(2)]),
                    ["Arbitro", "Eventos", "Diarias", "Extras", "Reembolsos", "Total"], `financeiro_arbitros_${ano}.csv`
                  )} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#007733", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Exportar CSV</button>
                </div>
                {data.porArbitro.length === 0 ? (
                  <div style={{ textAlign: "center", color: COLORS.gray, fontSize: 14, padding: 20 }}>Nenhum pagamento registrado.</div>
                ) : data.porArbitro.map((arb, i) => {
                  const isOpen = expandido === `arb_${i}`;
                  const arbAssigns = rawAssignments.filter(a => a.refereeId === arb.refereeId && (a.valorDiaria || 0) > 0);
                  const arbReemb = rawReembolsos.filter(r => r.refereeId === arb.refereeId && (r.status === "aprovado" || r.status === "aprovado_parcial" || r.status === "pago"));
                  return (
                    <div key={i} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                      <div onClick={() => setExpandido(isOpen ? null : `arb_${i}`)}
                        style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", cursor: "pointer", alignItems: "center" }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{arb.nome}</span>
                          <span style={{ fontSize: 12, color: COLORS.gray, marginLeft: 8 }}>{arb.eventos} evento(s)</span>
                        </div>
                        <div style={{ display: "flex", gap: 16, fontSize: 13, alignItems: "center" }}>
                          <span style={{ color: COLORS.gray }}>D: {fmt(arb.diarias)}</span>
                          <span style={{ color: COLORS.gray }}>R: {fmt(arb.reembolsos)}</span>
                          <strong>{fmt(arb.diarias + arb.extras + arb.reembolsos)}</strong>
                          <span style={{ fontSize: 10, color: COLORS.gray }}>{isOpen ? "▲" : "▼"}</span>
                        </div>
                      </div>
                      {isOpen && (
                        <div style={{ padding: "0 0 14px 14px" }}>
                          {arbAssigns.map(a => {
                            const evt = a.event || {};
                            const reembs = arbReemb.filter(r => r.eventId === a.eventId);
                            const totalEvt = (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0) + reembs.reduce((s, r) => s + ((r.valorAprovado ?? r.valor) || 0), 0);
                            const ref = refMap[arb.refereeId] || {};
                            return (
                              <div key={a.id} style={{ background: COLORS.offWhite, borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                  <span style={{ fontWeight: 600, fontSize: 13 }}>{evt.title || "—"} — {evt.date ? new Date(evt.date + "T12:00:00").toLocaleDateString("pt-BR") : ""}</span>
                                  <button onClick={(ev) => {
                                    ev.stopPropagation();
                                    gerarEMostrarRecibo({
                                      arbitroNome: arb.nome, arbitroCpf: ref.cpf,
                                      funcao: fnMap[a.refereeFunction] || a.refereeFunction,
                                      evento: evt.title, dataEvento: evt.date, cidade: evt.city,
                                      valorDiaria: a.valorDiaria, transporte: a.transporte,
                                      hospedagem: a.hospedagem, alimentacao: a.alimentacao,
                                      reembolsos: reembs.map(r => ({ categoria: r.categoria, descricao: r.descricao, valor: (r.valorAprovado ?? r.valor) || 0 })),
                                      assinaturaUrl: config.assinaturaPresidenteUrl || "",
                                    }, setReciboPreview);
                                  }} style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: COLORS.primary, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                    Recibo
                                  </button>
                                </div>
                                <div style={{ fontSize: 12, color: COLORS.gray, display: "flex", flexDirection: "column", gap: 2 }}>
                                  {(a.valorDiaria || 0) > 0 && <div>Diaria ({fnMap[a.refereeFunction] || a.refereeFunction}): <strong>{fmt(a.valorDiaria)}</strong></div>}
                                  {(a.transporte || 0) > 0 && <div>Transporte: {fmt(a.transporte)}</div>}
                                  {(a.hospedagem || 0) > 0 && <div>Hospedagem: {fmt(a.hospedagem)}</div>}
                                  {(a.alimentacao || 0) > 0 && <div>Alimentacao: {fmt(a.alimentacao)}</div>}
                                  {reembs.map((r, ri) => (
                                    <div key={ri} style={{ color: "#0066cc" }}>Reembolso — {r.categoria}{r.descricao ? `: ${r.descricao}` : ""}: {fmt((r.valorAprovado ?? r.valor) || 0)}</div>
                                  ))}
                                  <div style={{ marginTop: 4, fontWeight: 700, color: COLORS.dark }}>Total: {fmt(totalEvt)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      {/* Modal preview recibo */}
      {reciboPreview && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => { URL.revokeObjectURL(reciboPreview.url); setReciboPreview(null); }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 700, width: "95%", maxHeight: "90vh", overflow: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, color: COLORS.dark }}>Recibo de Pagamento</span>
              <button onClick={() => { URL.revokeObjectURL(reciboPreview.url); setReciboPreview(null); }}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: COLORS.gray }}>X</button>
            </div>
            <iframe src={`${reciboPreview.url}#zoom=page-width`} style={{ width: "100%", height: 500, border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, background: "#f4f4f4" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button onClick={() => { URL.revokeObjectURL(reciboPreview.url); setReciboPreview(null); }}
                style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", fontSize: 13, cursor: "pointer" }}>Fechar</button>
              <button onClick={() => {
                const win = window.open(reciboPreview.url);
                if (win) { win.onload = () => { win.focus(); win.print(); }; }
              }} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${COLORS.primary}`, background: "transparent", color: COLORS.primary, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.heading }}>Imprimir</button>
              <a href={reciboPreview.url} download={reciboPreview.nome}
                style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: FONTS.heading }}>Baixar PDF</a>
            </div>
          </div>
        </div>
      )}
    </IntranetLayout>
  );
}
