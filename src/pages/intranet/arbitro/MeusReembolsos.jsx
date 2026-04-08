/**
 * MeusReembolsos.jsx — Envio de notas fiscais para reembolso.
 * Rota: /intranet/reembolsos
 */
import { useState, useEffect, useRef } from "react";
import IntranetLayout from "../IntranetLayout";
import { useIntranet } from "../../../context/IntranetContext";
import { ReembolsosService, RefereeAssignmentsService } from "../../../services/index";
import { uploadFile } from "../../../services/storageService";
import { COLORS, FONTS } from "../../../styles/colors";
import { REFEREE_FUNCTIONS } from "../../../config/navigation";

const fnMap = Object.fromEntries((REFEREE_FUNCTIONS || []).map(f => [f.value, f.label]));
const CATEGORIAS = [
  { value: "transporte", label: "Transporte" },
  { value: "hospedagem", label: "Hospedagem" },
  { value: "alimentacao", label: "Alimentacao" },
  { value: "outro", label: "Outro" },
];
const STATUS_STYLE = {
  pendente: { label: "Pendente", color: "#d97706", bg: "#fffbeb" },
  aprovado: { label: "Aprovado", color: "#15803d", bg: "#f0fdf4" },
  aprovado_parcial: { label: "Aprovado parcial", color: "#0066cc", bg: "#eff6ff" },
  rejeitado: { label: "Rejeitado", color: "#dc2626", bg: "#fef2f2" },
};

function fmt(v) { return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function MeusReembolsos() {
  const { refereeId, name } = useIntranet();
  const [reembolsos, setReembolsos] = useState([]);
  const [escalacoes, setEscalacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selAssignment, setSelAssignment] = useState("");
  const [categoria, setCategoria] = useState("transporte");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    const [rRes, aRes] = await Promise.all([
      ReembolsosService.list({ refereeId }),
      RefereeAssignmentsService.getByReferee(refereeId),
    ]);
    setReembolsos(rRes.data || []);
    // Apenas escalações de hoje ou passadas (com evento válido)
    const passadas = (aRes.data || []).filter(a => a.event && a.event.date <= new Date().toISOString().slice(0, 10));
    setEscalacoes(passadas);
    setLoading(false);
  };

  useEffect(() => { if (refereeId) fetchData(); }, [refereeId]);

  const handleSend = async () => {
    if (!selAssignment) { setMsg("Selecione a escalacao."); return; }
    if (!valor || Number(valor) <= 0) { setMsg("Informe o valor."); return; }
    const file = fileRef.current?.files?.[0];
    if (!file) { setMsg("Anexe a foto/PDF da nota fiscal."); return; }
    if (file.size > 2 * 1024 * 1024) { setMsg("Arquivo deve ter no maximo 2MB."); return; }

    setSending(true); setMsg("");
    const upload = await uploadFile(file, `reembolsos/${refereeId}`);
    if (upload.error) { setMsg(`Erro no upload: ${upload.error}`); setSending(false); return; }

    const asgn = escalacoes.find(a => a.id === selAssignment);
    await ReembolsosService.create({
      assignmentId: selAssignment,
      eventId: asgn?.eventId || "",
      refereeId,
      refereeName: name,
      eventTitle: asgn?.event?.title || "",
      eventDate: asgn?.event?.date || "",
      categoria,
      descricao: descricao.trim(),
      valor: Number(valor),
      notaUrl: upload.url,
      notaPath: upload.path,
      status: "pendente",
    });

    setSending(false);
    setShowForm(false);
    setSelAssignment(""); setCategoria("transporte"); setDescricao(""); setValor("");
    if (fileRef.current) fileRef.current.value = "";
    fetchData();
  };

  const totalAprovado = reembolsos.filter(r => r.status === "aprovado" || r.status === "aprovado_parcial").reduce((s, r) => s + ((r.valorAprovado ?? r.valor) || 0), 0);
  const totalPendente = reembolsos.filter(r => r.status === "pendente").reduce((s, r) => s + (r.valor || 0), 0);

  const card = { background: "#fff", borderRadius: 12, padding: "18px 22px", marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" };
  const inp = { width: "100%", padding: "8px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 14, fontFamily: FONTS.body, boxSizing: "border-box" };
  const lbl = { display: "block", fontWeight: 600, fontSize: 11, marginBottom: 4, color: COLORS.grayDark, textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <IntranetLayout>
      <div style={{ padding: 36, maxWidth: 750, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: 0 }}>Meus Reembolsos</h1>
            <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "4px 0 0" }}>Envie notas fiscais para reembolso de despesas.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {showForm ? "Cancelar" : "Enviar Nota"}
          </button>
        </div>

        {/* Resumo */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ ...card, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 900, color: "#15803d" }}>{fmt(totalAprovado)}</div>
            <div style={{ fontSize: 11, color: COLORS.gray }}>Aprovado</div>
          </div>
          <div style={{ ...card, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 900, color: "#d97706" }}>{fmt(totalPendente)}</div>
            <div style={{ fontSize: 11, color: COLORS.gray }}>Pendente</div>
          </div>
          <div style={{ ...card, textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 900, color: COLORS.dark }}>{reembolsos.length}</div>
            <div style={{ fontSize: 11, color: COLORS.gray }}>Notas enviadas</div>
          </div>
        </div>

        {/* Formulário */}
        {showForm && (
          <div style={{ ...card, border: `2px solid ${COLORS.primary}` }}>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <span style={lbl}>Escalacao *</span>
                <select style={inp} value={selAssignment} onChange={e => setSelAssignment(e.target.value)}>
                  <option value="">Selecione o evento...</option>
                  {escalacoes.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.event?.title} — {a.event?.date ? new Date(a.event.date + "T12:00:00").toLocaleDateString("pt-BR") : ""} ({fnMap[a.refereeFunction] || a.refereeFunction})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={lbl}>Categoria *</span>
                  <select style={inp} value={categoria} onChange={e => setCategoria(e.target.value)}>
                    {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <span style={lbl}>Valor (R$) *</span>
                  <input type="number" min="0" step="0.01" style={inp} value={valor} onChange={e => setValor(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div>
                <span style={lbl}>Descricao</span>
                <input style={inp} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Uber aeroporto-estadio" />
              </div>
              <div>
                <span style={lbl}>Nota fiscal (foto ou PDF, max 2MB) *</span>
                <input type="file" ref={fileRef} accept="image/*,.pdf" style={{ fontSize: 13 }} />
              </div>
            </div>
            {msg && <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>{msg}</div>}
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleSend} disabled={sending}
                style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: sending ? COLORS.gray : COLORS.primary, color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer" }}>
                {sending ? "Enviando..." : "Enviar Nota"}
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.gray }}>Carregando...</div>
        ) : reembolsos.length === 0 ? (
          <div style={{ ...card, textAlign: "center", color: COLORS.gray, fontSize: 14 }}>Nenhuma nota enviada.</div>
        ) : reembolsos.map(r => {
          const st = STATUS_STYLE[r.status] || STATUS_STYLE.pendente;
          return (
            <div key={r.id} style={{ ...card, borderLeft: `4px solid ${st.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, color: COLORS.dark }}>
                    {CATEGORIAS.find(c => c.value === r.categoria)?.label || r.categoria} — {fmt(r.valor)}
                  </div>
                  {r.descricao && <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginTop: 2 }}>{r.descricao}</div>}
                  <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 4 }}>
                    {r.eventTitle} — {r.eventDate ? new Date(r.eventDate + "T12:00:00").toLocaleDateString("pt-BR") : ""}
                  </div>
                  {r.status === "aprovado_parcial" && r.valorAprovado != null && (
                    <div style={{ marginTop: 6, padding: "6px 10px", borderRadius: 6, background: "#eff6ff", fontSize: 12, color: "#0066cc" }}>
                      Valor aprovado: {fmt(r.valorAprovado)} (solicitado: {fmt(r.valor)})
                    </div>
                  )}
                  {r.status === "rejeitado" && r.motivoRejeicao && (
                    <div style={{ marginTop: 6, padding: "6px 10px", borderRadius: 6, background: "#fef2f2", fontSize: 12, color: "#dc2626" }}>
                      Motivo: {r.motivoRejeicao}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700, color: st.color, background: st.bg }}>{st.label}</span>
                  {r.notaUrl && (
                    <a href={r.notaUrl} target="_blank" rel="noreferrer"
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: COLORS.offWhite, color: COLORS.primary, textDecoration: "none" }}>Ver nota</a>
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
