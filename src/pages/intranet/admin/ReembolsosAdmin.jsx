/**
 * ReembolsosAdmin.jsx — Aprovação de notas fiscais de reembolso.
 * Rota: /intranet/admin/reembolsos
 */
import { useState, useEffect } from "react";
import IntranetLayout from "../IntranetLayout";
import { ReembolsosService, RefereesService } from "../../../services/index";
import { notificarReembolso } from "../../../services/emailService";
import { COLORS, FONTS } from "../../../styles/colors";

const CATEGORIAS = { transporte: "Transporte", hospedagem: "Hospedagem", alimentacao: "Alimentacao", outro: "Outro" };
const STATUS_STYLE = {
  pendente: { label: "Pendente", color: "#d97706", bg: "#fffbeb" },
  aprovado: { label: "Aprovado", color: "#15803d", bg: "#f0fdf4" },
  aprovado_parcial: { label: "Aprovado parcial", color: "#0066cc", bg: "#eff6ff" },
  rejeitado: { label: "Rejeitado", color: "#dc2626", bg: "#fef2f2" },
};

function fmt(v) { return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function ReembolsosAdmin() {
  const [reembolsos, setReembolsos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("pendente");
  const [actionLoading, setActionLoading] = useState(null);
  const [notifyEmail, setNotifyEmail] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const r = await ReembolsosService.list();
    setReembolsos(r.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const notificarArbitro = async (r, status, valorAprovado, motivo) => {
    if (!notifyEmail) return;
    const refRes = await RefereesService.get(r.refereeId);
    const ref = refRes.data;
    if (!ref?.email) return;
    notificarReembolso({
      arbitroEmail: ref.email, arbitroNome: ref.name,
      status, categoria: CATEGORIAS[r.categoria] || r.categoria,
      valor: r.valor, valorAprovado, motivo,
    }).catch(() => {});
  };

  const handleAprovar = async (id, valorOriginal) => {
    const input = prompt(`Valor aprovado (deixe vazio para aprovar integral R$ ${(valorOriginal || 0).toFixed(2)}):`, valorOriginal);
    if (input === null) return;
    const valorAprovado = input.trim() === "" ? valorOriginal : Number(input);
    if (isNaN(valorAprovado) || valorAprovado < 0) return;
    setActionLoading(id);
    const parcial = valorAprovado < valorOriginal;
    const status = parcial ? "aprovado_parcial" : "aprovado";
    await ReembolsosService.update(id, { status, valorAprovado, aprovadoPor: "Admin", aprovadoEm: new Date().toISOString() });
    const r = reembolsos.find(x => x.id === id);
    if (r) notificarArbitro(r, status, valorAprovado);
    setActionLoading(null);
    fetchData();
  };

  const handleRejeitar = async (id) => {
    const motivo = prompt("Motivo da rejeicao:");
    if (motivo === null) return;
    setActionLoading(id);
    await ReembolsosService.update(id, { status: "rejeitado", motivoRejeicao: motivo });
    const r = reembolsos.find(x => x.id === id);
    if (r) notificarArbitro(r, "rejeitado", null, motivo);
    setActionLoading(null);
    fetchData();
  };

  const filtered = reembolsos.filter(r => !filtroStatus || r.status === filtroStatus);

  const pendentes = reembolsos.filter(r => r.status === "pendente");
  const totalAprovado = reembolsos.filter(r => r.status === "aprovado" || r.status === "aprovado_parcial").reduce((s, r) => s + ((r.valorAprovado ?? r.valor) || 0), 0);
  const totalPendente = pendentes.reduce((s, r) => s + (r.valor || 0), 0);

  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 20 };

  return (
    <IntranetLayout requireRole="canManage">
      <div style={{ padding: 36, maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>
          Reembolsos
        </h1>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 24px" }}>
          Aprovar ou rejeitar notas fiscais enviadas pelos arbitros.
        </p>

        {/* Resumo */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
          <div style={{ ...card, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: "#d97706" }}>{pendentes.length}</div>
            <div style={{ fontSize: 12, color: COLORS.gray }}>Pendentes</div>
          </div>
          <div style={{ ...card, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: "#d97706" }}>{fmt(totalPendente)}</div>
            <div style={{ fontSize: 12, color: COLORS.gray }}>Valor pendente</div>
          </div>
          <div style={{ ...card, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: "#15803d" }}>{fmt(totalAprovado)}</div>
            <div style={{ fontSize: 12, color: COLORS.gray }}>Total aprovado</div>
          </div>
        </div>

        {/* Filtro */}
        <div style={{ marginBottom: 16, display: "flex", gap: 16, alignItems: "center" }}>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, fontSize: 13 }}>
            <option value="">Todos</option>
            <option value="pendente">Pendentes</option>
            <option value="aprovado">Aprovados</option>
            <option value="rejeitado">Rejeitados</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: COLORS.gray }}>
            <input type="checkbox" checked={notifyEmail} onChange={e => setNotifyEmail(e.target.checked)} style={{ accentColor: COLORS.primary, width: 15, height: 15 }} />
            Notificar arbitro por e-mail
          </label>
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.gray }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...card, textAlign: "center", color: COLORS.gray, fontSize: 14 }}>Nenhum reembolso encontrado.</div>
        ) : filtered.map(r => {
          const st = STATUS_STYLE[r.status] || STATUS_STYLE.pendente;
          return (
            <div key={r.id} style={{ ...card, borderLeft: `4px solid ${st.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.dark }}>{r.refereeName}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, color: st.color, background: st.bg }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.dark, marginBottom: 2 }}>
                    <strong>{CATEGORIAS[r.categoria] || r.categoria}</strong> — {fmt(r.valor)}
                  </div>
                  {r.descricao && <div style={{ fontSize: 12, color: COLORS.gray }}>{r.descricao}</div>}
                  <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 4 }}>
                    {r.eventTitle} — {r.eventDate ? new Date(r.eventDate + "T12:00:00").toLocaleDateString("pt-BR") : ""}
                    {" — Enviado em "}{new Date(r.createdAt).toLocaleDateString("pt-BR")}
                  </div>
                  {r.status === "rejeitado" && r.motivoRejeicao && (
                    <div style={{ marginTop: 6, padding: "6px 10px", borderRadius: 6, background: "#fef2f2", fontSize: 12, color: "#dc2626" }}>
                      Motivo: {r.motivoRejeicao}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, alignItems: "flex-end" }}>
                  {r.notaUrl && (
                    <a href={r.notaUrl} target="_blank" rel="noreferrer"
                      style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: COLORS.offWhite, color: COLORS.primary, textDecoration: "none" }}>
                      Ver nota
                    </a>
                  )}
                  {(r.status === "aprovado_parcial" || r.status === "aprovado") && r.valorAprovado != null && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0066cc", marginTop: 4 }}>
                      Valor aprovado: {fmt(r.valorAprovado)}{r.valorAprovado < r.valor ? ` (de ${fmt(r.valor)})` : ""}
                    </div>
                  )}
                  {r.status === "pendente" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => handleAprovar(r.id, r.valor)} disabled={actionLoading === r.id}
                        style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: "#15803d", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        Aprovar
                      </button>
                      <button onClick={() => handleRejeitar(r.id)} disabled={actionLoading === r.id}
                        style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #dc2626", background: "transparent", color: "#dc2626", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </IntranetLayout>
  );
}
