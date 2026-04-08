/**
 * RelatorioArbitros.jsx — Relatório de árbitros com exportação CSV/PDF.
 * Rota: /intranet/admin/relatorio
 */
import { useState, useEffect } from "react";
import IntranetLayout from "../IntranetLayout";
import { RefereesService, AnuidadesService } from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";

function exportCSV(rows, filename) {
  const headers = ["Nome", "Email", "CPF", "Telefone", "Nivel", "Status", "Cidade", "UF", "Anuidade"];
  const csv = [headers.join(";"), ...rows.map(r =>
    [r.name, r.email, r.cpf, r.phone, r.nivel, r.status, r.city, r.state, r._anuidadeStatus || "—"].join(";")
  )].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export default function RelatorioArbitros() {
  const [referees, setReferees] = useState([]);
  const [anuidades, setAnuidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroNivel, setFiltroNivel] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroAnuidade, setFiltroAnuidade] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const ano = new Date().getFullYear();

  useEffect(() => {
    Promise.all([RefereesService.list(), AnuidadesService.list({ ano })]).then(([rRes, aRes]) => {
      const anuidMap = {};
      (aRes.data || []).forEach(a => { anuidMap[a.refereeId] = a.status; });
      const refs = (rRes.data || []).map(r => ({ ...r, _anuidadeStatus: anuidMap[r.id] || "" }));
      setReferees(refs);
      setAnuidades(aRes.data || []);
      setLoading(false);
    });
  }, []);

  const cidades = [...new Set(referees.map(r => r.city).filter(Boolean))].sort();
  const filtered = referees
    .filter(r => !filtroNivel || r.nivel === filtroNivel)
    .filter(r => !filtroStatus || r.status === filtroStatus)
    .filter(r => !filtroAnuidade || r._anuidadeStatus === filtroAnuidade)
    .filter(r => !filtroCidade || r.city === filtroCidade);

  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 20 };

  return (
    <IntranetLayout requireRole="canManage">
      <div style={{ padding: 36 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: 0 }}>Relatorio de Arbitros</h1>
            <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "4px 0 0" }}>{filtered.length} arbitro(s) encontrado(s)</p>
          </div>
          <button onClick={() => exportCSV(filtered, `relatorio_arbitros_${ano}.csv`)}
            style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#007733", color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Exportar CSV
          </button>
        </div>

        {/* Filtros */}
        <div style={{ ...card, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          {[
            { label: "Nivel", value: filtroNivel, set: setFiltroNivel, opts: ["A", "B", "C", "NI"] },
            { label: "Status", value: filtroStatus, set: setFiltroStatus, opts: ["ativo", "inativo", "suspenso"] },
            { label: "Anuidade", value: filtroAnuidade, set: setFiltroAnuidade, opts: ["pendente", "pago", "vencido", "isento"] },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray, marginBottom: 4 }}>{f.label}</div>
              <select value={f.value} onChange={e => f.set(e.target.value)}
                style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, fontSize: 13 }}>
                <option value="">Todos</option>
                {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray, marginBottom: 4 }}>Cidade</div>
            <select value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)}
              style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, fontSize: 13 }}>
              <option value="">Todas</option>
              {cidades.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Tabela */}
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.gray }}>Carregando...</div>
        ) : (
          <div style={{ ...card, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: COLORS.offWhite }}>
                  {["Nome", "Nivel", "Status", "Cidade/UF", "Telefone", "Anuidade"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: COLORS.grayDark, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                    <td style={{ padding: "8px 10px", fontSize: 13 }}><span style={{ fontWeight: 600 }}>{r.name}</span></td>
                    <td style={{ padding: "8px 10px", fontSize: 13 }}>{r.nivel || "—"}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13 }}>{r.status}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13 }}>{r.city || "—"}{r.state ? `/${r.state}` : ""}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13 }}>{r.phone || "—"}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13 }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700,
                        color: r._anuidadeStatus === "pago" ? "#15803d" : r._anuidadeStatus === "pendente" || r._anuidadeStatus === "vencido" ? "#d97706" : COLORS.gray,
                        background: r._anuidadeStatus === "pago" ? "#f0fdf4" : r._anuidadeStatus === "pendente" || r._anuidadeStatus === "vencido" ? "#fffbeb" : "#f3f4f6",
                      }}>{r._anuidadeStatus || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </IntranetLayout>
  );
}
