import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import Table, { TableActions } from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/Badge";
import FilterBar from "../../components/ui/Filters";
import Button from "../../components/ui/Button";
import FileUpload from "../../components/ui/FileUpload";
import { FormField, TextInput, TextArea, SelectInput, CheckboxInput, DateInput } from "../../components/ui/FormField";
import { useCrud } from "../../hooks/useApi";
import { useApi } from "../../hooks/useApi";
import { useForm, required } from "../../hooks/useForm";
import { useFilters } from "../../hooks/useFilters";
import { NewsService } from "../../services/index";
import { NEWS_CATEGORIES } from "../../config/navigation";
import { useState, useEffect } from "react";
import { COLORS } from "../../styles/colors";

function slugify(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

// ─── Lista ────────────────────────────────────────────────────────────────────

export function NewsList() {
  const navigate = useNavigate();
  const { items, loading, remove, toggle } = useCrud(NewsService, { publishedOnly: false });

  const { filtered, search, setSearch, filters, setFilter, clearFilters, activeCount } = useFilters(items, {
    searchFields: ["title", "excerpt"],
    initialFilters: { category: "", published: "" },
  });

  const columns = [
    {
      key: "image",
      label: "",
      render: (v) => v
        ? <img src={v} alt="" style={{ width: 64, height: 44, objectFit: "cover", borderRadius: 6 }} />
        : <div style={{ width: 64, height: 44, background: COLORS.grayLight, borderRadius: 6 }} />,
    },
    {
      key: "title",
      label: "Título",
      wrap: true,
      render: (v, row) => (
        <div>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{v}</div>
          <div style={{ fontSize: 11, color: COLORS.gray }}>{row.date}</div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Categoria",
      render: (v) => <Badge preset={v} />,
    },
    {
      key: "published",
      label: "Status",
      render: (v) => <Badge preset={v ? "published" : "draft"} />,
    },
    {
      key: "_actions",
      label: "",
      render: (_, row) => (
        <TableActions
          onToggle={() => toggle(row, "published")}
          toggleLabel={row.published ? "Despublicar" : "Publicar"}
          onEdit={() => navigate(`/admin/noticias/${row.id}`)}
          onDelete={async () => {
            if (!confirm("Excluir esta notícia?")) return;
            await remove(row.id);
          }}
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: 40 }}>
        <PageHeader
          title="Notícias"
          subtitle={`${items.length} notícias cadastradas`}
          action={{ label: "+ Nova Notícia", onClick: () => navigate("/admin/noticias/novo") }}
        />
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Buscar notícias..."
          filters={[
            { key: "category", label: "Categoria", options: NEWS_CATEGORIES.filter(c => c.value) },
            { key: "published", label: "Status", options: [{ value: "true", label: "Publicados" }, { value: "false", label: "Rascunhos" }] },
          ]}
          values={filters}
          onChange={setFilter}
          onClear={clearFilters}
          activeCount={activeCount}
        />
        <Table columns={columns} rows={filtered} loading={loading} emptyMessage="Nenhuma notícia encontrada." />
      </div>
    </AdminLayout>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────

const empty = { title: "", slug: "", excerpt: "", content: "", date: "", category: "geral", image: "", published: false, featured: false };

export function NewsEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "novo";
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    if (isNew) { setInitial({ ...empty }); return; }
    NewsService.get(id).then(r => r.data ? setInitial(r.data) : navigate("/admin/noticias"));
  }, [id]);

  const { values, errors, set, handleSubmit, submitting } = useForm(
    initial || empty,
    { title: required("Título é obrigatório."), date: required("Data é obrigatória.") },
    async (formValues) => {
      const result = isNew
        ? await NewsService.create(formValues)
        : await NewsService.update(id, formValues);
      if (!result.error) navigate("/admin/noticias");
      return result;
    }
  );

  if (!initial) return <AdminLayout><div style={{ padding: 40 }}>Carregando...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div style={{ padding: 40, maxWidth: 900 }}>
        <PageHeader
          title={isNew ? "Nova Notícia" : "Editar Notícia"}
          backTo="/admin/noticias"
        />

        <div style={{ background: COLORS.white || "#fff", borderRadius: 12, padding: 32, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "grid", gap: 20 }}>

          <FormField label="Título" required error={errors.title}>
            <TextInput
              value={values.title}
              onChange={v => { set("title", v); if (!values.slug || values.slug === slugify(values.title)) set("slug", slugify(v)); }}
              error={errors.title}
              placeholder="Título da notícia"
            />
          </FormField>

          <FormField label="Slug (URL)" hint="Gerado automaticamente a partir do título.">
            <TextInput value={values.slug} onChange={v => set("slug", v)} placeholder="slug-da-noticia" />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="Data" required error={errors.date}>
              <DateInput value={values.date} onChange={v => set("date", v)} error={errors.date} />
            </FormField>
            <FormField label="Categoria">
              <SelectInput
                value={values.category}
                onChange={v => set("category", v)}
                options={NEWS_CATEGORIES.filter(c => c.value !== "")}
              />
            </FormField>
          </div>

          <FileUpload
            label="Imagem de Capa"
            value={values.image}
            onChange={v => set("image", v)}
            folder="noticias"
            hint="Recomendado: 800x440px. JPG ou PNG."
            mode="both"
          />

          <FormField label="Resumo (Excerpt)">
            <TextArea value={values.excerpt} onChange={v => set("excerpt", v)} rows={3} placeholder="Breve descrição para listagens e SEO." />
          </FormField>

          <FormField label="Conteúdo Completo (HTML)" hint="Suporte a HTML. Editor rico será adicionado na próxima etapa.">
            <TextArea value={values.content} onChange={v => set("content", v)} rows={8} placeholder="<p>Conteúdo completo da notícia...</p>" style={{ fontFamily: "monospace" }} />
          </FormField>

          <div style={{ display: "flex", gap: 24 }}>
            <CheckboxInput checked={values.published} onChange={v => set("published", v)} label="Publicado" />
            <CheckboxInput checked={values.featured} onChange={v => set("featured", v)} label="Destaque na home" />
          </div>

          <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
            <Button onClick={handleSubmit} loading={submitting}>
              {isNew ? "Criar Notícia" : "Salvar Alterações"}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/admin/noticias")}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
