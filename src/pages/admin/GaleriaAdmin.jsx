/**
 * GaleriaAdmin.jsx — CRUD de álbuns da galeria.
 * Exports: GaleriaList, GaleriaEditor
 * Rotas:  /admin/galeria       → GaleriaList
 *         /admin/galeria/novo  → GaleriaEditor (novo)
 *         /admin/galeria/:id   → GaleriaEditor (edição)
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { GalleryService } from "../../services/index";
import { COLORS, FONTS } from "../../styles/colors";

// ─── Categorias ───────────────────────────────────────────────────────────────
const CATS = [
  { value: "corrida",       label: "🏅 Corridas de Rua" },
  { value: "pista",         label: "🏟️ Pista e Campo"   },
  { value: "trail",         label: "🏔️ Trail Run"        },
  { value: "institucional", label: "🏛️ Institucional"    },
  { value: "outro",         label: "📷 Outro"             },
];
const catLabel = (v) => CATS.find(c => c.value === v)?.label || v;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
const inp = { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff" };
const lbl = { fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 6 };
const card = { background: "#fff", borderRadius: 12, padding: "22px 26px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 18 };
function SectionTitle({ children }) {
  return <h3 style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.primary, margin: "0 0 18px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>{children}</h3>;
}

// ─── LISTA ────────────────────────────────────────────────────────────────────
export function GaleriaList() {
  const navigate = useNavigate();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [catFil,  setCatFil]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await GalleryService.list({ publishedOnly: false });
    if (r.data) setItems(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Excluir este álbum permanentemente?")) return;
    await GalleryService.delete(id);
    load();
  };
  const handleToggle = async (item) => {
    if (item.published) await GalleryService.unpublish(item.id);
    else                await GalleryService.publish(item.id);
    load();
  };

  const filtered = items.filter(a => {
    if (catFil && a.category !== catFil) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.title.toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, color: COLORS.dark, textTransform: "uppercase", margin: 0 }}>📷 Galeria de Fotos</h1>
            <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "4px 0 0" }}>{items.length} álbum{items.length !== 1 ? "ns" : ""} cadastrado{items.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => navigate("/admin/galeria/novo")} style={{ padding: "11px 22px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "uppercase" }}>
            + Novo Álbum
          </button>
        </div>

        {/* Filtros */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginBottom: 20 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título ou descrição…"
            style={{ ...inp, padding: "10px 14px" }}
          />
          <select value={catFil} onChange={e => setCatFil(e.target.value)} style={{ ...inp, width: "auto", minWidth: 180 }}>
            <option value="">Todas as categorias</option>
            {CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, fontFamily: FONTS.body, color: COLORS.gray }}>⏳ Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 24px", background: "#fff", borderRadius: 12 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <p style={{ fontFamily: FONTS.heading, fontSize: 16, color: COLORS.gray }}>Nenhum álbum encontrado.</p>
            <button onClick={() => navigate("/admin/galeria/novo")} style={{ marginTop: 14, padding: "10px 22px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Criar álbum</button>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            {/* Cabeçalho da tabela */}
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 160px 100px 80px 120px", gap: 0, padding: "12px 20px", background: COLORS.offWhite, borderBottom: `1px solid ${COLORS.grayLight}` }}>
              {["Capa", "Álbum", "Categoria", "Data", "Fotos", "Ações"].map(h => (
                <div key={h} style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray }}>{h}</div>
              ))}
            </div>
            {filtered.map((album, i) => (
              <div key={album.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr 160px 100px 80px 120px", gap: 0, padding: "14px 20px", borderBottom: i < filtered.length - 1 ? `1px solid ${COLORS.grayLight}` : "none", alignItems: "center" }}>
                {/* Capa */}
                <div style={{ width: 60, height: 44, borderRadius: 8, overflow: "hidden", background: "#1a1a1a", flexShrink: 0 }}>
                  {album.cover ? (
                    <img src={album.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📷</div>
                  )}
                </div>
                {/* Título */}
                <div>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, color: COLORS.dark }}>{album.title}</div>
                  {album.description && <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>{album.description}</div>}
                </div>
                {/* Categoria */}
                <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray }}>{catLabel(album.category)}</div>
                {/* Data */}
                <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray }}>{fmtDate(album.date)}</div>
                {/* Fotos */}
                <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.dark }}>{(album.images || []).length}</div>
                {/* Ações */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleToggle(album)}
                    title={album.published ? "Despublicar" : "Publicar"}
                    style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${album.published ? "#86efac" : COLORS.grayLight}`, background: album.published ? "#f0fdf4" : "#fff", color: album.published ? "#15803d" : COLORS.gray, fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    {album.published ? "✓ Pub" : "Pub"}
                  </button>
                  <button onClick={() => navigate(`/admin/galeria/${album.id}`)} style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.dark, fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✏️</button>
                  <button onClick={() => handleDelete(album.id)} style={{ padding: "5px 8px", borderRadius: 7, border: "1px solid #fca5a5", background: "#fff", color: "#dc2626", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🗑️</button>
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
const EMPTY_ALBUM = {
  title: "", description: "", cover: "", category: "corrida",
  date: "", published: false, images: [],
};

export function GaleriaEditor() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const isNew      = !id || id === "novo";

  const [form,    setForm]    = useState(EMPTY_ALBUM);
  const [loading, setLoading] = useState(!isNew);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [imgInput,setImgInput]= useState({ url: "", caption: "" });

  useEffect(() => {
    if (!isNew) {
      GalleryService.get(id).then(r => {
        if (r.error) { setError(r.error); setLoading(false); return; }
        // Normalizar images para array de objetos
        const images = (r.data.images || []).map(img =>
          typeof img === "string" ? { url: img, caption: "" } : img
        );
        setForm({ ...r.data, images });
        setLoading(false);
      });
    }
  }, [id, isNew]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAddImage = () => {
    const url = imgInput.url.trim();
    if (!url) return;
    setForm(f => ({ ...f, images: [...f.images, { url, caption: imgInput.caption.trim() }] }));
    setImgInput({ url: "", caption: "" });
  };
  const handleRemoveImage = (idx) => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  const handleMoveUp   = (idx) => {
    if (idx === 0) return;
    const imgs = [...form.images];
    [imgs[idx-1], imgs[idx]] = [imgs[idx], imgs[idx-1]];
    setForm(f => ({ ...f, images: imgs }));
  };
  const handleMoveDown = (idx) => {
    if (idx === form.images.length - 1) return;
    const imgs = [...form.images];
    [imgs[idx], imgs[idx+1]] = [imgs[idx+1], imgs[idx]];
    setForm(f => ({ ...f, images: imgs }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Título é obrigatório."); return; }
    setSaving(true); setError("");
    const r = isNew
      ? await GalleryService.create({ ...form, published: false })
      : await GalleryService.update(id, form);
    if (r.error) { setError(r.error); setSaving(false); return; }
    navigate("/admin/galeria");
  };

  if (loading) return <AdminLayout><div style={{ padding: 60, textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>⏳ Carregando...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px 60px", maxWidth: 820 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <button onClick={() => navigate("/admin/galeria")} style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 8 }}>← Galeria</button>
            <h1 style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 900, color: COLORS.dark, textTransform: "uppercase", margin: 0 }}>
              {isNew ? "📷 Novo Álbum" : "✏️ Editar Álbum"}
            </h1>
          </div>
          {!isNew && (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => window.open(`/galeria/${id}`, "_blank")} style={{ padding: "9px 16px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>👁️ Ver</button>
              <button
                onClick={async () => { form.published ? await GalleryService.unpublish(id) : await GalleryService.publish(id); navigate("/admin/galeria"); }}
                style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: form.published ? "#fff5f5" : "#f0fdf4", color: form.published ? "#dc2626" : "#15803d", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {form.published ? "Despublicar" : "✓ Publicar"}
              </button>
            </div>
          )}
        </div>

        {error && <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontFamily: FONTS.body, fontSize: 13, color: "#dc2626" }}>⚠️ {error}</div>}

        {/* Informações básicas */}
        <div style={card}>
          <SectionTitle>📋 Informações do álbum</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={lbl}>Título *</label>
              <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ex: Campeonato Mineiro de Pista 2026" style={inp} />
            </div>
            <div>
              <label style={lbl}>Descrição</label>
              <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Breve descrição do álbum (exibida na listagem)" rows={2} style={{ ...inp, resize: "vertical" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={lbl}>Categoria</label>
                <select value={form.category} onChange={e => set("category", e.target.value)} style={inp}>
                  {CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Data do evento</label>
                <input type="date" value={form.date} onChange={e => set("date", e.target.value)} style={inp} />
              </div>
            </div>
            <div>
              <label style={lbl}>URL da capa</label>
              <input value={form.cover} onChange={e => set("cover", e.target.value)} placeholder="https://…/capa.jpg" style={inp} />
              {form.cover && (
                <div style={{ marginTop: 10, borderRadius: 8, overflow: "hidden", maxWidth: 220, border: `1px solid ${COLORS.grayLight}` }}>
                  <img src={form.cover} alt="capa" style={{ width: "100%", display: "block", maxHeight: 140, objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                </div>
              )}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: FONTS.body, fontSize: 14, color: COLORS.dark }}>
              <input type="checkbox" checked={form.published} onChange={e => set("published", e.target.checked)} style={{ width: 16, height: 16 }} />
              Publicado (visível no site)
            </label>
          </div>
        </div>

        {/* Gerenciamento de fotos */}
        <div style={card}>
          <SectionTitle>🖼️ Fotos do álbum — {form.images.length} imagem{form.images.length !== 1 ? "ns" : ""}</SectionTitle>

          {/* Adicionar foto */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: 10, marginBottom: 20 }}>
            <input
              value={imgInput.url} onChange={e => setImgInput(v => ({ ...v, url: e.target.value }))}
              placeholder="URL da imagem (https://…)"
              style={inp}
            />
            <input
              value={imgInput.caption} onChange={e => setImgInput(v => ({ ...v, caption: e.target.value }))}
              placeholder="Legenda (opcional)"
              style={inp}
            />
            <button
              onClick={handleAddImage}
              disabled={!imgInput.url.trim()}
              style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: imgInput.url.trim() ? COLORS.primary : COLORS.gray, color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: imgInput.url.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>
              + Adicionar
            </button>
          </div>

          {/* Lista de fotos */}
          {form.images.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", background: COLORS.offWhite, borderRadius: 10, border: `1.5px dashed ${COLORS.grayLight}` }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🖼️</div>
              <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: 0 }}>Nenhuma foto adicionada. Use o formulário acima para inserir URLs.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {form.images.map((img, i) => {
                const url     = typeof img === "string" ? img : img.url;
                const caption = typeof img === "string" ? "" : img.caption;
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 200px auto", gap: 10, alignItems: "center", background: COLORS.offWhite, borderRadius: 8, padding: "10px 12px", border: `1px solid ${COLORS.grayLight}` }}>
                    <img src={url} alt="" style={{ width: 56, height: 42, borderRadius: 6, objectFit: "cover", background: "#e0e0e0" }} onError={e => { e.target.style.opacity = 0.3; }} />
                    <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={url}>{url}</div>
                    <input
                      value={caption}
                      onChange={e => {
                        const imgs = [...form.images];
                        imgs[i] = { url, caption: e.target.value };
                        setForm(f => ({ ...f, images: imgs }));
                      }}
                      placeholder="Legenda…"
                      style={{ ...inp, padding: "6px 10px", fontSize: 12 }}
                    />
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={() => handleMoveUp(i)} disabled={i === 0} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "#fff", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                      <button onClick={() => handleMoveDown(i)} disabled={i === form.images.length - 1} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "#fff", cursor: i === form.images.length - 1 ? "default" : "pointer", opacity: i === form.images.length - 1 ? 0.3 : 1 }}>↓</button>
                      <button onClick={() => handleRemoveImage(i)} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #fca5a5", background: "#fff5f5", color: "#dc2626", cursor: "pointer", fontWeight: 700 }}>×</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Botões de salvar */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={() => navigate("/admin/galeria")} style={{ padding: "11px 20px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "11px 24px", borderRadius: 8, border: "none", background: saving ? COLORS.gray : COLORS.primary, color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Salvando..." : isNew ? "💾 Criar álbum" : "💾 Salvar alterações"}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
