import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import Table, { TableActions } from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { FormField, TextInput, SelectInput } from "../../components/ui/FormField";
import FileUpload from "../../components/ui/FileUpload";
import { useCrud } from "../../hooks/useApi";
import { useForm, required } from "../../hooks/useForm";
import { SocialLinksService } from "../../services/index";
import { SOCIAL_NETWORKS } from "../../config/navigation";
import { COLORS, FONTS } from "../../styles/colors";

/** Retorna true se o valor parece ser URL de imagem (não emoji) */
function isImageUrl(v) {
  return v && (v.startsWith("http") || v.startsWith("data:"));
}

/** Renderiza ícone social — imagem se URL, emoji caso contrário */
function SocialIcon({ icon, size = 24 }) {
  if (isImageUrl(icon)) {
    return <img src={icon} alt="" style={{ width: size, height: size, objectFit: "contain", borderRadius: 4 }} />;
  }
  return <span style={{ fontSize: size }}>{icon}</span>;
}

/** Mostra dimensões da imagem após carregamento */
function ImageDimensions({ src }) {
  const [dims, setDims] = useState(null);
  useEffect(() => {
    if (!src) { setDims(null); return; }
    const img = new Image();
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setDims(null);
    img.src = src;
  }, [src]);
  if (!dims) return null;
  return (
    <span style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
      Dimensões: {dims.w} × {dims.h}px
    </span>
  );
}

// ─── Lista ────────────────────────────────────────────────────────────────────

export function SocialLinksList() {
  const navigate = useNavigate();
  const { items, loading, remove, toggle } = useCrud(SocialLinksService, { activeOnly: false });

  const columns = [
    {
      key: "icon",
      label: "Ícone",
      render: (v) => <SocialIcon icon={v} size={24} />,
    },
    { key: "label", label: "Rede" },
    {
      key: "url",
      label: "URL",
      render: (v) => (
        <a href={v} target="_blank" rel="noreferrer"
          style={{ color: COLORS.primary, fontSize: 12, wordBreak: "break-all" }}>
          {v}
        </a>
      ),
    },
    { key: "order", label: "Ordem" },
    {
      key: "active",
      label: "Status",
      render: (v) => <Badge preset={v ? "active" : "inactive"} />,
    },
    {
      key: "_actions",
      label: "",
      render: (_, row) => (
        <TableActions
          onToggle={() => toggle(row, "active")}
          toggleLabel={row.active ? "Desativar" : "Ativar"}
          onEdit={() => navigate(`/admin/redes-sociais/${row.id}`)}
          onDelete={async () => {
            if (!confirm(`Excluir "${row.label}"?`)) return;
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
          title="Redes Sociais"
          subtitle="Gerencie os links de redes sociais exibidos no site e no rodapé."
          action={{ label: "+ Nova Rede Social", onClick: () => navigate("/admin/redes-sociais/novo") }}
        />
        <Table columns={columns} rows={items} loading={loading} emptyMessage="Nenhuma rede social cadastrada." />
      </div>
    </AdminLayout>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────

const empty = { network: "instagram", label: "Instagram", url: "", icon: "📸", order: 1, active: true };

export function SocialLinksEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "novo";
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    if (isNew) { setInitial({ ...empty }); return; }
    SocialLinksService.get(id).then(r => r.data ? setInitial(r.data) : navigate("/admin/redes-sociais"));
  }, [id]);

  const { values, errors, set, handleSubmit, submitting } = useForm(
    initial || empty,
    {
      url: required("URL é obrigatória."),
      label: required("Nome/label é obrigatório."),
    },
    async (formValues) => {
      const result = isNew
        ? await SocialLinksService.create(formValues)
        : await SocialLinksService.update(id, formValues);
      if (!result.error) navigate("/admin/redes-sociais");
      return result;
    }
  );

  // Auto-fill icon and label when network changes
  const handleNetworkChange = (network) => {
    const preset = SOCIAL_NETWORKS.find(n => n.value === network);
    set("network", network);
    if (preset) {
      set("icon", preset.icon);
      if (!values.label || values.label === (SOCIAL_NETWORKS.find(n => n.value === values.network)?.label)) {
        set("label", preset.label);
      }
    }
  };

  if (!initial) return <AdminLayout><div style={{ padding: 40 }}>Carregando...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div style={{ padding: 40, maxWidth: 700 }}>
        <PageHeader
          title={isNew ? "Nova Rede Social" : "Editar Rede Social"}
          backTo="/admin/redes-sociais"
        />
        <div style={{ background: "#fff", borderRadius: 12, padding: 32, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "grid", gap: 20 }}>

          <FormField label="Rede Social">
            <SelectInput
              value={values.network}
              onChange={handleNetworkChange}
              options={SOCIAL_NETWORKS}
            />
          </FormField>

          <FormField label="Label (nome de exibição)" required error={errors.label}>
            <TextInput value={values.label} onChange={v => set("label", v)} error={errors.label} placeholder="Ex: Instagram" />
          </FormField>

          <FileUpload
            label="Ícone / Imagem"
            value={isImageUrl(values.icon) ? values.icon : ""}
            onChange={(url) => set("icon", url)}
            folder="redes-sociais"
            accept="image/*"
            hint="Recomendado: imagem quadrada (ex: 64x64px). PNG ou SVG com fundo transparente."
            maxMB={2}
          />
          {isImageUrl(values.icon) && <ImageDimensions src={values.icon} />}

          {/* Fallback: emoji caso não use imagem */}
          {!isImageUrl(values.icon) && (
            <FormField label="Ou usar Emoji como ícone" hint="Se não enviar imagem, o emoji será usado.">
              <TextInput value={values.icon} onChange={v => set("icon", v)} placeholder="📸" />
            </FormField>
          )}

          <FormField label="URL" required error={errors.url} hint="URL completa incluindo https://">
            <TextInput value={values.url} onChange={v => set("url", v)} error={errors.url} placeholder="https://instagram.com/fmaatletismo" type="url" />
          </FormField>

          <FormField label="Ordem de Exibição" hint="Menor número = aparece primeiro.">
            <TextInput value={String(values.order)} onChange={v => set("order", parseInt(v) || 1)} type="number" />
          </FormField>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
            <input type="checkbox" checked={values.active} onChange={e => set("active", e.target.checked)} style={{ accentColor: COLORS.primary }} />
            Ativo (exibir no site e rodapé)
          </label>

          {/* Preview */}
          {values.url && (
            <div style={{ background: COLORS.offWhite || "#f7f7f7", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <SocialIcon icon={values.icon} size={24} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{values.label}</div>
                <div style={{ fontSize: 11, color: COLORS.gray }}>{values.url}</div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
            <Button onClick={handleSubmit} loading={submitting}>
              {isNew ? "Criar" : "Salvar Alterações"}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/admin/redes-sociais")}>Cancelar</Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
