/**
 * RelatorioFinanceiro.jsx — Dashboard financeiro de taxas e pagamentos.
 * Rota: /admin/financeiro
 */
import { useState, useEffect, useMemo } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { COLORS, FONTS } from "../../styles/colors";
import { SolicitacoesService, OrganizersService, PagamentosService, ArquivosService } from "../../services/index";
import { PAGAMENTO_STATUS, SOLICITACAO_STATUS } from "../../config/navigation";
import { formatarMoeda } from "../../utils/taxaCalculator";
import { exportRelatorioCSV } from "../../utils/relatorioExport";

const pagStatusMap = Object.fromEntries(PAGAMENTO_STATUS.map(s => [s.value, s]));

export default function RelatorioFinanceiro() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [allPagamentos, setAllPagamentos] = useState([]); // todos os registros de pagamento
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState("resumo");

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroPagamento, setFiltroPagamento] = useState("");
  const [filtroOrganizerId, setFiltroOrganizerId] = useState("");
  const [filtroParceiro, setFiltroParceiro] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  useEffect(() => {
    Promise.all([
      SolicitacoesService.list(),
      OrganizersService.list(),
      PagamentosService.list(),
    ]).then(([rSol, rOrg, rPag]) => {
      setSolicitacoes(rSol.data || []);
      setOrganizers(rOrg.data || []);
      setAllPagamentos(rPag.data || []);
      setLoading(false);
    });
  }, []);

  const organizerMap = useMemo(() =>
    Object.fromEntries(organizers.map(o => [o.id, o])),
    [organizers]
  );

  // Agrupar pagamentos por solicitacao
  const pagamentosPorSol = useMemo(() => {
    const map = {};
    allPagamentos.forEach(p => {
      if (!map[p.solicitacaoId]) map[p.solicitacaoId] = [];
      map[p.solicitacaoId].push(p);
    });
    return map;
  }, [allPagamentos]);

  // Filtragem
  const filtered = useMemo(() => {
    return solicitacoes.filter(sol => {
      if (filtroTipo && sol.tipo !== filtroTipo) return false;
      if (filtroPagamento && (sol.pagamento?.status || "pendente") !== filtroPagamento) return false;
      if (filtroOrganizerId && sol.organizerId !== filtroOrganizerId) return false;
      if (filtroParceiro === "sim" && !organizerMap[sol.organizerId]?.parceiro) return false;
      if (filtroParceiro === "nao" && organizerMap[sol.organizerId]?.parceiro) return false;
      if (filtroDataInicio && sol.dataEvento < filtroDataInicio) return false;
      if (filtroDataFim && sol.dataEvento > filtroDataFim) return false;
      return true;
    });
  }, [solicitacoes, filtroTipo, filtroPagamento, filtroOrganizerId, filtroParceiro, filtroDataInicio, filtroDataFim, organizerMap]);

  // Metricas (baseado nos registros de pagamento reais)
  const metricas = useMemo(() => {
    let totalArrecadado = 0;
    let totalPendente = 0;
    let totalIsento = 0;
    let countConfirmadas = 0;
    let countPendentes = 0;
    let countIsentas = 0;
    const totalUrgencia = filtered.reduce((acc, s) => acc + (s.taxas?.urgencia || 0), 0);
    const totalDesconto = filtered.reduce((acc, s) => acc + (s.taxas?.descontoValor || 0), 0);

    filtered.forEach(s => {
      const pags = pagamentosPorSol[s.id] || [];
      const pago = pags.filter(p => p.status === "confirmado").reduce((a, p) => a + (p.valor || 0), 0);
      const taxa = s.taxas?.total || 0;

      if (s.pagamento?.status === "isento") { totalIsento += taxa; countIsentas++; }
      else if (pago >= taxa && pago > 0) { totalArrecadado += pago; countConfirmadas++; }
      else if (pago > 0) { totalArrecadado += pago; totalPendente += (taxa - pago); countPendentes++; }
      else { totalPendente += taxa; countPendentes++; }
    });

    return { totalArrecadado, totalPendente, totalIsento, totalUrgencia, totalDesconto, countConfirmadas, countPendentes, countIsentas };
  }, [filtered, pagamentosPorSol]);

  // Por organizador (com pagamentos reais)
  const porOrganizador = useMemo(() => {
    const map = {};
    filtered.forEach(sol => {
      const oid = sol.organizerId;
      if (!map[oid]) map[oid] = { org: organizerMap[oid] || { name: "Desconhecido" }, count: 0, total: 0, pago: 0, pendente: 0, recibos: 0 };
      const pags = pagamentosPorSol[sol.id] || [];
      const pago = pags.filter(p => p.status === "confirmado").reduce((a, p) => a + (p.valor || 0), 0);
      const taxa = sol.taxas?.total || 0;
      map[oid].count++;
      map[oid].total += taxa;
      map[oid].pago += pago;
      map[oid].pendente += Math.max(0, taxa - pago);
      map[oid].recibos += pags.filter(p => p.reciboNumero).length;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered, organizerMap, pagamentosPorSol]);

  if (loading) {
    return <AdminLayout title="Relatorio Financeiro"><div style={{ padding: 40, textAlign: "center", color: COLORS.gray }}>Carregando...</div></AdminLayout>;
  }

  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 20 };
  const th = { textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 700, color: COLORS.grayDark, background: COLORS.offWhite };
  const td = { padding: "8px 12px", fontSize: 13, borderBottom: `1px solid ${COLORS.grayLight}` };
  const inp = { padding: "8px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 13, fontFamily: FONTS.body, boxSizing: "border-box" };

  const abas = [
    { key: "resumo",       label: "Resumo Geral" },
    { key: "organizador",  label: "Por Organizador" },
    { key: "detalhado",    label: "Detalhado" },
  ];

  return (
    <AdminLayout title="Relatorio Financeiro">
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 16px" }}>

        {/* Filtros */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.primary, margin: 0 }}>Filtros</h3>
            <button onClick={() => exportRelatorioCSV(filtered, organizerMap, { dataInicio: filtroDataInicio, dataFim: filtroDataFim }, pagamentosPorSol)}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#15803d", color: "#fff", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Exportar CSV
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.gray, marginBottom: 3 }}>PERIODO INICIO</div>
              <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.gray, marginBottom: 3 }}>PERIODO FIM</div>
              <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.gray, marginBottom: 3 }}>TIPO</div>
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={inp}>
                <option value="">Todos</option>
                <option value="permit">Permit</option>
                <option value="chancela">Chancela</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.gray, marginBottom: 3 }}>PAGAMENTO</div>
              <select value={filtroPagamento} onChange={e => setFiltroPagamento(e.target.value)} style={inp}>
                <option value="">Todos</option>
                {PAGAMENTO_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.gray, marginBottom: 3 }}>PARCEIRO</div>
              <select value={filtroParceiro} onChange={e => setFiltroParceiro(e.target.value)} style={inp}>
                <option value="">Todos</option>
                <option value="sim">Parceiros</option>
                <option value="nao">Nao parceiros</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.gray, marginBottom: 3 }}>ORGANIZADOR</div>
              <select value={filtroOrganizerId} onChange={e => setFiltroOrganizerId(e.target.value)} style={inp}>
                <option value="">Todos</option>
                {organizers.sort((a, b) => a.name.localeCompare(b.name)).map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: COLORS.gray }}>
            {filtered.length} solicitacao(oes) encontrada(s)
          </div>
        </div>

        {/* Abas */}
        <div style={{ display: "flex", background: "#fff", borderRadius: 10, border: `1px solid ${COLORS.grayLight}`, overflow: "hidden", marginBottom: 20 }}>
          {abas.map((a, i) => (
            <button key={a.key} onClick={() => setAba(a.key)}
              style={{ flex: 1, padding: "12px 16px", background: aba === a.key ? "#0f172a" : "#fff", border: "none",
                borderRight: i < abas.length - 1 ? `1px solid ${COLORS.grayLight}` : "none",
                color: aba === a.key ? "#fff" : COLORS.gray, fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700,
                cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {a.label}
            </button>
          ))}
        </div>

        {/* ── Resumo Geral ─── */}
        {aba === "resumo" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
              <MetricaCard label="Total arrecadado" valor={formatarMoeda(metricas.totalArrecadado)} color="#15803d" icon="" count={metricas.countConfirmadas} />
              <MetricaCard label="Total pendente" valor={formatarMoeda(metricas.totalPendente)} color="#d97706" icon="" count={metricas.countPendentes} />
              <MetricaCard label="Total isento" valor={formatarMoeda(metricas.totalIsento)} color="#6b7280" icon="" count={metricas.countIsentas} />
              <MetricaCard label="Taxas de urgencia" valor={formatarMoeda(metricas.totalUrgencia)} color="#b45309" icon="" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={card}>
                <h4 style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 12px" }}>Por status de pagamento</h4>
                {PAGAMENTO_STATUS.map(ps => {
                  const count = filtered.filter(s => (s.pagamento?.status || "pendente") === ps.value).length;
                  const total = filtered.filter(s => (s.pagamento?.status || "pendente") === ps.value).reduce((a, s) => a + (s.taxas?.total || 0), 0);
                  if (count === 0) return null;
                  return (
                    <div key={ps.value} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${COLORS.grayLight}` }}>
                      <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: ps.color }}>{ps.icon}</span> {ps.label} ({count})
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{formatarMoeda(total)}</span>
                    </div>
                  );
                })}
              </div>
              <div style={card}>
                <h4 style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 12px" }}>Por tipo</h4>
                {["permit", "chancela"].map(tipo => {
                  const items = filtered.filter(s => s.tipo === tipo);
                  const total = items.reduce((a, s) => a + (s.taxas?.total || 0), 0);
                  const media = items.length > 0 ? total / items.length : 0;
                  return (
                    <div key={tipo} style={{ padding: "8px 0", borderBottom: `1px solid ${COLORS.grayLight}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{tipo} ({items.length})</span>
                        <span style={{ fontWeight: 600 }}>{formatarMoeda(total)}</span>
                      </div>
                      <div style={{ fontSize: 11, color: COLORS.gray }}>Media: {formatarMoeda(media)}/evento</div>
                    </div>
                  );
                })}
                {metricas.totalDesconto > 0 && (
                  <div style={{ paddingTop: 8, fontSize: 12, color: "#15803d" }}>
                    Total em descontos concedidos: {formatarMoeda(metricas.totalDesconto)}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Por Organizador ─── */}
        {aba === "organizador" && (
          <div style={card}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Organizador</th>
                  <th style={{ ...th, textAlign: "center" }}>Solic.</th>
                  <th style={{ ...th, textAlign: "right" }}>Total</th>
                  <th style={{ ...th, textAlign: "right" }}>Pago</th>
                  <th style={{ ...th, textAlign: "right" }}>Pendente</th>
                </tr>
              </thead>
              <tbody>
                {porOrganizador.map((row, i) => (
                  <tr key={i}>
                    <td style={td}>
                      <span style={{ fontWeight: 600 }}>{row.org.name}</span>
                      {row.org.parceiro && <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 6px", borderRadius: 10, background: "#f0fdf4", color: "#15803d", fontWeight: 700 }}>Parceiro</span>}
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>{row.count}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{formatarMoeda(row.total)}</td>
                    <td style={{ ...td, textAlign: "right", color: "#15803d" }}>{formatarMoeda(row.pago)}</td>
                    <td style={{ ...td, textAlign: "right", color: row.pendente > 0 ? "#d97706" : COLORS.gray }}>{formatarMoeda(row.pendente)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 800, borderTop: `2px solid ${COLORS.grayLight}` }}>
                  <td style={{ ...td, fontFamily: FONTS.heading }}>TOTAL</td>
                  <td style={{ ...td, textAlign: "center" }}>{filtered.length}</td>
                  <td style={{ ...td, textAlign: "right" }}>{formatarMoeda(porOrganizador.reduce((a, r) => a + r.total, 0))}</td>
                  <td style={{ ...td, textAlign: "right", color: "#15803d" }}>{formatarMoeda(porOrganizador.reduce((a, r) => a + r.pago, 0))}</td>
                  <td style={{ ...td, textAlign: "right", color: "#d97706" }}>{formatarMoeda(porOrganizador.reduce((a, r) => a + r.pendente, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Detalhado ─── */}
        {aba === "detalhado" && (
          <div style={card}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                <thead>
                  <tr>
                    <th style={th}>Protocolo</th>
                    <th style={th}>Evento</th>
                    <th style={th}>Organizador</th>
                    <th style={{ ...th, textAlign: "right" }}>Taxa</th>
                    <th style={{ ...th, textAlign: "right" }}>Pago</th>
                    <th style={{ ...th, textAlign: "center" }}>Pgtos</th>
                    <th style={th}>Recibos</th>
                    <th style={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || "")).map(sol => {
                    const org = organizerMap[sol.organizerId] || {};
                    const st = SOLICITACAO_STATUS.find(s => s.value === sol.status) || {};
                    const pags = pagamentosPorSol[sol.id] || [];
                    const totalPago = pags.filter(p => p.status === "confirmado").reduce((a, p) => a + (p.valor || 0), 0);
                    const recibos = pags.filter(p => p.reciboNumero);
                    const taxaTotal = sol.taxas?.total || 0;
                    const temSaldo = totalPago < taxaTotal && totalPago > 0;
                    const tipoLabels = { taxa_solicitacao: "Sol", taxa_arbitragem: "Arb", complemento: "Compl" };

                    return (
                      <tr key={sol.id} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                        <td style={td}><span style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>{sol.protocoloFMA || "—"}</span></td>
                        <td style={td}>
                          <div>{sol.nomeEvento?.slice(0, 30)}{sol.nomeEvento?.length > 30 ? "..." : ""}</div>
                          <div style={{ fontSize: 10, color: COLORS.gray }}>{sol.tipo} — {sol.dataEvento || "—"}</div>
                        </td>
                        <td style={td}>
                          {org.name?.slice(0, 20) || "—"}
                          {org.parceiro && <span style={{ marginLeft: 4, fontSize: 9, color: "#15803d" }}>★</span>}
                        </td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{formatarMoeda(taxaTotal)}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 600, color: temSaldo ? "#d97706" : totalPago > 0 ? "#15803d" : COLORS.gray }}>
                          {formatarMoeda(totalPago)}
                          {temSaldo && <div style={{ fontSize: 9, color: "#d97706" }}>saldo: {formatarMoeda(taxaTotal - totalPago)}</div>}
                        </td>
                        <td style={{ ...td, textAlign: "center" }}>
                          {pags.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
                              {pags.map((p, i) => (
                                <span key={p.id} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: p.tipo === "taxa_arbitragem" ? "#eff6ff" : "#f0fdf4", color: p.tipo === "taxa_arbitragem" ? "#0066cc" : "#15803d", fontWeight: 600 }}>
                                  {tipoLabels[p.tipo] || "—"}: {formatarMoeda(p.valor)}
                                </span>
                              ))}
                            </div>
                          ) : <span style={{ fontSize: 11, color: COLORS.gray }}>—</span>}
                        </td>
                        <td style={td}>
                          {recibos.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {recibos.map(r => (
                                <button key={r.id} onClick={async () => {
                                  if (r.reciboArquivoId) {
                                    const res = await ArquivosService.get(r.reciboArquivoId);
                                    if (res.data?.url) window.open(res.data.url, "_blank");
                                  }
                                }} style={{ background: "none", border: "none", color: "#0066cc", cursor: "pointer", fontSize: 10, fontWeight: 700, textDecoration: "underline", padding: 0, textAlign: "left" }}>
                                  {r.reciboNumero}
                                </button>
                              ))}
                            </div>
                          ) : <span style={{ fontSize: 11, color: COLORS.gray }}>—</span>}
                        </td>
                        <td style={td}>
                          <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function MetricaCard({ label, valor, color, icon, count }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 10, fontFamily: FONTS.heading, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontFamily: FONTS.heading, fontWeight: 900, color }}>{valor}</div>
      {count !== undefined && <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>{count} solicitacao(oes)</div>}
    </div>
  );
}
