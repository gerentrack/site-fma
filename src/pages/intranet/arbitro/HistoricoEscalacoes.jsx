/**
 * HistoricoEscalacoes.jsx — Histórico completo de escalações do árbitro.
 * Rota: /intranet/historico
 * - Linha do tempo de todos os eventos
 * - Filtros por ano, cidade, função
 * - Resumo financeiro (total diárias + reembolsos)
 */
import { useState, useEffect, useMemo } from "react";
import IntranetLayout from "../IntranetLayout";
import { useIntranet } from "../../../context/IntranetContext";
import { RefereeAssignmentsService, ReembolsosService } from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";
import { CALENDAR_CATEGORIES, REFEREE_FUNCTIONS } from "../../../config/navigation";

const catMap = Object.fromEntries((CALENDAR_CATEGORIES || []).filter(c => c.value).map(c => [c.value, c]));
const fnMap = Object.fromEntries((REFEREE_FUNCTIONS || []).map(f => [f.value, f.label]));

const card = { background: "#fff", borderRadius: 12, padding: "18px 22px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" };
const R$ = v => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function HistoricoEscalacoes() {
  const { refereeId } = useIntranet();
  const [assignments, setAssignments] = useState([]);
  const [reembolsos, setReembolsos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroAno, setFiltroAno] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroFuncao, setFiltroFuncao] = useState("");

  useEffect(() => {
    if (!refereeId) return;
    Promise.all([
      RefereeAssignmentsService.getByReferee(refereeId),
      ReembolsosService.list({ refereeId }),
    ]).then(([aRes, rRes]) => {
      const all = (aRes.data || []).filter(a => a.event).sort((a, b) => b.event.date.localeCompare(a.event.date));
      setAssignments(all);
      setReembolsos((rRes.data || []).filter(r => r.refereeId === refereeId));
      setLoading(false);
    });
  }, [refereeId]);

  // Opções de filtro
  const anos = useMemo(() => [...new Set(assignments.map(a => a.event.date.slice(0, 4)))].sort().reverse(), [assignments]);
  const cidades = useMemo(() => [...new Set(assignments.map(a => a.event.city).filter(Boolean))].sort(), [assignments]);
  const funcoes = useMemo(() => [...new Set(assignments.map(a => a.refereeFunction).filter(Boolean))].sort(), [assignments]);

  // Aplicar filtros
  const filtered = useMemo(() => {
    let list = assignments;
    if (filtroAno) list = list.filter(a => a.event.date.startsWith(filtroAno));
    if (filtroCidade) list = list.filter(a => a.event.city === filtroCidade);
    if (filtroFuncao) list = list.filter(a => a.refereeFunction === filtroFuncao);
    return list;
  }, [assignments, filtroAno, filtroCidade, filtroFuncao]);

  // Resumo financeiro do filtro
  const resumo = useMemo(() => {
    const filteredIds = new Set(filtered.map(a => a.id));
    const filteredEventIds = new Set(filtered.map(a => a.eventId));
    const diarias = filtered.reduce((s, a) => s + (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0), 0);
    const diariasPagas = filtered.filter(a => a.diariaPaga).reduce((s, a) => s + (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0), 0);
    const reembTotal = reembolsos.filter(r => filteredEventIds.has(r.eventId) && r.status === "pago").reduce((s, r) => s + (r.valorAprovado || r.valor || 0), 0);
    return { eventos: filtered.length, diarias, diariasPagas, reembTotal, total: diariasPagas + reembTotal };
  }, [filtered, reembolsos]);

  // Agrupar por ano/mês
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(a => {
      const key = a.event.date.slice(0, 7); // YYYY-MM
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const selectStyle = {
    padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${COLORS.grayLight}`,
    fontFamily: FONTS.body, fontSize: 13, background: "#fff", cursor: "pointer", minWidth: 140,
  };

  return (
    <IntranetLayout>
      <div style={{ padding: 36, maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>
          Historico de Escalacoes
        </h1>
        <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: "0 0 24px" }}>
          Todos os eventos em que voce foi escalado.
        </p>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} style={selectStyle}>
            <option value="">Todos os anos</option>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)} style={selectStyle}>
            <option value="">Todas as cidades</option>
            {cidades.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filtroFuncao} onChange={e => setFiltroFuncao(e.target.value)} style={selectStyle}>
            <option value="">Todas as funcoes</option>
            {funcoes.map(f => <option key={f} value={f}>{fnMap[f] || f}</option>)}
          </select>
          {(filtroAno || filtroCidade || filtroFuncao) && (
            <button onClick={() => { setFiltroAno(""); setFiltroCidade(""); setFiltroFuncao(""); }}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: COLORS.grayLight, color: COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
              Limpar filtros
            </button>
          )}
        </div>

        {/* Resumo financeiro */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Eventos", value: resumo.eventos, color: COLORS.primary },
            { label: "Diarias (total)", value: R$(resumo.diarias), color: "#0066cc" },
            { label: "Diarias pagas", value: R$(resumo.diariasPagas), color: "#15803d" },
            { label: "Reembolsos pagos", value: R$(resumo.reembTotal), color: "#7c3aed" },
            { label: "Total recebido", value: R$(resumo.total), color: "#007733" },
          ].map(s => (
            <div key={s.label} style={{ ...card, borderTop: `3px solid ${s.color}`, textAlign: "center", padding: "14px 12px" }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: COLORS.gray, fontFamily: FONTS.body }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>📋</div>
            <p style={{ fontFamily: FONTS.body, color: COLORS.gray }}>Nenhuma escalacao encontrada.</p>
          </div>
        ) : (
          grouped.map(([mesKey, items]) => {
            const [y, m] = mesKey.split("-");
            const mesLabel = new Date(+y, +m - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            return (
              <div key={mesKey} style={{ marginBottom: 28 }}>
                <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, margin: "0 0 12px", paddingBottom: 8, borderBottom: `2px solid ${COLORS.grayLight}` }}>
                  {mesLabel}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {items.map(asgn => {
                    const evt = asgn.event;
                    const cat = catMap[evt.category] || { color: COLORS.gray, icon: "📅", label: evt.category || "" };
                    const total = (asgn.valorDiaria || 0) + (asgn.transporte || 0) + (asgn.hospedagem || 0) + (asgn.alimentacao || 0);
                    return (
                      <div key={asgn.id} style={{ ...card, display: "flex", alignItems: "center", gap: 16, borderLeft: `4px solid ${asgn.diariaPaga ? "#15803d" : COLORS.grayLight}` }}>
                        {/* Data */}
                        <div style={{ width: 44, flexShrink: 0, textAlign: "center" }}>
                          <div style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 900, color: cat.color, lineHeight: 1 }}>
                            {new Date(evt.date + "T12:00:00").getDate()}
                          </div>
                          <div style={{ fontFamily: FONTS.heading, fontSize: 9, fontWeight: 700, color: COLORS.gray, textTransform: "uppercase" }}>
                            {new Date(evt.date + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" })}
                          </div>
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, color: COLORS.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {evt.title}
                          </div>
                          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
                            {evt.city}{evt.location ? ` — ${evt.location}` : ""} | {fnMap[asgn.refereeFunction] || asgn.refereeFunction}
                          </div>
                        </div>
                        {/* Valor */}
                        {total > 0 && (
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, color: asgn.diariaPaga ? "#15803d" : "#d97706" }}>
                              {R$(total)}
                            </div>
                            <div style={{ fontFamily: FONTS.body, fontSize: 10, color: asgn.diariaPaga ? "#15803d" : "#d97706" }}>
                              {asgn.diariaPaga ? "Pago" : "Pendente"}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </IntranetLayout>
  );
}
