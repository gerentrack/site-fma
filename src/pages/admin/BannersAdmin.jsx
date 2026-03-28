import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { bannersAPI } from "../../data/api";
import { COLORS, FONTS } from "../../styles/colors";
import FileUpload from "../../components/ui/FileUpload";

const empty = {
  title: "", subtitle: "", cta: "", ctaLink: "#",
  bg: "#990000",
  image: "", icon: "🏃", order: 1, active: true,
};

function BannerForm({ initial, onSave, onCancel }) {
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
      {/* Preview */}
      <div style={{ background: form.bg, borderRadius: 10, padding: "28px 20px", textAlign: "center", marginBottom: 8, position: "relative", overflow: "hidden" }}>
        {form.image && <img src={form.image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{form.icon}</div>
          <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: 1, textShadow: form.image ? "0 2px 8px rgba(0,0,0,0.6)" : "none" }}>{form.title || "Título do Banner"}</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 6, textShadow: form.image ? "0 1px 4px rgba(0,0,0,0.6)" : "none" }}>{form.subtitle || "Subtítulo aqui"}</div>
          <div style={{ marginTop: 14, display: "inline-block", background: "#fff", color: "#990000", padding: "8px 20px", borderRadius: 30, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>{form.cta || "CTA"}</div>
        </div>
      </div>

      <div><label style={labelStyle}>Título *</label><input style={inputStyle} value={form.title} onChange={e => set("title", e.target.value)} /></div>
      <div><label style={labelStyle}>Subtítulo</label><input style={inputStyle} value={form.subtitle} onChange={e => set("subtitle", e.target.value)} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div><label style={labelStyle}>Texto do Botão (CTA)</label><input style={inputStyle} value={form.cta} onChange={e => set("cta", e.target.value)} /></div>
        <div><label style={labelStyle}>Link do Botão</label><input style={inputStyle} value={form.ctaLink} onChange={e => set("ctaLink", e.target.value)} /></div>
      </div>
      <div><label style={labelStyle}>Ícone (Emoji)</label><input style={inputStyle} value={form.icon} onChange={e => set("icon", e.target.value)} /></div>
      <div>
        <label style={labelStyle}>Cor de Fundo</label>
        <input type="color" value={form.bg.startsWith("#") ? form.bg : "#990000"} onChange={e => set("bg", e.target.value)} style={{ width: 48, height: 40, border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, cursor: "pointer", padding: 2 }} />
      </div>
      <FileUpload
        label="Imagem de Fundo (opcional)"
        value={form.image}
        onChange={v => set("image", v)}
        folder="banners"
        hint="Recomendado: 1920x600px. JPG ou PNG. Substitui o gradient quando preenchido."
        mode="both"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div><label style={labelStyle}>Ordem</label><input type="number" style={inputStyle} value={form.order} onChange={e => set("order", parseInt(e.target.value))} /></div>
        <div style={{ paddingTop: 28 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: FONTS.body, fontSize: 14 }}>
            <input type="checkbox" checked={form.active} onChange={e => set("active", e.target.checked)} /> Ativo
          </label>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={handleSave} disabled={saving} style={{ padding: "11px 28px", background: saving ? COLORS.gray : COLORS.primary, border: "none", borderRadius: 8, color: COLORS.white, fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", textTransform: "uppercase" }}>{saving ? "Salvando..." : "Salvar"}</button>
        <button onClick={onCancel} style={{ padding: "11px 28px", background: "transparent", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, color: COLORS.gray, fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
      </div>
    </div>
  );
}

export function BannersList() {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();
  const load = () => bannersAPI.list({ activeOnly: false }).then(r => r.data && setItems(r.data));
  useEffect(() => { load(); }, []);
  const handleDelete = async (id) => { if (!confirm("Excluir banner?")) return; await bannersAPI.delete(id); load(); };
  const handleToggle = async (item) => { await bannersAPI.update(item.id, { active: !item.active }); load(); };

  return (
    <AdminLayout>
      <div style={{ padding: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 800, color: COLORS.dark, margin: 0, textTransform: "uppercase" }}>Banners</h1>
          <button onClick={() => navigate("/admin/banners/novo")} style={{ padding: "10px 22px", background: COLORS.primary, border: "none", borderRadius: 8, color: COLORS.white, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "uppercase" }}>+ Novo Banner</button>
        </div>
        <div style={{ display: "grid", gap: 16 }}>
          {items.length === 0 && <p style={{ padding: 32, textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray, background: COLORS.white, borderRadius: 12 }}>Nenhum banner cadastrado.</p>}
          {items.map(item => (
            <div key={item.id} style={{ background: COLORS.white, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", gap: 0 }}>
              <div style={{ background: item.bg, width: 120, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0, position: "relative", overflow: "hidden" }}>
                {item.image && <img src={item.image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                <span style={{ position: "relative", zIndex: 1 }}>{item.icon}</span>
              </div>
              <div style={{ flex: 1, padding: "16px 20px" }}>
                <div style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 700, color: COLORS.dark }}>{item.title}</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 4 }}>{item.subtitle}</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 4 }}>Ordem: {item.order} · CTA: "{item.cta}"</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 20px" }}>
                <div style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: item.active ? "#e6f9ee" : "#f5f5f5", color: item.active ? "#007733" : COLORS.gray }}>{item.active ? "Ativo" : "Inativo"}</div>
                <button onClick={() => handleToggle(item)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "transparent", cursor: "pointer", fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{item.active ? "Desativar" : "Ativar"}</button>
                <button onClick={() => navigate(`/admin/banners/${item.id}`)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "transparent", cursor: "pointer", fontFamily: FONTS.body, fontSize: 12 }}>Editar</button>
                <button onClick={() => handleDelete(item.id)} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#fff0f0", cursor: "pointer", fontFamily: FONTS.body, fontSize: 12, color: COLORS.primaryDark }}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

export function BannersEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "novo";
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    if (isNew) { setInitial({ ...empty }); return; }
    bannersAPI.list({ activeOnly: false }).then(r => {
      const item = r.data?.find(b => b.id === id);
      item ? setInitial(item) : navigate("/admin/banners");
    });
  }, [id]);

  const handleSave = async (form) => {
    if (isNew) await bannersAPI.create(form);
    else await bannersAPI.update(id, form);
    navigate("/admin/banners");
  };

  if (!initial) return <AdminLayout><div style={{ padding: 40 }}>Carregando...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div style={{ padding: "40px", maxWidth: 860 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <button onClick={() => navigate("/admin/banners")} style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray }}>← Voltar</button>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 800, color: COLORS.dark, margin: 0, textTransform: "uppercase" }}>{isNew ? "Novo Banner" : "Editar Banner"}</h1>
        </div>
        <div style={{ background: COLORS.white, borderRadius: 12, padding: 32, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <BannerForm initial={initial} onSave={handleSave} onCancel={() => navigate("/admin/banners")} />
        </div>
      </div>
    </AdminLayout>
  );
}
