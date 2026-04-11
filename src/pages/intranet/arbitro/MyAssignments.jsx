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
import SignaturePad, { gerarEvidenciaAssinatura } from "../../../components/ui/SignaturePad";

const catMap = Object.fromEntries((CALENDAR_CATEGORIES || []).filter(c => c.value).map(c => [c.value, c]));
const fnMap = Object.fromEntries((REFEREE_FUNCTIONS || []).map(f => [f.value, f.label]));

const STATUS_STYLE = {
  confirmado: { bg: "#e6f9ee", color: "#007733", label: "Confirmado" },
  pendente:   { bg: "#fff7ed", color: "#884400", label: "Pendente" },
  cancelado:  { bg: "#fff5f5", color: "#cc0000", label: "Cancelado" },
};

const CHECKLIST_ITEMS = [
  "Uniforme completo (camisa, calca, tenis)",
  "Credencial de arbitro",
  "Documento com foto (RG/CNH)",
  "Apito e cronometro",
  "Protetor solar e agua",
  "Carregador de celular",
];

function Checklist({ assignmentId }) {
  const storageKey = `checklist_${assignmentId}`;
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || []; } catch { return []; }
  });
  const [open, setOpen] = useState(false);

  const toggle = (idx) => {
    const next = checked.includes(idx) ? checked.filter(i => i !== idx) : [...checked, idx];
    setChecked(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const done = checked.length;
  const total = CHECKLIST_ITEMS.length;

  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={() => setOpen(!open)}
        style={{ background: done === total ? "#f0fdf4" : "#fffbeb", border: `1px solid ${done === total ? "#86efac" : "#fde68a"}`, borderRadius: 6, padding: "4px 12px", fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, color: done === total ? "#15803d" : "#92400e", cursor: "pointer" }}>
        {done === total ? "Checklist completo" : `Checklist (${done}/${total})`} {open ? "▲" : "▼"}
      </button>
      {open && (
        <div style={{ marginTop: 8, padding: "8px 12px", background: "#fafafa", borderRadius: 8, border: `1px solid ${COLORS.grayLight}` }}>
          {CHECKLIST_ITEMS.map((item, i) => (
            <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", cursor: "pointer", fontFamily: FONTS.body, fontSize: 12, color: checked.includes(i) ? "#15803d" : COLORS.dark }}>
              <input type="checkbox" checked={checked.includes(i)} onChange={() => toggle(i)} />
              <span style={{ textDecoration: checked.includes(i) ? "line-through" : "none" }}>{item}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyAssignments() {
  const { refereeId, name } = useIntranet();
  const [assignments, setAssignments] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [referees, setReferees] = useState({});
  const [relatorios, setRelatorios] = useState({});
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [reciboModal, setReciboModal] = useState(null); // assignment para assinar recibo
  const [reciboAssinatura, setReciboAssinatura] = useState("");
  const [reciboSaving, setReciboSaving] = useState(false);

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
                        {asgn.diariaPaga && !asgn.reciboAssinadoEm && (
                          <button onClick={() => { setReciboModal(asgn); setReciboAssinatura(""); }}
                            style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", padding: "4px 12px", borderRadius: 20, cursor: "pointer" }}>
                            Assinar Recibo
                          </button>
                        )}
                        {asgn.reciboAssinadoEm && (
                          <span style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, color: "#15803d", background: "#f0fdf4", padding: "4px 12px", borderRadius: 20 }}>
                            Recibo assinado
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
                      {/* Checklist pré-evento (apenas escalas futuras) */}
                      {!showPast && <Checklist assignmentId={asgn.id} />}
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

      {/* Modal de assinatura de recibo */}
      {reciboModal && (() => {
        const a = reciboModal;
        const evt = a.event || {};
        const total = (a.valorDiaria || 0) + (a.transporte || 0) + (a.hospedagem || 0) + (a.alimentacao || 0);
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            onClick={() => setReciboModal(null)}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 540, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 900, color: COLORS.dark, margin: 0, textTransform: "uppercase" }}>Recibo de Pagamento</h3>
                <button onClick={() => setReciboModal(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: COLORS.gray }}>X</button>
              </div>

              <div style={{ background: "#f9fafb", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, color: COLORS.dark, marginBottom: 8 }}>{evt.title}</div>
                <div style={{ fontSize: 13, fontFamily: FONTS.body, color: COLORS.gray, marginBottom: 4 }}>
                  {evt.date ? new Date(evt.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : ""} — {evt.city}
                </div>
                <div style={{ fontSize: 13, fontFamily: FONTS.body, color: COLORS.gray, marginBottom: 12 }}>
                  Funcao: {fnMap[a.refereeFunction] || a.refereeFunction}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: FONTS.body }}>
                  <tbody>
                    {(a.valorDiaria || 0) > 0 && <tr><td style={{ padding: "4px 0", color: COLORS.gray }}>Diaria</td><td style={{ padding: "4px 0", textAlign: "right", fontWeight: 600 }}>R$ {(a.valorDiaria || 0).toFixed(2)}</td></tr>}
                    {(a.transporte || 0) > 0 && <tr><td style={{ padding: "4px 0", color: COLORS.gray }}>Transporte</td><td style={{ padding: "4px 0", textAlign: "right", fontWeight: 600 }}>R$ {(a.transporte || 0).toFixed(2)}</td></tr>}
                    {(a.hospedagem || 0) > 0 && <tr><td style={{ padding: "4px 0", color: COLORS.gray }}>Hospedagem</td><td style={{ padding: "4px 0", textAlign: "right", fontWeight: 600 }}>R$ {(a.hospedagem || 0).toFixed(2)}</td></tr>}
                    {(a.alimentacao || 0) > 0 && <tr><td style={{ padding: "4px 0", color: COLORS.gray }}>Alimentacao</td><td style={{ padding: "4px 0", textAlign: "right", fontWeight: 600 }}>R$ {(a.alimentacao || 0).toFixed(2)}</td></tr>}
                    <tr style={{ borderTop: `2px solid ${COLORS.dark}` }}>
                      <td style={{ padding: "8px 0", fontWeight: 800, fontSize: 14 }}>Total</td>
                      <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 900, fontSize: 16, color: "#15803d" }}>R$ {total.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
                {a.diariaPagaEm && (
                  <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 8 }}>Pago em: {new Date(a.diariaPagaEm + "T12:00:00").toLocaleDateString("pt-BR")}</div>
                )}
              </div>

              <p style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, margin: "0 0 12px" }}>
                Ao assinar, declaro que recebi o valor acima referente aos servicos de arbitragem prestados no evento indicado.
              </p>

              <SignaturePad
                value={reciboAssinatura}
                onChange={setReciboAssinatura}
                label="Assinatura do Arbitro"
              />

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
                <button onClick={() => setReciboModal(null)}
                  style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", color: COLORS.gray, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Cancelar
                </button>
                <button
                  disabled={!reciboAssinatura || reciboSaving}
                  onClick={async () => {
                    setReciboSaving(true);
                    const evidencia = gerarEvidenciaAssinatura({
                      uid: refereeId,
                      refereeId,
                      refereeName: name,
                      documentoId: a.id,
                    });
                    await RefereeAssignmentsService.update(a.id, {
                      reciboAssinatura: reciboAssinatura,
                      reciboAssinadoEm: new Date().toISOString(),
                      reciboEvidencia: evidencia,
                    });
                    setReciboSaving(false);
                    setReciboModal(null);
                    // Refresh
                    const myR = await RefereeAssignmentsService.getByReferee(refereeId);
                    if (myR.data) setAssignments(myR.data);
                  }}
                  style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: !reciboAssinatura ? COLORS.gray : "#15803d", color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: !reciboAssinatura ? "not-allowed" : "pointer" }}>
                  {reciboSaving ? "Salvando..." : "Confirmar Recebimento"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </IntranetLayout>
  );
}
