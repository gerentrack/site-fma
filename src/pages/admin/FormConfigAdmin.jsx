/**
 * FormConfigAdmin.jsx — Painel de configuração de formulários de solicitação.
 * Rota: /admin/formularios
 *
 * Permite ao admin da FMA:
 *   - Ativar/desativar campos (mostrar/ocultar no formulário do organizador)
 *   - Editar labels dos campos
 *   - Alterar obrigatoriedade de campos built-in
 *   - Adicionar novos campos customizados (text, textarea, number, upload)
 *   - Reordenar campos dentro de cada seção
 *   - Excluir campos customizados
 *   - Resetar para defaults
 *
 * Aplicado separadamente para Permit e Chancela (abas).
 */
import { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { COLORS, FONTS } from "../../styles/colors";
import Icon from "../../utils/icons";
import {
  getFormConfig, saveFormConfig, resetFormConfig,
  FORM_SECTIONS, PERMIT_FIELDS_DEFAULT, CHANCELA_FIELDS_DEFAULT,
  gerarCampoCustomId,
} from "../../utils/formSchema";

const TYPE_LABELS = {
  text:     "Texto curto",
  textarea: "Texto longo",
  number:   "Número",
  date:     "Data",
  time:     "Horário",
  select:   "Seleção (lista)",
  checkbox: "Caixa de seleção",
  upload:   "Upload de arquivo",
};

const TYPE_ICONS = {
  text: "T", textarea: "Aa", number: "#", date: "D",
  time: "H", select: "L", checkbox: "V", upload: "U",
};

const SECTIONS_ORDER = {
  permit:   ["datas", "financeiro", "tecnico", "infraestrutura", "composicao", "documentos"],
  chancela: ["identificacao", "financeiro", "tecnico", "equipemedica", "dadosfiscais", "seguros", "documentos"],
};

export default function FormConfigAdmin() {
  const [tipo, setTipo]       = useState("permit");
  const [fields, setFields]   = useState([]);
  const [saved, setSaved]     = useState(false);
  const [addingTo, setAddingTo] = useState(null); // sectionId or null
  const [newField, setNewField] = useState({ label: "", type: "text", required: false, hint: "" });
  const [editingId, setEditingId] = useState(null); // id of field being label-edited

  useEffect(() => { loadFields(); }, [tipo]);

  const loadFields = () => {
    const config = getFormConfig();
    setFields(config[tipo] || []);
    setSaved(false);
    setAddingTo(null);
    setEditingId(null);
  };

  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 16 };

  const updateField = (id, patch) => {
    setFields(fs => fs.map(f => f.id === id ? { ...f, ...patch } : f));
    setSaved(false);
  };

  const moveField = (id, dir) => {
    setFields(fs => {
      const f = fs.find(x => x.id === id);
      if (!f) return fs;
      const sectionFields = fs.filter(x => x.section === f.section).sort((a, b) => (a.order || 0) - (b.order || 0));
      const idx = sectionFields.findIndex(x => x.id === id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= sectionFields.length) return fs;
      // Swap orders
      const orders = sectionFields.map(x => x.order || 0);
      const [o1, o2] = [orders[idx], orders[newIdx]];
      return fs.map(x => {
        if (x.id === sectionFields[idx].id)    return { ...x, order: o2 };
        if (x.id === sectionFields[newIdx].id) return { ...x, order: o1 };
        return x;
      });
    });
    setSaved(false);
  };

  const deleteField = (id) => {
    if (!window.confirm("Excluir este campo customizado? Esta ação não pode ser desfeita.")) return;
    setFields(fs => fs.filter(f => f.id !== id));
    setSaved(false);
  };

  const handleAddField = (sectionId) => {
    if (!newField.label.trim()) return;
    const maxOrder = Math.max(0, ...fields.filter(f => f.section === sectionId).map(f => f.order || 0));
    const f = {
      id:       gerarCampoCustomId(tipo),
      label:    newField.label.trim(),
      type:     newField.type,
      section:  sectionId,
      required: newField.required,
      active:   true,
      builtin:  false,
      order:    maxOrder + 10,
      hint:     newField.hint.trim(),
      options:  [],
      accept:   newField.type === "upload" ? ".pdf,.doc,.docx,.jpg,.png" : undefined,
    };
    setFields(fs => [...fs, f]);
    setNewField({ label: "", type: "text", required: false, hint: "" });
    setAddingTo(null);
    setSaved(false);
  };

  const handleSave = () => {
    saveFormConfig(tipo, fields);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (!window.confirm(`Resetar o formulário de ${tipo === "permit" ? "Permit" : "Chancela"} para os valores padrão? Todos os campos customizados serão perdidos.`)) return;
    resetFormConfig(tipo);
    loadFields();
  };

  // Agrupar por seção
  const grouped = {};
  fields.forEach(f => {
    if (!grouped[f.section]) grouped[f.section] = [];
    grouped[f.section].push(f);
  });
  const sectionOrder = SECTIONS_ORDER[tipo] || [];

  const inp = { width: "100%", padding: "8px 11px", borderRadius: 7, border: `1.5px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff" };

  return (
    <AdminLayout>
      <div style={{ padding: "32px 36px 60px", maxWidth: 900 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.primary, marginBottom: 6 }}>Admin FMA</div>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, color: COLORS.dark, margin: 0, textTransform: "uppercase" }}>Formulários de Solicitação</h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "6px 0 0" }}>
            Configure os campos exibidos no portal para Permit e Chancela. Alterações entram em vigor imediatamente para novas solicitações.
          </p>
        </div>

        {/* Abas Permit / Chancela */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24, background: "#fff", borderRadius: 10, padding: 4, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", width: "fit-content" }}>
          {[{ v: "permit", l: "Permit" }, { v: "chancela", l: "Chancela" }].map(t => (
            <button key={t.v} onClick={() => setTipo(t.v)}
              style={{ padding: "9px 24px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, transition: "all 0.15s",
                background: tipo === t.v ? COLORS.dark : "transparent",
                color: tipo === t.v ? "#fff" : COLORS.gray }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Resumo */}
        <div style={{ ...card, background: "#f0f9ff", border: "1px solid #bae6fd", display: "flex", gap: 20, marginBottom: 20 }}>
          {["active", "required", "custom"].map(k => {
            const count = k === "active"   ? fields.filter(f => f.active).length
                        : k === "required" ? fields.filter(f => f.required && f.active).length
                        : fields.filter(f => !f.builtin).length;
            const label = k === "active" ? "campos ativos" : k === "required" ? "obrigatórios" : "campos customizados";
            return (
              <div key={k} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: COLORS.dark }}>{count}</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{label}</div>
              </div>
            );
          })}
        </div>

        {/* Seções e campos */}
        {sectionOrder.map(sectionId => {
          const sectionFields = (grouped[sectionId] || []).sort((a, b) => (a.order || 0) - (b.order || 0));
          const sectionMeta   = FORM_SECTIONS[sectionId];
          if (!sectionMeta && !sectionFields.length) return null;

          return (
            <div key={sectionId} style={card}>
              {/* Header da seção */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottom: `2px solid ${COLORS.grayLight}` }}>
                <h2 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: 0 }}>
                  {sectionMeta?.title || sectionId}
                </h2>
                <button onClick={() => setAddingTo(addingTo === sectionId ? null : sectionId)}
                  style={{ padding: "5px 14px", borderRadius: 7, border: `1.5px solid ${COLORS.primary}`, background: "#fff", color: COLORS.primary, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>
                  + Adicionar campo
                </button>
              </div>

              {/* Lista de campos */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sectionFields.map((f, idx) => (
                  <FieldRow
                    key={f.id} field={f}
                    isFirst={idx === 0}
                    isLast={idx === sectionFields.length - 1}
                    isEditing={editingId === f.id}
                    onToggleActive={() => updateField(f.id, { active: !f.active })}
                    onToggleRequired={() => updateField(f.id, { required: !f.required })}
                    onLabelChange={label => updateField(f.id, { label })}
                    onHintChange={hint => updateField(f.id, { hint })}
                    onEditStart={() => setEditingId(f.id)}
                    onEditEnd={() => setEditingId(null)}
                    onMoveUp={() => moveField(f.id, -1)}
                    onMoveDown={() => moveField(f.id, 1)}
                    onDelete={!f.builtin ? () => deleteField(f.id) : null}
                    inp={inp}
                  />
                ))}

                {sectionFields.length === 0 && (
                  <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, fontStyle: "italic", padding: "8px 0" }}>
                    Nenhum campo nesta seção. Adicione um campo customizado.
                  </div>
                )}
              </div>

              {/* Formulário de adicionar campo */}
              {addingTo === sectionId && (
                <AddFieldForm
                  newField={newField}
                  onChange={setNewField}
                  onAdd={() => handleAddField(sectionId)}
                  onCancel={() => setAddingTo(null)}
                  inp={inp}
                />
              )}
            </div>
          );
        })}

        {/* Botões de ação */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <button onClick={handleReset}
            style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fff5f5", color: "#dc2626", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Resetar para padrão
          </button>
          <button onClick={handleSave}
            style={{ padding: "11px 28px", borderRadius: 8, border: "none", background: saved ? "#15803d" : COLORS.dark, color: "#fff", fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, cursor: "pointer", transition: "background 0.2s" }}>
            {saved ? "Salvo!" : "Salvar configuração"}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

// ── FieldRow ──────────────────────────────────────────────────────────────────
function FieldRow({ field: f, isFirst, isLast, isEditing, onToggleActive, onToggleRequired, onLabelChange, onHintChange, onEditStart, onEditEnd, onMoveUp, onMoveDown, onDelete, inp }) {
  const [labelVal, setLabelVal] = useState(f.label);
  const [hintVal,  setHintVal]  = useState(f.hint || "");

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 9,
      background: f.active ? "#fafafa" : "#f0f0f0",
      border: `1px solid ${f.active ? COLORS.grayLight : "#d1d5db"}`,
      opacity: f.active ? 1 : 0.6,
    }}>
      {/* Tipo icon */}
      <span style={{ fontSize: 16, paddingTop: 2, flexShrink: 0 }} title={TYPE_LABELS[f.type] || f.type}>
        {TYPE_ICONS[f.type] || "T"}
      </span>

      {/* Label e hint */}
      <div style={{ flex: 1 }}>
        {isEditing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input value={labelVal} onChange={e => setLabelVal(e.target.value)}
              autoFocus
              style={{ ...inp, fontSize: 13, fontWeight: 700 }}
              onBlur={() => { onLabelChange(labelVal); onEditEnd(); }} />
            <input value={hintVal} onChange={e => setHintVal(e.target.value)}
              placeholder="Dica / instrução (opcional)"
              style={{ ...inp, fontSize: 11, color: COLORS.gray }}
              onBlur={() => { onHintChange(hintVal); onEditEnd(); }} />
          </div>
        ) : (
          <div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.dark }}>
              {f.label}
              {f.required && f.active && <span style={{ color: COLORS.primary, marginLeft: 4 }}>*</span>}
              {!f.builtin && <span style={{ marginLeft: 6, fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "#e0f2fe", color: "#0369a1", fontFamily: FONTS.heading, fontWeight: 700 }}>CUSTOM</span>}
            </div>
            {f.hint && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 2 }}>{f.hint}</div>}
            <div style={{ fontFamily: FONTS.body, fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
              {TYPE_LABELS[f.type] || f.type}
              {f.conditional && ` · visível se "${f.conditional}"`}
            </div>
          </div>
        )}
      </div>

      {/* Controles */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
        {/* Editar label */}
        <button onClick={onEditStart} title="Editar label"
          style={iconBtn("#e0f2fe", "#0369a1")}><Icon name="Pencil" size={13} /></button>

        {/* Obrigatório */}
        <button onClick={onToggleRequired} title={f.required ? "Tornar opcional" : "Tornar obrigatório"}
          style={iconBtn(f.required ? "#fef3c7" : "#f9fafb", f.required ? "#92400e" : "#94a3b8")}>
          {f.required ? "!" : "○"}
        </button>

        {/* Ativo/inativo */}
        <button onClick={onToggleActive} title={f.active ? "Ocultar campo" : "Mostrar campo"}
          style={iconBtn(f.active ? "#dcfce7" : "#fee2e2", f.active ? "#15803d" : "#dc2626")}>
          {f.active ? <Icon name="Eye" size={13} /> : <Icon name="CircleX" size={13} />}
        </button>

        {/* Mover cima/baixo */}
        <button onClick={onMoveUp} disabled={isFirst} title="Mover para cima"
          style={{ ...iconBtn("#f8fafc", "#64748b"), opacity: isFirst ? 0.3 : 1 }}>↑</button>
        <button onClick={onMoveDown} disabled={isLast} title="Mover para baixo"
          style={{ ...iconBtn("#f8fafc", "#64748b"), opacity: isLast ? 0.3 : 1 }}>↓</button>

        {/* Excluir (só custom) */}
        {onDelete && (
          <button onClick={onDelete} title="Excluir campo customizado"
            style={iconBtn("#fff5f5", "#dc2626")}><Icon name="Trash2" size={13} /></button>
        )}
      </div>
    </div>
  );
}

function iconBtn(bg, color) {
  return {
    width: 30, height: 30, borderRadius: 7, border: "none", background: bg, color,
    cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: FONTS.heading, fontWeight: 700, flexShrink: 0,
  };
}

// ── AddFieldForm ──────────────────────────────────────────────────────────────
function AddFieldForm({ newField, onChange, onAdd, onCancel, inp }) {
  const set = (k, v) => onChange(f => ({ ...f, [k]: v }));
  return (
    <div style={{ marginTop: 14, padding: "16px", borderRadius: 10, background: "#eff6ff", border: "1.5px solid #bfdbfe" }}>
      <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#0066cc", marginBottom: 12 }}>
        + Novo Campo
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, display: "block", marginBottom: 4 }}>
            Rótulo do campo *
          </label>
          <input value={newField.label} onChange={e => set("label", e.target.value)}
            placeholder="Ex: Declaração de apoio institucional"
            style={inp} />
        </div>
        <div>
          <label style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, display: "block", marginBottom: 4 }}>
            Tipo
          </label>
          <select value={newField.type} onChange={e => set("type", e.target.value)}
            style={{ ...inp, cursor: "pointer" }}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, display: "block", marginBottom: 4 }}>
          Instrução / dica (opcional)
        </label>
        <input value={newField.hint} onChange={e => set("hint", e.target.value)}
          placeholder="Ex: Formatos aceitos: PDF, DOC — máx. 5 MB"
          style={inp} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark }}>
          <input type="checkbox" checked={newField.required} onChange={e => set("required", e.target.checked)} style={{ width: 15, height: 15 }} />
          Campo obrigatório
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel}
            style={{ padding: "7px 16px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
            Cancelar
          </button>
          <button onClick={onAdd} disabled={!newField.label.trim()}
            style={{ padding: "7px 18px", borderRadius: 7, border: "none", background: newField.label.trim() ? "#0066cc" : COLORS.gray, color: "#fff", cursor: newField.label.trim() ? "pointer" : "not-allowed", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
