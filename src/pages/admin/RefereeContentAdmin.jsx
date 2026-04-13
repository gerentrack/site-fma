/**
 * RefereeContentAdmin.jsx — Gerenciador de conteúdo público de árbitros (FMA admin).
 * Exporta: RefereeContentList, RefereeContentEditor
 * Rotas: /admin/arbitros-conteudo  |  /admin/arbitros-conteudo/:id
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import Table, { TableActions } from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import FileUpload from "../../components/ui/FileUpload";
import { deleteFile } from "../../services/storageService";
import { FormField, TextInput, TextArea, SelectInput, CheckboxInput } from "../../components/ui/FormField";
import { useForm, required } from "../../hooks/useForm";
import { RefereeContentService } from "../../services/index";
import { REFEREE_CONTENT_CATEGORIES } from "../../config/navigation";
import { COLORS, FONTS } from "../../styles/colors";
import DOMPurify from "dompurify";

const catMap = Object.fromEntries(REFEREE_CONTENT_CATEGORIES.filter(c => c.value).map(c => [c.value, c]));
const catOptions = REFEREE_CONTENT_CATEGORIES.filter(c => c.value).map(c => ({ value: c.value, label: `${c.icon} ${c.label}` }));
const statusOptions = [{ value: "published", label: "Publicado" }, { value: "draft", label: "Rascunho" }];

function CatBadge({ category }) {
  const cat = catMap[category];
  if (!cat) return <span style={{ fontSize: 12, color: COLORS.gray }}>{category}</span>;
  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: `${cat.color}18`, color: cat.color }}>{cat.icon} {cat.label}</span>;
}

const card = { background: "#fff", borderRadius: 12, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20 };
const sec = (label) => <h3 style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.primary, margin: "0 0 18px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>{label}</h3>;

// ─── Lista ────────────────────────────────────────────────────────────────────
export function RefereeContentList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await RefereeContentService.list({ publishedOnly: false });
    if (r.data) setItems(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (item) => {
    if (item.status === "published") await RefereeContentService.unpublish(item.id);
    else await RefereeContentService.publish(item.id);
    load();
  };

  const handleDelete = async (item) => {
    if (!confirm(`Excluir "${item.title}"?`)) return;
    if (item.fileUrl) deleteFile(item.fileUrl).catch(() => {});
    if (item.image) deleteFile(item.image).catch(() => {});
    await RefereeContentService.delete(item.id);
    load();
  };

  const filtered = items.filter(i => {
    if (filterCat && i.category !== filterCat) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = REFEREE_CONTENT_CATEGORIES.filter(c => c.value).map(c => ({
    ...c,
    count: items.filter(i => i.category === c.value).length,
    published: items.filter(i => i.category === c.value && i.status === "published").length,
  }));

  const columns = [
    { key: "featured", label: "★", render: (v, row) => (
      <button onClick={() => RefereeContentService.toggleFeatured(row.id).then(load)}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 17, color: v ? "#f59e0b" : COLORS.grayLight }}>★</button>
    )},
    { key: "title", label: "Título", render: (v, row) => (
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.dark }}>{v}</div>
        <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>{row.summary?.slice(0, 80)}{row.summary?.length > 80 ? "…" : ""}</div>
      </div>
    )},
    { key: "category", label: "Categoria", render: v => <CatBadge category={v} /> },
    { key: "_docs", label: "Conteúdo", render: (_, row) => (
      <div style={{ fontSize: 14, display: "flex", gap: 4 }}>
        {row.content && <span title="Texto">T</span>}
        {row.fileUrl && <span title="Arquivo">F</span>}
        {row.externalLink && <span title="Link">L</span>}
      </div>
    )},
    { key: "publishedAt", label: "Publicação", render: v => v ? new Date(v + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
    { key: "status", label: "Status", render: v => <Badge preset={v === "published" ? "published" : "draft"} /> },
    { key: "_actions", label: "", render: (_, row) => (
      <TableActions
        onToggle={() => handleToggle(row)}
        toggleLabel={row.status === "published" ? "Ocultar" : "Publicar"}
        onEdit={() => navigate(`/admin/arbitros-conteudo/${row.id}`)}
        onDelete={() => handleDelete(row)}
        extra={[{ label: "Ver →", onClick: () => window.open(`/arbitros/conteudo/${row.id}`, "_blank") }]}
      />
    )},
  ];

  return (
    <AdminLayout>
      <div style={{ padding: 40 }}>
        <PageHeader
          title="Conteúdo — Árbitros"
          subtitle="Gerencie o conteúdo público da Central do Árbitro."
          action={{ label: "+ Novo Conteúdo", onClick: () => navigate("/admin/arbitros-conteudo/novo") }}
        />

        {/* Cards de categoria */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginBottom: 24 }}>
          {stats.map(c => (
            <div key={c.value} onClick={() => setFilterCat(filterCat === c.value ? "" : c.value)}
              style={{ background: filterCat === c.value ? `${c.color}12` : "#fff", border: `1.5px solid ${filterCat === c.value ? c.color : COLORS.grayLight}`, borderRadius: 10, padding: "12px 14px", cursor: "pointer" }}>
              <div style={{ fontSize: 17, marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, color: filterCat === c.value ? c.color : COLORS.dark, lineHeight: 1.2 }}>{c.label}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 4 }}>{c.published}/{c.count} pub.</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
          <input placeholder="Buscar título..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", minWidth: 220 }} />
          {(filterCat || search) && (
            <button onClick={() => { setFilterCat(""); setSearch(""); }}
              style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", cursor: "pointer", fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
              ✕ Limpar
            </button>
          )}
          <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginLeft: "auto" }}>{filtered.length} item(s)</span>
        </div>

        <Table columns={columns} rows={filtered} loading={loading} emptyMessage="Nenhum conteúdo cadastrado." />
      </div>
    </AdminLayout>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────
const emptyContent = { title: "", summary: "", content: "", category: "orientacao", fileUrl: "", fileLabel: "", externalLink: "", image: "", publishedAt: new Date().toISOString().slice(0, 10), status: "draft", featured: false, order: 0 };

export function RefereeContentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "novo";
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    if (isNew) { setInitial({ ...emptyContent }); return; }
    RefereeContentService.get(id).then(r => r.data ? setInitial(r.data) : navigate("/admin/arbitros-conteudo"));
  }, [id]);

  const { values, errors, set, handleSubmit, submitting, serverError } = useForm(
    initial || emptyContent,
    { title: required("Título é obrigatório."), category: required("Categoria é obrigatória.") },
    async (fv) => {
      const r = isNew ? await RefereeContentService.create(fv) : await RefereeContentService.update(id, fv);
      if (!r.error) navigate("/admin/arbitros-conteudo");
      return r;
    }
  );

  if (!initial) return <AdminLayout><div style={{ padding: 40, fontFamily: FONTS.body }}>Carregando...</div></AdminLayout>;
  const cat = catMap[values.category];

  return (
    <AdminLayout>
      <div style={{ padding: 40, maxWidth: 900 }}>
        <PageHeader
          title={isNew ? "Novo Conteúdo (Árbitros)" : `Editando: ${values.title || "..."}`}
          subtitle={cat ? `${cat.icon} ${cat.label}` : ""}
          backTo="/admin/arbitros-conteudo"
          action={{ label: isNew ? "Criar" : "Salvar", onClick: handleSubmit, loading: submitting }}
        />

        {serverError && <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 16px", marginBottom: 16, color: "#991b1b", fontFamily: FONTS.body, fontSize: 13 }}>{serverError}</div>}

        {/* Identificação */}
        <div style={card}>
          {sec("Identificação")}
          <div style={{ display: "grid", gap: 14 }}>
            <FormField label="Título" required error={errors.title}>
              <TextInput value={values.title} onChange={v => set("title", v)} error={errors.title} placeholder="Ex: Ficha de Corrida de Rua 2026" />
            </FormField>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <FormField label="Categoria" required error={errors.category}>
                <SelectInput value={values.category} onChange={v => set("category", v)} options={catOptions} />
              </FormField>
              <FormField label="Status">
                <SelectInput value={values.status} onChange={v => set("status", v)} options={statusOptions} />
              </FormField>
              <FormField label="Data de Publicação">
                <input type="date" value={values.publishedAt} onChange={e => set("publishedAt", e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </FormField>
            </div>
            <FormField label="Resumo" hint="Exibido nos cards da listagem pública">
              <TextArea value={values.summary} onChange={v => set("summary", v)} rows={2} placeholder="Breve descrição..." />
            </FormField>
            <CheckboxInput checked={values.featured} onChange={v => set("featured", v)} label="Marcar como destaque" />
          </div>
        </div>

        {/* Conteúdo */}
        <div style={card}>
          {sec("Conteúdo Completo")}
          <FormField label="Texto (HTML)" hint="Aceita <p>, <strong>, <ul>, <ol>, <li>, <a href=''>">
            <TextArea value={values.content} onChange={v => set("content", v)} rows={10} placeholder="<p>Conteúdo completo...</p>"
              style={{ fontFamily: "monospace", fontSize: 13 }} />
          </FormField>
          {values.content && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 8 }}>Preview:</div>
              <div style={{ border: `1px dashed ${COLORS.grayLight}`, borderRadius: 8, padding: "14px 18px", background: "#fafafa", fontSize: 14, lineHeight: 1.8, fontFamily: FONTS.body }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(values.content) }} />
            </div>
          )}
        </div>

        {/* Arquivo & Link */}
        <div style={card}>
          {sec("Arquivo, Link e Imagem")}
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FormField label="URL do Arquivo">
                <TextInput value={values.fileUrl} onChange={v => set("fileUrl", v)} placeholder="https://...documento.pdf" type="url" />
              </FormField>
              <FormField label="Texto do Botão de Download">
                <TextInput value={values.fileLabel} onChange={v => set("fileLabel", v)} placeholder="Baixar Formulário (PDF)" />
              </FormField>
            </div>
            <FormField label="Link Externo">
              <TextInput value={values.externalLink} onChange={v => set("externalLink", v)} placeholder="https://..." type="url" />
            </FormField>
            <FileUpload label="Imagem" value={values.image} onChange={v => set("image", v)} folder="arbitros" hint="Opcional. Recomendado: 600x340px." mode="both" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={() => navigate("/admin/arbitros-conteudo")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} size="lg">{isNew ? "Criar Conteúdo" : "Salvar Alterações"}</Button>
        </div>
      </div>
    </AdminLayout>
  );
}
