/**
 * AthletesAdmin.jsx
 * Gerenciador de conteúdo da aba Atletas.
 * Exporta: AthleteContentList, AthleteContentEditor
 *
 * Rotas:
 *   /admin/atletas              → AthleteContentList
 *   /admin/atletas/:id          → AthleteContentEditor
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
import {
  FormField, TextInput, TextArea, SelectInput, CheckboxInput,
} from "../../components/ui/FormField";
import { useForm, required } from "../../hooks/useForm";
import { AthleteContentService } from "../../services/index";
import { ATHLETE_CONTENT_CATEGORIES } from "../../config/navigation";
import { COLORS, FONTS } from "../../styles/colors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const catMap = Object.fromEntries(
  ATHLETE_CONTENT_CATEGORIES.filter(c => c.value).map(c => [c.value, c])
);

const card = {
  background: "#fff",
  borderRadius: 12,
  padding: "24px 28px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  marginBottom: 20,
};

const sec = (label) => (
  <h3 style={{
    fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800,
    textTransform: "uppercase", letterSpacing: 2, color: COLORS.primary,
    margin: "0 0 18px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}`,
  }}>{label}</h3>
);

function CatBadge({ category }) {
  const cat = catMap[category];
  if (!cat) return <span style={{ fontSize: 12, color: COLORS.gray }}>{category}</span>;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: 11,
      fontFamily: FONTS.heading, fontWeight: 700,
      background: `${cat.color}18`, color: cat.color,
    }}>
      {cat.icon} {cat.label}
    </span>
  );
}

// ─── Lista ────────────────────────────────────────────────────────────────────

export function AthleteContentList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await AthleteContentService.list({ publishedOnly: false });
    if (r.data) setItems(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (item) => {
    if (item.status === "published") await AthleteContentService.unpublish(item.id);
    else await AthleteContentService.publish(item.id);
    load();
  };

  const handleFeature = async (item) => {
    await AthleteContentService.toggleFeatured(item.id);
    load();
  };

  const handleDelete = async (item) => {
    if (!confirm(`Excluir "${item.title}"? Esta ação não pode ser desfeita.`)) return;
    if (item.fileUrl) deleteFile(item.fileUrl).catch(() => {});
    if (item.image) deleteFile(item.image).catch(() => {});
    await AthleteContentService.delete(item.id);
    load();
  };

  const filtered = items.filter(i => {
    if (filterCat && i.category !== filterCat) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Stats por categoria
  const stats = ATHLETE_CONTENT_CATEGORIES.filter(c => c.value).map(c => ({
    ...c,
    count: items.filter(i => i.category === c.value).length,
    published: items.filter(i => i.category === c.value && i.status === "published").length,
  }));

  const columns = [
    {
      key: "featured",
      label: "★",
      render: (v, row) => (
        <button
          onClick={() => handleFeature(row)}
          title={v ? "Remover destaque" : "Marcar como destaque"}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, color: v ? "#f59e0b" : COLORS.grayLight }}
        >★</button>
      ),
    },
    {
      key: "title",
      label: "Título",
      render: (v, row) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.dark }}>{v}</div>
          <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
            {row.summary ? row.summary.slice(0, 80) + (row.summary.length > 80 ? "…" : "") : "—"}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Categoria",
      render: (v) => <CatBadge category={v} />,
    },
    {
      key: "_docs",
      label: "Conteúdo",
      render: (_, row) => (
        <div style={{ fontSize: 15, display: "flex", gap: 4 }}>
          {row.content && <span title="Texto completo">T</span>}
          {row.fileUrl && <span title="Arquivo anexo">F</span>}
          {row.externalLink && <span title="Link externo">L</span>}
          {row.image && <span title="Imagem">I</span>}
        </div>
      ),
    },
    {
      key: "publishedAt",
      label: "Publicação",
      render: (v) => v
        ? new Date(v + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
        : "—",
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <Badge preset={v === "published" ? "published" : "draft"} />,
    },
    {
      key: "_actions",
      label: "",
      render: (_, row) => (
        <TableActions
          onToggle={() => handleToggle(row)}
          toggleLabel={row.status === "published" ? "Ocultar" : "Publicar"}
          onEdit={() => navigate(`/admin/atletas/${row.id}`)}
          onDelete={() => handleDelete(row)}
          extra={[{ label: "Ver →", onClick: () => window.open(`/atletas/conteudo/${row.id}`, "_blank") }]}
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: 40 }}>
        <PageHeader
          title="Conteúdo — Atletas"
          subtitle="Gerencie todo o conteúdo informativo e documental da aba Atletas."
          action={{ label: "+ Novo Conteúdo", onClick: () => navigate("/admin/atletas/novo") }}
        />

        {/* Cards de resumo por categoria */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 24 }}>
          {stats.map(c => (
            <div
              key={c.value}
              onClick={() => setFilterCat(filterCat === c.value ? "" : c.value)}
              style={{
                background: filterCat === c.value ? `${c.color}12` : "#fff",
                border: `1.5px solid ${filterCat === c.value ? c.color : COLORS.grayLight}`,
                borderRadius: 10, padding: "12px 14px", cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: filterCat === c.value ? c.color : COLORS.dark, lineHeight: 1.2 }}>{c.label}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 4 }}>
                {c.published}/{c.count} publicados
              </div>
            </div>
          ))}
        </div>

        {/* Barra de busca */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
          <input
            placeholder="Buscar por título..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", minWidth: 240 }}
          />
          {(filterCat || search) && (
            <button onClick={() => { setFilterCat(""); setSearch(""); }}
              style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", cursor: "pointer", fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
              ✕ Limpar
            </button>
          )}
          <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginLeft: "auto" }}>
            {filtered.length} item(s)
          </span>
        </div>

        <Table columns={columns} rows={filtered} loading={loading} emptyMessage="Nenhum conteúdo cadastrado. Clique em '+ Novo Conteúdo' para começar." />
      </div>
    </AdminLayout>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────

const emptyContent = {
  title: "",
  summary: "",
  content: "",
  category: "orientacao",
  fileUrl: "",
  fileLabel: "",
  externalLink: "",
  image: "",
  publishedAt: new Date().toISOString().slice(0, 10),
  status: "draft",
  featured: false,
  order: 0,
};

const catOptions = ATHLETE_CONTENT_CATEGORIES
  .filter(c => c.value)
  .map(c => ({ value: c.value, label: `${c.icon} ${c.label}` }));

const statusOptions = [
  { value: "published", label: "Publicado" },
  { value: "draft",     label: "Rascunho" },
];

export function AthleteContentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "novo";
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    if (isNew) { setInitial({ ...emptyContent }); return; }
    AthleteContentService.get(id).then(r =>
      r.data ? setInitial(r.data) : navigate("/admin/atletas")
    );
  }, [id]);

  const { values, errors, set, handleSubmit, submitting, serverError } = useForm(
    initial || emptyContent,
    {
      title: required("Título é obrigatório."),
      category: required("Categoria é obrigatória."),
    },
    async (formValues) => {
      const result = isNew
        ? await AthleteContentService.create(formValues)
        : await AthleteContentService.update(id, formValues);
      if (!result.error) navigate("/admin/atletas");
      return result;
    }
  );

  if (!initial) return <AdminLayout><div style={{ padding: 40, fontFamily: FONTS.body }}>Carregando...</div></AdminLayout>;

  const cat = catMap[values.category];
  const hasFile  = ["text-file", "file", "text-image-file"].includes(values.layout);

  return (
    <AdminLayout>
      <div style={{ padding: 40, maxWidth: 900 }}>
        <PageHeader
          title={isNew ? "Novo Conteúdo" : `Editando: ${values.title || "..."}`}
          subtitle={cat ? `${cat.icon} ${cat.label}` : ""}
          backTo="/admin/atletas"
          action={{ label: isNew ? "Criar" : "Salvar", onClick: handleSubmit, loading: submitting }}
        />

        {serverError && (
          <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 16px", marginBottom: 16, color: "#991b1b", fontFamily: FONTS.body, fontSize: 13 }}>
            {serverError}
          </div>
        )}

        {/* ── Identificação ── */}
        <div style={card}>
          {sec("Identificação")}
          <div style={{ display: "grid", gap: 16 }}>
            <FormField label="Título" required error={errors.title}>
              <TextInput
                value={values.title}
                onChange={v => set("title", v)}
                error={errors.title}
                placeholder="Ex: Como se Filiar à FMA"
              />
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <FormField label="Categoria" required error={errors.category}>
                <SelectInput value={values.category} onChange={v => set("category", v)} options={catOptions} />
              </FormField>
              <FormField label="Status">
                <SelectInput value={values.status} onChange={v => set("status", v)} options={statusOptions} />
              </FormField>
              <FormField label="Data de Publicação">
                <input
                  type="date"
                  value={values.publishedAt}
                  onChange={e => set("publishedAt", e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </FormField>
            </div>

            <FormField label="Resumo" hint="Exibido nos cards da listagem (máx. 200 caracteres)">
              <TextArea
                value={values.summary}
                onChange={v => set("summary", v)}
                rows={2}
                placeholder="Breve descrição para aparecer no card da listagem pública..."
              />
            </FormField>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <CheckboxInput
                checked={values.featured}
                onChange={v => set("featured", v)}
                label="Marcar como destaque (aparece primeiro e com visual diferenciado)"
              />
            </div>
          </div>
        </div>

        {/* ── Conteúdo completo ── */}
        <div style={card}>
          {sec("Conteúdo Completo")}
          <FormField
            label="Texto"
            hint="HTML básico aceito: <p>, <strong>, <em>, <ul>, <ol>, <li>, <h3>, <h4>, <a href=''>. Este conteúdo aparece na página interna do item."
          >
            <TextArea
              value={values.content}
              onChange={v => set("content", v)}
              rows={12}
              placeholder="<p>Digite aqui o conteúdo completo. Pode incluir passos, orientações, listas, etc.</p>"
              style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 1.6 }}
            />
          </FormField>
          {values.content && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 8 }}>
                Preview do conteúdo:
              </div>
              <div
                style={{ border: `1px dashed ${COLORS.grayLight}`, borderRadius: 8, padding: "16px 20px", background: "#fafafa", fontSize: 14, lineHeight: 1.8, fontFamily: FONTS.body, color: COLORS.dark }}
                dangerouslySetInnerHTML={{ __html: values.content }}
              />
            </div>
          )}
        </div>

        {/* ── Arquivo & Link ── */}
        <div style={card}>
          {sec("Arquivo, Link e Imagem")}
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <FormField label="URL do Arquivo" hint="PDF, DOCX, XLS — cole a URL completa do arquivo hospedado">
                <TextInput
                  value={values.fileUrl}
                  onChange={v => set("fileUrl", v)}
                  placeholder="https://...formulario.pdf"
                  type="url"
                />
              </FormField>
              <FormField label="Texto do Botão de Download" hint="Ex: Baixar Formulário (PDF)">
                <TextInput
                  value={values.fileLabel}
                  onChange={v => set("fileLabel", v)}
                  placeholder="Baixar documento (PDF)"
                />
              </FormField>
            </div>

            <FormField label="Link Externo" hint="URL de um portal, formulário online ou site externo">
              <TextInput
                value={values.externalLink}
                onChange={v => set("externalLink", v)}
                placeholder="https://..."
                type="url"
              />
            </FormField>

            <FileUpload
              label="Imagem"
              value={values.image}
              onChange={v => set("image", v)}
              folder="atletas"
              hint="Opcional. Recomendado: 600x340px."
              mode="both"
            />
          </div>
        </div>

        {/* ── Botões finais ── */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={() => navigate("/admin/atletas")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} size="lg">
            {isNew ? "Criar Conteúdo" : "Salvar Alterações"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
