/**
 * MinhasSolicitacoes.jsx — Lista de solicitações do organizador.
 * Rota: /portal/solicitacoes
 * - Filtros por status e tipo
 * - Busca por nome de evento
 * - Cards com status badge, datas e ações
 */
import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useOrganizer } from "../../context/OrganizerContext";
import { SolicitacoesService } from "../../services/index";
import { COLORS, FONTS } from "../../styles/colors";
import { SOLICITACAO_STATUS, SOLICITACAO_TIPOS } from "../../config/navigation";

const statusMap = Object.fromEntries(SOLICITACAO_STATUS.map(s => [s.value, s]));
const tipoMap = Object.fromEntries(SOLICITACAO_TIPOS.map(t => [t.value, t]));

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MinhasSolicitacoes() {
  const { organizerId } = useOrganizer();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const statusFilter = searchParams.get("status") || "";
  const tipoFilter = searchParams.get("tipo") || "";
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await SolicitacoesService.list({ organizerId });
    if (r.data) setItems(r.data);
    setLoading(false);
  }, [organizerId]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(item => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (tipoFilter && item.tipo !== tipoFilter) return false;
    if (search && !item.nomeEvento.toLowerCase().includes(search.toLowerCase()) &&
        !item.cidadeEvento.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const setParam = (k, v) => {
    const n = new URLSearchParams(searchParams);
    if (v) n.set(k, v); else n.delete(k);
    setSearchParams(n);
  };

  return (
    <>
      <div style={{ padding: "36px 40px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: 2, color: "#0066cc", marginBottom: 6 }}>
              Portal FMA
            </div>
            <h1 style={{ fontFamily: FONTS.heading, fontSize: 28, fontWeight: 900,
              color: COLORS.dark, textTransform: "uppercase", margin: 0 }}>Minhas Solicitações</h1>
          </div>
          <Link to="/portal/nova-solicitacao"
            style={{ padding: "11px 20px", borderRadius: 8, background: "#0066cc", color: "#fff",
              textDecoration: "none", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800,
              textTransform: "uppercase", whiteSpace: "nowrap" }}>
            ➕ Nova solicitação
          </Link>
        </div>

        {/* Filtros */}
        <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)", marginBottom: 20,
          display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar por nome do evento..."
            style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8,
              border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body,
              fontSize: 13, outline: "none" }} />
          <select value={statusFilter} onChange={e => setParam("status", e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`,
              fontFamily: FONTS.body, fontSize: 13, outline: "none", cursor: "pointer" }}>
            <option value="">Todos os status</option>
            {SOLICITACAO_STATUS.map(s => (
              <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
            ))}
          </select>
          <select value={tipoFilter} onChange={e => setParam("tipo", e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`,
              fontFamily: FONTS.body, fontSize: 13, outline: "none", cursor: "pointer" }}>
            <option value="">Permit e Chancela</option>
            {SOLICITACAO_TIPOS.map(t => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
          {(statusFilter || tipoFilter || search) && (
            <button onClick={() => { setSearch(""); setSearchParams({}); }}
              style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`,
                background: "#fff", color: COLORS.gray, fontFamily: FONTS.body, fontSize: 12, cursor: "pointer" }}>
              ✕ Limpar
            </button>
          )}
        </div>

        {/* Contagem */}
        <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginBottom: 16 }}>
          {loading ? "Carregando..." : `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}`}
        </div>

        {/* Lista */}
        {!loading && filtered.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 12, padding: "60px 24px",
            textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📭</div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 800,
              textTransform: "uppercase", color: COLORS.dark, marginBottom: 8 }}>
              {items.length === 0 ? "Nenhuma solicitação ainda" : "Nenhum resultado"}
            </div>
            <p style={{ fontFamily: FONTS.body, color: COLORS.gray, marginBottom: 20 }}>
              {items.length === 0 ? "Crie sua primeira solicitação de Permit ou Chancela." : "Tente outros filtros."}
            </p>
            {items.length === 0 && (
              <Link to="/portal/nova-solicitacao"
                style={{ display: "inline-block", padding: "10px 22px", borderRadius: 8,
                  background: "#0066cc", color: "#fff", textDecoration: "none",
                  fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>
                ➕ Nova solicitação
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(sol => {
              const st = statusMap[sol.status] || { label: sol.status, color: COLORS.gray, bg: "#f3f4f6", icon: "📋" };
              const tp = tipoMap[sol.tipo] || { label: sol.tipo, icon: "📋" };
              return (
                <div key={sol.id} style={{ background: "#fff", borderRadius: 12,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.06)", overflow: "hidden",
                  border: `1.5px solid ${st.color}20` }}>
                  <div style={{ display: "flex", gap: 0 }}>
                    {/* Faixa lateral colorida */}
                    <div style={{ width: 5, background: st.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, padding: "18px 20px", display: "flex",
                      justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11,
                            fontFamily: FONTS.heading, fontWeight: 700, background: `${st.color}15`, color: st.color }}>
                            {st.icon} {st.label}
                          </span>
                          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11,
                            fontFamily: FONTS.heading, fontWeight: 700, background: COLORS.grayLight, color: COLORS.grayDark }}>
                            {tp.icon} {tp.label}
                          </span>
                          {sol.protocoloFMA && (
                            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11,
                              fontFamily: FONTS.heading, fontWeight: 700, background: "#f0fdf4", color: "#15803d" }}>
                              📄 {sol.protocoloFMA}
                            </span>
                          )}
                        </div>
                        <div style={{ fontFamily: FONTS.heading, fontSize: 17, fontWeight: 800,
                          color: COLORS.dark, marginBottom: 4 }}>{sol.nomeEvento}</div>
                        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
                          📍 {sol.cidadeEvento} · 📅 {sol.dataEvento ? new Date(sol.dataEvento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                          {" "}· Criado em {fmt(sol.criadoEm)}
                          {sol.enviadoEm && ` · Enviado em ${fmt(sol.enviadoEm)}`}
                        </div>
                        {sol.parecerFMA && sol.status !== "em_analise" && (
                          <div style={{ marginTop: 8, padding: "8px 12px", background: `${st.color}08`,
                            borderLeft: `3px solid ${st.color}`, borderRadius: "0 6px 6px 0",
                            fontFamily: FONTS.body, fontSize: 12, color: COLORS.grayDark, lineHeight: 1.5 }}>
                            <strong>FMA:</strong> {sol.parecerFMA}
                          </div>
                        )}
                      </div>
                      <Link to={`/portal/solicitacoes/${sol.id}`}
                        style={{ flexShrink: 0, padding: "8px 16px", borderRadius: 8,
                          background: COLORS.dark, color: "#fff", textDecoration: "none",
                          fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700,
                          textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        Ver detalhes →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
