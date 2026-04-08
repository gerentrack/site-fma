/**
 * MeusDocumentosRecebidos.jsx — Hub de Mensagens da intranet.
 * Rota: /intranet/mensagens
 * Abas: Recebidos | Nova Mensagem | Enviados
 * Acessível por todos os perfis (admin, coordenador, árbitro).
 */
import { useState, useEffect, useRef } from "react";
import IntranetLayout from "../IntranetLayout";
import { useIntranet } from "../../../context/IntranetContext";
import { EnvioDocumentosService, RefereesService } from "../../../services/index";
import { uploadFile } from "../../../services/storageService";
import { COLORS, FONTS } from "../../../styles/colors";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

function Tab({ label, active, badge, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "10px 20px", borderRadius: "8px 8px 0 0", border: "none",
      background: active ? "#fff" : "transparent",
      color: active ? COLORS.primary : COLORS.gray,
      fontFamily: FONTS.heading, fontSize: 13, fontWeight: active ? 800 : 600,
      cursor: "pointer", position: "relative",
      boxShadow: active ? "0 -2px 8px rgba(0,0,0,0.06)" : "none",
    }}>
      {label}
      {badge > 0 && (
        <span style={{
          marginLeft: 6, padding: "1px 7px", borderRadius: 10, fontSize: 10,
          fontWeight: 800, color: "#fff", background: "#d97706",
        }}>{badge}</span>
      )}
    </button>
  );
}

export default function MeusDocumentosRecebidos() {
  const { refereeId, name, role, canManage } = useIntranet();
  const [tab, setTab] = useState("recebidos");
  const [recebidos, setRecebidos] = useState([]);
  const [enviados, setEnviados] = useState([]);
  const [arbitros, setArbitros] = useState([]);
  const [nivel, setNivel] = useState("");
  const [loading, setLoading] = useState(true);

  // form
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [anexoTipo, setAnexoTipo] = useState(""); // "" | "upload" | "link"
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [destTipo, setDestTipo] = useState("individual");
  const [destNiveis, setDestNiveis] = useState([]);
  const [destIds, setDestIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [formMsg, setFormMsg] = useState("");
  const fileRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    const refRes = await RefereesService.get(refereeId);
    const nv = refRes.data?.nivel || "";
    setNivel(nv);
    const [rRes, eRes, aRes] = await Promise.all([
      EnvioDocumentosService.listByReferee(refereeId, nv),
      EnvioDocumentosService.listEnviados(refereeId),
      RefereesService.list(),
    ]);
    setRecebidos((rRes.data || []).filter(d => d.remetenteId !== refereeId));
    setEnviados(eRes.data || []);
    setArbitros((aRes.data || []).filter(r => r.status === "ativo" && r.id !== refereeId));
    setLoading(false);
  };

  useEffect(() => { if (refereeId) fetchData(); }, [refereeId]);

  const handleMarcarLido = async (docId) => {
    await EnvioDocumentosService.marcarLido(docId, refereeId, name);
    setRecebidos(prev => prev.map(d =>
      d.id === docId
        ? { ...d, leituras: { ...d.leituras, [refereeId]: { lidoEm: new Date().toISOString(), nome: name } } }
        : d
    ));
  };

  const resetForm = () => {
    setTitulo(""); setDescricao(""); setAnexoTipo("");
    setLinkUrl(""); setLinkLabel("");
    setDestTipo("individual"); setDestNiveis([]); setDestIds([]);
    setFormMsg("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSend = async () => {
    if (!titulo.trim()) { setFormMsg("Informe o assunto."); return; }

    let fileUrl = "", filePath = "", fileName = "";

    if (anexoTipo === "upload") {
      const file = fileRef.current?.files?.[0];
      if (!file) { setFormMsg("Selecione um arquivo."); return; }
      if (file.size > MAX_FILE_SIZE) { setFormMsg("Arquivo excede o limite de 2MB."); return; }
      setSending(true); setFormMsg("");
      const r = await uploadFile(file, "mensagens");
      if (r.error) { setFormMsg(`Erro no upload: ${r.error}`); setSending(false); return; }
      fileUrl = r.url; filePath = r.path; fileName = file.name;
    } else if (anexoTipo === "link") {
      if (!linkUrl.trim()) { setFormMsg("Informe o link do documento."); return; }
      fileUrl = linkUrl.trim();
      fileName = linkLabel.trim() || "Documento vinculado";
    }

    setSending(true); setFormMsg("");

    let ids = [], nomes = [];
    if (destTipo === "todos") {
      ids = arbitros.map(a => a.id);
      nomes = ["Todos"];
    } else if (destTipo === "nivel") {
      const f = arbitros.filter(a => destNiveis.includes(a.nivel));
      ids = f.map(a => a.id); nomes = destNiveis.map(n => `Nivel ${n}`);
    } else {
      ids = destIds;
      nomes = arbitros.filter(a => destIds.includes(a.id)).map(a => a.name);
    }

    if (ids.length === 0) { setFormMsg("Selecione ao menos um destinatario."); setSending(false); return; }

    await EnvioDocumentosService.create({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      anexoTipo: anexoTipo || "",
      fileUrl, filePath, fileName,
      remetenteId: refereeId,
      remetenteNome: name,
      remetenteRole: role || "arbitro",
      destinatariosTipo: destTipo,
      destinatariosNiveis: destTipo === "nivel" ? destNiveis : [],
      destinatariosIds: ids,
      destinatariosNomes: nomes,
      leituras: {},
    });

    setSending(false);
    resetForm();
    setTab("enviados");
    fetchData();
  };

  const naoLidos = recebidos.filter(d => !(d.leituras || {})[refereeId]).length;

  const card = { background: "#fff", borderRadius: 12, padding: "18px 22px", marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" };
  const inp = { width: "100%", padding: "8px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 14, fontFamily: FONTS.body, boxSizing: "border-box" };
  const lbl = { display: "block", fontWeight: 600, fontSize: 11, marginBottom: 4, color: COLORS.grayDark, textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <IntranetLayout>
      <div style={{ padding: 36, maxWidth: 780, margin: "0 auto" }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 20px" }}>
          Mensagens
        </h1>

        {/* Abas */}
        <div style={{ display: "flex", gap: 2, borderBottom: `2px solid ${COLORS.grayLight}`, marginBottom: 0 }}>
          <Tab label="Recebidos" active={tab === "recebidos"} badge={naoLidos} onClick={() => setTab("recebidos")} />
          <Tab label="Nova Mensagem" active={tab === "nova"} badge={0} onClick={() => setTab("nova")} />
          <Tab label="Enviados" active={tab === "enviados"} badge={0} onClick={() => setTab("enviados")} />
        </div>

        <div style={{ background: "#fff", borderRadius: "0 0 12px 12px", padding: "24px 22px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", minHeight: 200 }}>

          {loading && <div style={{ padding: 24, textAlign: "center", color: COLORS.gray }}>Carregando...</div>}

          {/* ── Recebidos ── */}
          {!loading && tab === "recebidos" && (
            recebidos.length === 0 ? (
              <div style={{ textAlign: "center", color: COLORS.gray, fontSize: 14, padding: 24 }}>Nenhuma mensagem recebida.</div>
            ) : recebidos.map(doc => {
              const leitura = (doc.leituras || {})[refereeId];
              const isNovo = !leitura;
              return (
                <div key={doc.id} style={{ ...card, borderLeft: isNovo ? "4px solid #d97706" : `4px solid ${COLORS.grayLight}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.dark }}>{doc.titulo}</span>
                        {isNovo && <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 800, color: "#d97706", background: "#fffbeb", textTransform: "uppercase" }}>NOVO</span>}
                      </div>
                      {doc.descricao && <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "4px 0 0" }}>{doc.descricao}</p>}
                      <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 6 }}>
                        De: <strong>{doc.remetenteNome || "Admin"}</strong> — {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                        {doc.fileName && ` — ${doc.fileName}`}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                      {doc.fileUrl && (
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                          style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: COLORS.primary, color: "#fff", textDecoration: "none" }}>
                          {doc.anexoTipo === "link" ? "Abrir" : "Baixar"}
                        </a>
                      )}
                      {isNovo && (
                        <button onClick={() => handleMarcarLido(doc.id)}
                          style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid #15803d", background: "transparent", color: "#15803d", cursor: "pointer" }}>
                          Marcar como lido
                        </button>
                      )}
                    </div>
                  </div>
                  {leitura && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: "#15803d", marginTop: 6 }}>Lido em {new Date(leitura.lidoEm).toLocaleDateString("pt-BR")}</div>}
                </div>
              );
            })
          )}

          {/* ── Nova Mensagem ── */}
          {!loading && tab === "nova" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <span style={lbl}>Assunto *</span>
                <input style={inp} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Assunto da mensagem" />
              </div>
              <div>
                <span style={lbl}>Mensagem</span>
                <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Conteudo da mensagem (opcional)" />
              </div>

              {/* Anexo */}
              <div>
                <span style={lbl}>Anexo</span>
                <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                  {[
                    { value: "", label: "Sem anexo" },
                    { value: "upload", label: "Enviar arquivo (max 2MB)" },
                    { value: "link", label: "Link de documento" },
                  ].map(opt => (
                    <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                      <input type="radio" name="anexo" value={opt.value} checked={anexoTipo === opt.value}
                        onChange={() => setAnexoTipo(opt.value)} style={{ accentColor: COLORS.primary }} />
                      {opt.label}
                    </label>
                  ))}
                </div>
                {anexoTipo === "upload" && (
                  <input type="file" ref={fileRef} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" style={{ fontSize: 13 }} />
                )}
                {anexoTipo === "link" && (
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
                    <input style={inp} value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." />
                    <input style={inp} value={linkLabel} onChange={e => setLinkLabel(e.target.value)} placeholder="Nome do documento" />
                  </div>
                )}
              </div>

              {/* Destinatários */}
              <div>
                <span style={lbl}>Destinatarios *</span>
                <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                  {[
                    { value: "todos", label: "Todos" },
                    { value: "nivel", label: "Por nivel" },
                    { value: "individual", label: "Selecionar" },
                  ].map(opt => (
                    <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                      <input type="radio" name="dest" value={opt.value} checked={destTipo === opt.value}
                        onChange={() => setDestTipo(opt.value)} style={{ accentColor: COLORS.primary }} />
                      {opt.label}
                    </label>
                  ))}
                </div>

                {destTipo === "nivel" && (
                  <div style={{ display: "flex", gap: 12 }}>
                    {["A", "B", "C", "NI"].map(n => (
                      <label key={n} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                        <input type="checkbox" checked={destNiveis.includes(n)}
                          onChange={e => setDestNiveis(prev => e.target.checked ? [...prev, n] : prev.filter(x => x !== n))}
                          style={{ accentColor: COLORS.primary }} />
                        Nivel {n}
                      </label>
                    ))}
                  </div>
                )}

                {destTipo === "individual" && (
                  <div style={{ maxHeight: 200, overflow: "auto", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, padding: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11, color: COLORS.gray }}>
                      <span>{destIds.length} selecionado(s)</span>
                      <button onClick={() => setDestIds(destIds.length === arbitros.length ? [] : arbitros.map(a => a.id))}
                        style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                        {destIds.length === arbitros.length ? "Desmarcar todos" : "Selecionar todos"}
                      </button>
                    </div>
                    {arbitros.map(a => (
                      <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", cursor: "pointer", fontSize: 13, borderBottom: `1px solid ${COLORS.grayLight}` }}>
                        <input type="checkbox" checked={destIds.includes(a.id)}
                          onChange={e => setDestIds(prev => e.target.checked ? [...prev, a.id] : prev.filter(x => x !== a.id))}
                          style={{ accentColor: COLORS.primary }} />
                        <span style={{ fontWeight: 500 }}>{a.name}</span>
                        <span style={{ fontSize: 11, color: COLORS.gray, marginLeft: "auto" }}>{a.role === "admin" ? "Admin" : a.role === "coordenador" ? "Coord" : a.nivel || "—"}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {formMsg && <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>{formMsg}</div>}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleSend} disabled={sending}
                  style={{
                    padding: "10px 28px", borderRadius: 8, border: "none",
                    background: sending ? COLORS.gray : COLORS.primary, color: "#fff",
                    fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700,
                    cursor: sending ? "not-allowed" : "pointer",
                  }}>{sending ? "Enviando..." : "Enviar"}</button>
              </div>
            </div>
          )}

          {/* ── Enviados ── */}
          {!loading && tab === "enviados" && (
            enviados.length === 0 ? (
              <div style={{ textAlign: "center", color: COLORS.gray, fontSize: 14, padding: 24 }}>Nenhuma mensagem enviada.</div>
            ) : enviados.map(doc => {
              const totalDest = (doc.destinatariosIds || []).length;
              const totalLido = Object.keys(doc.leituras || {}).length;
              return (
                <div key={doc.id} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.dark }}>{doc.titulo}</div>
                      {doc.descricao && <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "4px 0 0" }}>{doc.descricao}</p>}
                      <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 6 }}>
                        {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                        {" — Para: "}{(doc.destinatariosNomes || []).join(", ") || "—"}
                        {doc.fileName && ` — ${doc.fileName}`}
                      </div>
                    </div>
                    <span style={{
                      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0,
                      color: totalLido === totalDest && totalDest > 0 ? "#15803d" : "#d97706",
                      background: totalLido === totalDest && totalDest > 0 ? "#f0fdf4" : "#fffbeb",
                    }}>{totalLido}/{totalDest} lidos</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </IntranetLayout>
  );
}
