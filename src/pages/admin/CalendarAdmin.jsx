/**
 * CalendarAdmin.jsx
 * CRUD completo de eventos do calendário FMA.
 * Exporta: CalendarList, CalendarEditor
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import Table, { TableActions } from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import FileUpload from "../../components/ui/FileUpload";
import { FormField, TextInput, TextArea, SelectInput, CheckboxInput } from "../../components/ui/FormField";
import { useForm, required } from "../../hooks/useForm";
import { useCep } from "../../hooks/useCep";
import CepField from "../../components/common/CepField";
import { CalendarService } from "../../services/index";
import { CALENDAR_CATEGORIES, EVENT_STATUS } from "../../config/navigation";
import { COLORS, FONTS } from "../../styles/colors";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const catMap = Object.fromEntries(CALENDAR_CATEGORIES.filter(c => c.value).map(c => [c.value, c]));
const statusMap = Object.fromEntries(EVENT_STATUS.map(s => [s.value, s]));

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

const card = { background: "#fff", borderRadius: 12, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20 };
const sec = (label) => (
  <h3 style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.primary, margin: "0 0 18px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>{label}</h3>
);

// ─── Lista ────────────────────────────────────────────────────────────────────

export function CalendarList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [years, setYears] = useState([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [eventsRes, yearsRes] = await Promise.all([
      CalendarService.list({ publishedOnly: false }),
      CalendarService.getYears(),
    ]);
    if (eventsRes.data) setItems(eventsRes.data);
    if (yearsRes.data) setYears(yearsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Excluir este evento permanentemente?")) return;
    await CalendarService.delete(id);
    load();
  };

  const handleToggle = async (item) => {
    if (item.published) await CalendarService.unpublish(item.id);
    else await CalendarService.publish(item.id);
    load();
  };

  const filtered = items.filter(e => {
    if (filterCat && e.category !== filterCat) return false;
    if (filterYear && !e.date?.startsWith(filterYear)) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.city?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns = [
    {
      key: "date",
      label: "Data",
      render: (v, row) => {
        const dt = v ? new Date(v + "T12:00:00") : null;
        const cat = catMap[row.category];
        return (
          <div style={{ textAlign: "center", minWidth: 52 }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 800, color: cat?.color || COLORS.primary, lineHeight: 1 }}>
              {dt ? dt.getDate() : "?"}
            </div>
            <div style={{ fontFamily: FONTS.body, fontSize: 10, color: COLORS.gray, textTransform: "uppercase" }}>
              {dt ? dt.toLocaleDateString("pt-BR", { month: "short" }) : ""}
            </div>
            <div style={{ fontFamily: FONTS.body, fontSize: 10, color: COLORS.gray }}>{dt?.getFullYear()}</div>
          </div>
        );
      },
    },
    {
      key: "title",
      label: "Evento",
      render: (v, row) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.dark, display: "flex", alignItems: "center", gap: 6 }}>
            {row.featured && <span title="Destaque" style={{ color: "#f59e0b" }}>⭐</span>}
            {v}
          </div>
          <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 3 }}>
            {row.time && `${row.time} · `}{row.city}{row.organizer && ` · ${row.organizer}`}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Tipo",
      render: (v) => {
        const cat = catMap[v];
        return cat ? (
          <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: `${cat.color}18`, color: cat.color }}>
            {cat.icon} {cat.label}
          </span>
        ) : <span style={{ color: COLORS.gray, fontSize: 12 }}>{v}</span>;
      },
    },
    {
      key: "status",
      label: "Status",
      render: (v) => {
        const s = statusMap[v] || statusMap.confirmado;
        return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: `${s.color}18`, color: s.color }}>{s.label}</span>;
      },
    },
    {
      key: "published",
      label: "Publicado",
      render: (v) => <Badge preset={v ? "published" : "draft"} />,
    },
    {
      key: "_files",
      label: "Docs",
      render: (_, row) => (
        <div style={{ fontSize: 16, display: "flex", gap: 4 }}>
          {(row.permitFileUrl || row.permitUrl) && <span title="Permit">📋</span>}
          {row.chancelaFileUrl && <span title="Chancela">🏅</span>}
          {row.resultsFileUrl && <span title="Resultados">📊</span>}
        </div>
      ),
    },
    {
      key: "_actions",
      label: "",
      render: (_, row) => (
        <TableActions
          onToggle={() => handleToggle(row)}
          toggleLabel={row.published ? "Despublicar" : "Publicar"}
          onEdit={() => navigate(`/admin/calendario/${row.id}`)}
          onDelete={() => handleDelete(row.id)}
          extra={[{ label: "Ver →", onClick: () => window.open(`/eventos/${row.id}`, "_blank") }]}
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: 40 }}>
        <PageHeader
          title="Calendário de Eventos"
          subtitle={`${filtered.length} evento(s) • Gerencie todas as competições cadastradas.`}
          action={{ label: "+ Novo Evento", onClick: () => navigate("/admin/calendario/novo") }}
        />

        {/* Filtros admin */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
          <input
            placeholder="🔍 Buscar por título ou cidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", minWidth: 220 }}
          />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none" }}>
            <option value="">Todos os Tipos</option>
            {CALENDAR_CATEGORIES.filter(c => c.value).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none" }}>
            <option value="">Todos os Anos</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {(filterCat || filterYear || search) && (
            <button onClick={() => { setFilterCat(""); setFilterYear(""); setSearch(""); }}
              style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", cursor: "pointer", fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
              ✕ Limpar
            </button>
          )}
        </div>

        <Table columns={columns} rows={filtered} loading={loading} emptyMessage="Nenhum evento encontrado." />
      </div>
    </AdminLayout>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────

const emptyEvent = {
  title: "", date: "", time: "", location: "", city: "",
  category: "corrida", status: "confirmado",
  shortDescription: "", fullDescription: "",
  organizer: "", modalities: [],
  externalLink: "", coverImage: "",
  permitFileUrl: "", chancelaFileUrl: "", resultsFileUrl: "",
  featured: false, published: false,
  lat: null, lng: null,
};

// Editor de array de modalidades
function ModalitiesInput({ value = [], onChange }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
    setInput("");
  };
  const remove = (item) => onChange(value.filter(m => m !== item));
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {value.map(m => (
          <span key={m} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: `${COLORS.primary}15`, color: COLORS.primary, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontFamily: FONTS.heading, fontWeight: 600 }}>
            {m}
            <button onClick={() => remove(m)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.primary, padding: 0, fontSize: 13, lineHeight: 1 }}>✕</button>
          </span>
        ))}
        {value.length === 0 && <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FONTS.body }}>Nenhuma modalidade adicionada.</span>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder='Ex: "10km", "Sub-18", "Absoluto"...'
          style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none" }}
        />
        <Button variant="secondary" onClick={add} size="sm">+ Add</Button>
      </div>
    </div>
  );
}

export function CalendarEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "novo";
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    if (isNew) { setInitial({ ...emptyEvent }); return; }
    CalendarService.get(id).then(r => r.data ? setInitial(r.data) : navigate("/admin/calendario"));
  }, [id]);

  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const { cep, setCep, setNumero: cepSetNumero, loading: cepLoading, error: cepError, endereco: cepEndereco } = useCep((found) => {
    set("location", `${found.logradouro}${numero ? ", " + numero : ""}${complemento ? ", " + complemento : ""}, ${found.bairro}`);
    set("city", found.cidade);
    if (found.lat) set("lat", found.lat);
    if (found.lng) set("lng", found.lng);
  });

  const { values, errors, set, handleSubmit, submitting, serverError } = useForm(
    initial || emptyEvent,
    {
      title: required("Título é obrigatório."),
      date: required("Data é obrigatória."),
      city: required("Cidade é obrigatória."),
    },
    async (formValues) => {
      const result = isNew
        ? await CalendarService.create(formValues)
        : await CalendarService.update(id, formValues);
      if (!result.error) navigate("/admin/calendario");
      return result;
    }
  );

  if (!initial) return <AdminLayout><div style={{ padding: 40, fontFamily: FONTS.body }}>Carregando...</div></AdminLayout>;

  const catOpts = CALENDAR_CATEGORIES.filter(c => c.value).map(c => ({ value: c.value, label: `${c.icon || ""} ${c.label}` }));
  const statusOpts = EVENT_STATUS.map(s => ({ value: s.value, label: s.label }));

  return (
    <AdminLayout>
      <div style={{ padding: 40, maxWidth: 960 }}>
        <PageHeader
          title={isNew ? "Novo Evento" : `Editando: ${values.title || "..."}`}
          backTo="/admin/calendario"
          action={{ label: isNew ? "Criar Evento" : "Salvar", onClick: handleSubmit, loading: submitting }}
        />

        {serverError && (
          <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 16px", marginBottom: 16, color: "#991b1b", fontFamily: FONTS.body, fontSize: 13 }}>
            {serverError}
          </div>
        )}

        {/* ── 1. Identificação ── */}
        <div style={card}>
          {sec("Identificação do Evento")}
          <div style={{ display: "grid", gap: 16 }}>
            <FormField label="Título do Evento" required error={errors.title}>
              <TextInput value={values.title} onChange={v => set("title", v)} error={errors.title} placeholder="Ex: Campeonato Mineiro de Corridas de Rua – Etapa 1" />
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
              <FormField label="Data" required error={errors.date}>
                <input type="date" value={values.date} onChange={e => set("date", e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 7, border: `1px solid ${errors.date ? COLORS.primary : COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </FormField>
              <FormField label="Horário">
                <input type="time" value={values.time} onChange={e => set("time", e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </FormField>
              <FormField label="Tipo de Competição">
                <SelectInput value={values.category} onChange={v => set("category", v)} options={catOpts} />
              </FormField>
              <FormField label="Status do Evento">
                <SelectInput value={values.status} onChange={v => set("status", v)} options={statusOpts} />
              </FormField>
            </div>

            <FormField label="CEP do local" required>
              <CepField
                cep={cep} onChange={setCep}
                numero={numero} onNumero={(v) => {
                  setNumero(v);
                  if (cepEndereco) set("location", `${cepEndereco.logradouro}, ${v}, ${cepEndereco.bairro}`);
                }}
                loading={cepLoading} error={cepError} endereco={cepEndereco}
                required
              />
            </FormField>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
              <FormField label="Local / Endereço">
                <TextInput value={values.location} onChange={v => set("location", v)} placeholder="Preenchido automaticamente pelo CEP" />
              </FormField>
              <FormField label="Cidade" required error={errors.city}>
                <TextInput value={values.city} onChange={v => set("city", v)} error={errors.city} placeholder="Preenchida automaticamente" />
              </FormField>
            </div>

            <div style={{ display: "flex", gap: 24, paddingTop: 4, flexWrap: "wrap" }}>
              <CheckboxInput checked={values.featured} onChange={v => set("featured", v)} label="⭐ Evento em Destaque (aparece no topo da listagem)" />
              <CheckboxInput checked={values.published} onChange={v => set("published", v)} label="Publicado no site" />
            </div>
          </div>
        </div>

        {/* ── 2. Organização ── */}
        <div style={card}>
          {sec("Organização & Modalidades")}
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FormField label="Organizador" hint="Nome do clube, associação ou entidade organizadora">
                <TextInput value={values.organizer} onChange={v => set("organizer", v)} placeholder="Ex: FMA – Federação Mineira de Atletismo" />
              </FormField>
              <FormField label="Link Externo" hint="Site do evento ou do organizador">
                <TextInput value={values.externalLink} onChange={v => set("externalLink", v)} placeholder="https://..." type="url" />
              </FormField>
            </div>
            <FormField label="Modalidades / Categorias" hint="Pressione Enter ou clique + para adicionar. Ex: 10km, 5km, Sub-18, Absoluto">
              <ModalitiesInput value={values.modalities} onChange={v => set("modalities", v)} />
            </FormField>
          </div>
        </div>

        {/* ── 3. Conteúdo ── */}
        <div style={card}>
          {sec("Conteúdo do Evento")}
          <div style={{ display: "grid", gap: 16 }}>
            <FormField label="Descrição Curta" hint="Exibida nos cards e listagem (máx. 200 caracteres)">
              <TextArea value={values.shortDescription} onChange={v => set("shortDescription", v)} rows={2} placeholder="Resumo para aparecer nos cards e listagem..." />
            </FormField>
            <FormField label="Descrição Completa" hint="HTML básico aceito: <p>, <strong>, <em>, <ul>, <li>, <h3>. Exibida na página do evento.">
              <TextArea value={values.fullDescription} onChange={v => set("fullDescription", v)} rows={8}
                placeholder="<p>Descrição detalhada do evento, regulamento, percurso, categorias premiadas, etc.</p>"
                style={{ fontFamily: "monospace", fontSize: 13 }} />
            </FormField>
            {values.fullDescription && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 6 }}>Preview:</div>
                <div style={{ border: `1px dashed ${COLORS.grayLight}`, borderRadius: 8, padding: "14px 18px", background: "#fafafa", fontSize: 14, lineHeight: 1.7, fontFamily: FONTS.body }}
                  dangerouslySetInnerHTML={{ __html: values.fullDescription }} />
              </div>
            )}
          </div>
        </div>

        {/* ── 4. Arquivos & Imagem ── */}
        <div style={card}>
          {sec("Arquivos & Imagem")}
          <div style={{ display: "grid", gap: 20 }}>
            <FileUpload
              label="Imagem de Capa"
              folder="eventos"
              value={values.coverImage}
              onChange={v => set("coverImage", v)}
              hint="Recomendado: 800x440px. URL ou upload."
              mode="both"
            />

            {(() => {
              const ano = values.date ? values.date.slice(0, 4) : new Date().getFullYear().toString();
              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <FileUpload
                    label="📋 Arquivo de Permit"
                    value={values.permitFileUrl}
                    onChange={v => set("permitFileUrl", v)}
                    folder={`eventos/permits/${ano}`}
                    accept=".pdf,.doc,.docx"
                    hint={`PDF do permit · Salvo em eventos/permits/${ano}/`}
                    mode="both"
                    maxMB={10}
                  />
                  <FileUpload
                    label="🏅 Arquivo de Chancela"
                    value={values.chancelaFileUrl}
                    onChange={v => set("chancelaFileUrl", v)}
                    folder={`eventos/chancelas/${ano}`}
                    accept=".pdf,.doc,.docx"
                    hint={`PDF da chancela · Salvo em eventos/chancelas/${ano}/`}
                    mode="both"
                    maxMB={10}
                  />
                  <FileUpload
                    label="📊 Arquivo de Resultados"
                    value={values.resultsFileUrl}
                    onChange={v => set("resultsFileUrl", v)}
                    folder={`eventos/resultados/${ano}`}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                    hint={`PDF ou planilha · Salvo em eventos/resultados/${ano}/`}
                    mode="both"
                    maxMB={10}
                  />
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Botões finais ── */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={() => navigate("/admin/calendario")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} size="lg">
            {isNew ? "Criar Evento" : "Salvar Alterações"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
