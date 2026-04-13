/**
 * AnuidadesAdmin.jsx — Controle de anuidades dos árbitros.
 * Rota: /admin/anuidades
 *
 * - Gerar anuidades do ano para todos os árbitros ativos
 * - Listar com filtros (ano, status, nível)
 * - Confirmar/rejeitar pagamento, marcar isenção
 * - Visualizar comprovante
 */
import { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import IntranetLayout from "../../pages/intranet/IntranetLayout";
import { COLORS, FONTS } from "../../styles/colors";
import { AnuidadesService, TaxasConfigService, RefereesService } from "../../services/index";
import { ANUIDADE_STATUS } from "../../config/navigation";
import { notificarAnuidadeConfirmada } from "../../services/emailService";

const statusMap = Object.fromEntries(ANUIDADE_STATUS.map(s => [s.value, s]));

function Badge({ label, color, bg }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700,
      color, background: bg,
    }}>{label}</span>
  );
}

function formatMoeda(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AnuidadesAdmin({ useIntranet = false }) {
  const Layout = useIntranet ? IntranetLayout : ({ children }) => <AdminLayout title="Anuidades de Arbitragem">{children}</AdminLayout>;
  const [anuidades, setAnuidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [gerando, setGerando] = useState(false);
  const [msg, setMsg] = useState("");
  const [detail, setDetail] = useState(null); // anuidade selecionada
  const [actionLoading, setActionLoading] = useState(false);
  const [reciboNumero, setReciboNumero] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [aRes, cRes] = await Promise.all([
      AnuidadesService.list({ ano }),
      TaxasConfigService.get(),
    ]);
    setAnuidades(aRes.data || []);
    setConfig(cRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [ano]);

  const handleGerar = async () => {
    setGerando(true); setMsg("");
    const r = await AnuidadesService.gerarAnuidades(ano, config?.anuidade);
    setGerando(false);
    if (r.error) { setMsg(`Erro: ${r.error}`); return; }
    setMsg(`${r.data.length} anuidade(s) gerada(s) com sucesso.`);
    fetchData();
  };

  const handleAction = async (id, status, obs) => {
    setActionLoading(true);
    const patch = { status };
    if (status === "pago") {
      patch.confirmadoPor = "admin";
      patch.confirmadoEm = new Date().toISOString();
    }
    if (status === "pendente") {
      patch.confirmadoPor = "";
      patch.confirmadoEm = "";
      patch.comprovanteUrl = "";
      patch.comprovantePath = "";
      patch.pagamentoEm = "";
      patch.reciboNumero = "";
    }
    if (obs !== undefined) patch.observacao = obs;
    await AnuidadesService.update(id, patch);

    // Notificar árbitro quando anuidade confirmada como paga
    if (status === "pago" && detail?.refereeId) {
      RefereesService.get(detail.refereeId).then(refRes => {
        if (refRes.data?.email) {
          notificarAnuidadeConfirmada({
            arbitroEmail: refRes.data.email,
            arbitroNome: detail.refereeName || refRes.data.name || "Árbitro",
            ano: detail.ano,
            valor: detail.valor || 0,
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    setActionLoading(false);
    setDetail(null);
    fetchData();
  };

  const filtered = anuidades
    .filter(a => !filtroStatus || a.status === filtroStatus)
    .filter(a => !filtroNivel || a.refereeNivel === filtroNivel);

  const resumo = {
    total: anuidades.length,
    pendente: anuidades.filter(a => a.status === "pendente").length,
    pago: anuidades.filter(a => a.status === "pago").length,
    vencido: anuidades.filter(a => a.status === "vencido").length,
    isento: anuidades.filter(a => a.status === "isento").length,
    arrecadado: anuidades.filter(a => a.status === "pago").reduce((s, a) => s + (a.valor || 0), 0),
  };

  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 20 };

  return (
    <Layout>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* ── Filtros e ações ── */}
        <div style={{ ...card, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray, display: "block", marginBottom: 4 }}>Ano</label>
            <select value={ano} onChange={e => setAno(Number(e.target.value))}
              style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontSize: 14, fontFamily: FONTS.body }}>
              {[0, 1, 2].map(offset => {
                const y = new Date().getFullYear() - 1 + offset;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray, display: "block", marginBottom: 4 }}>Status</label>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontSize: 14, fontFamily: FONTS.body }}>
              <option value="">Todos</option>
              {ANUIDADE_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray, display: "block", marginBottom: 4 }}>Nivel</label>
            <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontSize: 14, fontFamily: FONTS.body }}>
              <option value="">Todos</option>
              {[{v:"A",l:"A"},{v:"B",l:"B"},{v:"C",l:"C"},{v:"NI",l:"NAR"}].map(n => <option key={n.v} value={n.v}>{n.l}</option>)}
            </select>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button onClick={handleGerar} disabled={gerando}
              style={{
                padding: "9px 20px", borderRadius: 8, border: "none",
                background: "#007733", color: "#fff", fontFamily: FONTS.heading,
                fontSize: 13, fontWeight: 700, cursor: gerando ? "not-allowed" : "pointer",
              }}>{gerando ? "Gerando..." : "Gerar Anuidades " + ano}</button>
          </div>
        </div>

        {msg && (
          <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, fontFamily: FONTS.body,
            background: msg.startsWith("Erro") ? "#fef2f2" : "#f0fdf4",
            color: msg.startsWith("Erro") ? "#dc2626" : "#15803d",
          }}>{msg}</div>
        )}

        {/* ── Resumo ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total", value: resumo.total, color: COLORS.dark },
            { label: "Pendentes", value: resumo.pendente, color: "#d97706" },
            { label: "Pagos", value: resumo.pago, color: "#15803d" },
            { label: "Vencidos", value: resumo.vencido, color: "#dc2626" },
            { label: "Isentos", value: resumo.isento, color: "#6b7280" },
            { label: "Arrecadado", value: formatMoeda(resumo.arrecadado), color: "#15803d" },
          ].map(s => (
            <div key={s.label} style={{ ...card, textAlign: "center", marginBottom: 0 }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Tabela ── */}
        <div style={card}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: COLORS.gray }}>Carregando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: COLORS.gray, fontFamily: FONTS.body, fontSize: 14 }}>
              Nenhuma anuidade encontrada para {ano}. Clique em "Gerar Anuidades" para criar.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: COLORS.offWhite }}>
                  <th style={th}>Arbitro</th>
                  <th style={th}>Nivel</th>
                  <th style={th}>Valor</th>
                  <th style={th}>Status</th>
                  <th style={th}>Recibo</th>
                  <th style={th}>Comprovante</th>
                  <th style={th}>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const st = statusMap[a.status] || statusMap.pendente;
                  return (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                      <td style={td}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{a.refereeName}</div>
                      </td>
                      <td style={td}>{a.refereeNivel || "—"}</td>
                      <td style={td}>{formatMoeda(a.valor)}</td>
                      <td style={td}><Badge label={st.label} color={st.color} bg={st.bg} /></td>
                      <td style={td}><span style={{ fontSize: 12, color: a.reciboNumero ? "#15803d" : COLORS.gray }}>{a.reciboNumero || "—"}</span></td>
                      <td style={td}>
                        {a.comprovanteUrl ? (
                          <a href={a.comprovanteUrl} target="_blank" rel="noreferrer"
                            style={{ color: COLORS.primary, fontSize: 13 }}>Ver</a>
                        ) : "—"}
                      </td>
                      <td style={td}>
                        <button onClick={() => setDetail(a)}
                          style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: FONTS.heading, fontWeight: 600 }}>
                          Gerenciar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Modal de ação ── */}
        {detail && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setDetail(null)}>
            <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "90%", maxWidth: 480 }}
              onClick={e => e.stopPropagation()}>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 800, color: COLORS.dark, margin: "0 0 16px" }}>
                {detail.refereeName} — {detail.ano}
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, fontSize: 14, fontFamily: FONTS.body }}>
                <div><strong>Nivel:</strong> {detail.refereeNivel || "—"}</div>
                <div><strong>Valor:</strong> {formatMoeda(detail.valor)}</div>
                <div><strong>Status:</strong> <Badge label={(statusMap[detail.status] || {}).label || detail.status} color={(statusMap[detail.status] || {}).color} bg={(statusMap[detail.status] || {}).bg} /></div>
                {detail.pagamentoEm && (
                  <div><strong>Pagamento em:</strong> {detail.pagamentoEm.length === 10 ? new Date(detail.pagamentoEm + "T12:00:00").toLocaleDateString("pt-BR") : new Date(detail.pagamentoEm).toLocaleDateString("pt-BR")}</div>
                )}
                {detail.comprovanteUrl && (
                  <div><a href={detail.comprovanteUrl} target="_blank" rel="noreferrer" style={{ color: COLORS.primary }}>Ver comprovante</a></div>
                )}
                {detail.confirmadoEm && (
                  <div style={{ gridColumn: "1 / -1" }}><strong>Confirmado em:</strong> {new Date(detail.confirmadoEm).toLocaleDateString("pt-BR")} por {detail.confirmadoPor}</div>
                )}
              </div>

              {detail.observacao && (
                <div style={{ padding: "8px 12px", background: COLORS.offWhite, borderRadius: 8, fontSize: 13, fontFamily: FONTS.body, marginBottom: 16 }}>
                  <strong>Obs:</strong> {detail.observacao}
                </div>
              )}

              {/* Acoes de status */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {detail.status !== "pago" && (
                  <button onClick={() => handleAction(detail.id, "pago")} disabled={actionLoading}
                    style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#15803d", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    Confirmar Pagamento
                  </button>
                )}
                {detail.status !== "isento" && (
                  <button onClick={() => {
                    const obs = prompt("Motivo da isencao (opcional):");
                    handleAction(detail.id, "isento", obs || "");
                  }} disabled={actionLoading}
                    style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#6b7280", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    Marcar Isento
                  </button>
                )}
                {detail.status !== "vencido" && detail.status !== "pago" && (
                  <button onClick={() => handleAction(detail.id, "vencido")} disabled={actionLoading}
                    style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    Marcar Vencido
                  </button>
                )}
                {detail.status !== "pendente" && (
                  <button onClick={() => handleAction(detail.id, "pendente")} disabled={actionLoading}
                    style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    Voltar p/ Pendente
                  </button>
                )}
              </div>


              <div style={{ textAlign: "right", marginTop: 16 }}>
                <button onClick={() => { setDetail(null); setReciboNumero(""); }}
                  style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", fontSize: 13, cursor: "pointer" }}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

const th = { textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: COLORS.grayDark, textTransform: "uppercase", letterSpacing: 0.5 };
const td = { padding: "10px 12px", fontSize: 13, fontFamily: FONTS.body };
