/**
 * DiariasAdmin.jsx — Resumo financeiro de diárias (lê dos assignments).
 * Rota: /intranet/admin/diarias
 */
import { useState, useEffect } from "react";
import IntranetLayout from "../IntranetLayout";
import { RefereeAssignmentsService, RefereesService } from "../../../services/index";
import { notificarDiariaPaga } from "../../../services/emailService";
import { COLORS, FONTS } from "../../../styles/colors";
import { REFEREE_FUNCTIONS } from "../../../config/navigation";
import PixModal from "../../../components/ui/PixModal";

const fnMap = Object.fromEntries((REFEREE_FUNCTIONS || []).map(f => [f.value, f.label]));
function fmt(v) { return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function DiariasAdmin() {
  const [assignments, setAssignments] = useState([]);
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroArbitro, setFiltroArbitro] = useState("");
  const [pixModal, setPixModal] = useState(null); // assignment id
  const [pagando, setPagando] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [aRes, rRes] = await Promise.all([
      RefereeAssignmentsService.list(),
      RefereesService.list(),
    ]);
    // Apenas escalações com diária > 0
    const comDiaria = (aRes.data || []).filter(a => (a.valorDiaria || 0) > 0);
    comDiaria.sort((a, b) => new Date(b.event?.date || b.createdAt) - new Date(a.event?.date || a.createdAt));
    setAssignments(comDiaria);
    setReferees(rRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const refMap = Object.fromEntries(referees.map(r => [r.id, r]));

  const filtered = assignments
    .filter(a => !filtroStatus || (filtroStatus === "pago" ? a.diariaPaga : !a.diariaPaga))
    .filter(a => !filtroArbitro || a.refereeId === filtroArbitro);

  const totalPago = assignments.filter(a => a.diariaPaga).reduce((s, a) => s + (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0), 0);
  const totalPendente = assignments.filter(a => !a.diariaPaga).reduce((s, a) => s + (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0), 0);

  const handlePagar = (id) => setPixModal(id);

  const confirmarPagar = async (dataISO) => {
    if (!pixModal || !dataISO) return;
    setPagando(true);
    await RefereeAssignmentsService.update(pixModal, { diariaPaga: true, diariaPagaEm: dataISO });
    const a = assignments.find(x => x.id === pixModal);
    const ref = a && refMap[a.refereeId];
    if (ref?.email && a?.event) {
      const total = (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0);
      notificarDiariaPaga({ arbitroEmail: ref.email, arbitroNome: ref.name, evento: a.event.title, valor: total }).catch(() => {});
    }
    setPagando(false);
    setPixModal(null);
    fetchData();
  };
  const handleDesfazerPago = async (id) => {
    await RefereeAssignmentsService.update(id, { diariaPaga: false, diariaPagaEm: "" });
    fetchData();
  };

  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 20 };

  return (
    <IntranetLayout requireRole="canManage">
      <div style={{ padding: 36, maxWidth: 950, margin: "0 auto" }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>
          Diarias de Arbitragem
        </h1>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 24px" }}>
          Resumo financeiro das diarias definidas nas escalacoes (Art. 6).
        </p>

        {/* Resumo */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
          <div style={{ ...card, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 900, color: "#15803d" }}>{fmt(totalPago)}</div>
            <div style={{ fontSize: 12, color: COLORS.gray }}>Total pago</div>
          </div>
          <div style={{ ...card, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 900, color: "#d97706" }}>{fmt(totalPendente)}</div>
            <div style={{ fontSize: 12, color: COLORS.gray }}>Total pendente</div>
          </div>
          <div style={{ ...card, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 900, color: COLORS.dark }}>{assignments.length}</div>
            <div style={{ fontSize: 12, color: COLORS.gray }}>Escalacoes com diaria</div>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, fontSize: 13 }}>
            <option value="">Todos</option>
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
                  {["Arbitro", "Evento", "Data", "Funcao", "Diaria", "Extras", "Total", "Status", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: COLORS.grayDark, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: 20, textAlign: "center", color: COLORS.gray, fontSize: 14 }}>Nenhuma diaria encontrada.</td></tr>
                ) : filtered.map(a => {
                  const total = (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0);
                  const extras = (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0);
                  const ref = refMap[a.refereeId] || a.referee || {};
                  return (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                      <td style={{ padding: "8px 10px", fontSize: 13 }}>{ref.name || a.refereeId}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13 }}>{a.event?.title || "—"}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13 }}>{a.event?.date ? new Date(a.event.date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13 }}>{fnMap[a.refereeFunction] || a.refereeFunction}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13 }}>{fmt(a.valorDiaria)}</td>
                      <td style={{ padding: "8px 10px", fontSize: 12, color: COLORS.gray }}>{fmt(extras)}</td>
                      <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 700 }}>{fmt(total)}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700,
                          color: a.diariaPaga ? "#15803d" : "#d97706",
                          background: a.diariaPaga ? "#f0fdf4" : "#fffbeb",
                        }}>{a.diariaPaga ? "Pago" : "Pendente"}</span>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        {a.diariaPaga ? (
                          <button onClick={() => handleDesfazerPago(a.id)}
                            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #dc2626", background: "transparent", color: "#dc2626", fontSize: 10, cursor: "pointer" }}>
                            Desfazer
                          </button>
                        ) : (
                          <button onClick={() => handlePagar(a.id)}
                            style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#15803d", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {pixModal && (() => {
        const a = assignments.find(x => x.id === pixModal);
        const ref = a && refMap[a.refereeId];
        const total = a ? (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0) : 0;
        return (
          <PixModal
            referee={ref}
            valor={total}
            descricao={a?.event?.title ? `Diaria ${a.event.title}` : "Diaria"}
            loading={pagando}
            onClose={() => setPixModal(null)}
            onConfirm={confirmarPagar}
          />
        );
      })()}
    </IntranetLayout>
  );
}
