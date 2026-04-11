/**
 * MyAssignments.jsx — Minhas escalas (visão do árbitro).
 * Rota: /intranet/escalas
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import IntranetLayout from "../IntranetLayout";
import { useIntranet } from "../../../context/IntranetContext";
import { RefereeAssignmentsService, RefereesService, RelatoriosService } from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";
import { CALENDAR_CATEGORIES, REFEREE_FUNCTIONS } from "../../../config/navigation";

const catMap = Object.fromEntries((CALENDAR_CATEGORIES || []).filter(c => c.value).map(c => [c.value, c]));
const fnMap = Object.fromEntries((REFEREE_FUNCTIONS || []).map(f => [f.value, f.label]));

const STATUS_STYLE = {
  confirmado: { bg: "#e6f9ee", color: "#007733", label: "Confirmado" },
  pendente:   { bg: "#fff7ed", color: "#884400", label: "Pendente" },
  cancelado:  { bg: "#fff5f5", color: "#cc0000", label: "Cancelado" },
};

export default function MyAssignments() {
  const { refereeId } = useIntranet();
  const [assignments, setAssignments] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [referees, setReferees] = useState({});
  const [relatorios, setRelatorios] = useState({});
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");

  useEffect(() => {
    Promise.all([
      RefereeAssignmentsService.getByReferee(refereeId),
      RefereeAssignmentsService.list(),
      RefereesService.list(),
      RelatoriosService.list(),
    ]).then(([myR, allR, refR, relR]) => {
      if (myR.data) setAssignments(myR.data);
      if (allR.data) setAllAssignments(allR.data);
      if (refR.data) setReferees(Object.fromEntries(refR.data.map(r => [r.id, r])));
      // Mapear relatórios por eventId (qualquer árbitro) e por assignmentId (meu)
      const relByEvent = {};
      const relByAssign = {};
      (relR.data || []).forEach(r => {
        relByEvent[r.eventId] = r;
        relByAssign[r.assignmentId] = r;
      });
      setRelatorios({ byEvent: relByEvent, byAssign: relByAssign });
      setLoading(false);
    });
  }, [refereeId]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = assignments.filter(a => a.event?.date >= today);
  const past = assignments.filter(a => a.event?.date < today);
  let list = showPast ? past : upcoming;
  if (filtroStatus) list = list.filter(a => a.status === filtroStatus);
  if (filtroCidade) list = list.filter(a => a.event?.city === filtroCidade);
  const cidades = [...new Set((showPast ? past : upcoming).map(a => a.event?.city).filter(Boolean))].sort();

  return (
    <IntranetLayout>
      <div style={{ padding: 36 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>📋 Minhas Escalas</h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: 0 }}>Provas em que você foi escalado pela coordenação da FMA.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[
            { key: false, label: `Próximas (${upcoming.length})` },
            { key: true,  label: `Histórico (${past.length})` },
          ].map(t => (
            <button key={String(t.key)} onClick={() => setShowPast(t.key)}
              style={{ padding: "8px 20px", borderRadius: 20, border: `2px solid ${showPast === t.key ? COLORS.primary : COLORS.grayLight}`, background: showPast === t.key ? COLORS.primary : "#fff", color: showPast === t.key ? "#fff" : COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
              {t.label}
            </button>
          ))}
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 20, border: `2px solid ${COLORS.grayLight}`, fontFamily: FONTS.heading, fontSize: 13, background: "#fff", cursor: "pointer" }}>
            <option value="">Todos os status</option>
            <option value="confirmado">Confirmado</option>
            <option value="pendente">Pendente</option>
            <option value="cancelado">Cancelado</option>
          </select>
          {cidades.length > 1 && (
            <select value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 20, border: `2px solid ${COLORS.grayLight}`, fontFamily: FONTS.heading, fontSize: 13, background: "#fff", cursor: "pointer" }}>
              <option value="">Todas as cidades</option>
              {cidades.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: COLORS.gray, fontFamily: FONTS.body }}>⏳ Carregando...</div>
        ) : list.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>📋</div>
            <p style={{ fontFamily: FONTS.body, color: COLORS.gray }}>
              {showPast ? "Sem histórico de escalas." : "Você não tem escalas futuras no momento."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {list.map(asgn => {
              const evt = asgn.event;
              if (!evt) return null;
              const cat = catMap[evt.category] || { color: COLORS.gray, icon: "📅", label: evt.category };
              const statusStyle = STATUS_STYLE[asgn.status] || STATUS_STYLE.pendente;
              return (
                <div key={asgn.id} style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", borderLeft: `4px solid ${statusStyle.color}` }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 52, flexShrink: 0, textAlign: "center", background: `${cat.color}12`, borderRadius: 8, padding: "8px 4px" }}>
                      <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: cat.color, lineHeight: 1 }}>{new Date(evt.date + "T12:00:00").getDate()}</div>
                      <div style={{ fontFamily: FONTS.heading, fontSize: 9, fontWeight: 700, color: cat.color, textTransform: "uppercase" }}>{new Date(evt.date + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" })}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 9, fontFamily: FONTS.heading, fontWeight: 700, background: `${cat.color}15`, color: cat.color }}>{cat.icon} {cat.label}</span>
                        <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 9, fontFamily: FONTS.heading, fontWeight: 700, background: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</span>
                      </div>
                      <div style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.dark }}>{evt.title}</div>
                      <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 4 }}>
                        {evt.city}{evt.location ? ` — ${evt.location}` : ""}{evt.time ? ` • ${evt.time}` : ""}
                      </div>
                      {/* Funções */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        <span style={{ fontFamily: FONTS.heading, fontSize: 13, color: COLORS.primary, background: `${COLORS.primary}10`, display: "inline-block", padding: "4px 12px", borderRadius: 20 }}>
                          {fnMap[asgn.refereeFunction] || asgn.refereeFunction}
                        </span>
                        {asgn.funcaoExtra && (
                          <span style={{ fontFamily: FONTS.heading, fontSize: 13, color: "#0066cc", background: "#eff6ff", display: "inline-block", padding: "4px 12px", borderRadius: 20 }}>
                            + {fnMap[asgn.funcaoExtra] || asgn.funcaoExtra}
                          </span>
                        )}
                        {/* Valor da diária */}
                        {(asgn.valorDiaria || 0) > 0 && (
                          <span style={{ fontFamily: FONTS.heading, fontSize: 13, color: "#15803d", background: "#f0fdf4", display: "inline-block", padding: "4px 12px", borderRadius: 20 }}>
                            R$ {((asgn.valorDiaria || 0) + (asgn.transporte || 0) + (asgn.hospedagem || 0) + (asgn.alimentacao || 0)).toFixed(2)}
                          </span>
                        )}
                      </div>
                      {/* Detalhes do evento para o árbitro */}
                      {(() => {
                        // Horário de apresentação: campo do evento ou 1h antes
                        let horario = evt.horarioApresentacao;
                        if (!horario && evt.time) {
                          const [h, m] = evt.time.split(":").map(Number);
                          if (!isNaN(h)) horario = `${String(Math.max(0, h - 1)).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
                        }
                        // Contato: campo do evento, ou puxar do coordenador/chefe escalado
                        let contato = evt.contatoCoordenador;
                        if (!contato) {
                          const colegas = allAssignments.filter(a => a.eventId === asgn.eventId);
                          const coord = colegas.find(a => a.refereeFunction === "coordenador_ev" || a.refereeFunction === "representante");
                          const chefe = colegas.find(a => a.refereeFunction === "chefe");
                          const responsavel = coord || chefe;
                          if (responsavel) {
                            const ref = referees[responsavel.refereeId];
                            if (ref) contato = `${ref.name}${ref.phone ? ` — ${ref.phone}` : ""}`;
                          }
                        }
                        return (
                          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontFamily: FONTS.body, color: COLORS.gray }}>
                            {horario && <div><strong>Apresentacao:</strong> {horario}</div>}
                            {contato && <div><strong>Coordenador:</strong> {contato}</div>}
                            {evt.observacoesArbitro && <div><strong>Instrucoes:</strong> {evt.observacoesArbitro}</div>}
                          </div>
                        );
                      })()}
                      {/* Documentos */}
                      {(evt.regulamentoUrl || evt.mapaPercursoUrl) && (
                        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                          {evt.regulamentoUrl && (
                            <a href={evt.regulamentoUrl} target="_blank" rel="noreferrer"
                              style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: COLORS.offWhite, color: COLORS.primary, textDecoration: "none" }}>
                              Regulamento
                            </a>
                          )}
                          {evt.mapaPercursoUrl && (
                            <a href={evt.mapaPercursoUrl} target="_blank" rel="noreferrer"
                              style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: COLORS.offWhite, color: COLORS.primary, textDecoration: "none" }}>
                              Mapa do Percurso
                            </a>
                          )}
                        </div>
                      )}
                      {asgn.notes && <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 6, fontStyle: "italic" }}>Obs: {asgn.notes}</div>}
                      {/* Relatório (eventos passados, chefe ou coordenador) */}
                      {evt.date <= today && (
                        asgn.refereeFunction === "chefe" || asgn.refereeFunction === "coordenador_ev" ||
                        asgn.funcaoExtra === "chefe" || asgn.funcaoExtra === "coordenador_ev"
                      ) && (() => {
                        const meuRelatorio = relatorios.byAssign?.[asgn.id];
                        const relatorioEvento = relatorios.byEvent?.[asgn.eventId];
                        const outroPreencheu = relatorioEvento && relatorioEvento.refereeId !== refereeId;

                        if (meuRelatorio) {
                          return (
                            <div style={{ marginTop: 8 }}>
                              <Link to={`/intranet/relatorio/${asgn.id}`} style={{
                                padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: "none",
                                background: meuRelatorio.status === "aprovado" ? "#f0fdf4" : meuRelatorio.status === "pendencia" ? "#fef2f2" : meuRelatorio.status === "enviado" ? "#f0fdf4" : "#fffbeb",
                                color: meuRelatorio.status === "aprovado" ? "#15803d" : meuRelatorio.status === "pendencia" ? "#dc2626" : meuRelatorio.status === "enviado" ? "#15803d" : "#d97706",
                              }}>
                                {meuRelatorio.status === "aprovado" ? "Relatorio aprovado"
                                  : meuRelatorio.status === "pendencia" ? "Pendencia — corrigir e reenviar"
                                  : meuRelatorio.status === "enviado" ? "Relatorio enviado — aguardando"
                                  : "Continuar relatorio (rascunho)"}
                              </Link>
                            </div>
                          );
                        }
                        if (outroPreencheu && (relatorioEvento.status === "enviado" || relatorioEvento.status === "aprovado")) {
                          return (
                            <div style={{ marginTop: 8 }}>
                              <span style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "#f0fdf4", color: "#15803d" }}>
                                Relatorio ja preenchido por {relatorioEvento.refereeName}
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div style={{ marginTop: 8 }}>
                            <Link to={`/intranet/relatorio/${asgn.id}`} style={{
                              padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: "none",
                              background: COLORS.primary, color: "#fff",
                            }}>Preencher Relatorio</Link>
                          </div>
                        );
                      })()}
                      {/* Colegas escalados */}
                      {(() => {
                        const colegas = allAssignments.filter(a => a.eventId === asgn.eventId && a.refereeId !== refereeId);
                        if (colegas.length === 0) return null;
                        return (
                          <div style={{ marginTop: 10, padding: "8px 12px", background: COLORS.offWhite, borderRadius: 8 }}>
                            <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 4 }}>Equipe escalada</div>
                            {colegas.map(c => {
                              const ref = referees[c.refereeId] || {};
                              const fn = c.refereeFunction === "representante" ? "Coordenacao" : (fnMap[c.refereeFunction] || c.refereeFunction);
                              return (
                                <div key={c.id} style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.dark, padding: "2px 0" }}>
                                  {ref.name || "Arbitro"} — <span style={{ color: COLORS.gray }}>{fn}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </IntranetLayout>
  );
}
