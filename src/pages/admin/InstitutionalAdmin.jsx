/**
 * InstitutionalAdmin.jsx
 *
 * Três "telas" dentro de um único arquivo, roteadas pelo React Router:
 *   /admin/institucional             → InstitutionalList   (lista de páginas)
 *   /admin/institucional/:pageId     → PageEditor          (metadados + gerenciador de seções)
 *   /admin/institucional/:pageId/secoes/:sectionId → SectionEditor (editor de bloco)
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Table, { TableActions } from "../../components/ui/Table";
import { FormField, TextInput, TextArea, SelectInput, CheckboxInput } from "../../components/ui/FormField";
import FileUpload from "../../components/ui/FileUpload";
import { deleteFile } from "../../services/storageService";
import { useForm, required } from "../../hooks/useForm";
import {
  InstitutionalPagesService,
  InstitutionalSectionsService,
} from "../../services/index";
import { COLORS, FONTS } from "../../styles/colors";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(str = "") {
  return str.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-");
}

const LAYOUT_OPTIONS = [
  { value: "text",            label: "Apenas texto" },
  { value: "text-image",      label: "Texto + Imagem" },
  { value: "text-file",       label: "Texto + Arquivo para download" },
  { value: "file",            label: "Apenas arquivo para download" },
  { value: "text-image-file", label: "Texto + Imagem + Arquivo" },
];

const IMAGE_POSITION_OPTIONS = [
  { value: "right", label: "Imagem à direita" },
  { value: "left",  label: "Imagem à esquerda" },
  { value: "top",   label: "Imagem acima do texto" },
];

const card = {
  background: "#fff",
  borderRadius: 12,
  padding: "28px 32px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  marginBottom: 24,
};

const sectionHeading = (text) => (
  <h3 style={{
    fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: 2, color: COLORS.primary,
    margin: "0 0 20px", paddingBottom: 10,
    borderBottom: `1px solid ${COLORS.grayLight}`,
  }}>{text}</h3>
);

// ─── 1. Lista de Páginas ──────────────────────────────────────────────────────

export function InstitutionalList() {
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await InstitutionalPagesService.list({ publishedOnly: false });
    if (r.data) setPages(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (page) => {
    if (page.published) await InstitutionalPagesService.unpublish(page.id);
    else await InstitutionalPagesService.publish(page.id);
    load();
  };

  const handleDelete = async (page) => {
    if (!confirm(`Excluir a página "${page.title}" e TODAS as suas seções? Esta ação não pode ser desfeita.`)) return;
    // Limpar arquivos das seções do Storage
    const secRes = await InstitutionalSectionsService.list({ pageId: page.id, publishedOnly: false });
    (secRes.data || []).forEach(sec => {
      if (sec.image) deleteFile(sec.image).catch(() => {});
      if (sec.fileUrl) deleteFile(sec.fileUrl).catch(() => {});
    });
    await InstitutionalPagesService.delete(page.id);
    load();
  };

  const handleMoveUp = async (page, index) => {
    if (index === 0) return;
    const newOrder = [...pages];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setPages(newOrder);
    await InstitutionalPagesService.reorder(newOrder.map(p => p.id));
  };

  const handleMoveDown = async (page, index) => {
    if (index === pages.length - 1) return;
    const newOrder = [...pages];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setPages(newOrder);
    await InstitutionalPagesService.reorder(newOrder.map(p => p.id));
  };

  const columns = [
    { key: "order", label: "#", render: (v) => <span style={{ fontWeight: 700, color: COLORS.gray }}>{v}</span> },
    {
      key: "title",
      label: "Página",
      render: (v, row) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.dark }}>{v}</div>
          <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>
            /{row.slug} {row.showInNav && <span style={{ color: COLORS.primary }}>• no menu</span>}
          </div>
        </div>
      ),
    },
    {
      key: "description",
      label: "Descrição",
      render: (v) => <span style={{ fontSize: 13, color: COLORS.gray }}>{v || "—"}</span>,
    },
    {
      key: "published",
      label: "Status",
      render: (v) => <Badge preset={v ? "published" : "draft"} />,
    },
    {
      key: "_reorder",
      label: "Ordem",
      render: (_, row, index) => (
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => handleMoveUp(row, index)}
            disabled={index === 0}
            style={{ background: "none", border: `1px solid ${COLORS.grayLight}`, borderRadius: 4, padding: "2px 8px", cursor: "pointer", opacity: index === 0 ? 0.3 : 1, fontSize: 13 }}>↑</button>
          <button onClick={() => handleMoveDown(row, index)}
            disabled={index === pages.length - 1}
            style={{ background: "none", border: `1px solid ${COLORS.grayLight}`, borderRadius: 4, padding: "2px 8px", cursor: "pointer", opacity: index === pages.length - 1 ? 0.3 : 1, fontSize: 13 }}>↓</button>
        </div>
      ),
    },
    {
      key: "_actions",
      label: "",
      render: (_, row, index) => (
        <TableActions
          onToggle={() => handleToggle(row)}
          toggleLabel={row.published ? "Ocultar" : "Publicar"}
          onEdit={() => navigate(`/admin/institucional/${row.id}`)}
          onDelete={() => handleDelete(row)}
          extra={[{
            label: "Ver página →",
            onClick: () => window.open(`/institucional/${row.slug}`, "_blank"),
          }]}
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: 40 }}>
        <PageHeader
          title="Páginas Institucionais"
          subtitle="Gerencie todas as páginas da aba 'A FMA'. Cada página pode ter múltiplas seções de conteúdo."
          action={{ label: "+ Nova Página", onClick: () => navigate("/admin/institucional/nova") }}
        />
        <div style={{ background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: 8, padding: "12px 18px", marginBottom: 24, fontSize: 13, color: "#92400e", fontFamily: FONTS.body }}>
          💡 <strong>Dica:</strong> Cada página pode ter quantas seções de conteúdo quiser — texto, imagem, arquivo ou combinações. Para editar o conteúdo, clique no botão de edição da página.
        </div>
        <Table columns={columns} rows={pages} loading={loading} emptyMessage="Nenhuma página institucional cadastrada." />
      </div>
    </AdminLayout>
  );
}

// ─── 2. Editor de Página (metadados + lista de seções) ────────────────────────

const emptyPage = {
  title: "", slug: "", menuLabel: "", description: "",
  order: 1, published: false, showInNav: true,
};

export function PageEditor() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const isNew = pageId === "nova";
  const [initialPage, setInitialPage] = useState(null);
  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [slugLocked, setSlugLocked] = useState(!isNew);

  useEffect(() => {
    if (isNew) { setInitialPage({ ...emptyPage }); return; }
    InstitutionalPagesService.get(pageId).then(r => {
      if (!r.data) { navigate("/admin/institucional"); return; }
      setInitialPage(r.data);
    });
    loadSections();
  }, [pageId]);

  const loadSections = useCallback(async () => {
    if (isNew) return;
    setSectionsLoading(true);
    const r = await InstitutionalSectionsService.list({ pageId, publishedOnly: false });
    if (r.data) setSections(r.data);
    setSectionsLoading(false);
  }, [pageId, isNew]);

  const { values, errors, set, handleSubmit, submitting } = useForm(
    initialPage || emptyPage,
    { title: required("Título é obrigatório.") },
    async (formValues) => {
      const payload = {
        ...formValues,
        slug: formValues.slug || slugify(formValues.title),
        menuLabel: formValues.menuLabel || formValues.title,
      };
      const result = isNew
        ? await InstitutionalPagesService.create(payload)
        : await InstitutionalPagesService.update(pageId, payload);
      if (!result.error) {
        if (isNew) navigate(`/admin/institucional/${result.data.id}`);
      }
      return result;
    }
  );

  const handleToggleSection = async (section) => {
    if (section.published) await InstitutionalSectionsService.unpublish(section.id);
    else await InstitutionalSectionsService.publish(section.id);
    loadSections();
  };

  const handleDeleteSection = async (section) => {
    if (!confirm(`Excluir a seção "${section.title}"?`)) return;
    if (section.image) deleteFile(section.image).catch(() => {});
    if (section.fileUrl) deleteFile(section.fileUrl).catch(() => {});
    await InstitutionalSectionsService.delete(section.id);
    loadSections();
  };

  const handleMoveSectionUp = async (section, index) => {
    if (index === 0) return;
    const newOrder = [...sections];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setSections(newOrder);
    await InstitutionalSectionsService.reorder(pageId, newOrder.map(s => s.id));
  };

  const handleMoveSectionDown = async (section, index) => {
    if (index === sections.length - 1) return;
    const newOrder = [...sections];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setSections(newOrder);
    await InstitutionalSectionsService.reorder(pageId, newOrder.map(s => s.id));
  };

  if (!initialPage) return <AdminLayout><div style={{ padding: 40 }}>Carregando...</div></AdminLayout>;

  const layoutLabel = LAYOUT_OPTIONS.find(l => l.value === (v => v)(""))?.label;

  const sectionColumns = [
    { key: "order", label: "#", render: (v) => <span style={{ fontWeight: 700, color: COLORS.gray }}>{v}</span> },
    {
      key: "title",
      label: "Seção",
      render: (v, row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
          <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>
            {LAYOUT_OPTIONS.find(l => l.value === row.layout)?.label || row.layout}
            {row.fileUrl && " • 📎 arquivo"}
            {row.image && " • 🖼️ imagem"}
          </div>
        </div>
      ),
    },
    {
      key: "published",
      label: "Status",
      render: (v) => <Badge preset={v ? "published" : "draft"} />,
    },
    {
      key: "_reorder",
      label: "Ordem",
      render: (_, row, index) => (
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => handleMoveSectionUp(row, index)} disabled={index === 0}
            style={{ background: "none", border: `1px solid ${COLORS.grayLight}`, borderRadius: 4, padding: "2px 8px", cursor: "pointer", opacity: index === 0 ? 0.3 : 1, fontSize: 13 }}>↑</button>
          <button onClick={() => handleMoveSectionDown(row, index)} disabled={index === sections.length - 1}
            style={{ background: "none", border: `1px solid ${COLORS.grayLight}`, borderRadius: 4, padding: "2px 8px", cursor: "pointer", opacity: index === sections.length - 1 ? 0.3 : 1, fontSize: 13 }}>↓</button>
        </div>
      ),
    },
    {
      key: "_actions",
      label: "",
      render: (_, row) => (
        <TableActions
          onToggle={() => handleToggleSection(row)}
          toggleLabel={row.published ? "Rascunho" : "Publicar"}
          onEdit={() => navigate(`/admin/institucional/${pageId}/secoes/${row.id}`)}
          onDelete={() => handleDeleteSection(row)}
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: 40, maxWidth: 900 }}>
        <PageHeader
          title={isNew ? "Nova Página Institucional" : `Editando: ${values.title || "..."}`}
          subtitle={isNew ? "Preencha os dados básicos. Após salvar, você poderá adicionar seções de conteúdo." : `/${values.slug}`}
          backTo="/admin/institucional"
        />

        {/* ── Metadados da página ── */}
        <div style={card}>
          {sectionHeading("Informações da Página")}
          <div style={{ display: "grid", gap: 18 }}>
            <FormField label="Título da Página" required error={errors.title}>
              <TextInput
                value={values.title}
                onChange={v => {
                  set("title", v);
                  if (!slugLocked) set("slug", slugify(v));
                  if (!values.menuLabel) set("menuLabel", v);
                }}
                error={errors.title}
                placeholder="Ex: Sobre a FMA"
              />
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <FormField
                label="Slug (URL)"
                hint={`Endereço público: /institucional/${values.slug || "..."}`}
              >
                <div style={{ display: "flex", gap: 8 }}>
                  <TextInput
                    value={values.slug}
                    onChange={v => set("slug", v)}
                    placeholder="sobre-a-fma"
                    disabled={slugLocked && !isNew}
                  />
                  {!isNew && (
                    <button
                      onClick={() => setSlugLocked(l => !l)}
                      title={slugLocked ? "Desbloquear para editar" : "Bloquear slug"}
                      style={{ padding: "0 12px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "#fff", cursor: "pointer", fontSize: 16, flexShrink: 0 }}
                    >{slugLocked ? "🔒" : "🔓"}</button>
                  )}
                </div>
              </FormField>

              <FormField label="Label no Menu" hint="Texto que aparece no sub-menu 'A FMA'">
                <TextInput value={values.menuLabel} onChange={v => set("menuLabel", v)} placeholder="Ex: Sobre Nós" />
              </FormField>
            </div>

            <FormField label="Descrição / Subtítulo" hint="Texto breve exibido no topo da página">
              <TextArea value={values.description} onChange={v => set("description", v)} rows={2} placeholder="Ex: Conheça a história e os valores da FMA." />
            </FormField>

            <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
              <CheckboxInput checked={values.published} onChange={v => set("published", v)} label="Publicar página (visível no site)" />
              <CheckboxInput checked={values.showInNav} onChange={v => set("showInNav", v)} label="Exibir no sub-menu 'A FMA'" />
            </div>

            <div style={{ display: "flex", gap: 12, paddingTop: 4 }}>
              <Button onClick={handleSubmit} loading={submitting}>
                {isNew ? "Criar Página" : "Salvar Alterações"}
              </Button>
              {!isNew && (
                <Button variant="ghost" onClick={() => window.open(`/institucional/${values.slug}`, "_blank")}>
                  Ver Página Pública →
                </Button>
              )}
              <Button variant="ghost" onClick={() => navigate("/admin/institucional")}>Cancelar</Button>
            </div>
          </div>
        </div>

        {/* ── Gerenciador de Seções ── */}
        {!isNew && (
          <div style={card}>
            {sectionHeading("Seções de Conteúdo")}
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ margin: 0, fontSize: 13, color: COLORS.gray, fontFamily: FONTS.body }}>
                {sections.length === 0
                  ? "Nenhuma seção ainda. Adicione blocos de conteúdo abaixo."
                  : `${sections.length} seção(ões) — arraste ↑↓ para reordenar.`}
              </p>
              <Button
                variant="secondary"
                onClick={() => navigate(`/admin/institucional/${pageId}/secoes/nova`)}
              >
                + Nova Seção
              </Button>
            </div>
            <Table
              columns={sectionColumns}
              rows={sections}
              loading={sectionsLoading}
              emptyMessage="Nenhuma seção de conteúdo criada para esta página."
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ─── 3. Editor de Seção ───────────────────────────────────────────────────────

const emptySection = {
  title: "", subtitle: "", content: "",
  image: "", imagePosition: "right",
  fileUrl: "", fileLabel: "",
  layout: "text", bgColor: "",
  order: 1, published: true,
};

export function SectionEditor() {
  const { pageId, sectionId } = useParams();
  const navigate = useNavigate();
  const isNew = sectionId === "nova";
  const [initialSection, setInitialSection] = useState(null);
  const [pageTitle, setPageTitle] = useState("");

  useEffect(() => {
    InstitutionalPagesService.get(pageId).then(r => r.data && setPageTitle(r.data.title));
    if (isNew) { setInitialSection({ ...emptySection, pageId }); return; }
    InstitutionalSectionsService.get(sectionId).then(r => {
      if (!r.data) { navigate(`/admin/institucional/${pageId}`); return; }
      setInitialSection(r.data);
    });
  }, [pageId, sectionId]);

  const { values, errors, set, handleSubmit, submitting, serverError } = useForm(
    initialSection || { ...emptySection, pageId },
    { title: required("Título da seção é obrigatório.") },
    async (formValues) => {
      const result = isNew
        ? await InstitutionalSectionsService.create({ ...formValues, pageId })
        : await InstitutionalSectionsService.update(sectionId, formValues);
      if (!result.error) navigate(`/admin/institucional/${pageId}`);
      return result;
    }
  );

  const showImage = ["text-image", "text-image-file"].includes(values.layout);
  const showFile  = ["text-file", "file", "text-image-file"].includes(values.layout);
  const showText  = values.layout !== "file";

  if (!initialSection) return <AdminLayout><div style={{ padding: 40 }}>Carregando...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div style={{ padding: 40, maxWidth: 860 }}>
        <PageHeader
          title={isNew ? "Nova Seção de Conteúdo" : `Editando Seção: ${values.title || "..."}`}
          subtitle={pageTitle ? `Página: ${pageTitle}` : ""}
          backTo={`/admin/institucional/${pageId}`}
        />

        {/* Layout selector — mostrado primeiro porque define o resto */}
        <div style={card}>
          {sectionHeading("Tipo de Conteúdo")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {LAYOUT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => set("layout", opt.value)}
                style={{
                  padding: "14px 16px", borderRadius: 8, cursor: "pointer",
                  border: `2px solid ${values.layout === opt.value ? COLORS.primary : COLORS.grayLight}`,
                  background: values.layout === opt.value ? "#fff5f5" : "#fff",
                  color: values.layout === opt.value ? COLORS.primary : COLORS.grayDark,
                  fontFamily: FONTS.heading, fontWeight: 600, fontSize: 13,
                  textAlign: "left", transition: "all 0.15s",
                }}
              >
                {opt.value === "text"            && "📝 "}
                {opt.value === "text-image"      && "🖼️ "}
                {opt.value === "text-file"       && "📄 "}
                {opt.value === "file"            && "📥 "}
                {opt.value === "text-image-file" && "🗂️ "}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Campos comuns */}
        <div style={card}>
          {sectionHeading("Identificação da Seção")}
          <div style={{ display: "grid", gap: 16 }}>
            <FormField label="Título da Seção" required error={errors.title}>
              <TextInput value={values.title} onChange={v => set("title", v)} error={errors.title} placeholder="Ex: Quem Somos" />
            </FormField>
            <FormField label="Subtítulo" hint="Opcional — aparece abaixo do título em texto menor">
              <TextInput value={values.subtitle} onChange={v => set("subtitle", v)} placeholder="Ex: A entidade máxima do atletismo mineiro" />
            </FormField>
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 16 }}>
              <FormField label="Cor de Fundo" hint="Ex: #f7f7f7 ou vazio">
                <TextInput value={values.bgColor} onChange={v => set("bgColor", v)} placeholder="#f7f7f7" />
              </FormField>
              {values.bgColor && (
                <div style={{ alignSelf: "end", height: 40, borderRadius: 6, background: values.bgColor, border: `1px solid ${COLORS.grayLight}` }} />
              )}
            </div>
          </div>
        </div>

        {/* Texto rico */}
        {showText && (
          <div style={card}>
            {sectionHeading("Conteúdo em Texto")}
            <FormField label="Texto" hint="Aceita HTML básico: <p>, <strong>, <em>, <ul>, <li>, <h3>, <h4>, <a>">
              <TextArea
                value={values.content}
                onChange={v => set("content", v)}
                rows={10}
                placeholder="<p>Digite o conteúdo aqui. Você pode usar HTML básico para formatação.</p>"
                style={{ fontFamily: "monospace", fontSize: 13 }}
              />
            </FormField>
            {/* Preview do HTML */}
            {values.content && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 8 }}>Preview do texto:</div>
                <div
                  style={{ border: `1px dashed ${COLORS.grayLight}`, borderRadius: 8, padding: "16px 20px", background: "#fafafa", fontSize: 14, lineHeight: 1.7, fontFamily: FONTS.body, color: COLORS.dark }}
                  dangerouslySetInnerHTML={{ __html: values.content }}
                />
              </div>
            )}
          </div>
        )}

        {/* Imagem */}
        {showImage && (
          <div style={card}>
            {sectionHeading("Imagem")}
            <FileUpload
              label="Imagem da Seção"
              value={values.image}
              onChange={v => set("image", v)}
              folder="institucional"
              hint="Recomendado: 700x420px. URL ou upload."
              mode="both"
            />
            <div style={{ marginTop: 16 }}>
              <FormField label="Posição da Imagem">
                <SelectInput value={values.imagePosition} onChange={v => set("imagePosition", v)} options={IMAGE_POSITION_OPTIONS} />
              </FormField>
            </div>
          </div>
        )}

        {/* Arquivo */}
        {showFile && (
          <div style={card}>
            {sectionHeading("Arquivo para Download")}
            <div style={{ display: "grid", gap: 16 }}>
              <FileUpload
                label="Arquivo (URL)"
                value={values.fileUrl}
                onChange={v => set("fileUrl", v)}
                hint="Cole a URL do arquivo (PDF, DOCX, etc.) hospedado no servidor."
                mode="url"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip"
              />
              <FormField label="Texto do Botão de Download" hint="Ex: Baixar Estatuto (PDF)">
                <TextInput value={values.fileLabel} onChange={v => set("fileLabel", v)} placeholder="Baixar documento (PDF)" />
              </FormField>
            </div>
          </div>
        )}

        {/* Status + salvar */}
        <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <CheckboxInput checked={values.published} onChange={v => set("published", v)} label="Publicar seção (visível no site)" />
          {serverError && <div style={{ color: "red", fontSize: 13 }}>{serverError}</div>}
          <div style={{ display: "flex", gap: 12 }}>
            <Button onClick={handleSubmit} loading={submitting}>
              {isNew ? "Criar Seção" : "Salvar Alterações"}
            </Button>
            <Button variant="ghost" onClick={() => navigate(`/admin/institucional/${pageId}`)}>Cancelar</Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
