import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import Table, { TableActions } from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import FileUpload from "../../components/ui/FileUpload";
import { FormField, TextInput } from "../../components/ui/FormField";
import { useCrud } from "../../hooks/useApi";
import { useForm, required } from "../../hooks/useForm";
import { PartnersService } from "../../services/index";
import { COLORS } from "../../styles/colors";

// ─── Lista ────────────────────────────────────────────────────────────────────

export function PartnersList() {
  const navigate = useNavigate();
  const { items, loading, remove, toggle } = useCrud(PartnersService, { activeOnly: false });

  const columns = [
    {
      key: "logo",
      label: "Logo",
      render: (v, row) => v
        ? <img src={v} alt={row.name} style={{ height: 40, maxWidth: 100, objectFit: "contain", borderRadius: 4, border: `1px solid ${COLORS.grayLight}`, padding: 4, background: "#fff" }} />
        : <div style={{ width: 80, height: 40, background: COLORS.grayLight, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: COLORS.gray }}>Sem logo</div>,
    },
    { key: "name", label: "Nome", wrap: true },
    {
      key: "link",
      label: "Link",
      render: (v) => v
        ? <a href={v} target="_blank" rel="noreferrer" style={{ color: COLORS.primary, fontSize: 12, wordBreak: "break-all" }}>{v}</a>
        : "—",
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
          onEdit={() => navigate(`/admin/parceiros/${row.id}`)}
          onDelete={async () => {
            if (!confirm(`Excluir "${row.name}"?`)) return;
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
          title="Parceiros"
          subtitle={`${items.length} parceiros cadastrados`}
          action={{ label: "+ Novo Parceiro", onClick: () => navigate("/admin/parceiros/novo") }}
        />
        <Table columns={columns} rows={items} loading={loading} emptyMessage="Nenhum parceiro cadastrado." />
      </div>
    </AdminLayout>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────

const empty = { name: "", logo: "", link: "", order: 1, active: true };

export function PartnersEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "novo";
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    if (isNew) { setInitial({ ...empty }); return; }
    PartnersService.get(id).then(r => r.data ? setInitial(r.data) : navigate("/admin/parceiros"));
  }, [id]);

  const { values, errors, set, handleSubmit, submitting } = useForm(
    initial || empty,
    { name: required("Nome é obrigatório.") },
    async (formValues) => {
      const result = isNew
        ? await PartnersService.create(formValues)
        : await PartnersService.update(id, formValues);
      if (!result.error) navigate("/admin/parceiros");
      return result;
    }
  );

  if (!initial) return <AdminLayout><div style={{ padding: 40 }}>Carregando...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div style={{ padding: 40, maxWidth: 700 }}>
        <PageHeader
          title={isNew ? "Novo Parceiro" : "Editar Parceiro"}
          backTo="/admin/parceiros"
        />
        <div style={{ background: "#fff", borderRadius: 12, padding: 32, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "grid", gap: 20 }}>

          <FormField label="Nome do Parceiro" required error={errors.name}>
            <TextInput value={values.name} onChange={v => set("name", v)} error={errors.name} placeholder="Ex: CBAT – Confederação Brasileira de Atletismo" />
          </FormField>

          <FileUpload
            label="Logo"
            value={values.logo}
            onChange={v => set("logo", v)}
            hint="Recomendado: 160x80px, fundo transparente (PNG) ou branco. URL ou upload."
            mode="both"
          />

          <FormField label="Link do Site (URL completa)">
            <TextInput value={values.link} onChange={v => set("link", v)} placeholder="https://www.parceiro.com.br" type="url" />
          </FormField>

          <FormField label="Ordem de Exibição" hint="Menor número = aparece primeiro.">
            <TextInput value={String(values.order)} onChange={v => set("order", parseInt(v) || 1)} type="number" />
          </FormField>

          <div style={{ display: "flex", gap: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: "sans-serif", fontSize: 14 }}>
              <input type="checkbox" checked={values.active} onChange={e => set("active", e.target.checked)} style={{ accentColor: COLORS.primary }} />
              Ativo (exibir no site)
            </label>
          </div>

          <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
            <Button onClick={handleSubmit} loading={submitting}>
              {isNew ? "Criar Parceiro" : "Salvar Alterações"}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/admin/parceiros")}>Cancelar</Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
