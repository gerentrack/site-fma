/**
 * RelatorioCorridaRua.jsx — Relatório de Arbitragem — Corrida de Rua 2026
 * Rota: /intranet/relatorio/:assignmentId
 * Wizard por seções, salva rascunho, pré-preenchido.
 */
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import IntranetLayout from "../IntranetLayout";
import { useIntranet } from "../../../context/IntranetContext";
import { RelatoriosService, RefereeAssignmentsService, RefereesService } from "../../../services/index";
import { uploadFile } from "../../../services/storageService";
import { COLORS, FONTS } from "../../../styles/colors";

// ── Opções de checkboxes/radios por seção ──
const TIPO_EVENTO = ["Social e/ou Beneficente", "Participativo e Promocao do Esporte", "Competicao / Performance"];
const ARENA = ["Local amplo, atendeu bem a demanda de participantes.", "Local pequeno para a demanda de participantes, gerando muito tumulto no setor.", "Layout da arena muito bem definido, facilitando a circulacao dos participantes.", "Disposicao dos itens da arena ruim, dificultou a circulacao, gerando filas em alguns pontos."];
const SINALIZACAO_ARENA = ["As tendas estavam identificadas.", "Nao havia nenhuma identificacao da arena."];
const SONORIZACAO = ["Sistema de som audivel em toda a arena.", "O som esta muito alto e sem equalizacao, podendo atrapalhar os moradores ao entorno.", "Otima equalizacao e volume, som agradavel em todo o ambiente da arena.", "Nao havia sistema de som no evento."];
const POSTO_MEDICO = ["Bem instalado, proximo a chegada.", "Totalmente equipado com estrutura suficiente para atendimento emergencial aos corredores.", "Apenas uma tenda, sem estrutura para atendimento de emergencia.", "Posicionando muito longe da chegada, dificultando o deslocamento e atendimento dos corredores.", "Posto medico com uma equipe multidisciplinar como medicos, enfermeiros, auxiliares etc.", "Nao houve atendimentos graves no evento.", "Houve atendimento grave com remocao para hospital, requer acompanhamento pos evento."];
const GUARDA_VOLUMES = ["Foram utilizadas tendas, com quantidade adequada de staffs.", "Foi utilizado local fixo com quantidade adequada de staffs.", "A quantidade de staffs no setor nao atendeu a demanda de inscritos.", "Nao foi oferecido este servico no evento, descumprindo terminacao da Norma de Corrida de Rua."];
const COMENTARIOS_LARGADA = ["O local de largada estava visivel e identificado.", "Nao havia identificacao do local de largada.", "Local totalmente isolado por grades e seguro.", "Nao houve isolamento do local, proporcionando grande circulacao de pessoas."];
const DIVISAO_ELITE = ["Havia divisao de elite no evento.", "Acesso da elite controlado pela organizacao e arbitros da FMA.", "Nao teve pelotao de elite no evento."];
const MEDICAO_PERCURSO = ["Medicao Oficial", "Medicao feita pelo Organizador"];
const TRAJETO_PERCURSO = ["Percurso totalmente no asfalto.", "Percurso com trechos de terra batida, gramas, rustico etc.", "Plano com pequenas variacoes de subida e decida.", "Percurso dificil com muita inclinacao.", "Percurso com muito vai e vem, cotovelos e curvas, proporcionando muita quebra no ritmo.", "Percurso com muitas chances de cortes para os participantes."];
const SINALIZACAO_PERCURSO = ["Totalmente sinalizado nas viradas, retorno, placas de km etc.", "Somente com sinalizacao de placas de kms.", "Nao havia nenhum tipo de sinalizacao.", "Parcialmente sinalizado. Placas somente em alguns km."];
const HIDRATACAO = ["Posto de agua bem instalado proximo a chegada do evento.", "Posto de agua estava distante da chegada, dificultando a hidratacao imediata dos corredores.", "A quantidade de copos de agua foi suficiente para atender a demanda de participantes.", "Faltou agua. A quantidade dimensionada NAO atendeu a quantidade de participantes.", "A agua servida estava quente, nao havia gelo nos panchoes de agua.", "Agua servida estava refrigerada.", "Alem de agua, tambem foi oferecido outras bebidas para hidratacao dos corredores."];
const PODIO_BACKDROP = ["Estrutura adequada para a premiacao.", "Nao havia podio e back-drop na premiacao.", "Back-drop com logo da FMA.", "Nao havia logo da FMA na comunicacao visual do back-drop.", "Numero de lugares no podio nao foi suficiente para a quantidade de premiados no evento."];
const PREMIACAO = ["A premiacao foi realizada rapidamente.", "A premiacao foi demorada, fazendo com muitos corredores fossem embora.", "A premiacao iniciou dentro do horario programado em regulamento.", "Houve atraso na premiacao devido a espera de autoridades."];
const CLASSIFICACAO = ["Classificacao somente o primeiro colocado Masculino e Feminino.", "Classificacao dos 3 primeiros colocados Masculino e Feminino.", "Classificacao dos 5 primeiros colocados Masculino e Feminino.", "Classificacao dos 10 primeiros colocados Masculino e Feminino."];
const ORGANIZACAO_EQUIPE = ["A empresa organizadora demonstrou total conhecimento tecnico.", "A empresa realizou um excelente evento, atendendo aos criterios tecnicos estabelecidos em normas.", "Faltou conhecimento tecnico a empresa, prejudicando na organizacao do evento.", "A equipe de trabalho demonstrou inexperiencia em determinados pontos do evento.", "Faltou lideranca e coordenadores nos setores.", "Concentracao e tomada de decisao somente em uma pessoa, prejudicando o desenvolvimento do evento."];

const STEPS = [
  "Equipe", "Evento", "Arena e Estrutura", "Percurso",
  "Hidratacao e Premiacao", "Geral e Conclusao",
];

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: COLORS.grayDark, marginBottom: 6 }}>
        {label}{required && <span style={{ color: COLORS.primary }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function CheckGroup({ options, value = [], onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {options.map(opt => (
        <label key={opt} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 13, fontFamily: FONTS.body, color: COLORS.dark, lineHeight: 1.5 }}>
          <input type="checkbox" checked={value.includes(opt)}
            onChange={e => onChange(e.target.checked ? [...value, opt] : value.filter(v => v !== opt))}
            style={{ marginTop: 3, accentColor: COLORS.primary, flexShrink: 0 }} />
          {opt}
        </label>
      ))}
    </div>
  );
}

function RadioGroup({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {options.map(opt => (
        <label key={opt} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 13, fontFamily: FONTS.body, color: COLORS.dark, lineHeight: 1.5 }}>
          <input type="radio" name={opt} checked={value === opt} onChange={() => onChange(opt)}
            style={{ marginTop: 3, accentColor: COLORS.primary, flexShrink: 0 }} />
          {opt}
        </label>
      ))}
    </div>
  );
}

function PhotoUpload({ label, urls = [], onUpload, folder }) {
  const fileRef = useRef(null);
  return (
    <Field label={label}>
      {urls.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {urls.map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: COLORS.primary }}>Foto {i + 1}</a>
          ))}
        </div>
      )}
      <input type="file" ref={fileRef} accept="image/*" multiple onChange={async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const newUrls = [];
        for (const f of files) {
          const r = await uploadFile(f, folder || "relatorios");
          if (r.url) newUrls.push(r.url);
        }
        onUpload([...urls, ...newUrls]);
        if (fileRef.current) fileRef.current.value = "";
      }} style={{ fontSize: 12 }} />
    </Field>
  );
}

function slugify(str) {
  return (str || "sem-nome").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase().slice(0, 50);
}

const inp = { width: "100%", padding: "8px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 14, fontFamily: FONTS.body, boxSizing: "border-box" };
const textarea = { ...inp, minHeight: 60, resize: "vertical" };

export default function RelatorioCorridaRua() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { refereeId, name } = useIntranet();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({});
  const [assignment, setAssignment] = useState(null);
  const [allAssignments, setAllAssignments] = useState([]);
  const [referees, setReferees] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [existingId, setExistingId] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const [aRes, allRes, refRes, relRes] = await Promise.all([
        RefereeAssignmentsService.list({ refereeId }),
        RefereeAssignmentsService.list(),
        RefereesService.list(),
        RelatoriosService.getByAssignment(assignmentId),
      ]);
      const myAsgn = (aRes.data || []).find(a => a.id === assignmentId);
      if (!myAsgn) { navigate("/intranet/escalas"); return; }
      setAssignment(myAsgn);
      setAllAssignments((allRes.data || []).filter(a => a.eventId === myAsgn.eventId));
      setReferees(Object.fromEntries((refRes.data || []).map(r => [r.id, r])));
      if (relRes.data) {
        setForm(relRes.data);
        setExistingId(relRes.data.id);
      } else {
        setForm({
          arbitrosPresentes: (allRes.data || []).filter(a => a.eventId === myAsgn.eventId).map(a => a.refereeId),
        });
      }
      setLoading(false);
    };
    fetch();
  }, [assignmentId, refereeId]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const save = async (enviar = false) => {
    setSaving(true); setMsg("");
    const evt = assignment?.event || {};
    const payload = {
      ...form,
      assignmentId,
      eventId: assignment?.eventId || "",
      refereeId, refereeName: name,
      eventTitle: evt.title || "", eventDate: evt.date || "", eventCity: evt.city || "",
      status: enviar ? "enviado" : "rascunho",
    };
    if (existingId) {
      await RelatoriosService.update(existingId, payload);
    } else {
      const r = await RelatoriosService.create(payload);
      if (r.data) setExistingId(r.data.id);
    }
    setSaving(false);
    setMsg(enviar ? "Relatorio enviado!" : "Rascunho salvo!");
    if (enviar) setTimeout(() => navigate("/intranet/escalas"), 2000);
    else setTimeout(() => setMsg(""), 3000);
  };

  if (loading) return <IntranetLayout><div style={{ padding: 40, textAlign: "center", color: COLORS.gray }}>Carregando...</div></IntranetLayout>;

  const evt = assignment?.event || {};
  const escalados = allAssignments;
  const uploadFolder = `relatorios/${slugify(evt.organizer)}-${slugify(evt.title)}`;

  return (
    <IntranetLayout>
      <div style={{ padding: 36, maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 4px" }}>
          Relatorio de Arbitragem
        </h1>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 4px" }}>
          {evt.title} — {evt.date ? new Date(evt.date + "T12:00:00").toLocaleDateString("pt-BR") : ""} — {evt.city}
        </p>
        {form.status === "enviado" && <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "#f0fdf4", color: "#15803d" }}>Enviado</span>}

        {/* Stepper */}
        <div style={{ display: "flex", gap: 4, margin: "20px 0" }}>
          {STEPS.map((s, i) => (
            <div key={s} onClick={() => setStep(i)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 6, textAlign: "center",
              background: i === step ? COLORS.primary : i < step ? "#007733" : "#e8e8e8",
              color: i <= step ? "#fff" : COLORS.gray,
              fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, cursor: "pointer",
              textTransform: "uppercase", letterSpacing: 0.3,
            }}>{s}</div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

          {/* ── Etapa 1: Equipe ── */}
          {step === 0 && (
            <>
              <Field label="Arbitros presentes" required>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {escalados.map(a => {
                    const ref = referees[a.refereeId] || {};
                    return (
                      <label key={a.refereeId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                        <input type="checkbox" checked={(form.arbitrosPresentes || []).includes(a.refereeId)}
                          onChange={e => set("arbitrosPresentes", e.target.checked
                            ? [...(form.arbitrosPresentes || []), a.refereeId]
                            : (form.arbitrosPresentes || []).filter(id => id !== a.refereeId)
                          )} style={{ accentColor: COLORS.primary }} />
                        {ref.name || a.refereeId}
                      </label>
                    );
                  })}
                </div>
              </Field>
              <Field label="Horario de chegada dos arbitros">
                <textarea style={textarea} value={form.horariosChegada || ""} onChange={e => set("horariosChegada", e.target.value)} placeholder="Descrever o horario de cada arbitro" />
              </Field>
            </>
          )}

          {/* ── Etapa 2: Evento ── */}
          {step === 1 && (
            <>
              <Field label="Tipo de evento"><CheckGroup options={TIPO_EVENTO} value={form.tipoEvento || []} onChange={v => set("tipoEvento", v)} /></Field>
              <Field label="Inscritos x Concluintes por modalidade">
                <textarea style={textarea} value={form.inscritosConcluintes || ""} onChange={e => set("inscritosConcluintes", e.target.value)} placeholder="Ex: Inscritos 5km: 200, Concluintes: 180..." />
              </Field>
              <Field label="Link de acesso aos Resultados Oficiais">
                <input style={inp} value={form.linkResultados || ""} onChange={e => set("linkResultados", e.target.value)} placeholder="https://..." />
              </Field>
            </>
          )}

          {/* ── Etapa 3: Arena e Estrutura ── */}
          {step === 2 && (
            <>
              <Field label="Arena do Evento"><CheckGroup options={ARENA} value={form.arena || []} onChange={v => set("arena", v)} /></Field>
              <Field label="Sinalizacao de Arena"><CheckGroup options={SINALIZACAO_ARENA} value={form.sinalizacaoArena || []} onChange={v => set("sinalizacaoArena", v)} /></Field>
              <PhotoUpload folder={uploadFolder} label="Fotos — Sinalizacao da Arena" urls={form.sinalizacaoArenaFotos || []} onUpload={v => set("sinalizacaoArenaFotos", v)} />
              <Field label="Sonorizacao da Arena"><CheckGroup options={SONORIZACAO} value={form.sonorizacao || []} onChange={v => set("sonorizacao", v)} /></Field>
              <Field label="Posto Medico" required><CheckGroup options={POSTO_MEDICO} value={form.postoMedico || []} onChange={v => set("postoMedico", v)} /></Field>
              <PhotoUpload folder={uploadFolder} label="Fotos — Servicos Medicos" urls={form.postoMedicoFotos || []} onUpload={v => set("postoMedicoFotos", v)} />
              <PhotoUpload folder={uploadFolder} label="Fotos — Zona de Largada / Chegada" urls={form.zonaLargadaChegadaFotos || []} onUpload={v => set("zonaLargadaChegadaFotos", v)} />
              <PhotoUpload folder={uploadFolder} label="Fotos — Numero de Peito" urls={form.numeroPeitoFotos || []} onUpload={v => set("numeroPeitoFotos", v)} />
              <Field label="Guarda Volumes"><RadioGroup options={GUARDA_VOLUMES} value={form.guardaVolumes || ""} onChange={v => set("guardaVolumes", v)} /></Field>
              <PhotoUpload folder={uploadFolder} label="Fotos — Guarda Volumes" urls={form.guardaVolumesFotos || []} onUpload={v => set("guardaVolumesFotos", v)} />
              <PhotoUpload folder={uploadFolder} label="Fotos — Banheiros / Banheiro Quimico" urls={form.banheirosFotos || []} onUpload={v => set("banheirosFotos", v)} />
            </>
          )}

          {/* ── Etapa 4: Percurso ── */}
          {step === 3 && (
            <>
              <PhotoUpload folder={uploadFolder} label="Fotos — Marcacao do Percurso" urls={form.marcacaoPercursoFotos || []} onUpload={v => set("marcacaoPercursoFotos", v)} />
              <Field label="Largada e Chegada"><CheckGroup options={COMENTARIOS_LARGADA} value={form.comentariosLargadaChegada || []} onChange={v => set("comentariosLargadaChegada", v)} /></Field>
              <PhotoUpload folder={uploadFolder} label="Fotos — Setor de Largada" urls={form.setorLargadaFotos || []} onUpload={v => set("setorLargadaFotos", v)} />
              <Field label="Divisao de Elite"><CheckGroup options={DIVISAO_ELITE} value={form.divisaoElite || []} onChange={v => set("divisaoElite", v)} /></Field>
              <Field label="Cronometragem Eletronica">
                <textarea style={textarea} value={form.cronometragemEletronica || ""} onChange={e => set("cronometragemEletronica", e.target.value)} placeholder="Informe o nome da empresa e o nome do operador do sistema." />
              </Field>
              <PhotoUpload folder={uploadFolder} label="Fotos — Cronometragem" urls={form.cronometragemFotos || []} onUpload={v => set("cronometragemFotos", v)} />
              <Field label="Medicao do Percurso"><RadioGroup options={MEDICAO_PERCURSO} value={form.medicaoPercurso || ""} onChange={v => set("medicaoPercurso", v)} /></Field>
              <Field label="Trajeto do Percurso"><CheckGroup options={TRAJETO_PERCURSO} value={form.trajetoPercurso || []} onChange={v => set("trajetoPercurso", v)} /></Field>
              <Field label="Sinalizacao do Percurso"><CheckGroup options={SINALIZACAO_PERCURSO} value={form.sinalizacaoPercurso || []} onChange={v => set("sinalizacaoPercurso", v)} /></Field>
            </>
          )}

          {/* ── Etapa 5: Hidratação e Premiação ── */}
          {step === 4 && (
            <>
              <Field label="Hidratacao"><CheckGroup options={HIDRATACAO} value={form.hidratacao || []} onChange={v => set("hidratacao", v)} /></Field>
              <PhotoUpload folder={uploadFolder} label="Fotos — Hidratacao" urls={form.hidratacaoFotos || []} onUpload={v => set("hidratacaoFotos", v)} />
              <Field label="Podio / Back-Drop"><CheckGroup options={PODIO_BACKDROP} value={form.podioBackdrop || []} onChange={v => set("podioBackdrop", v)} /></Field>
              <PhotoUpload folder={uploadFolder} label="Fotos — Podio / Back-Drop" urls={form.podioFotos || []} onUpload={v => set("podioFotos", v)} />
              <Field label="Premiacao"><CheckGroup options={PREMIACAO} value={form.premiacao || []} onChange={v => set("premiacao", v)} /></Field>
              <Field label="Classificacao"><CheckGroup options={CLASSIFICACAO} value={form.classificacao || []} onChange={v => set("classificacao", v)} /></Field>
              <PhotoUpload folder={uploadFolder} label="Foto Equipe de Arbitragem" urls={form.fotoEquipeArbitragem || []} onUpload={v => set("fotoEquipeArbitragem", v)} />
              <PhotoUpload folder={uploadFolder} label="Fotos Anotacao Arbitragem" urls={form.fotosAnotacao || []} onUpload={v => set("fotosAnotacao", v)} />
            </>
          )}

          {/* ── Etapa 6: Geral e Conclusão ── */}
          {step === 5 && (
            <>
              <Field label="Diferenca entre numeros de peito por modalidade">
                <textarea style={textarea} value={form.diferencaNumerosPeito || ""} onChange={e => set("diferencaNumerosPeito", e.target.value)} placeholder="Ex: 5km - azul / 10km - amarelo" />
              </Field>
              <Field label="Cumprimento do Regulamento — Infracoes" required>
                <textarea style={textarea} value={form.cumprimentoRegulamento || ""} onChange={e => set("cumprimentoRegulamento", e.target.value)} placeholder="Descreva tudo que ocorreu no evento relacionado as regras do atletismo e do regulamento." />
              </Field>
              <Field label="Organizacao / Equipe de Trabalho"><CheckGroup options={ORGANIZACAO_EQUIPE} value={form.organizacaoEquipe || []} onChange={v => set("organizacaoEquipe", v)} /></Field>
              <Field label="Seguranca dos Atletas">
                <textarea style={textarea} value={form.segurancaAtletas || ""} onChange={e => set("segurancaAtletas", e.target.value)} placeholder="Obstrucoes na via, dificuldades, sinalizacao..." />
              </Field>
              <Field label="Detalhes do Percurso">
                <textarea style={textarea} value={form.detalhesPercurso || ""} onChange={e => set("detalhesPercurso", e.target.value)} />
              </Field>
              <Field label="Comentarios Adicionais">
                <textarea style={textarea} value={form.comentariosAdicionais || ""} onChange={e => set("comentariosAdicionais", e.target.value)} placeholder="Desclassificacoes, idade minima, pacer, auxilio de terceiros..." />
              </Field>
              <Field label="Os Resultados devem ser Homologados? Descreva o motivo." required>
                <textarea style={textarea} value={form.homologacaoResultados || ""} onChange={e => set("homologacaoResultados", e.target.value)} />
              </Field>
            </>
          )}

          {/* Mensagem */}
          {msg && <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: msg.includes("Erro") ? "#fef2f2" : "#f0fdf4", color: msg.includes("Erro") ? "#dc2626" : "#15803d", fontSize: 13 }}>{msg}</div>}

          {/* Navegação */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, gap: 8 }}>
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)} style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", color: COLORS.gray, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Voltar</button>
            ) : <div />}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => save(false)} disabled={saving}
                style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", color: COLORS.dark, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {saving ? "Salvando..." : "Salvar Rascunho"}
              </button>
              {step < STEPS.length - 1 ? (
                <button onClick={() => setStep(s => s + 1)} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Proximo</button>
              ) : (
                <button onClick={() => save(true)} disabled={saving}
                  style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: "#007733", color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {saving ? "Enviando..." : "Enviar Relatorio"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </IntranetLayout>
  );
}
