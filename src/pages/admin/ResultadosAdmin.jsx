/**
 * ResultadosAdmin.jsx — CRUD de resultados de eventos.
 * Exports: ResultadosList, ResultadosEditor
 * Rotas:  /admin/resultados       → ResultadosList
 *         /admin/resultados/novo  → ResultadosEditor (novo)
 *         /admin/resultados/:id   → ResultadosEditor (edição)
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { ResultadosService } from "../../services/index";
import { COLORS, FONTS } from "../../styles/colors";
import { deleteFile } from "../../services/storageService";

// ─── Config ───────────────────────────────────────────────────────────────────
const CATEGORIAS = [
  { value: "corrida", label: "🏅 Corridas de Rua" },
  { value: "pista",   label: "🏟️ Pista e Campo"   },
  { value: "trail",   label: "🏔️ Trail Run"        },
  { value: "marcha",  label: "🚶 Marcha Atlética"  },
  { value: "cross",   label: "🌿 Cross Country"    },
];
const TIPOS = [
  { value: "pdf",  label: "📄 PDF"          },
  { value: "xlsx", label: "📊 Excel (XLSX)" },
  { value: "link", label: "🔗 Link Externo" },
];
const catLabel = (v) => CATEGORIAS.find(c => c.value === v)?.label || v;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
const inp = { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" };
const lbl = { fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 6 };
const cardSty = { background: "#fff", borderRadius: 12, padding: "22px 26px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 18 };
function SectionTitle({ children }) {
  return <h3 style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.primary, margin: "0 0 18px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>{children}</h3>;
}

// ─── LISTA ────────────────────────────────────────────────────────────────────
export function ResultadosList() {
  const navigate = useNavigate();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [catFil,  setCatFil]  = useState("");
  const [anoFil,  setAnoFil]  = useState("");
  const [anos,    setAnos]    = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await ResultadosService.listAdmin();
    if (r.data) {
      setItems(r.data);
      const uniqueAnos = [...new Set(r.data.map(x => x.anoCompetitivo).filter(Boolean))].sort((a, b) => b - a);
      setAnos(uniqueAnos);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Excluir este resultado permanentemente?")) return;
    const res = items.find(r => r.id === id);
    if (res?.fileUrl) deleteFile(res.fileUrl).catch(() => {});
    await ResultadosService.delete(id);
    load();
  };
  const handleToggle = async (item) => {
    if (item.published) await ResultadosService.unpublish(item.id);
    else                await ResultadosService.publish(item.id);
    load();
  };

  const filtered = items.filter(r => {
    if (catFil && r.categoria !== catFil) return false;
    if (anoFil && String(r.anoCompetitivo) !== String(anoFil)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.nomeEvento.toLowerCase().includes(q) ||
        (r.cidade || "").toLowerCase().includes(q) ||
        (r.modalidade || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Agrupados por categoria para exibição
  const groupByCat = CATEGORIAS.reduce((acc, c) => {
    acc[c.value] = filtered.filter(r => r.categoria === c.value);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, color: COLORS.dark, textTransform: "uppercase", margin: 0 }}>🏆 Resultados</h1>
            <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "4px 0 0" }}>{items.length} resultado{items.length !== 1 ? "s" : ""} cadastrado{items.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => navigate("/admin/resultados/novo")} style={{ padding: "11px 22px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "uppercase" }}>
            + Novo Resultado
          </button>
        </div>

        {/* Filtros */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, marginBottom: 20 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por evento, cidade ou modalidade…" style={{ ...inp, padding: "10px 14px" }} />
          <select value={catFil} onChange={e => setCatFil(e.target.value)} style={{ ...inp, width: "auto", minWidth: 180 }}>
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={anoFil} onChange={e => setAnoFil(e.target.value)} style={{ ...inp, width: "auto", minWidth: 100 }}>
            <option value="">Todos os anos</option>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, fontFamily: FONTS.body, color: COLORS.gray }}>⏳ Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 24px", background: "#fff", borderRadius: 12 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <p style={{ fontFamily: FONTS.heading, fontSize: 16, color: COLORS.gray }}>Nenhum resultado encontrado.</p>
            <button onClick={() => navigate("/admin/resultados/novo")} style={{ marginTop: 14, padding: "10px 22px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Cadastrar resultado</button>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 80px 80px 90px 130px", gap: 0, padding: "12px 20px", background: COLORS.offWhite, borderBottom: `1px solid ${COLORS.grayLight}` }}>
              {["Evento", "Categoria", "Ano", "Tipo", "Status", "Ações"].map(h => (
                <div key={h} style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray }}>{h}</div>
              ))}
            </div>
            {filtered.map((res, i) => (
              <div key={res.id} style={{ display: "grid", gridTemplateColumns: "1fr 130px 80px 80px 90px 130px", gap: 0, padding: "13px 20px", borderBottom: i < filtered.length - 1 ? `1px solid ${COLORS.grayLight}` : "none", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, color: COLORS.dark }}>{res.nomeEvento}</div>
                  {res.cidade && <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 2 }}>📍 {res.cidade} · 📅 {fmtDate(res.dataEvento)}</div>}
                  {res.modalidade && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>{res.modalidade}</div>}
                </div>
                <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{catLabel(res.categoria)}</div>
                <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.dark }}>{res.anoCompetitivo || "—"}</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{TIPOS.find(t => t.value === res.tipoArquivo)?.label || res.tipoArquivo}</div>
                <div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: res.published ? "#f0fdf4" : "#f3f4f6", color: res.published ? "#15803d" : COLORS.gray, border: `1px solid ${res.published ? "#86efac" : COLORS.grayLight}` }}>
                    {res.published ? "✓ Pub" : "Rascunho"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleToggle(res)} style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${res.published ? "#fde68a" : "#86efac"}`, background: res.published ? "#fffbeb" : "#f0fdf4", color: res.published ? "#92400e" : "#15803d", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    {res.published ? "Ocultar" : "Publicar"}
                  </button>
                  <button onClick={() => navigate(`/admin/resultados/${res.id}`)} style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.dark, fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✏️</button>
                  <button onClick={() => handleDelete(res.id)} style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid #fca5a5", background: "#fff", color: "#dc2626", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ─── EDITOR ───────────────────────────────────────────────────────────────────
const EMPTY = {
  nomeEvento: "", dataEvento: "", cidade: "",
  categoria: "corrida", modalidade: "",
  tipoArquivo: "pdf", fileUrl: "", externalLink: "",
  descricao: "", anoCompetitivo: new Date().getFullYear(),
  published: false,
};

export function ResultadosEditor() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isNew    = !id || id === "novo";

  const [form,    setForm]    = useState(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!isNew) {
      ResultadosService.get(id).then(r => {
        if (r.error) { setError(r.error); setLoading(false); return; }
        setForm({ ...EMPTY, ...r.data });
        setLoading(false);
      });
    }
  }, [id, isNew]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nomeEvento.trim()) { setError("Nome do evento é obrigatório."); return; }
    if (!form.categoria)         { setError("Categoria é obrigatória."); return; }
    setSaving(true); setError("");
    const payload = { ...form, anoCompetitivo: Number(form.anoCompetitivo) || new Date().getFullYear() };
    const r = isNew
      ? await ResultadosService.create(payload)
      : await ResultadosService.update(id, payload);
    if (r.error) { setError(r.error); setSaving(false); return; }
    navigate("/admin/resultados");
  };

  if (loading) return <AdminLayout><div style={{ padding: 60, textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>⏳ Carregando...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px 60px", maxWidth: 760 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <button onClick={() => navigate("/admin/resultados")} style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 8 }}>← Resultados</button>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 900, color: COLORS.dark, textTransform: "uppercase", margin: 0 }}>
            {isNew ? "🏆 Novo Resultado" : "✏️ Editar Resultado"}
          </h1>
        </div>

        {error && <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontFamily: FONTS.body, fontSize: 13, color: "#dc2626" }}>⚠️ {error}</div>}

        {/* Identificação do evento */}
        <div style={cardSty}>
          <SectionTitle>🗓️ Identificação do evento</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={lbl}>Nome do evento *</label>
              <input value={form.nomeEvento} onChange={e => set("nomeEvento", e.target.value)} placeholder="Ex: Campeonato Mineiro Adulto 2026" style={inp} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div>
                <label style={lbl}>Data do evento</label>
                <input type="date" value={form.dataEvento} onChange={e => set("dataEvento", e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Cidade</label>
                <input value={form.cidade} onChange={e => set("cidade", e.target.value)} placeholder="Ex: Belo Horizonte" style={inp} />
              </div>
              <div>
                <label style={lbl}>Ano competitivo</label>
                <input type="number" min="2000" max="2099" value={form.anoCompetitivo} onChange={e => set("anoCompetitivo", e.target.value)} style={inp} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={lbl}>Categoria *</label>
                <select value={form.categoria} onChange={e => set("categoria", e.target.value)} style={inp}>
                  {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Modalidade / Percurso</label>
                <input value={form.modalidade} onChange={e => set("modalidade", e.target.value)} placeholder="Ex: 10km, Sub-18 100m rasos" style={inp} />
              </div>
            </div>
            <div>
              <label style={lbl}>Descrição / Destaques</label>
              <textarea value={form.descricao} onChange={e => set("descricao", e.target.value)} placeholder="Recordes, destaques, observações…" rows={2} style={{ ...inp, resize: "vertical" }} />
            </div>
          </div>
        </div>

        {/* Arquivo de resultado */}
        <div style={cardSty}>
          <SectionTitle>📄 Arquivo de resultado</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={lbl}>Tipo de arquivo</label>
              <div style={{ display: "flex", gap: 10 }}>
                {TIPOS.map(t => (
                  <label key={t.value} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, border: `2px solid ${form.tipoArquivo === t.value ? "#0066cc" : COLORS.grayLight}`, background: form.tipoArquivo === t.value ? "#eff6ff" : "#fff", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: form.tipoArquivo === t.value ? "#0066cc" : COLORS.gray }}>
                    <input type="radio" name="tipoArquivo" value={t.value} checked={form.tipoArquivo === t.value} onChange={() => set("tipoArquivo", t.value)} style={{ display: "none" }} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
            {form.tipoArquivo !== "link" && (
              <div>
                <label style={lbl}>URL do arquivo ({form.tipoArquivo === "pdf" ? "PDF" : "XLSX"})</label>
                <input value={form.fileUrl} onChange={e => set("fileUrl", e.target.value)} placeholder="https://…/resultado.pdf" style={inp} />
                <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 4 }}>URL do arquivo hospedado (PDF ou Excel).</div>
              </div>
            )}
            {form.tipoArquivo === "link" && (
              <div>
                <label style={lbl}>Link externo</label>
                <input value={form.externalLink} onChange={e => set("externalLink", e.target.value)} placeholder="https://www.athlinks.com/…" style={inp} />
                <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 4 }}>Link para plataforma externa de resultados (Athlinks, Webmaster Sports, etc.).</div>
              </div>
            )}
          </div>
        </div>

        {/* Publicação */}
        <div style={cardSty}>
          <SectionTitle>📡 Publicação</SectionTitle>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: FONTS.body, fontSize: 14, color: COLORS.dark }}>
            <input type="checkbox" checked={form.published} onChange={e => set("published", e.target.checked)} style={{ width: 16, height: 16 }} />
            Publicado — visível na página de resultados do site
          </label>
          {!isNew && (
            <div style={{ marginTop: 14 }}>
              <a href={`/resultados/${id}`} target="_blank" rel="noreferrer" style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: "#0066cc", textDecoration: "none" }}>👁️ Ver no site →</a>
            </div>
          )}
        </div>

        {/* Botões */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={() => navigate("/admin/resultados")} style={{ padding: "11px 20px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "11px 24px", borderRadius: 8, border: "none", background: saving ? COLORS.gray : COLORS.primary, color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Salvando..." : isNew ? "💾 Criar resultado" : "💾 Salvar alterações"}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
