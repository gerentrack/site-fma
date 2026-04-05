import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { documentsAPI } from "../../data/api";
import { COLORS, FONTS } from "../../styles/colors";
import { deleteFile } from "../../services/storageService";

const CATEGORIES = [
  { value: "estatuto", label: "Estatuto" },
  { value: "nota", label: "Nota Oficial" },
  { value: "regimento", label: "Regimento" },
  { value: "formulario", label: "Formulário" },
  { value: "outro", label: "Outro" },
];

const empty = { title: "", category: "outro", fileUrl: "", date: "", published: false };

function DocForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 14, outline: "none", boxSizing: "border-box" };
  const labelStyle = { fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, display: "block", marginBottom: 6 };

  const handleSave = async () => {
    if (!form.title) { alert("Título é obrigatório."); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <label style={labelStyle}>Título *</label>
        <input style={inputStyle} value={form.title} onChange={e => set("title", e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={labelStyle}>Categoria</label>
          <select style={inputStyle} value={form.category} onChange={e => set("category", e.target.value)}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Data</label>
          <input type="date" style={inputStyle} value={form.date} onChange={e => set("date", e.target.value)} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>URL do Arquivo (PDF)</label>
        <input style={inputStyle} value={form.fileUrl} onChange={e => set("fileUrl", e.target.value)} placeholder="https://..." />
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: FONTS.body, fontSize: 14 }}>
        <input type="checkbox" checked={form.published} onChange={e => set("published", e.target.checked)} />
        Publicado
      </label>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={handleSave} disabled={saving} style={{ padding: "11px 28px", background: saving ? COLORS.gray : COLORS.primary, border: "none", borderRadius: 8, color: COLORS.white, fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", textTransform: "uppercase" }}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button onClick={onCancel} style={{ padding: "11px 28px", background: "transparent", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, color: COLORS.gray, fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
      </div>
    </div>
  );
}

export function DocumentsList() {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();
  const load = () => documentsAPI.list({ publishedOnly: false }).then(r => r.data && setItems(r.data));
  useEffect(() => { load(); }, []);
  const handleDelete = async (id) => {
    if (!confirm("Excluir?")) return;
    const doc = items.find(d => d.id === id);
    if (doc?.fileUrl) deleteFile(doc.fileUrl).catch(() => {});
    await documentsAPI.delete(id);
    load();
  };
  const handleToggle = async (item) => { await documentsAPI.update(item.id, { published: !item.published }); load(); };

  return (
    <AdminLayout>
      <div style={{ padding: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 800, color: COLORS.dark, margin: 0, textTransform: "uppercase" }}>Documentos</h1>
          <button onClick={() => navigate("/admin/documentos/novo")} style={{ padding: "10px 22px", background: COLORS.primary, border: "none", borderRadius: 8, color: COLORS.white, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "uppercase" }}>+ Novo Documento</button>
        </div>
        <div style={{ background: COLORS.white, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          {items.length === 0 && <p style={{ padding: 32, textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>Nenhum documento cadastrado.</p>}
          {items.map((item, i) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", borderBottom: i < items.length - 1 ? `1px solid ${COLORS.grayLight}` : "none" }}>
              <span style={{ fontSize: 24 }}>📄</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.dark }}>{item.title}</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{item.category} · {item.date}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleToggle(item)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "transparent", cursor: "pointer", fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{item.published ? "Despublicar" : "Publicar"}</button>
                <button onClick={() => navigate(`/admin/documentos/${item.id}`)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "transparent", cursor: "pointer", fontFamily: FONTS.body, fontSize: 12 }}>Editar</button>
                <button onClick={() => handleDelete(item.id)} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#fff0f0", cursor: "pointer", fontFamily: FONTS.body, fontSize: 12, color: COLORS.primaryDark }}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

export function DocumentsEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "novo";
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    if (isNew) { setInitial({ ...empty }); return; }
    documentsAPI.get(id).then(r => r.data ? setInitial(r.data) : navigate("/admin/documentos"));
  }, [id]);

  const handleSave = async (form) => {
    if (isNew) await documentsAPI.create(form);
    else await documentsAPI.update(id, form);
    navigate("/admin/documentos");
  };

  if (!initial) return <AdminLayout><div style={{ padding: 40 }}>Carregando...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div style={{ padding: "40px", maxWidth: 720 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <button onClick={() => navigate("/admin/documentos")} style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray }}>← Voltar</button>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 800, color: COLORS.dark, margin: 0, textTransform: "uppercase" }}>{isNew ? "Novo Documento" : "Editar Documento"}</h1>
        </div>
        <div style={{ background: COLORS.white, borderRadius: 12, padding: 32, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <DocForm initial={initial} onSave={handleSave} onCancel={() => navigate("/admin/documentos")} />
        </div>
      </div>
    </AdminLayout>
  );
}
