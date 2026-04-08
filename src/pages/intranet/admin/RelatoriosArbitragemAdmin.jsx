/**
 * RelatoriosArbitragemAdmin.jsx — Visualização dos relatórios de arbitragem.
 * Rota: /intranet/admin/relatorios-arbitragem
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import IntranetLayout from "../IntranetLayout";
import { RelatoriosService } from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";

export default function RelatoriosArbitragemAdmin() {
  const [relatorios, setRelatorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    RelatoriosService.list({ status: "enviado" }).then(r => {
      setRelatorios(r.data || []);
      setLoading(false);
    });
  }, []);

  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 16 };

  return (
    <IntranetLayout requireRole="canManage">
      <div style={{ padding: 36, maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>
          Relatorios de Arbitragem
        </h1>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 24px" }}>
          {relatorios.length} relatorio(s) enviado(s)
        </p>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.gray }}>Carregando...</div>
        ) : relatorios.length === 0 ? (
          <div style={{ ...card, textAlign: "center", color: COLORS.gray, fontSize: 14 }}>Nenhum relatorio enviado.</div>
        ) : !selected ? (
          relatorios.map(r => (
            <div key={r.id} style={{ ...card, cursor: "pointer" }} onClick={() => setSelected(r)}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 8px rgba(0,0,0,0.07)"}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.dark }}>{r.eventTitle}</div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
                    {r.eventDate ? new Date(r.eventDate + "T12:00:00").toLocaleDateString("pt-BR") : ""} — {r.eventCity} — Por: {r.refereeName}
                  </div>
                </div>
                <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "#f0fdf4", color: "#15803d" }}>Enviado</span>
              </div>
            </div>
          ))
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
                { label: "Inscritos x Concluintes", value: selected.inscritosConcluintes },
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
            </div>
          </div>
        )}
      </div>
    </IntranetLayout>
  );
}
