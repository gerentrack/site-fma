/**
 * EquipesAdmin.jsx — CRUD de Clubes e Equipes.
 * Exports: EquipesList, EquipesEditor
 * Rotas:  /admin/equipes       → EquipesList
 *         /admin/equipes/novo  → EquipesEditor (novo)
 *         /admin/equipes/:id   → EquipesEditor (edição)
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { EquipesService } from "../../services/index";
import FileUpload from "../../components/ui/FileUpload";
import { COLORS, FONTS } from "../../styles/colors";

// ─── Helpers de estilo ────────────────────────────────────────────────────────

const inp = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: `1px solid ${COLORS.grayLight}`,
  fontFamily: FONTS.body, fontSize: 14, outline: "none",
  boxSizing: "border-box", background: "#fff",
};
const lbl = {
  fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: 1,
  color: COLORS.grayDark, display: "block", marginBottom: 6,
};
const card = {
  background: "#fff", borderRadius: 12,
  padding: "22px 26px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  marginBottom: 18,
};

function SectionTitle({ children }) {
  return (
    <h3 style={{
      fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800,
      textTransform: "uppercase", letterSpacing: 2,
      color: COLORS.primary, margin: "0 0 18px",
      paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}`,
    }}>
      {children}
    </h3>
  );
}

function slugify(str = "") {
  return str.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-");
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── LISTA ────────────────────────────────────────────────────────────────────

export function EquipesList() {
  const navigate = useNavigate();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await EquipesService.listAdmin();
    if (r.data) setItems(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { document.title = "Equipes | Admin FMA"; load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Excluir esta equipe permanentemente?")) return;
    await EquipesService.delete(id);
    load();
  };

  const handleToggle = async (item) => {
    if (item.published) await EquipesService.unpublish(item.id);
    else                await EquipesService.publish(item.id);
    load();
  };

  const filtered = items.filter(i =>
    !search || i.title.toLowerCase().includes(search.toLowerCase()) ||
    (i.cidade || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 900,
              textTransform: "uppercase", color: COLORS.dark, margin: 0 }}>
              🏃 Clubes e Equipes
            </h1>
            <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "4px 0 0" }}>
              {items.length} equipe{items.length !== 1 ? "s" : ""} cadastrada{items.length !== 1 ? "s" : ""}
              {" "}· {items.filter(i => i.published).length} publicada{items.filter(i => i.published).length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={() => navigate("/admin/equipes/novo")}
            style={{ padding: "10px 20px", borderRadius: 9, border: "none",
              background: COLORS.primary, color: "#fff",
              fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700,
              cursor: "pointer", textTransform: "uppercase" }}>
            + Nova Equipe
          </button>
        </div>

        {/* Busca */}
        <div style={{ position: "relative", marginBottom: 20 }}>
          <span style={{ position: "absolute", left: 12, top: "50%",
            transform: "translateY(-50%)", fontSize: 14,
            color: COLORS.gray, pointerEvents: "none" }}>🔍</span>
          <input type="search" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou cidade…"
            style={{ ...inp, paddingLeft: 36 }} />
        </div>

        {/* Tabela */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40,
            fontFamily: FONTS.body, color: COLORS.gray }}>Carregando…</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
            <p style={{ fontFamily: FONTS.heading, color: COLORS.gray, margin: 0 }}>
              {search ? "Nenhuma equipe encontrada." : "Nenhuma equipe cadastrada ainda."}
            </p>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12,
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: COLORS.dark }}>
                  {["Equipe", "Cidade", "Status", "Ações"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left",
                      fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: 1, color: "#fff" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id}
                    style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa",
                      borderBottom: `1px solid ${COLORS.grayLight}` }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {item.logo ? (
                          <img src={item.logo} alt="" style={{ width: 36, height: 36,
                            borderRadius: 8, objectFit: "cover",
                            border: `1px solid ${COLORS.grayLight}` }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 8,
                            background: "#f3f4f6", display: "flex",
                            alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                            🏃
                          </div>
                        )}
                        <div>
                          <div style={{ fontFamily: FONTS.heading, fontSize: 14,
                            fontWeight: 700, color: COLORS.dark }}>
                            {item.title}
                          </div>
                          <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>
                            /{item.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark }}>
                      {item.cidade || "—"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <button onClick={() => handleToggle(item)}
                        style={{ padding: "4px 12px", borderRadius: 20,
                          border: "none", cursor: "pointer",
                          fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
                          background: item.published ? "#f0fdf4" : "#fff3f3",
                          color: item.published ? "#15803d" : "#cc0000" }}>
                        {item.published ? "✅ Publicada" : "⏸ Rascunho"}
                      </button>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => navigate(`/admin/equipes/${item.id}`)}
                          style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`,
                            background: "#fff", cursor: "pointer",
                            fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, color: COLORS.dark }}>
                          ✏️ Editar
                        </button>
                        <button onClick={() => handleDelete(item.id)}
                          style={{ padding: "6px 12px", borderRadius: 7,
                            border: "1px solid #fca5a5", background: "#fff",
                            cursor: "pointer", fontFamily: FONTS.heading,
                            fontSize: 11, fontWeight: 700, color: "#dc2626" }}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ─── EDITOR ───────────────────────────────────────────────────────────────────

const EMPTY = {
  title: "", slug: "", image: "",
  cidade: "", contato: "",
  order: 0, showInNav: false, published: false,
};

export function EquipesEditor() {
  const { id }  = useParams();
  const navigate = useNavigate();
  const isNew    = !id || id === "novo";

  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [msg,     setMsg]     = useState({ type: "", text: "" });
  const [slugManual, setSlugManual] = useState(false);

  useEffect(() => {
    document.title = isNew ? "Nova Equipe | Admin FMA" : "Editar Equipe | Admin FMA";
    if (!isNew) {
      EquipesService.get(id).then(r => {
        if (r.data) setForm(r.data);
        else setMsg({ type: "error", text: "Equipe não encontrada." });
        setLoading(false);
      });
    }
  }, [id, isNew]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleTitleChange = (val) => {
    set("title", val);
    if (!slugManual) set("slug", slugify(val));
  };

  const handleSlugChange = (val) => {
    set("slug", slugify(val));
    setSlugManual(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setMsg({ type: "error", text: "O nome da equipe é obrigatório." }); return; }
    if (!form.slug.trim())  { setMsg({ type: "error", text: "O slug é obrigatório." }); return; }
    setSaving(true);
    const r = isNew
      ? await EquipesService.create(form)
      : await EquipesService.update(id, form);
    if (r.error) {
      setMsg({ type: "error", text: r.error });
    } else {
      setMsg({ type: "success", text: isNew ? "Equipe criada com sucesso!" : "Equipe salva com sucesso!" });
      if (isNew) setTimeout(() => navigate(`/admin/equipes/${r.data.id}`), 900);
    }
    setSaving(false);
  };

  if (loading) return (
    <AdminLayout>
      <div style={{ textAlign: "center", padding: 60, fontFamily: FONTS.body, color: COLORS.gray }}>
        Carregando…
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <button onClick={() => navigate("/admin/equipes")}
            style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`,
              background: "#fff", cursor: "pointer",
              fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: COLORS.gray }}>
            ← Voltar
          </button>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900,
            textTransform: "uppercase", color: COLORS.dark, margin: 0 }}>
            {isNew ? "Nova Equipe" : "Editar Equipe"}
          </h1>
        </div>

        {/* Mensagem */}
        {msg.text && (
          <div style={{ padding: "12px 18px", borderRadius: 9, marginBottom: 20,
            background: msg.type === "error" ? "#fff5f5" : "#f0fdf4",
            border: `1px solid ${msg.type === "error" ? "#fca5a5" : "#86efac"}`,
            fontFamily: FONTS.body, fontSize: 13,
            color: msg.type === "error" ? "#cc0000" : "#15803d" }}>
            {msg.type === "error" ? "⚠️" : "✅"} {msg.text}
          </div>
        )}

        {/* Informações básicas */}
        <div style={card}>
          <SectionTitle>Informações Básicas</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={lbl}>Nome da Equipe / Clube *</label>
              <input style={inp} value={form.title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Ex: Correia Sports" />
            </div>

            <div>
              <label style={lbl}>Slug (URL) *</label>
              <input style={inp} value={form.slug}
                onChange={e => handleSlugChange(e.target.value)}
                placeholder="correia-sports" />
              <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 4 }}>
                /equipes/{form.slug || "slug"}
              </div>
            </div>

            <div>
              <label style={lbl}>Cidade</label>
              <input style={inp} value={form.cidade}
                onChange={e => set("cidade", e.target.value)}
                placeholder="Belo Horizonte" />
            </div>

            <div>
              <label style={lbl}>Contato (e-mail ou site)</label>
              <input style={inp} value={form.contato}
                onChange={e => set("contato", e.target.value)}
                placeholder="contato@exemplo.com.br" />
            </div>

          </div>
        </div>


        {/* Imagem */}
        <div style={card}>
          <SectionTitle>Imagem da Equipe</SectionTitle>
          <FileUpload
            label="Imagem"
            value={form.image}
            onChange={v => set("image", v)}
            folder="equipes"
            hint="Recomendado: 800x400px. JPG ou PNG."
            mode="both"
          />
        </div>

        {/* Configurações */}
        <div style={card}>
          <SectionTitle>Configurações</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={lbl}>Ordem de exibição</label>
              <input type="number" style={inp} value={form.order}
                onChange={e => set("order", parseInt(e.target.value) || 0)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 22 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={form.published}
                  onChange={e => set("published", e.target.checked)} />
                <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark }}>
                  Publicado (visível no site)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={() => navigate("/admin/equipes")}
            style={{ padding: "11px 22px", borderRadius: 9,
              border: `1px solid ${COLORS.grayLight}`, background: "#fff",
              fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700,
              color: COLORS.gray, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "11px 28px", borderRadius: 9, border: "none",
              background: saving ? COLORS.gray : COLORS.primary, color: "#fff",
              fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              textTransform: "uppercase" }}>
            {saving ? "Salvando…" : isNew ? "Criar Equipe" : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
