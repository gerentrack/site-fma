/**
 * EnvioDocumentosAdmin.jsx — Envio direcionado de documentos a árbitros.
 * Rota: /admin/envio-documentos
 */
import { useState, useEffect, useRef } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { COLORS, FONTS } from "../../styles/colors";
import { EnvioDocumentosService, RefereesService } from "../../services/index";
import { uploadFile } from "../../services/storageService";

export default function EnvioDocumentosAdmin() {
  const [envios, setEnvios] = useState([]);
  const [arbitros, setArbitros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" | "form" | "detail"
  const [detail, setDetail] = useState(null);

  // form state
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("todos"); // "todos" | "nivel" | "individual"
  const [niveis, setNiveis] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [formMsg, setFormMsg] = useState("");
  const fileRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    const [eRes, rRes] = await Promise.all([
      EnvioDocumentosService.list(),
      RefereesService.list(),
    ]);
    setEnvios(eRes.data || []);
    setArbitros((rRes.data || []).filter(r => r.status === "ativo" && r.profileComplete));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setTitulo(""); setDescricao(""); setTipo("todos");
    setNiveis([]); setSelectedIds([]); setFormMsg("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSend = async () => {
    if (!titulo.trim()) { setFormMsg("Informe o titulo."); return; }
    const file = fileRef.current?.files?.[0];
    if (!file) { setFormMsg("Selecione um arquivo."); return; }

    setSending(true); setFormMsg("");
    const upload = await uploadFile(file, "envio-documentos");
    if (upload.error) { setFormMsg(`Erro no upload: ${upload.error}`); setSending(false); return; }

    // Resolver destinatários
    let destIds = [];
    let destNomes = [];
    if (tipo === "todos") {
      destIds = arbitros.map(a => a.id);
      destNomes = ["Todos os arbitros ativos"];
    } else if (tipo === "nivel") {
      const filtrados = arbitros.filter(a => niveis.includes(a.nivel));
      destIds = filtrados.map(a => a.id);
      destNomes = niveis.map(n => `Nivel ${n}`);
    } else {
      destIds = selectedIds;
      destNomes = arbitros.filter(a => selectedIds.includes(a.id)).map(a => a.name);
    }

    await EnvioDocumentosService.create({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      fileUrl: upload.url,
      filePath: upload.path,
      fileName: file.name,
      enviadoPor: "Admin",
      destinatariosTipo: tipo,
      destinatariosNiveis: tipo === "nivel" ? niveis : [],
      destinatariosIds: destIds,
      destinatariosNomes: destNomes,
      leituras: {},
    });

    setSending(false);
    resetForm();
    setView("list");
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir este envio?")) return;
    await EnvioDocumentosService.delete(id);
    fetchData();
    if (detail?.id === id) { setDetail(null); setView("list"); }
  };

  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 20 };
  const inp = { width: "100%", padding: "8px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 14, fontFamily: FONTS.body, boxSizing: "border-box" };
  const lbl = { display: "block", fontWeight: 600, fontSize: 12, marginBottom: 4, color: COLORS.grayDark, textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <AdminLayout title="Envio de Documentos">
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* ── Listagem ── */}
        {view === "list" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray }}>{envios.length} envio(s) registrado(s)</div>
              <button onClick={() => { resetForm(); setView("form"); }}
                style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Novo Envio
              </button>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: COLORS.gray }}>Carregando...</div>
            ) : envios.length === 0 ? (
              <div style={{ ...card, textAlign: "center", color: COLORS.gray, fontSize: 14 }}>Nenhum documento enviado ainda.</div>
            ) : (
              envios.map(e => {
                const totalDest = (e.destinatariosIds || []).length;
                const totalLido = Object.keys(e.leituras || {}).length;
                return (
                  <div key={e.id} style={{ ...card, cursor: "pointer", transition: "box-shadow 0.15s" }}
                    onClick={() => { setDetail(e); setView("detail"); }}
                    onMouseEnter={ev => ev.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"}
                    onMouseLeave={ev => ev.currentTarget.style.boxShadow = "0 1px 8px rgba(0,0,0,0.07)"}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.dark }}>{e.titulo}</div>
                        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
                          {new Date(e.createdAt).toLocaleDateString("pt-BR")} — {e.fileName || "arquivo"}
                        </div>
                        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
                          Dest: {e.destinatariosTipo === "todos" ? "Todos" : (e.destinatariosNomes || []).join(", ")}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{
                          padding: "3px 10px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700,
                          color: totalLido === totalDest && totalDest > 0 ? "#15803d" : "#d97706",
                          background: totalLido === totalDest && totalDest > 0 ? "#f0fdf4" : "#fffbeb",
                        }}>
                          {totalLido}/{totalDest} lidos
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ── Formulário de envio ── */}
        {view === "form" && (
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 800, color: COLORS.dark, margin: 0 }}>Novo Envio de Documento</h3>
              <button onClick={() => setView("list")} style={{ background: "none", border: "none", color: COLORS.gray, cursor: "pointer", fontSize: 13 }}>Cancelar</button>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <span style={lbl}>Titulo *</span>
                <input style={inp} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Convocacao Campeonato Estadual" />
              </div>
              <div>
                <span style={lbl}>Descricao</span>
                <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descricao breve (opcional)" />
              </div>
              <div>
                <span style={lbl}>Arquivo *</span>
                <input type="file" ref={fileRef} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" style={{ fontSize: 13 }} />
              </div>

              {/* Destinatários */}
              <div>
                <span style={lbl}>Destinatarios</span>
                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                  {[
                    { value: "todos", label: "Todos os ativos" },
                    { value: "nivel", label: "Por nivel" },
                    { value: "individual", label: "Selecionar arbitros" },
                  ].map(opt => (
                    <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                      <input type="radio" name="tipo" value={opt.value} checked={tipo === opt.value}
                        onChange={() => setTipo(opt.value)} style={{ accentColor: COLORS.primary }} />
                      {opt.label}
                    </label>
                  ))}
                </div>

                {tipo === "nivel" && (
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {["A", "B", "C", "NI"].map(n => (
                      <label key={n} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                        <input type="checkbox" checked={niveis.includes(n)}
                          onChange={e => setNiveis(prev => e.target.checked ? [...prev, n] : prev.filter(x => x !== n))}
                          style={{ accentColor: COLORS.primary }} />
                        Nivel {n}
                      </label>
                    ))}
                  </div>
                )}

                {tipo === "individual" && (
                  <div style={{ maxHeight: 220, overflow: "auto", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, padding: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: COLORS.gray }}>
                      <span>{selectedIds.length} selecionado(s)</span>
                      <button onClick={() => setSelectedIds(selectedIds.length === arbitros.length ? [] : arbitros.map(a => a.id))}
                        style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                        {selectedIds.length === arbitros.length ? "Desmarcar todos" : "Selecionar todos"}
                      </button>
                    </div>
                    {arbitros.map(a => (
                      <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", cursor: "pointer", fontSize: 13, borderBottom: `1px solid ${COLORS.grayLight}` }}>
                        <input type="checkbox" checked={selectedIds.includes(a.id)}
                          onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, a.id] : prev.filter(x => x !== a.id))}
                          style={{ accentColor: COLORS.primary }} />
                        <span style={{ fontWeight: 500 }}>{a.name}</span>
                        <span style={{ fontSize: 11, color: COLORS.gray, marginLeft: "auto" }}>{a.nivel || "—"}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {formMsg && (
              <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>{formMsg}</div>
            )}

            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleSend} disabled={sending}
                style={{
                  padding: "10px 28px", borderRadius: 8, border: "none",
                  background: sending ? COLORS.gray : COLORS.primary, color: "#fff",
                  fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700,
                  cursor: sending ? "not-allowed" : "pointer",
                }}>{sending ? "Enviando..." : "Enviar Documento"}</button>
            </div>
          </div>
        )}

        {/* ── Detalhe com leituras ── */}
        {view === "detail" && detail && (
          <div>
            <button onClick={() => { setDetail(null); setView("list"); }}
              style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              Voltar a lista
            </button>

            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 800, color: COLORS.dark, margin: "0 0 4px" }}>{detail.titulo}</h3>
                  {detail.descricao && <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 8px" }}>{detail.descricao}</p>}
                  <div style={{ fontSize: 12, color: COLORS.gray }}>
                    Enviado em {new Date(detail.createdAt).toLocaleDateString("pt-BR")} por {detail.enviadoPor}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {detail.fileUrl && (
                    <a href={detail.fileUrl} target="_blank" rel="noreferrer"
                      style={{ padding: "6px 14px", borderRadius: 6, background: COLORS.primary, color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                      Baixar
                    </a>
                  )}
                  <button onClick={() => handleDelete(detail.id)}
                    style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid #dc2626`, background: "transparent", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Excluir
                  </button>
                </div>
              </div>
            </div>

            {/* Controle de leitura */}
            <div style={card}>
              <h4 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, margin: "0 0 12px" }}>
                Controle de Leitura
              </h4>
              <div style={{ fontSize: 13, color: COLORS.gray, marginBottom: 12 }}>
                {Object.keys(detail.leituras || {}).length} de {(detail.destinatariosIds || []).length} leram
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: COLORS.offWhite }}>
                    <th style={thS}>Arbitro</th>
                    <th style={thS}>Status</th>
                    <th style={thS}>Lido em</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.destinatariosIds || []).map(id => {
                    const ref = arbitros.find(a => a.id === id);
                    const leitura = (detail.leituras || {})[id];
                    return (
                      <tr key={id} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                        <td style={tdS}>{ref?.name || id}</td>
                        <td style={tdS}>
                          <span style={{
                            padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                            color: leitura ? "#15803d" : "#d97706",
                            background: leitura ? "#f0fdf4" : "#fffbeb",
                          }}>{leitura ? "Lido" : "Nao lido"}</span>
                        </td>
                        <td style={tdS}>{leitura ? new Date(leitura.lidoEm).toLocaleDateString("pt-BR") : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

const thS = { textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 700, color: COLORS.grayDark, textTransform: "uppercase" };
const tdS = { padding: "8px 12px", fontSize: 13, fontFamily: FONTS.body };
