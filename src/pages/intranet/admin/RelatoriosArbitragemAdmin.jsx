/**
 * RelatoriosArbitragemAdmin.jsx — Visualização dos relatórios de arbitragem.
 * Rota: /intranet/admin/relatorios-arbitragem
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import IntranetLayout from "../IntranetLayout";
import { RelatoriosService, RefereesService } from "../../../services/index";
import { deleteFile } from "../../../services/storageService";
import { notificarPendenciaRelatorio } from "../../../services/emailService";
import { COLORS, FONTS } from "../../../styles/colors";

const STATUS_MAP = {
  enviado: { label: "Enviado", color: "#0066cc", bg: "#eff6ff" },
  aprovado: { label: "Aprovado", color: "#15803d", bg: "#f0fdf4" },
  pendencia: { label: "Pendencia", color: "#d97706", bg: "#fffbeb" },
  rascunho: { label: "Rascunho", color: "#6b7280", bg: "#f3f4f6" },
};

export default function RelatoriosArbitragemAdmin() {
  const [relatorios, setRelatorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showPendenciaForm, setShowPendenciaForm] = useState(false);
  const [pendenciaTexto, setPendenciaTexto] = useState("");

  const fetchData = () => {
    setLoading(true);
    RelatoriosService.list().then(r => {
      setRelatorios((r.data || []).filter(rel => rel.status !== "rascunho"));
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleAprovar = async (id) => {
    setActionLoading(true);
    await RelatoriosService.update(id, { status: "aprovado", aprovadoEm: new Date().toISOString() });
    setActionLoading(false);
    setSelected(prev => ({ ...prev, status: "aprovado" }));
    fetchData();
  };

  const handlePendencia = async (id) => {
    if (!pendenciaTexto.trim()) return;
    setActionLoading(true);
    await RelatoriosService.update(id, { status: "pendencia", observacaoAdmin: pendenciaTexto.trim(), pendenciaEm: new Date().toISOString() });
    // Notificar árbitro por email
    const rel = relatorios.find(r => r.id === id);
    if (rel?.refereeId) {
      const refRes = await RefereesService.get(rel.refereeId);
      if (refRes.data?.email) {
        notificarPendenciaRelatorio({
          arbitroEmail: refRes.data.email,
          arbitroNome: refRes.data.name,
          evento: rel.eventTitle,
          pendencia: pendenciaTexto.trim(),
        }).catch(() => {});
      }
    }
    setActionLoading(false);
    setSelected(prev => ({ ...prev, status: "pendencia", observacaoAdmin: pendenciaTexto.trim() }));
    setShowPendenciaForm(false);
    setPendenciaTexto("");
    fetchData();
  };

  const handleDevolver = async (id) => {
    if (!confirm("Devolver o relatório? O árbitro precisará refazer do zero. Todas as fotos serão excluídas.")) return;
    setActionLoading(true);
    // Excluir fotos do Storage
    const rel = relatorios.find(r => r.id === id);
    if (rel) {
      const fotoCampos = [
        "sinalizacaoArenaFotos", "postoMedicoFotos", "zonaLargadaChegadaFotos",
        "numeroPeitoFotos", "guardaVolumesFotos", "banheirosFotos",
        "marcacaoPercursoFotos", "setorLargadaFotos", "cronometragemFotos",
        "hidratacaoFotos", "podioFotos", "fotoEquipeArbitragem", "fotosAnotacao",
      ];
      for (const campo of fotoCampos) {
        for (const url of (rel[campo] || [])) {
          await deleteFile(url).catch(() => {});
        }
      }
    }
    await RelatoriosService.delete(id);
    setActionLoading(false);
    setSelected(null);
    fetchData();
  };

  const filtered = relatorios.filter(r => !filtroStatus || r.status === filtroStatus);

  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 16 };

  return (
    <IntranetLayout requireRole="canManage">
      <div style={{ padding: 36, maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>
          Relatorios de Arbitragem
        </h1>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 16px" }}>
          {filtered.length} relatorio(s)
        </p>
        <div style={{ marginBottom: 20 }}>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, fontSize: 13 }}>
            <option value="">Todos</option>
            <option value="enviado">Enviados</option>
            <option value="aprovado">Aprovados</option>
            <option value="pendencia">Com pendencia</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.gray }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...card, textAlign: "center", color: COLORS.gray, fontSize: 14 }}>Nenhum relatorio encontrado.</div>
        ) : !selected ? (
          filtered.map(r => {
            const st = STATUS_MAP[r.status] || STATUS_MAP.enviado;
            return (
              <div key={r.id} style={{ ...card, cursor: "pointer", borderLeft: `4px solid ${st.color}` }} onClick={() => setSelected(r)}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 8px rgba(0,0,0,0.07)"}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.dark }}>{r.eventTitle}</div>
                    <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
                      {r.eventDate ? new Date(r.eventDate + "T12:00:00").toLocaleDateString("pt-BR") : ""} — {r.eventCity} — Por: {r.refereeName}
                    </div>
                  </div>
                  <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              Voltar a lista
            </button>
            <div style={card}>
              <h2 style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 800, color: COLORS.dark, margin: "0 0 4px" }}>{selected.eventTitle}</h2>
              <p style={{ fontSize: 13, color: COLORS.gray, margin: "0 0 20px" }}>
                {selected.eventDate ? new Date(selected.eventDate + "T12:00:00").toLocaleDateString("pt-BR") : ""} — {selected.eventCity} — Elaborado por: {selected.refereeName}
              </p>

              {/* Renderizar todos os campos preenchidos */}
              {[
                { label: "Horarios de chegada", value: selected.horariosChegada },
                { label: "Tipo de evento", value: (selected.tipoEvento || []).join(", ") },
                { label: "Inscritos x Concluintes", value: (selected.modalidadesData || []).map(m => `${m.nome}: ${m.inscritos || 0} inscritos / ${m.concluintes || 0} concluintes`).join("\n") || selected.inscritosConcluintes },
                { label: "Link Resultados", value: selected.linkResultados, link: true },
                { label: "Arena", value: (selected.arena || []).join("; ") },
                { label: "Sinalizacao Arena", value: (selected.sinalizacaoArena || []).join("; ") },
                { label: "Sonorizacao", value: (selected.sonorizacao || []).join("; ") },
                { label: "Posto Medico", value: (selected.postoMedico || []).join("; ") },
                { label: "Guarda Volumes", value: selected.guardaVolumes },
                { label: "Largada e Chegada", value: (selected.comentariosLargadaChegada || []).join("; ") },
                { label: "Divisao Elite", value: (selected.divisaoElite || []).join("; ") },
                { label: "Cronometragem", value: selected.cronometragemEletronica },
                { label: "Medicao Percurso", value: selected.medicaoPercurso },
                { label: "Trajeto", value: (selected.trajetoPercurso || []).join("; ") },
                { label: "Sinalizacao Percurso", value: (selected.sinalizacaoPercurso || []).join("; ") },
                { label: "Hidratacao", value: (selected.hidratacao || []).join("; ") },
                { label: "Podio/Backdrop", value: (selected.podioBackdrop || []).join("; ") },
                { label: "Premiacao", value: (selected.premiacao || []).join("; ") },
                { label: "Classificacao", value: (selected.classificacao || []).join("; ") },
                { label: "Numeros de Peito", value: selected.diferencaNumerosPeito },
                { label: "Regulamento/Infracoes", value: selected.cumprimentoRegulamento },
                { label: "Organizacao/Equipe", value: (selected.organizacaoEquipe || []).join("; ") },
                { label: "Seguranca Atletas", value: selected.segurancaAtletas },
                { label: "Detalhes Percurso", value: selected.detalhesPercurso },
                { label: "Comentarios Adicionais", value: selected.comentariosAdicionais },
                { label: "Homologacao", value: selected.homologacaoResultados },
              ].filter(f => f.value).map(f => (
                <div key={f.label} style={{ marginBottom: 12, borderBottom: `1px solid ${COLORS.grayLight}`, paddingBottom: 10 }}>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: COLORS.gray, marginBottom: 4 }}>{f.label}</div>
                  {f.link ? (
                    <a href={f.value} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: COLORS.primary }}>{f.value}</a>
                  ) : (
                    <div style={{ fontSize: 13, fontFamily: FONTS.body, color: COLORS.dark, whiteSpace: "pre-wrap" }}>{f.value}</div>
                  )}
                </div>
              ))}

              {/* Fotos */}
              {[
                { label: "Sinalizacao Arena", urls: selected.sinalizacaoArenaFotos },
                { label: "Servicos Medicos", urls: selected.postoMedicoFotos },
                { label: "Largada/Chegada", urls: selected.zonaLargadaChegadaFotos },
                { label: "Numero de Peito", urls: selected.numeroPeitoFotos },
                { label: "Guarda Volumes", urls: selected.guardaVolumesFotos },
                { label: "Banheiros", urls: selected.banheirosFotos },
                { label: "Marcacao Percurso", urls: selected.marcacaoPercursoFotos },
                { label: "Setor Largada", urls: selected.setorLargadaFotos },
                { label: "Cronometragem", urls: selected.cronometragemFotos },
                { label: "Hidratacao", urls: selected.hidratacaoFotos },
                { label: "Podio", urls: selected.podioFotos },
                { label: "Equipe Arbitragem", urls: selected.fotoEquipeArbitragem },
                { label: "Anotacoes", urls: selected.fotosAnotacao },
              ].filter(f => f.urls && f.urls.length > 0).map(f => (
                <div key={f.label} style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: COLORS.gray, marginBottom: 4 }}>{f.label}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {f.urls.map((u, i) => (
                      <a key={i} href={u} target="_blank" rel="noreferrer">
                        <img src={u} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6, border: `1px solid ${COLORS.grayLight}` }} />
                      </a>
                    ))}
                  </div>
                </div>
              ))}

              {/* Assinatura digital */}
              {selected.assinaturaDigital && (
                <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#15803d", marginBottom: 8 }}>Assinatura Digital</div>
                  <div style={{ background: "#fff", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, padding: 8, display: "inline-block" }}>
                    <img src={selected.assinaturaDigital} alt="Assinatura" style={{ height: 80, display: "block" }} />
                  </div>
                  {selected.assinaturaEvidencia && (
                    <div style={{ marginTop: 10, fontSize: 11, fontFamily: FONTS.body, color: COLORS.gray, lineHeight: 1.6 }}>
                      <div><strong>Assinado por:</strong> {selected.assinaturaEvidencia.refereeName}</div>
                      <div><strong>Data/hora:</strong> {selected.assinaturaEvidencia.assinadoEm ? new Date(selected.assinaturaEvidencia.assinadoEm).toLocaleString("pt-BR") : "—"}</div>
                      <div><strong>ID:</strong> {selected.assinaturaEvidencia.refereeId}</div>
                      <div><strong>Dispositivo:</strong> {(selected.assinaturaEvidencia.userAgent || "").slice(0, 80)}...</div>
                      <div><strong>Base legal:</strong> {selected.assinaturaEvidencia.baseLegal}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Observação do admin (pendência) */}
              {selected.observacaoAdmin && (
                <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fde68a" }}>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, color: "#d97706", marginBottom: 4 }}>PENDENCIA REGISTRADA</div>
                  <div style={{ fontSize: 13, fontFamily: FONTS.body, color: COLORS.dark }}>{selected.observacaoAdmin}</div>
                </div>
              )}

              {/* Ações */}
              {selected.status !== "aprovado" && (
                <div style={{ marginTop: 20, padding: "16px 0", borderTop: `1px solid ${COLORS.grayLight}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => handleAprovar(selected.id)} disabled={actionLoading}
                    style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#15803d", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Aprovar Relatorio
                  </button>
                  <button onClick={() => setShowPendenciaForm(true)} disabled={actionLoading}
                    style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#d97706", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Inserir Pendencia
                  </button>
                  <button onClick={() => handleDevolver(selected.id)} disabled={actionLoading}
                    style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #dc2626", background: "transparent", color: "#dc2626", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Devolver (refazer)
                  </button>
                </div>
              )}
              {showPendenciaForm && (
                <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fde68a" }}>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, color: "#d97706", marginBottom: 8 }}>DESCREVA A PENDENCIA</div>
                  <textarea value={pendenciaTexto} onChange={e => setPendenciaTexto(e.target.value)}
                    placeholder="Descreva o que precisa ser corrigido pelo arbitro..."
                    style={{ width: "100%", padding: "8px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 13, fontFamily: FONTS.body, minHeight: 60, resize: "vertical", boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => { setShowPendenciaForm(false); setPendenciaTexto(""); }}
                      style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "transparent", fontSize: 12, cursor: "pointer" }}>Cancelar</button>
                    <button onClick={() => handlePendencia(selected.id)} disabled={actionLoading || !pendenciaTexto.trim()}
                      style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#d97706", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {actionLoading ? "Salvando..." : "Enviar Pendencia"}
                    </button>
                  </div>
                </div>
              )}
              {selected.status === "aprovado" && (
                <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "#f0fdf4", fontSize: 13, color: "#15803d", fontWeight: 600 }}>
                  Relatorio aprovado{selected.aprovadoEm ? ` em ${new Date(selected.aprovadoEm).toLocaleDateString("pt-BR")}` : ""}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </IntranetLayout>
  );
}
