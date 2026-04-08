/**
 * FinanceiroArbitragem.jsx — Relatório financeiro consolidado da arbitragem.
 * Rota: /intranet/admin/financeiro
 */
import { useState, useEffect } from "react";
import IntranetLayout from "../IntranetLayout";
import { RefereeAssignmentsService, AnuidadesService, ReembolsosService, RefereesService } from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";

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

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [asgRes, anRes, reembRes, refRes] = await Promise.all([
        RefereeAssignmentsService.list(),
        AnuidadesService.list({ ano }),
        ReembolsosService.list(),
        RefereesService.list(),
      ]);

      const assignments = (asgRes.data || []).filter(a => a.event);
      const anuidades = anRes.data || [];
      const reembolsos = (reembRes.data || []).filter(r => r.status === "aprovado" || r.status === "aprovado_parcial");
      const refMap = Object.fromEntries((refRes.data || []).map(r => [r.id, r]));

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
        if (!eventosMap[key]) eventosMap[key] = { title: a.event?.title || "—", date: a.event?.date || "", diarias: 0, extras: 0, reembolsos: 0, arbitros: 0 };
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
        if (!arbitrosMap[id]) arbitrosMap[id] = { nome: refMap[id]?.name || id, diarias: 0, extras: 0, reembolsos: 0, eventos: 0 };
        arbitrosMap[id].diarias += (a.valorDiaria || 0);
        arbitrosMap[id].extras += (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0);
        arbitrosMap[id].eventos++;
      });
      reembolsos.forEach(r => {
        if (!arbitrosMap[r.refereeId]) arbitrosMap[r.refereeId] = { nome: refMap[r.refereeId]?.name || r.refereeName || r.refereeId, diarias: 0, extras: 0, reembolsos: 0, eventos: 0 };
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
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr style={{ background: COLORS.offWhite }}>
                      <th style={th}>Evento</th><th style={th}>Arbitros</th><th style={th}>Diarias</th><th style={th}>Extras</th><th style={th}>Reembolsos</th><th style={th}>Total</th>
                    </tr></thead>
                    <tbody>
                      {data.porEvento.map((e, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                          <td style={{ ...td, fontWeight: 600 }}>{e.title}</td>
                          <td style={td}>{e.arbitros}</td>
                          <td style={td}>{fmt(e.diarias)}</td>
                          <td style={td}>{fmt(e.extras)}</td>
                          <td style={td}>{fmt(e.reembolsos)}</td>
                          <td style={{ ...td, fontWeight: 700 }}>{fmt(e.diarias + e.extras + e.reembolsos)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
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
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr style={{ background: COLORS.offWhite }}>
                      <th style={th}>Arbitro</th><th style={th}>Eventos</th><th style={th}>Diarias</th><th style={th}>Extras</th><th style={th}>Reembolsos</th><th style={th}>Total</th>
                    </tr></thead>
                    <tbody>
                      {data.porArbitro.map((a, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                          <td style={{ ...td, fontWeight: 600 }}>{a.nome}</td>
                          <td style={td}>{a.eventos}</td>
                          <td style={td}>{fmt(a.diarias)}</td>
                          <td style={td}>{fmt(a.extras)}</td>
                          <td style={td}>{fmt(a.reembolsos)}</td>
                          <td style={{ ...td, fontWeight: 700 }}>{fmt(a.diarias + a.extras + a.reembolsos)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </IntranetLayout>
  );
}
