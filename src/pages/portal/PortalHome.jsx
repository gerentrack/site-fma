/**
 * PortalHome.jsx — Dashboard do organizador.
 * Rota: /portal
 * - Resumo de solicitações por status
 * - Alertas de pendências abertas
 * - Últimas atividades (movimentações recentes do organizador)
 * - Ações rápidas
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useOrganizer } from "../../context/OrganizerContext";
import { SolicitacoesService, MovimentacoesService } from "../../services/index";
import { COLORS, FONTS } from "../../styles/colors";
import { SOLICITACAO_STATUS, SOLICITACAO_TIPOS, MOVIMENTACAO_TIPOS } from "../../config/navigation";

const statusMap = Object.fromEntries(SOLICITACAO_STATUS.map(s => [s.value, s]));
const tipoMap = Object.fromEntries(SOLICITACAO_TIPOS.map(t => [t.value, t]));
const movMap = MOVIMENTACAO_TIPOS;

function StatCard({ status, count, onClick }) {
  const s = statusMap[status] || { label: status, color: COLORS.gray, bg: "#f3f4f6", icon: "📋" };
  return (
    <button onClick={onClick} style={{
      background: s.bg, border: `1.5px solid ${s.color}30`,
      borderRadius: 12, padding: "18px 20px", cursor: count > 0 ? "pointer" : "default",
      textAlign: "left", transition: "transform 0.15s, box-shadow 0.15s",
      opacity: count === 0 ? 0.55 : 1,
    }}
      onMouseEnter={e => { if (count > 0) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
      <div style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, color: s.color }}>{count}</div>
      <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: 0.5, color: s.color, marginTop: 2 }}>{s.label}</div>
    </button>
  );
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function PortalHome() {
  const { organizerId, organizerName } = useOrganizer();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [recentMovs, setRecentMovs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const r = await SolicitacoesService.list({ organizerId });
      if (r.data) {
        setSolicitacoes(r.data);
        // Pegar as últimas movimentações das 3 solicitações mais recentes
        const recent = r.data.slice(0, 4);
        const movsAll = [];
        for (const sol of recent) {
          const mr = await MovimentacoesService.listBySolicitacao(sol.id);
          if (mr.data) movsAll.push(...mr.data.map(m => ({ ...m, solicitacao: sol })));
        }
        movsAll.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
        setRecentMovs(movsAll.slice(0, 8));
      }
      setLoading(false);
    }
    load();
  }, [organizerId]);

  // Contagens por status
  const counts = SOLICITACAO_STATUS.reduce((acc, s) => {
    acc[s.value] = solicitacoes.filter(i => i.status === s.value).length;
    return acc;
  }, {});

  // Pendências abertas
  const pendencias = solicitacoes.filter(s => s.status === "pendencia");

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  if (loading) return (
    <>
      <div style={{ padding: 60, textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>
        ⏳ Carregando...
      </div>
    </>
  );

  return (
    <>
      <div style={{ padding: "36px 40px 60px", maxWidth: 1100 }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: 2, color: "#0066cc", marginBottom: 6 }}>
            Portal FMA — Permit e Chancela
          </div>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 900,
            color: COLORS.dark, margin: 0, textTransform: "uppercase" }}>
            {saudacao}, {organizerName.split(" ")[0]}!
          </h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: "6px 0 0" }}>
            {solicitacoes.length === 0 ? "Você ainda não tem solicitações. Comece criando uma nova." :
              `Você tem ${solicitacoes.length} solicitação${solicitacoes.length > 1 ? "ções" : ""} no sistema.`}
          </p>
        </div>

        {/* Alertas de pendências */}
        {pendencias.length > 0 && (
          <div style={{ background: "#fffbeb", border: "1.5px solid #f59e0b", borderRadius: 12,
            padding: "16px 20px", marginBottom: 28, display: "flex", gap: 14, alignItems: "flex-start" }}>
            <span style={{ fontSize: 22 }}>⚠️</span>
            <div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, color: "#92400e" }}>
                {pendencias.length} solicitação{pendencias.length > 1 ? "ções" : ""} com pendência
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: "#92400e", margin: "4px 0 8px" }}>
                A FMA solicitou documentos ou informações adicionais. Acesse as solicitações para responder.
              </div>
              {pendencias.map(s => (
                <Link key={s.id} to={`/portal/solicitacoes/${s.id}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, marginRight: 10,
                    padding: "4px 12px", borderRadius: 20, background: "#f59e0b", color: "#fff",
                    fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                  {tipoMap[s.tipo]?.icon} {s.nomeEvento.slice(0, 30)}… →
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 14, marginBottom: 36 }}>
          {SOLICITACAO_STATUS.map(s => (
            <StatCard key={s.value} status={s.value} count={counts[s.value] || 0}
              onClick={() => counts[s.value] > 0 && (window.location.href = `/portal/solicitacoes?status=${s.value}`)} />
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 28, alignItems: "start" }}>
          {/* Solicitações recentes */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, margin: 0 }}>
                Minhas solicitações
              </h2>
              <Link to="/portal/solicitacoes"
                style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700,
                  color: "#0066cc", textDecoration: "none", textTransform: "uppercase" }}>
                Ver todas →
              </Link>
            </div>
            {solicitacoes.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 12, padding: "40px 24px",
                textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800,
                  color: COLORS.dark, textTransform: "uppercase", marginBottom: 8 }}>
                  Nenhuma solicitação ainda
                </div>
                <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginBottom: 20 }}>
                  Solicite um Permit ou Chancela para seu evento.
                </p>
                <Link to="/portal/nova-solicitacao"
                  style={{ display: "inline-block", padding: "10px 22px", borderRadius: 8,
                    background: "#0066cc", color: "#fff", textDecoration: "none",
                    fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>
                  ➕ Nova solicitação
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {solicitacoes.slice(0, 5).map(sol => {
                  const st = statusMap[sol.status] || { label: sol.status, color: COLORS.gray, bg: "#f3f4f6", icon: "📋" };
                  const tp = tipoMap[sol.tipo] || { label: sol.tipo, icon: "📋" };
                  return (
                    <Link key={sol.id} to={`/portal/solicitacoes/${sol.id}`}
                      style={{ display: "block", textDecoration: "none", background: "#fff",
                        borderRadius: 12, padding: "16px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                        border: `1px solid ${st.color}20`, transition: "transform 0.15s, box-shadow 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateX(3px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)"; }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                            <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10,
                              fontFamily: FONTS.heading, fontWeight: 700,
                              background: `${st.color}15`, color: st.color }}>
                              {st.icon} {st.label}
                            </span>
                            <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 10,
                              fontFamily: FONTS.heading, fontWeight: 700,
                              background: COLORS.grayLight, color: COLORS.grayDark }}>
                              {tp.icon} {tp.label}
                            </span>
                          </div>
                          <div style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 800,
                            color: COLORS.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {sol.nomeEvento}
                          </div>
                          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 3 }}>
                            📍 {sol.cidadeEvento} · 📅 {fmtDate(sol.dataEvento)}
                          </div>
                        </div>
                        <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, flexShrink: 0 }}>
                          {fmtDate(sol.criadoEm)}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar: ações rápidas + timeline recente */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Ações rápidas */}
            <div style={{ background: "#fff", borderRadius: 12, padding: "20px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: 2, color: COLORS.dark,
                margin: "0 0 14px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>
                Ações rápidas
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { to: "/portal/nova-solicitacao", icon: "➕", label: "Nova solicitação", color: "#0066cc" },
                  { to: "/portal/solicitacoes", icon: "📋", label: "Minhas solicitações", color: COLORS.dark },
                  { to: "/portal/meus-dados", icon: "👤", label: "Meus dados", color: COLORS.dark },
                ].map(a => (
                  <Link key={a.to} to={a.to} style={{ display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 8, background: COLORS.grayLight,
                    color: a.color, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700,
                    textDecoration: "none", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = `${a.color}18`}
                    onMouseLeave={e => e.currentTarget.style.background = COLORS.grayLight}>
                    <span>{a.icon}</span> {a.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Últimas movimentações */}
            {recentMovs.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 12, padding: "20px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <h3 style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800,
                  textTransform: "uppercase", letterSpacing: 2, color: COLORS.dark,
                  margin: "0 0 14px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>
                  Atividade recente
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {recentMovs.slice(0, 5).map(mov => {
                    const mt = movMap[mov.tipoEvento] || { icon: "📋", color: COLORS.gray };
                    return (
                      <Link key={mov.id} to={`/portal/solicitacoes/${mov.solicitacaoId}`}
                        style={{ textDecoration: "none", display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{mt.icon}</span>
                        <div>
                          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.dark,
                            lineHeight: 1.4 }}>{mov.descricao}</div>
                          <div style={{ fontFamily: FONTS.body, fontSize: 10, color: COLORS.gray, marginTop: 2 }}>
                            {mov.solicitacao?.nomeEvento?.slice(0, 28)}… · {fmtDateTime(mov.criadoEm)}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
