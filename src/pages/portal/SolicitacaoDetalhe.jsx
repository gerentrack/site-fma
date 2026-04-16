/**
 * SolicitacaoDetalhe.jsx
 * Rota: /portal/solicitacoes/:id
 *
 * Correções:
 *   [P1] Botão "Editar rascunho" + drawer lateral com formulário completo
 *   [P2] Banner com link para evento público quando eventoCalendarioId preenchido
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useOrganizer } from "../../context/OrganizerContext";
import { SolicitacoesService, ArquivosService, MovimentacoesService, TaxasConfigService, PagamentosService } from "../../services/index";
import { uploadFile, deleteFile, deleteFolder } from "../../services/storageService";
import { COLORS, FONTS } from "../../styles/colors";
import { SOLICITACAO_STATUS, SOLICITACAO_TIPOS, MOVIMENTACAO_TIPOS, ARQUIVO_CATEGORIAS } from "../../config/navigation";
import { getFieldsBySection, initFormConfig } from "../../utils/formSchema";
import { defaultCamposTecnicosPermit, defaultCamposTecnicosChancela, novaModalidadeId } from "../../utils/permitDefaults";
import { formatarMoeda } from "../../utils/taxaCalculator";
import { PAGAMENTO_STATUS } from "../../config/navigation";
import { notificarFmaComprovanteAnexado, notificarFmaResultadoEnviado, notificarFmaPendenciaRespondida } from "../../services/emailService";
import PdfModal, { usePdfModal } from "../../components/ui/PdfModal";

const statusMap     = Object.fromEntries(SOLICITACAO_STATUS.map(s => [s.value, s]));
const tipoMap       = Object.fromEntries(SOLICITACAO_TIPOS.map(t => [t.value, t]));
const movMap        = MOVIMENTACAO_TIPOS;
const arquivoCatMap = Object.fromEntries(ARQUIVO_CATEGORIAS.map(c => [c.value, c]));

function fmt(d)   { if (!d) return "—"; return new Date(d).toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" }); }
function fmtDT(d) { if (!d) return "—"; return new Date(d).toLocaleString("pt-BR", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }); }
function fmtSize(b) { if (!b) return "—"; if (b<1024) return b+" B"; if (b<1048576) return (b/1024).toFixed(1)+" KB"; return (b/1048576).toFixed(1)+" MB"; }

const baseInp = (err=false) => ({ width:"100%", padding:"10px 13px", borderRadius:8, border:`1.5px solid ${err?"#fca5a5":COLORS.grayLight}`, fontFamily:FONTS.body, fontSize:14, outline:"none", boxSizing:"border-box", background:"#fff" });
const cardSty = { background:"#fff", borderRadius:12, padding:"20px 24px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", marginBottom:14 };

function Lbl({ children, req }) {
  return <label style={{ fontFamily:FONTS.heading, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:COLORS.grayDark, display:"block", marginBottom:5 }}>{children}{req&&<span style={{color:COLORS.primary}}> *</span>}</label>;
}
function Err({ msg }) { return <div style={{ fontFamily:FONTS.body, fontSize:11, color:"#dc2626", marginTop:3 }}>{msg}</div>; }
function SecTitle({ children }) {
  return <h3 style={{ fontFamily:FONTS.heading, fontSize:12, fontWeight:800, textTransform:"uppercase", letterSpacing:2, color:COLORS.dark, margin:"0 0 16px", paddingBottom:10, borderBottom:`2px solid ${COLORS.grayLight}` }}>{children}</h3>;
}

const pagStatusMap = Object.fromEntries(PAGAMENTO_STATUS.map(s => [s.value, s]));

// ─── TaxasPagamentoSection ───────────────────────────────────────────────────
function TaxasPagamentoSection({ sol }) {
  const taxas = sol.taxas || {};
  const pagamento = sol.pagamento || {};
  const ps = pagStatusMap[pagamento.status] || pagStatusMap.pendente;
  const mods = taxas.modalidades || [];
  const [pagamentos, setPagamentos] = useState([]);

  useEffect(() => {
    PagamentosService.listBySolicitacao(sol.id).then(r => setPagamentos(r.data || []));
  }, [sol.id]);

  const totalPago = pagamentos.filter(p => p.status === "confirmado").reduce((a, p) => a + (p.valor || 0), 0);
  const tipoLabels = { taxa_solicitacao: "Solicitacao", taxa_arbitragem: "Arbitragem", complemento: "Complemento" };

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontFamily:FONTS.heading, fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:1.5, color:COLORS.gray, marginBottom:12 }}>Taxas e Pagamento</div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {/* Resumo da taxa */}
        <div style={{ padding:"14px 16px", background:COLORS.offWhite, borderRadius:10, border:`1px solid ${COLORS.grayLight}` }}>
          <div style={{ fontFamily:FONTS.heading, fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:1, color:COLORS.gray, marginBottom:8 }}>Valor da taxa</div>
          {mods.length > 0 && (
            <div style={{ fontSize:12, fontFamily:FONTS.body, color:COLORS.grayDark, marginBottom:8 }}>
              {mods.map(m => (
                <div key={m.id} style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                  <span>{m.distancia} ({m.inscritos} inscritos)</span>
                  <span style={{ fontWeight:600 }}>{formatarMoeda(m.valorFinal)}</span>
                </div>
              ))}
            </div>
          )}
          {taxas.urgencia > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#92400e", marginBottom:2 }}>
              <span>Taxa de urgencia</span><span>+{formatarMoeda(taxas.urgencia)}</span>
            </div>
          )}
          {taxas.descontoValor > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#15803d", marginBottom:2 }}>
              <span>{taxas.descontoDescricao || "Desconto"}</span><span>-{formatarMoeda(taxas.descontoValor)}</span>
            </div>
          )}
          {taxas.taxaArbitragem?.valor > 0 && (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", fontWeight:600, fontSize:13, marginTop:6, paddingTop:6, borderTop:`1px solid ${COLORS.grayLight}` }}>
                <span>Subtotal {sol.tipo === "chancela" ? "Chancela" : "Permit"}</span><span>{formatarMoeda(taxas.total)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginTop:2 }}>
                <span>Taxa de Arbitragem</span><span>{formatarMoeda(taxas.taxaArbitragem.valor)}</span>
              </div>
              {taxas.taxaArbitragem.descricao && (
                <div style={{ fontSize:11, color:COLORS.gray, fontFamily:FONTS.body, marginTop:2, whiteSpace:"pre-line" }}>{taxas.taxaArbitragem.descricao}</div>
              )}
            </>
          )}
          <div style={{ display:"flex", justifyContent:"space-between", fontWeight:800, fontSize:16, marginTop:6, paddingTop:6, borderTop:`1px solid ${COLORS.grayLight}` }}>
            <span>Total</span><span style={{ color:COLORS.primary }}>{formatarMoeda((taxas.total || 0) + (taxas.taxaArbitragem?.valor || 0))}</span>
          </div>
          {taxas.ajustadoPorFMA && (
            <div style={{ fontSize:11, color:"#7c3aed", marginTop:4, fontFamily:FONTS.body }}>
              Valor ajustado pela FMA{taxas.observacaoAjuste ? `: ${taxas.observacaoAjuste}` : ""}
            </div>
          )}
        </div>

        {/* Status do pagamento */}
        <div style={{ padding:"14px 16px", background:ps.bg || COLORS.offWhite, borderRadius:10, border:`1px solid ${ps.color}30` }}>
          <div style={{ fontFamily:FONTS.heading, fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:1, color:COLORS.gray, marginBottom:8 }}>Pagamento</div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <span style={{ fontSize:18 }}>{ps.icon}</span>
            <span style={{ fontFamily:FONTS.heading, fontSize:15, fontWeight:800, color:ps.color }}>{ps.label}</span>
          </div>
          {totalPago > 0 && (
            <div style={{ fontSize:12, fontFamily:FONTS.body, color:"#15803d", marginBottom:4 }}>
              Total pago: {formatarMoeda(totalPago)}
              {(() => { const totalGeral = (taxas.total || 0) + (taxas.taxaArbitragem?.valor || 0); return totalPago < totalGeral ? <span style={{ color:"#d97706" }}> (saldo: {formatarMoeda(totalGeral - totalPago)})</span> : null; })()}
            </div>
          )}
          {pagamento.status === "confirmado" && pagamento.confirmadoEm && (
            <div style={{ fontSize:12, fontFamily:FONTS.body, color:COLORS.grayDark }}>
              Confirmado em {fmtDT(pagamento.confirmadoEm)}
            </div>
          )}
        </div>
      </div>

      {/* Lista de pagamentos e recibos */}
      {pagamentos.length > 0 && (
        <div style={{ marginTop:14 }}>
          <div style={{ fontFamily:FONTS.heading, fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:1.5, color:COLORS.gray, marginBottom:8 }}>
            Pagamentos realizados ({pagamentos.length})
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {pagamentos.map((pag, i) => (
              <div key={pag.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderRadius:8, background:"#fff", border:`1px solid ${COLORS.grayLight}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:13, fontWeight:800, color:COLORS.dark }}>#{i+1}</span>
                  <span style={{ fontSize:12, color:COLORS.grayDark }}>
                    {tipoLabels[pag.tipo] || pag.tipo} — {formatarMoeda(pag.valor)}
                    {pag.natureza !== "total" && <span style={{ color:"#d97706" }}> ({pag.natureza})</span>}
                  </span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {pag.reciboNumero && (
                    <span style={{ fontSize:12, fontWeight:700, color:"#15803d", display:"flex", alignItems:"center", gap:4 }}>
                      {pag.reciboNumero}
                      {pag.reciboArquivoId && (
                        <button onClick={async () => {
                          const r = await ArquivosService.get(pag.reciboArquivoId);
                          if (r.data?.url) window.open(r.data.url, "_blank");
                        }} style={{ background:"none", border:"none", color:"#0066cc", cursor:"pointer", fontSize:11, textDecoration:"underline", padding:0 }}>
                          Baixar
                        </button>
                      )}
                    </span>
                  )}
                  {pag.confirmadoEm && <span style={{ fontSize:11, color:COLORS.gray }}>{fmtDT(pag.confirmadoEm)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, size="md" }) {
  const s = statusMap[status] || { label:status, color:COLORS.gray, bg:"#f3f4f6", icon:"" };
  return <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:size==="lg"?"6px 16px":"3px 10px", borderRadius:20, fontSize:size==="lg"?13:11, fontFamily:FONTS.heading, fontWeight:700, background:s.bg, color:s.color, border:`1px solid ${s.color}30` }}>{s.icon} {s.label}</span>;
}

// ─── TimelineItem ─────────────────────────────────────────────────────────────
function TimelineItem({ mov, isLast }) {
  const mt = movMap[mov.tipoEvento] || { icon:"" };
  const isOrg = mov.autor === "organizador";
  return (
    <div style={{ display:"flex", gap:14, position:"relative" }}>
      {!isLast && <div style={{ position:"absolute", left:19, top:38, bottom:-12, width:2, background:COLORS.grayLight }} />}
      <div style={{ width:40, height:40, borderRadius:"50%", flexShrink:0, zIndex:1, background:isOrg?"#eff6ff":"#fff5f5", border:`2px solid ${isOrg?"#93c5fd":"#fca5a5"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{mt.icon}</div>
      <div style={{ flex:1, paddingBottom:isLast?0:24 }}>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:4 }}>
          <span style={{ fontFamily:FONTS.heading, fontSize:13, fontWeight:700, color:COLORS.dark }}>{mov.descricao}</span>
          {mov.statusNovo && mov.statusAnterior && mov.statusNovo !== mov.statusAnterior && (
            <div style={{ display:"flex", gap:5, alignItems:"center" }}>
              <StatusBadge status={mov.statusAnterior} /><span style={{ fontSize:11, color:COLORS.gray }}>→</span><StatusBadge status={mov.statusNovo} />
            </div>
          )}
        </div>
        <div style={{ fontFamily:FONTS.body, fontSize:11, color:COLORS.gray }}>{fmtDT(mov.criadoEm)} · {mov.autorNome}</div>
      </div>
    </div>
  );
}

// ─── ArquivoUploader (múltiplos arquivos) ────────────────────────────────────
function ArquivoUploader({ solicitacaoId, organizerId, organizerName, nomeEvento, dataEvento, onUploaded }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [categoria, setCategoria] = useState("complementar");
  const [files, setFiles] = useState([]); // [{ file, descricao }]
  const [error, setError] = useState("");
  const MAX = 5 * 1024 * 1024;

  const addFiles = (fileList) => {
    const novos = [];
    for (const f of fileList) {
      if (f.size > MAX) { setError(`"${f.name}" excede ${fmtSize(MAX)}.`); continue; }
      // Sugerir nome baseado no arquivo (sem extensão)
      const sugestao = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
      novos.push({ file: f, descricao: sugestao });
    }
    if (novos.length) { setFiles(prev => [...prev, ...novos]); setError(""); }
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));
  const updateDescricao = (idx, val) => setFiles(prev => prev.map((f, i) => i === idx ? { ...f, descricao: val } : f));

  const handleUpload = async () => {
    if (!files.length) { setError("Selecione ao menos um arquivo."); return; }
    const semNome = files.find(f => !f.descricao.trim());
    if (semNome) { setError("Preencha o nome/descricao de todos os arquivos."); return; }
    setUploading(true); setError("");
    const sanitize = (s) => (s || "sem-nome").replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, "").trim().replace(/\s+/g, "_");
    const ano = (dataEvento || "").slice(0, 4) || String(new Date().getFullYear());
    const folder = `solicitacoes/${ano}/${sanitize(organizerName)}/${sanitize(nomeEvento)}`;
    const enviados = [];

    for (const item of files) {
      const ext = item.file.name.includes(".") ? item.file.name.split(".").pop() : "pdf";
      const descLabel = sanitize(item.descricao);
      const nomeRenomeado = `${descLabel}_${sanitize(nomeEvento)}.${ext}`;
      const renamedFile = new File([item.file], nomeRenomeado, { type: item.file.type });
      const { url, path, error: uploadError } = await uploadFile(renamedFile, folder);
      if (uploadError) { setError(`Erro em "${item.descricao}": ${uploadError}`); continue; }
      const r = await ArquivosService.create({ solicitacaoId, nome: nomeRenomeado, tamanho: item.file.size, tipo: item.file.type, descricao: item.descricao, categoria, enviadoPor: "organizador", enviadoById: organizerId, enviadoPorNome: organizerName, url, storagePath: path });
      if (!r.error) enviados.push(nomeRenomeado);
    }

    if (enviados.length) {
      await MovimentacoesService.registrar({ solicitacaoId, tipoEvento: "arquivo_enviado", statusAnterior: "", statusNovo: "", descricao: `${enviados.length} arquivo(s) enviado(s): ${enviados.join(", ")}`, autor: "organizador", autorNome: organizerName, autorId: organizerId, visivel: true });
      notificarFmaComprovanteAnexado({ organizadorNome: organizerName, evento: nomeEvento || "Evento", protocolo: "", solicitacaoId }).catch(() => {});
    }

    setFiles([]); setCategoria("complementar");
    if (inputRef.current) inputRef.current.value = "";
    setUploading(false); onUploaded();
  };

  const lbl = { fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, display: "block", marginBottom: 4 };
  const inp = { width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ background: "#f8fafc", border: `2px dashed ${COLORS.grayLight}`, borderRadius: 10, padding: 20 }}>
      <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, marginBottom: 14 }}>Enviar arquivos</div>
      {error && <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontFamily: FONTS.body, fontSize: 12, color: "#dc2626" }}>{error}</div>}

      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={lbl}>Selecionar arquivos</label>
          <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
            onChange={e => { addFiles(e.target.files); e.target.value = ""; }}
            style={{ fontFamily: FONTS.body, fontSize: 13, width: "100%" }} />
        </div>
        <div>
          <label style={lbl}>Categoria</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} style={{ ...inp, cursor: "pointer", width: "auto", minWidth: 150 }}>
            {ARQUIVO_CATEGORIAS.filter(c => c.value !== "resposta_fma").map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
        </div>
      </div>

      {files.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {files.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", borderRadius: 8, border: `1px solid ${COLORS.grayLight}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: COLORS.gray, fontFamily: FONTS.body, marginBottom: 4 }}>
                  {item.file.name} — {fmtSize(item.file.size)}
                </div>
                <input value={item.descricao} onChange={e => updateDescricao(i, e.target.value)}
                  placeholder="Nome do documento (ex: Alvara, Seguro, Mapa...)"
                  style={{ ...inp, background: !item.descricao.trim() ? "#fffbeb" : "#fff", borderColor: !item.descricao.trim() ? "#fcd34d" : COLORS.grayLight }} />
              </div>
              <button onClick={() => removeFile(i)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fff5f5", color: "#dc2626", cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>Remover</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={handleUpload} disabled={uploading || !files.length}
          style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: !files.length ? COLORS.gray : "#0066cc", color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: (!files.length || uploading) ? "not-allowed" : "pointer" }}>
          {uploading ? "Enviando..." : `Enviar ${files.length || ""} arquivo${files.length !== 1 ? "s" : ""}`}
        </button>
        {files.length > 0 && <span style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>{files.length} arquivo(s) selecionado(s)</span>}
      </div>
      <div style={{ fontFamily: FONTS.body, fontSize: 10, color: COLORS.gray, marginTop: 8 }}>PDF, DOC, JPG, PNG, XLS. Max. 5 MB por arquivo. Voce pode selecionar varios de uma vez.</div>
    </div>
  );
}

// ─── Campo dinâmico para o drawer de edição ───────────────────────────────────
function DynField({ field:f, value, ctValue, error, onChange }) {
  const L = () => <label style={{ fontFamily:FONTS.heading, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:COLORS.grayDark, display:"block", marginBottom:5 }}>{f.label}{f.required&&<span style={{color:COLORS.primary}}> *</span>}</label>;
  if (f.conditional && !ctValue[f.conditional]) return null;
  if (f.type==="upload") return null;
  if (f.type==="checkbox") return <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontFamily:FONTS.body, fontSize:14, color:COLORS.dark }}><input type="checkbox" checked={!!value} onChange={e=>onChange(e.target.checked)} style={{width:16,height:16}}/>{f.label}</label>;
  if (f.type==="select") return <div><L/><select value={value||""} onChange={e=>onChange(e.target.value)} style={{...baseInp(!!error),cursor:"pointer"}}><option value="">Selecione...</option>{(f.options||[]).map(o=><option key={o} value={o}>{o}</option>)}</select>{error&&<Err msg={error}/>}</div>;
  if (f.type==="textarea") return <div><L/><textarea value={value||""} onChange={e=>onChange(e.target.value)} rows={3} style={{...baseInp(!!error),resize:"vertical"}}/>{error&&<Err msg={error}/>}</div>;
  return <div><L/><input type={f.type==="date"?"date":f.type==="time"?"time":f.type==="number"?"number":"text"} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={f.hint||""} style={baseInp(!!error)}/>{error&&<Err msg={error}/>}</div>;
}

// ─── Drawer de edição — PENDÊNCIA 1 ──────────────────────────────────────────
function EditDrawer({ sol, organizerId, organizerName, onClose, onSaved }) {
  useEffect(() => { initFormConfig(); }, []);

  const [form,setForm] = useState({ nomeEvento:sol.nomeEvento||"", dataEvento:sol.dataEvento||"", cidadeEvento:sol.cidadeEvento||"", localEvento:sol.localEvento||"", descricaoEvento:sol.descricaoEvento||"" });
  const [ct,setCt]     = useState(() => {
    const ex = sol.camposTecnicos||{};
    if (Object.keys(ex).length>0) return {...ex};
    return sol.tipo==="permit" ? defaultCamposTecnicosPermit() : defaultCamposTecnicosChancela();
  });
  const [errors,setErrors]     = useState({});
  const [ctErrors,setCtErrors] = useState({});
  const [saving,setSaving]     = useState(false);
  const [globalErr,setGlobalErr]=useState("");

  const setF = (k,v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:""})); };
  const setC = (k,v) => { setCt(c=>({...c,[k]:v})); setCtErrors(e=>({...e,[k]:""})); };
  const addMod = () => setCt(c=>({...c,modalidades:[...(c.modalidades||[]),{id:novaModalidadeId(),distancia:"",estimativaInscritos:""}]}));
  const remMod = (id) => setCt(c=>({...c,modalidades:(c.modalidades||[]).filter(m=>m.id!==id)}));
  const setMod = (id,k,v) => setCt(c=>({...c,modalidades:(c.modalidades||[]).map(m=>m.id===id?{...m,[k]:v}:m)}));

  const validate = () => {
    const e={};
    if (!form.nomeEvento.trim())   e.nomeEvento="Obrigatório.";
    if (!form.dataEvento)          e.dataEvento="Obrigatório.";
    if (!form.cidadeEvento.trim()) e.cidadeEvento="Obrigatório.";
    if (!form.localEvento.trim())  e.localEvento="Obrigatório.";
    return e;
  };

  const handleSave = async () => {
    const e = validate(); if (Object.keys(e).length>0){ setErrors(e); return; }
    setSaving(true); setGlobalErr("");
    const r = await SolicitacoesService.update(sol.id,{...form, camposTecnicos:ct});
    if (r.error){ setGlobalErr(r.error); setSaving(false); return; }
    await MovimentacoesService.registrar({ solicitacaoId:sol.id, tipoEvento:"dados_alterados", statusAnterior:sol.status, statusNovo:sol.status, descricao:"Rascunho editado pelo organizador.", autor:"organizador", autorNome:organizerName, autorId:organizerId, visivel:true });
    setSaving(false); onSaved();
  };

  useEffect(() => {
    const h = (e) => { if (e.key==="Escape") onClose(); };
    window.addEventListener("keydown",h);
    document.body.style.overflow="hidden";
    return () => { window.removeEventListener("keydown",h); document.body.style.overflow=""; };
  },[onClose]);

  const sections = getFieldsBySection(sol.tipo);
  const mods     = ct.modalidades||[];

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.5)", display:"flex", justifyContent:"flex-end" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"min(640px,100vw)", height:"100%", background:COLORS.offWhite, overflowY:"auto", display:"flex", flexDirection:"column", boxShadow:"-4px 0 32px rgba(0,0,0,0.18)" }}>

        {/* Header drawer */}
        <div style={{ background:"#0066cc", padding:"20px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:FONTS.heading, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, color:"rgba(255,255,255,0.65)", marginBottom:4 }}>Editar rascunho</div>
            <div style={{ fontFamily:FONTS.heading, fontSize:16, fontWeight:900, color:"#fff", textTransform:"uppercase" }}>{tipoMap[sol.tipo]?.icon} {tipoMap[sol.tipo]?.label}</div>
          </div>
          <button onClick={onClose} style={{ width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", fontSize:18, cursor:"pointer" }}>✕</button>
        </div>

        {/* Corpo */}
        <div style={{ padding:"20px 24px", flex:1 }}>
          {globalErr && <div style={{ background:"#fff5f5", border:"1px solid #fca5a5", borderRadius:8, padding:"10px 14px", marginBottom:16, fontFamily:FONTS.body, fontSize:13, color:"#dc2626" }}>{globalErr}</div>}

          {/* Dados base */}
          <div style={cardSty}>
            <SecTitle>Dados do evento</SecTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div><Lbl req>Nome do evento</Lbl><input value={form.nomeEvento} onChange={e=>setF("nomeEvento",e.target.value)} style={baseInp(!!errors.nomeEvento)}/>{errors.nomeEvento&&<Err msg={errors.nomeEvento}/>}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><Lbl req>Data de realização</Lbl><input type="date" value={form.dataEvento} onChange={e=>setF("dataEvento",e.target.value)} style={baseInp(!!errors.dataEvento)}/>{errors.dataEvento&&<Err msg={errors.dataEvento}/>}</div>
                <div><Lbl req>Município</Lbl><input value={form.cidadeEvento} onChange={e=>setF("cidadeEvento",e.target.value)} style={baseInp(!!errors.cidadeEvento)}/>{errors.cidadeEvento&&<Err msg={errors.cidadeEvento}/>}</div>
              </div>
              <div><Lbl req>Local de realização</Lbl><input value={form.localEvento} onChange={e=>setF("localEvento",e.target.value)} style={baseInp(!!errors.localEvento)}/>{errors.localEvento&&<Err msg={errors.localEvento}/>}</div>
            </div>
          </div>

          {/* Modalidades */}
          <div style={cardSty}>
            <SecTitle>Modalidades / Distancias</SecTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {mods.map((m,i)=>(
                <div key={m.id} style={{ display:"grid", gridTemplateColumns:"1fr 150px 36px", gap:10, alignItems:"flex-end" }}>
                  <div>{i===0&&<Lbl req>Distância / Categoria</Lbl>}<input value={m.distancia} onChange={e=>setMod(m.id,"distancia",e.target.value)} placeholder="Ex: 10km, Sub-18" style={baseInp()}/></div>
                  <div>{i===0&&<Lbl req>Estimativa</Lbl>}<input type="number" min="1" value={m.estimativaInscritos} onChange={e=>setMod(m.id,"estimativaInscritos",e.target.value)} placeholder="Qtd." style={baseInp()}/></div>
                  <div style={{ paddingTop:i===0?22:0 }}>{mods.length>1&&<button onClick={()=>remMod(m.id)} style={{ width:36,height:36,borderRadius:8,border:"1px solid #fca5a5",background:"#fff5f5",color:"#dc2626",cursor:"pointer",fontSize:16 }}>×</button>}</div>
                </div>
              ))}
            </div>
            <button onClick={addMod} style={{ marginTop:12, padding:"7px 16px", borderRadius:8, border:"1.5px dashed #94a3b8", background:"#f8fafc", color:"#475569", cursor:"pointer", fontFamily:FONTS.heading, fontSize:12, fontWeight:700 }}>+ Adicionar modalidade</button>
          </div>

          {/* Campos técnicos dinâmicos */}
          {sections.map(({sectionId,sectionTitle,fields})=>{
            if (sectionId==="modalidades") return null;
            const vis = fields.filter(f=>f.type!=="upload");
            if (vis.length===0) return null;
            return (
              <div key={sectionId} style={cardSty}>
                <SecTitle>{sectionTitle}</SecTitle>
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  {vis.map(f=><DynField key={f.id} field={f} value={ct[f.id]} ctValue={ct} error={ctErrors[f.id]} onChange={v=>setC(f.id,v)}/>)}
                </div>
              </div>
            );
          })}
          <div style={{height:24}}/>
        </div>

        {/* Rodapé fixo */}
        <div style={{ padding:"16px 24px", background:"#fff", borderTop:`1px solid ${COLORS.grayLight}`, display:"flex", gap:10, justifyContent:"flex-end", flexShrink:0 }}>
          <button onClick={onClose} style={{ padding:"10px 18px", borderRadius:8, border:`1px solid ${COLORS.grayLight}`, background:"#fff", color:COLORS.grayDark, fontFamily:FONTS.heading, fontSize:13, fontWeight:700, cursor:"pointer" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ padding:"10px 22px", borderRadius:8, border:"none", background:saving?COLORS.gray:"#0066cc", color:"#fff", fontFamily:FONTS.heading, fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer" }}>{saving?"Salvando...":"Salvar alteracoes"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Banner evento público — PENDÊNCIA 2 ──────────────────────────────────────
function EventoBanner({ eventoId }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:14, background:"linear-gradient(90deg,#f0fdf4,#dcfce7)", border:"1.5px solid #86efac", borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
      <span style={{fontSize:32}}></span>
      <div style={{flex:1}}>
        <div style={{ fontFamily:FONTS.heading, fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:1.5, color:"#15803d", marginBottom:2 }}>Evento publicado no calendário FMA</div>
        <div style={{ fontFamily:FONTS.body, fontSize:13, color:"#166534" }}>Sua solicitação foi aprovada. O evento está disponível publicamente no site da FMA.</div>
      </div>
      <Link to={`/eventos/${eventoId}`} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 18px", borderRadius:8, background:"#15803d", color:"#fff", fontFamily:FONTS.heading, fontSize:12, fontWeight:700, textDecoration:"none", textTransform:"uppercase", letterSpacing:0.5, flexShrink:0 }}>
        Ver evento →
      </Link>
    </div>
  );
}

// ─── ResultadosTab — upload de resultado pelo organizador ────────────────────
function ResultadosTab({ sol, organizerId, organizerName, onUpdated }) {
  const [tipo, setTipo] = useState("arquivo"); // "arquivo" | "link"
  const [file, setFile] = useState(null);
  const [link, setLink] = useState("");
  const [descricao, setDescricao] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef();

  const jaEnviou = !!sol.resultadoStatus;
  const podeReenviar = sol.resultadoStatus === "rejeitado";

  const handleEnviar = async () => {
    setError("");
    let fileUrl = "";
    let tipoArquivo = tipo;

    if (tipo === "arquivo") {
      if (!file) { setError("Selecione um arquivo."); return; }
      if (file.size > 10 * 1024 * 1024) { setError("Arquivo muito grande (máx. 10 MB)."); return; }
      setUploading(true);
      const ano = new Date(sol.dataEvento || Date.now()).getFullYear();
      const sanitizeR = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, "_").slice(0, 60);
      const { url, error: uploadErr } = await uploadFile(file, `eventos/resultados/${ano}/${sanitizeR(sol.nomeEvento) || "evento"}`);
      if (uploadErr) { setError("Erro ao enviar arquivo."); setUploading(false); return; }
      fileUrl = url;
      tipoArquivo = file.name.endsWith(".xlsx") || file.name.endsWith(".xls") ? "xlsx" : "pdf";
    } else {
      if (!link.trim()) { setError("Informe o link do resultado."); return; }
      fileUrl = link.trim();
      tipoArquivo = "link";
      setUploading(true);
    }

    // Atualizar solicitação com dados do resultado
    await SolicitacoesService.update(sol.id, {
      resultadoStatus: "pendente_aprovacao",
      resultadoFileUrl: fileUrl,
      resultadoTipo: tipoArquivo,
      resultadoDescricao: descricao,
      resultadoEnviadoEm: new Date().toISOString(),
    });

    // Mudar status do evento para realizado
    if (sol.eventoCalendarioId) {
      const { CalendarService } = await import("../../services/index");
      await CalendarService.update(sol.eventoCalendarioId, { status: "realizado" });
    }

    // Registrar movimentação
    await MovimentacoesService.registrar({
      solicitacaoId: sol.id,
      tipoEvento: "resultado_enviado",
      statusAnterior: sol.status,
      statusNovo: sol.status,
      descricao: `Resultado enviado pelo organizador.${descricao ? ` Descrição: ${descricao.slice(0, 80)}` : ""}`,
      autor: "organizador",
      autorNome: organizerName,
      autorId: organizerId,
      visivel: true,
    });

    // Notificar FMA: resultado enviado pelo organizador
    notificarFmaResultadoEnviado({
      organizadorNome: organizerName,
      evento: sol.nomeEvento || sol.titulo || "Evento",
      protocolo: sol.protocoloFMA || sol.id,
      solicitacaoId: sol.id,
    }).catch(() => {});

    setUploading(false);
    setFile(null);
    setLink("");
    setDescricao("");
    onUpdated();
  };

  return (
    <div style={{ background:"#fff", borderRadius:12, padding:"24px 28px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
      <SecTitle>Resultados do Evento</SecTitle>

      {/* Status do resultado já enviado */}
      {jaEnviou && !podeReenviar && (
        <div style={{ padding:16, borderRadius:10, marginBottom:20,
          background: sol.resultadoStatus === "aprovado" ? "#f0fdf4" : sol.resultadoStatus === "pendente_aprovacao" ? "#fffbeb" : "#fff5f5",
          border: `1.5px solid ${sol.resultadoStatus === "aprovado" ? "#86efac" : sol.resultadoStatus === "pendente_aprovacao" ? "#fde68a" : "#fca5a5"}`,
        }}>
          <div style={{ fontFamily:FONTS.heading, fontSize:12, fontWeight:800, textTransform:"uppercase", marginBottom:6,
            color: sol.resultadoStatus === "aprovado" ? "#15803d" : sol.resultadoStatus === "pendente_aprovacao" ? "#92400e" : "#dc2626",
          }}>
            {sol.resultadoStatus === "aprovado" && "Resultado aprovado e publicado"}
            {sol.resultadoStatus === "pendente_aprovacao" && "Aguardando aprovacao da FMA"}
          </div>
          <div style={{ fontFamily:FONTS.body, fontSize:13, color:COLORS.dark }}>
            <a href={sol.resultadoFileUrl} target="_blank" rel="noreferrer" style={{ color:"#0066cc" }}>
              {sol.resultadoTipo === "link" ? "Ver link externo" : "Baixar arquivo"}
            </a>
            {sol.resultadoDescricao && <span style={{ color:COLORS.gray }}> — {sol.resultadoDescricao}</span>}
          </div>
          <div style={{ fontFamily:FONTS.body, fontSize:11, color:COLORS.gray, marginTop:4 }}>
            Enviado em {fmtDT(sol.resultadoEnviadoEm)}
            {sol.resultadoAprovadoEm && ` · Aprovado em ${fmtDT(sol.resultadoAprovadoEm)}`}
          </div>
        </div>
      )}

      {/* Formulário (visível se não enviou ou se foi rejeitado) */}
      {(!jaEnviou || podeReenviar) && (
        <div style={{ padding:20, background:"#f9fafb", borderRadius:10, border:`1px solid ${COLORS.grayLight}` }}>
          {podeReenviar && (
            <div style={{ padding:"10px 14px", borderRadius:8, background:"#fff5f5", border:"1px solid #fca5a5", marginBottom:16, fontFamily:FONTS.body, fontSize:12, color:"#dc2626" }}>
              O resultado anterior foi rejeitado pela FMA. Voce pode enviar um novo resultado.
            </div>
          )}

          <Lbl>Tipo de resultado</Lbl>
          <div style={{ display:"flex", gap:12, marginBottom:16 }}>
            <label style={{ display:"flex", alignItems:"center", gap:6, fontFamily:FONTS.body, fontSize:13, cursor:"pointer" }}>
              <input type="radio" name="resTipo" checked={tipo==="arquivo"} onChange={()=>setTipo("arquivo")} /> Arquivo (PDF/Excel)
            </label>
            <label style={{ display:"flex", alignItems:"center", gap:6, fontFamily:FONTS.body, fontSize:13, cursor:"pointer" }}>
              <input type="radio" name="resTipo" checked={tipo==="link"} onChange={()=>setTipo("link")} /> Link externo
            </label>
          </div>

          {tipo === "arquivo" ? (
            <div style={{ marginBottom:16 }}>
              <Lbl>Arquivo</Lbl>
              <div
                onClick={()=>inputRef.current?.click()}
                style={{ padding:20, border:`2px dashed ${COLORS.grayLight}`, borderRadius:10, textAlign:"center", cursor:"pointer", background:"#fff" }}
              >
                {file ? (
                  <span style={{ fontFamily:FONTS.body, fontSize:13, color:COLORS.dark }}>{file.name} ({(file.size/1024/1024).toFixed(1)} MB)</span>
                ) : (
                  <span style={{ fontFamily:FONTS.body, fontSize:13, color:COLORS.gray }}>Clique para selecionar PDF ou Excel (máx. 10 MB)</span>
                )}
              </div>
              <input ref={inputRef} type="file" accept=".pdf,.xls,.xlsx,.csv" style={{display:"none"}} onChange={e=>setFile(e.target.files?.[0]||null)} />
            </div>
          ) : (
            <div style={{ marginBottom:16 }}>
              <Lbl>Link do resultado</Lbl>
              <input value={link} onChange={e=>setLink(e.target.value)} placeholder="https://..." style={baseInp()} />
            </div>
          )}

          <div style={{ marginBottom:16 }}>
            <Lbl>Descrição (opcional)</Lbl>
            <textarea value={descricao} onChange={e=>setDescricao(e.target.value)} rows={3} placeholder="Observações sobre o resultado..."
              style={{ ...baseInp(), resize:"vertical", lineHeight:1.5 }} />
          </div>

          {error && <Err msg={error} />}

          <button onClick={handleEnviar} disabled={uploading}
            style={{ padding:"11px 24px", borderRadius:8, border:"none", background:uploading?COLORS.gray:"#0066cc", color:"#fff", cursor:uploading?"wait":"pointer", fontFamily:FONTS.heading, fontSize:13, fontWeight:700, marginTop:8 }}>
            {uploading ? "Enviando..." : "Enviar Resultado"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SolicitacaoDetalhe() {
  const { id }                         = useParams();
  const navigate                       = useNavigate();
  const { organizerId, organizerName } = useOrganizer();

  const [sol,           setSol]           = useState(null);
  const [arquivos,      setArquivos]      = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [pageStatus,    setPageStatus]    = useState("loading");
  const [activeTab,     setActiveTab]     = useState("geral");
  const [sendingStatus, setSendingStatus] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [editOpen,      setEditOpen]      = useState(false);
  const [respostaPendencia, setRespostaPendencia] = useState("");
  const [enviandoResposta, setEnviandoResposta] = useState(false);
  const respostaFileRef = useRef(null);
  const [pendenciaFiles, setPendenciaFiles] = useState([]); // [{ file, descricao }]
  const { pdfModal, openPdf, closePdf } = usePdfModal();

  const load = useCallback(async () => {
    const [sr,ar,mr] = await Promise.all([
      SolicitacoesService.get(id),
      ArquivosService.listBySolicitacao(id),
      MovimentacoesService.listBySolicitacao(id),
    ]);
    if (sr.error || !sr.data || sr.data.organizerId !== organizerId) { setPageStatus("notfound"); return; }
    setSol(sr.data); setArquivos(ar.data||[]); setMovimentacoes(mr.data||[]); setPageStatus("ok");
  },[id,organizerId]);

  useEffect(()=>{ load(); },[load]);

  const handleEnviar = async () => {
    // Validar modalidades antes de enviar
    const ct = sol.camposTecnicos || {};
    const mods = (ct.modalidades || []).filter(m => m.distancia && m.distancia.trim());
    if (mods.length === 0) { alert("Adicione ao menos uma modalidade antes de enviar."); return; }
    const semEstimativa = mods.some(m => !m.estimativaInscritos || Number(m.estimativaInscritos) <= 0);
    if (semEstimativa) { alert("Informe a estimativa de inscritos para todas as modalidades."); return; }
    if (!confirm("Confirmar envio para análise da FMA?")) return;
    setSendingStatus(true);
    await SolicitacoesService.enviar(id,organizerId,organizerName);
    setSendingStatus(false); load();
  };
  const handleDelete = async () => {
    if (!confirm("Excluir este rascunho? Ação irreversível.")) return;
    setDeleting(true);
    // 1. Excluir arquivos anexos do Storage + Firestore
    const arqRes = await ArquivosService.listBySolicitacao(id);
    for (const arq of (arqRes.data || [])) {
      if (arq.storagePath) await deleteFile(arq.storagePath).catch(() => {});
      else if (arq.url?.includes("firebasestorage.googleapis.com")) await deleteFile(arq.url).catch(() => {});
      await ArquivosService.delete(arq.id).catch(() => {});
    }
    // 1b. Limpar pasta inteira no Storage usando o path salvo na solicitação
    if (sol.storagePath) await deleteFolder(sol.storagePath).catch(() => {});
    // 2. Excluir pagamentos do Firestore
    await PagamentosService.deleteBySolicitacao(id).catch(() => {});
    // 3. Excluir movimentações do Firestore
    await MovimentacoesService.deleteBySolicitacao(id).catch(() => {});
    // 4. Excluir a solicitação
    await SolicitacoesService.delete(id);
    navigate("/portal/solicitacoes");
  };

  if (pageStatus==="loading") return <div style={{ padding:60, textAlign:"center", fontFamily:FONTS.body, color:COLORS.gray }}>Carregando...</div>;
  if (pageStatus==="notfound") return <div style={{ padding:60, textAlign:"center" }}><div style={{fontSize:44,marginBottom:12}}>—</div><h2 style={{ fontFamily:FONTS.heading, fontSize:22, color:COLORS.primary, textTransform:"uppercase" }}>Solicitacao nao encontrada</h2><Link to="/portal/solicitacoes" style={{color:"#0066cc"}}>← Voltar</Link></div>;

  const st        = statusMap[sol.status]||{ label:sol.status, color:COLORS.gray, bg:"#f3f4f6", icon:"" };
  const tp        = tipoMap[sol.tipo]||{ label:sol.tipo, icon:"" };
  const canUpload = !["concluida","indeferida"].includes(sol.status);
  const canSend   = sol.status==="rascunho";
  const canDelete = sol.status==="rascunho";
  const canEdit   = sol.status==="rascunho";

  const showResultados = ["aprovada", "concluida"].includes(sol.status);
  const tabs = [
    { id:"geral",     label:"Visao geral",                      icon:"" },
    { id:"arquivos",  label:`Arquivos (${arquivos.length})`,     icon:"" },
    ...(showResultados ? [{ id:"resultados", label:"Resultados", icon:"" }] : []),
    { id:"historico", label:`Historico (${movimentacoes.length})`,icon:"" },
  ];

  return (
    <>
      {editOpen && <EditDrawer sol={sol} organizerId={organizerId} organizerName={organizerName} onClose={()=>setEditOpen(false)} onSaved={()=>{ setEditOpen(false); load(); }}/>}

      <div style={{ padding:"36px 40px 60px", maxWidth:900 }}>
        {/* Breadcrumb */}
        <div style={{ fontFamily:FONTS.body, fontSize:12, color:COLORS.gray, marginBottom:16 }}>
          <Link to="/portal" style={{color:COLORS.gray,textDecoration:"none"}}>Portal</Link>
          {" / "}<Link to="/portal/solicitacoes" style={{color:COLORS.gray,textDecoration:"none"}}>Solicitações</Link>
          {" / "}<span style={{color:COLORS.dark}}>{sol.nomeEvento?.slice(0,40)}…</span>
        </div>

        {/* Banner evento público — P2 */}
        {sol.eventoCalendarioId && <EventoBanner eventoId={sol.eventoCalendarioId}/>}

        {/* Header card */}
        <div style={{ background:"#fff", borderRadius:14, padding:"24px 28px", boxShadow:"0 2px 12px rgba(0,0,0,0.07)", marginBottom:20, borderLeft:`5px solid ${st.color}` }}>
          <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
            <StatusBadge status={sol.status} size="lg"/>
            <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"6px 14px", borderRadius:20, fontSize:12, fontFamily:FONTS.heading, fontWeight:700, background:COLORS.grayLight, color:COLORS.grayDark }}>{tp.icon} {tp.label}</span>
            {sol.protocoloFMA ? (
              <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20, fontSize:13, fontFamily:FONTS.heading, fontWeight:800, background:"#f0fdf4", color:"#15803d", border:"1.5px solid #86efac" }}>{sol.protocoloFMA}</span>
            ) : (
              ["em_analise","pendencia","aprovada","indeferida","concluida"].includes(sol.status)?null:(
                <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20, fontSize:11, fontFamily:FONTS.body, color:"#92400e", background:"#fffbeb", border:"1px dashed #fcd34d" }}>Protocolo pendente</span>
              )
            )}
          </div>
          <h1 style={{ fontFamily:FONTS.heading, fontSize:"clamp(1.3rem,3vw,1.9rem)", fontWeight:900, color:COLORS.dark, margin:"0 0 8px", textTransform:"uppercase", lineHeight:1.2 }}>{sol.nomeEvento}</h1>
          <div style={{ fontFamily:FONTS.body, fontSize:13, color:COLORS.gray, marginBottom:(sol.parecerFMA||sol.parecerPdfUrl||sol.parecerDocs?.length)?16:0 }}>
            {sol.cidadeEvento} · {sol.dataEvento?new Date(sol.dataEvento+"T12:00:00").toLocaleDateString("pt-BR"):"—"} · Criado em {fmtDT(sol.criadoEm)}
          </div>
          {(sol.parecerFMA || sol.parecerPdfUrl || sol.parecerDocs?.length > 0) && (
            <div style={{ background:`${st.color}08`, borderLeft:`3px solid ${st.color}`, borderRadius:"0 8px 8px 0", padding:"12px 16px" }}>
              <div style={{ fontFamily:FONTS.heading, fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:1, color:st.color, marginBottom:4 }}>Manifestacao da FMA</div>
              {sol.parecerFMA && <div style={{ fontFamily:FONTS.body, fontSize:13, color:COLORS.dark, lineHeight:1.6, whiteSpace:"pre-line", marginBottom:(sol.parecerDocs?.length||sol.parecerPdfUrl)?10:0 }}>{sol.parecerFMA}</div>}
              {/* Documentos do parecer (múltiplos) */}
              {(sol.parecerDocs?.length > 0 || sol.parecerPdfUrl) && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {sol.parecerPdfUrl && !sol.parecerDocs?.length && (
                    <button onClick={() => openPdf(sol.parecerPdfUrl, "Parecer FMA")}
                      style={{ padding:"6px 14px", borderRadius:6, border:`1.5px solid ${st.color}`, background:"#fff", color:st.color, cursor:"pointer", fontFamily:FONTS.heading, fontSize:11, fontWeight:700 }}>
                      Ver documento
                    </button>
                  )}
                  {(sol.parecerDocs || []).map((doc, i) => (
                    <button key={i} onClick={() => openPdf(doc.url, doc.nome || `Documento ${i + 1}`)}
                      style={{ padding:"6px 14px", borderRadius:6, border:`1.5px solid ${st.color}`, background:"#fff", color:st.color, cursor:"pointer", fontFamily:FONTS.heading, fontSize:11, fontWeight:700 }}>
                      {doc.nome || `Documento ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Responder pendência */}
          {sol.status === "pendencia" && (
            <div style={{ marginTop:16, padding:"16px 20px", borderRadius:10, background:"#fffbeb", border:"1.5px solid #fde68a" }}>
              <div style={{ fontFamily:FONTS.heading, fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:1, color:"#92400e", marginBottom:8 }}>Responder pendencia</div>
              <textarea value={respostaPendencia} onChange={e => setRespostaPendencia(e.target.value)}
                placeholder="Descreva a correção realizada ou justifique..."
                style={{ width:"100%", padding:"10px 12px", border:`1px solid #fde68a`, borderRadius:8, fontSize:13, fontFamily:FONTS.body, minHeight:80, resize:"vertical", boxSizing:"border-box" }} />

              {/* Upload múltiplo de arquivos */}
              <div style={{ marginTop:12 }}>
                <label style={{ fontSize:11, fontWeight:600, color:"#92400e", display:"block", marginBottom:6 }}>Anexar documentos (opcional)</label>
                <input type="file" ref={respostaFileRef} multiple accept="image/*,.pdf,.doc,.docx"
                  onChange={e => {
                    const novos = [];
                    for (const f of e.target.files) {
                      if (f.size > 5 * 1024 * 1024) continue;
                      const sugestao = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
                      novos.push({ file: f, descricao: sugestao });
                    }
                    if (novos.length) setPendenciaFiles(prev => [...prev, ...novos]);
                    e.target.value = "";
                  }}
                  style={{ fontSize:12 }} />
              </div>

              {pendenciaFiles.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:10 }}>
                  {pendenciaFiles.map((item, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:"#fff", borderRadius:8, border:"1px solid #fde68a" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, color:"#92400e", fontFamily:FONTS.body, marginBottom:3 }}>{item.file.name} — {fmtSize(item.file.size)}</div>
                        <input value={item.descricao}
                          onChange={e => setPendenciaFiles(prev => prev.map((f, idx) => idx === i ? { ...f, descricao: e.target.value } : f))}
                          placeholder="Nome do documento (ex: Alvara corrigido)"
                          style={{ width:"100%", padding:"6px 8px", borderRadius:6, border:`1px solid ${!item.descricao.trim() ? "#fcd34d" : COLORS.grayLight}`, background:!item.descricao.trim()?"#fffbeb":"#fff", fontFamily:FONTS.body, fontSize:12, outline:"none", boxSizing:"border-box" }} />
                      </div>
                      <button onClick={() => setPendenciaFiles(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ padding:"4px 8px", borderRadius:5, border:"1px solid #fca5a5", background:"#fff5f5", color:"#dc2626", cursor:"pointer", fontSize:10, fontWeight:600 }}>Remover</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display:"flex", gap:8, marginTop:12, justifyContent:"flex-end", alignItems:"center" }}>
                {pendenciaFiles.length > 0 && <span style={{ fontFamily:FONTS.body, fontSize:11, color:"#92400e", marginRight:"auto" }}>{pendenciaFiles.length} arquivo(s)</span>}
                <button disabled={enviandoResposta || !respostaPendencia.trim()} onClick={async () => {
                  setEnviandoResposta(true);
                  const sanitize = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 80);
                  const anoR = (sol.dataEvento || "").slice(0, 4) || String(new Date().getFullYear());
                  const folder = sol.storagePath || `solicitacoes/${anoR}/${sanitize(organizerName)}/${sanitize(sol.nomeEvento)}`;
                  const nomesEnviados = [];

                  // Upload de todos os arquivos
                  for (const item of pendenciaFiles) {
                    const ext = item.file.name.includes(".") ? item.file.name.split(".").pop() : "pdf";
                    const descLabel = sanitize(item.descricao || item.file.name.replace(/\.[^.]+$/, ""));
                    const nomeRenomeado = `${descLabel}_${sanitize(sol.nomeEvento)}.${ext}`;
                    const renamedFile = new File([item.file], nomeRenomeado, { type: item.file.type });
                    const { url, path } = await uploadFile(renamedFile, folder);
                    if (url) {
                      await ArquivosService.upload({
                        solicitacaoId: id, nome: nomeRenomeado, tamanho: item.file.size,
                        tipo: item.file.type || "application/octet-stream",
                        descricao: item.descricao || item.file.name,
                        categoria: "complementar", url, storagePath: path,
                        enviadoPor: "organizador", enviadoPorId: organizerId,
                      });
                      nomesEnviados.push(nomeRenomeado);
                    }
                  }

                  await MovimentacoesService.registrar({
                    solicitacaoId: id, tipoEvento: "comentario",
                    statusAnterior: sol.status, statusNovo: sol.status,
                    descricao: respostaPendencia.trim() + (nomesEnviados.length ? `\n\nArquivos: ${nomesEnviados.join(", ")}` : ""),
                    autor: "organizador", autorNome: organizerName, autorId: organizerId, visivel: true,
                  });
                  await SolicitacoesService.changeStatus(id, "em_analise");
                  await SolicitacoesService.update(id, { pendenciaRespondidaEm: new Date().toISOString(), pendenciaResposta: respostaPendencia.trim() });
                  await MovimentacoesService.registrar({
                    solicitacaoId: id, tipoEvento: "enviada",
                    statusAnterior: "pendencia", statusNovo: "em_analise",
                    descricao: `Solicitacao reenviada apos correcao da pendencia.${nomesEnviados.length ? ` ${nomesEnviados.length} arquivo(s) anexado(s).` : ""}`,
                    autor: "organizador", autorNome: organizerName, autorId: organizerId, visivel: true,
                  });
                  notificarFmaPendenciaRespondida({
                    organizadorNome: organizerName,
                    evento: sol.nomeEvento || "",
                    protocolo: sol.protocoloFMA || "",
                    resposta: respostaPendencia.trim(),
                    nomeArquivo: nomesEnviados.join(", "),
                    solicitacaoId: id,
                  }).catch(() => {});
                  setRespostaPendencia(""); setPendenciaFiles([]);
                  if (respostaFileRef.current) respostaFileRef.current.value = "";
                  setEnviandoResposta(false);
                  load();
                }} style={{ padding:"10px 20px", borderRadius:8, border:"none", background:enviandoResposta?COLORS.gray:"#0066cc", color:"#fff", fontFamily:FONTS.heading, fontSize:13, fontWeight:700, cursor:enviandoResposta?"not-allowed":"pointer" }}>
                  {enviandoResposta ? "Enviando..." : "Enviar resposta e reenviar solicitacao"}
                </button>
              </div>
            </div>
          )}

          {/* Ações */}
          <div style={{ display:"flex", gap:10, marginTop:16, flexWrap:"wrap" }}>
            {canSend && <button onClick={handleEnviar} disabled={sendingStatus} style={{ padding:"10px 20px", borderRadius:8, border:"none", background:sendingStatus?COLORS.gray:"#0066cc", color:"#fff", fontFamily:FONTS.heading, fontSize:13, fontWeight:700, cursor:sendingStatus?"not-allowed":"pointer" }}>{sendingStatus?"Enviando...":"Enviar para analise"}</button>}
            {/* P1 — botão editar rascunho */}
            {canEdit && <button onClick={()=>setEditOpen(true)} style={{ padding:"10px 18px", borderRadius:8, border:"1.5px solid #bfdbfe", background:"#eff6ff", color:"#0066cc", fontFamily:FONTS.heading, fontSize:13, fontWeight:700, cursor:"pointer" }}>Editar rascunho</button>}
            {canDelete && <button onClick={handleDelete} disabled={deleting} style={{ padding:"10px 18px", borderRadius:8, border:"1px solid #fca5a5", background:"#fff", color:"#dc2626", fontFamily:FONTS.heading, fontSize:13, fontWeight:700, cursor:deleting?"not-allowed":"pointer" }}>{deleting?"Excluindo...":"Excluir rascunho"}</button>}
          </div>
        </div>

        {/* Abas */}
        <div style={{ display:"flex", background:"#fff", borderRadius:10, border:`1px solid ${COLORS.grayLight}`, overflow:"hidden", marginBottom:20 }}>
          {tabs.map((tab,i)=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{ flex:1, padding:"13px 16px", background:activeTab===tab.id?"#0f172a":"#fff", border:"none", borderRight:i<tabs.length-1?`1px solid ${COLORS.grayLight}`:"none", color:activeTab===tab.id?"#fff":COLORS.gray, fontFamily:FONTS.heading, fontSize:12, fontWeight:700, cursor:"pointer", textTransform:"uppercase", letterSpacing:0.5, transition:"all 0.15s" }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Aba: Visão geral */}
        {activeTab==="geral" && (
          <div style={{ background:"#fff", borderRadius:12, padding:"24px 28px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
            <h3 style={{ fontFamily:FONTS.heading, fontSize:12, fontWeight:800, textTransform:"uppercase", letterSpacing:2, color:COLORS.dark, margin:"0 0 20px", paddingBottom:10, borderBottom:`2px solid ${COLORS.grayLight}` }}>Dados do evento</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
              {[
                { label:"Nome do evento",        value:sol.nomeEvento, full:true },
                { label:"Tipo de solicitação",   value:`${tp.icon} ${tp.label}` },
                { label:"Data do evento",         value:sol.dataEvento?new Date(sol.dataEvento+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}):"—" },
                { label:"Cidade",                 value:sol.cidadeEvento||"—" },
                { label:"Local de realização",    value:sol.localEvento||"—", full:true },
              ].map((f,i)=>(
                <div key={i} style={{ gridColumn:f.full?"1/-1":undefined }}>
                  <div style={{ fontFamily:FONTS.heading, fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:1.5, color:COLORS.gray, marginBottom:5 }}>{f.label}</div>
                  <div style={{ fontFamily:FONTS.body, fontSize:14, color:COLORS.dark }}>{f.value}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:28}}>
              <div style={{ fontFamily:FONTS.heading, fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:1.5, color:COLORS.gray, marginBottom:12 }}>Ciclo de vida</div>
              <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                {[{label:"Criada em",val:sol.criadoEm},{label:"Enviada em",val:sol.enviadoEm},{label:"Em análise desde",val:sol.analisadoEm},{label:"Encerrada em",val:sol.encerradoEm}].filter(d=>d.val).map(d=>(
                  <div key={d.label} style={{ padding:"8px 14px", background:COLORS.offWhite, borderRadius:8, border:`1px solid ${COLORS.grayLight}` }}>
                    <div style={{ fontFamily:FONTS.heading, fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:1, color:COLORS.gray }}>{d.label}</div>
                    <div style={{ fontFamily:FONTS.body, fontSize:12, color:COLORS.dark, marginTop:2 }}>{fmtDT(d.val)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Taxas e Pagamento ── */}
            {sol.taxas && sol.taxas.total > 0 && (
              <TaxasPagamentoSection sol={sol} />
            )}
          </div>
        )}

        {/* Aba: Arquivos */}
        {activeTab==="arquivos" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {canUpload && <ArquivoUploader solicitacaoId={id} organizerId={organizerId} organizerName={organizerName} nomeEvento={sol.nomeEvento} dataEvento={sol.dataEvento} onUploaded={load}/>}
            {arquivos.length===0 ? (
              <div style={{ background:"#fff", borderRadius:12, padding:"40px 24px", textAlign:"center", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
                <div style={{fontSize:40,marginBottom:10}}>—</div>
                <div style={{ fontFamily:FONTS.heading, fontSize:16, fontWeight:800, textTransform:"uppercase", color:COLORS.dark }}>Nenhum arquivo enviado</div>
                <p style={{ fontFamily:FONTS.body, fontSize:13, color:COLORS.gray, marginTop:6 }}>{canUpload?"Use o formulário acima para enviar documentos.":"Não há arquivos nesta solicitação."}</p>
              </div>
            ) : (
              <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden" }}>
                <div style={{ padding:"16px 20px", borderBottom:`1px solid ${COLORS.grayLight}`, fontFamily:FONTS.heading, fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:1.5, color:COLORS.dark }}>{arquivos.length} arquivo{arquivos.length>1?"s":""}</div>
                {arquivos.map((arq,i)=>{
                  const cat=arquivoCatMap[arq.categoria]||{label:arq.categoria,icon:"",color:COLORS.gray};
                  const isFMA=arq.enviadoPor==="fma";
                  return (
                    <div key={arq.id} style={{ padding:"14px 20px", background:isFMA?"#eff6ff":"#fff", borderBottom:i<arquivos.length-1?`1px solid ${COLORS.grayLight}`:"none", display:"flex", justifyContent:"space-between", alignItems:"center", gap:16 }}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                          <span style={{fontSize:20}}>{arq.tipo?.includes("pdf")?"":arq.tipo?.includes("image")?"":""}</span>
                          <span style={{ fontFamily:FONTS.heading, fontSize:13, fontWeight:700, color:COLORS.dark, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{arq.nome}</span>
                          <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontFamily:FONTS.heading, fontWeight:700, background:`${cat.color}15`, color:cat.color }}>{cat.icon} {cat.label}</span>
                          {isFMA&&<span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontFamily:FONTS.heading, fontWeight:700, background:"#eff6ff", color:"#0066cc" }}>FMA</span>}
                        </div>
                        <div style={{ fontFamily:FONTS.body, fontSize:12, color:COLORS.gray, paddingLeft:28 }}>{arq.descricao} · {fmtSize(arq.tamanho)} · {fmtDT(arq.uploadedAt)}</div>
                      </div>
                      <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                        {(arq.dataUrl||arq.url) && arq.tipo?.includes("pdf") ? (
                          <button onClick={()=>openPdf(arq.dataUrl||arq.url, arq.nome)}
                            style={{ padding:"6px 14px", borderRadius:7, background:"#0066cc", color:"#fff", border:"none", fontFamily:FONTS.heading, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                            Visualizar
                          </button>
                        ) : (arq.dataUrl||arq.url) ? (
                          <a href={arq.dataUrl||arq.url} download={arq.nome} target="_blank" rel="noreferrer" style={{ padding:"6px 14px", borderRadius:7, background:"#0066cc", color:"#fff", fontFamily:FONTS.heading, fontSize:11, fontWeight:700, textDecoration:"none" }}>Baixar</a>
                        ) : null}
                        {!isFMA&&canDelete&&<button onClick={async()=>{ if(!confirm(`Remover "${arq.nome}"?`))return; await ArquivosService.delete(arq.id); load(); }} style={{ padding:"6px 10px", borderRadius:7, border:"1px solid #fca5a5", background:"#fff", color:"#dc2626", fontFamily:FONTS.heading, fontSize:11, fontWeight:700, cursor:"pointer" }}>✕</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Aba: Resultados */}
        {activeTab==="resultados" && showResultados && (
          <ResultadosTab sol={sol} organizerId={organizerId} organizerName={organizerName} onUpdated={load} />
        )}

        {/* Aba: Histórico */}
        {activeTab==="historico" && (
          <div style={{ background:"#fff", borderRadius:12, padding:"24px 28px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
            {movimentacoes.length===0 ? (
              <div style={{ textAlign:"center", padding:"30px 0" }}>
                <div style={{fontSize:36,marginBottom:10}}>—</div>
                <div style={{ fontFamily:FONTS.heading, fontSize:14, fontWeight:800, textTransform:"uppercase", color:COLORS.dark }}>Nenhuma movimentação</div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column"}}>
                {movimentacoes.map((mov,i)=><TimelineItem key={mov.id} mov={mov} isLast={i===movimentacoes.length-1}/>)}
              </div>
            )}
          </div>
        )}
      </div>
      <PdfModal url={pdfModal.url} title={pdfModal.title} onClose={closePdf} />
    </>
  );
}
