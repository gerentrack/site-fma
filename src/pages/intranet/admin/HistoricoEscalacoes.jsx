/**
 * HistoricoEscalacoes.jsx — Histórico completo de escalações.
 * Rota: /intranet/admin/historico
 * Visibilidade: admin sempre, coordenador e árbitro controlados por config.
 */
import { useState, useEffect } from "react";
import IntranetLayout from "../IntranetLayout";
import { useIntranet } from "../../../context/IntranetContext";
import { RefereeAssignmentsService, RefereeEventsService, RefereesService } from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";
import { REFEREE_FUNCTIONS, CALENDAR_CATEGORIES } from "../../../config/navigation";

const fnMap = Object.fromEntries((REFEREE_FUNCTIONS || []).map(f => [f.value, f.label]));
const catMap = Object.fromEntries((CALENDAR_CATEGORIES || []).filter(c => c.value).map(c => [c.value, c]));

export default function HistoricoEscalacoes() {
  const { canManage, refereeId, role } = useIntranet();
  const [assignments, setAssignments] = useState([]);
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroArbitro, setFiltroArbitro] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const [aRes, rRes] = await Promise.all([
        canManage ? RefereeAssignmentsService.list() : RefereeAssignmentsService.getByReferee(refereeId),
        canManage ? RefereesService.list() : Promise.resolve({ data: [] }),
      ]);
      const items = (aRes.data || []).filter(a => a.event?.date < new Date().toISOString().slice(0, 10));
      items.sort((a, b) => new Date(b.event?.date) - new Date(a.event?.date));
      setAssignments(items);
      setReferees(rRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [refereeId, canManage]);

  const refMap = Object.fromEntries(referees.map(r => [r.id, r.name]));
  const filtered = filtroArbitro ? assignments.filter(a => a.refereeId === filtroArbitro) : assignments;

  return (
    <IntranetLayout>
      <div style={{ padding: 36 }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>
          Historico de Escalacoes
        </h1>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 24px" }}>
          {canManage ? "Todas as escalacoes passadas." : "Suas escalacoes passadas."}
        </p>

        {canManage && referees.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <select value={filtroArbitro} onChange={e => setFiltroArbitro(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontSize: 14, fontFamily: FONTS.body }}>
              <option value="">Todos os arbitros</option>
              {referees.filter(r => r.status === "ativo").sort((a, b) => a.name.localeCompare(b.name)).map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <span style={{ marginLeft: 12, fontSize: 13, color: COLORS.gray }}>{filtered.length} registro(s)</span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.gray }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.gray, fontSize: 14 }}>Nenhuma escalacao passada encontrada.</div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: COLORS.offWhite }}>
                  <th style={th}>Data</th>
                  <th style={th}>Evento</th>
                  <th style={th}>Cidade</th>
                  {canManage && <th style={th}>Arbitro</th>}
                  <th style={th}>Funcao</th>
                  <th style={th}>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const evt = a.event || {};
                  const cat = catMap[evt.category] || { label: evt.category, color: COLORS.gray };
                  return (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                      <td style={td}>{evt.date ? new Date(evt.date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                      <td style={td}><span style={{ fontWeight: 600 }}>{evt.title || "—"}</span></td>
                      <td style={td}>{evt.city || "—"}</td>
                      {canManage && <td style={td}>{refMap[a.refereeId] || a.refereeId}</td>}
                      <td style={td}>{fnMap[a.refereeFunction] || a.refereeFunction}</td>
                      <td style={td}><span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, background: `${cat.color}15`, color: cat.color }}>{cat.label}</span></td>
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

const th = { textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: COLORS.grayDark, textTransform: "uppercase" };
const td = { padding: "10px 12px", fontSize: 13, fontFamily: FONTS.body };
