/**
 * ArbitrosVisaoAdmin.jsx
 * Gestão de árbitros dentro do painel admin.
 * Permite criar, visualizar e gerenciar árbitros sem precisar logar na intranet.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { FormField, TextInput, SelectInput } from "../../components/ui/FormField";
import { refereesAPI } from "../../data/api";
import { REFEREE_CATEGORIES, REFEREE_ROLES } from "../../config/navigation";
import { COLORS, FONTS } from "../../styles/colors";

const STATUS_BADGE = {
  ativo:   { label: "Ativo",   bg: "#e6f9ee", color: "#007733" },
  inativo: { label: "Inativo", bg: "#f5f5f5", color: "#6b7280" },
  suspenso:{ label: "Suspenso",bg: "#fff0f0", color: "#cc0000" },
};

const ROLE_LABEL = { admin: "Admin", coordenador: "Coordenador", arbitro: "Árbitro" };

export default function ArbitrosVisaoAdmin() {
  const navigate = useNavigate();
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await refereesAPI.list();
    if (r.data) setReferees(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "todos" ? referees : referees.filter(r => r.status === filter);
  const totals = {
    total: referees.length,
    ativos: referees.filter(r => r.status === "ativo").length,
    inativos: referees.filter(r => r.status === "inativo").length,
    suspensos: referees.filter(r => r.status === "suspenso").length,
  };

  return (
    <AdminLayout minLevel="admin">
      <div style={{ padding: 40 }}>
        <PageHeader
          title="Árbitros"
          subtitle="Gestão do quadro de arbitragem"
          action={{ label: "+ Novo Árbitro", onClick: () => setShowForm(true) }}
        />

        {/* Formulário de criação */}
        {showForm && <CreateRefereeForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />}

        {/* Resumo */}
        <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
          {[
            { label: "Total", value: totals.total, color: COLORS.dark },
            { label: "Ativos", value: totals.ativos, color: "#007733" },
            { label: "Inativos", value: totals.inativos, color: "#6b7280" },
            { label: "Suspensos", value: totals.suspensos, color: "#cc0000" },
          ].map(s => (
            <div key={s.label} style={{
              background: "#fff", borderRadius: 10, padding: "16px 24px",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)", minWidth: 120, textAlign: "center",
            }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filtro */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["todos", "ativo", "inativo", "suspenso"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 16px", borderRadius: 20, border: "none", cursor: "pointer",
                fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700,
                background: filter === f ? COLORS.primary : "#f0f0f0",
                color: filter === f ? "#fff" : COLORS.gray,
                transition: "all 0.15s",
              }}
            >
              {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Tabela */}
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>Nenhum árbitro encontrado.</div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr 80px",
              padding: "12px 24px", background: COLORS.offWhite, borderBottom: `1px solid ${COLORS.grayLight}`,
            }}>
              {["Nome", "E-mail", "Nível", "Função", "Perfil", "Status", ""].map(h => (
                <div key={h} style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray }}>{h}</div>
              ))}
            </div>
            {filtered.map(ref => {
              const st = STATUS_BADGE[ref.status] || STATUS_BADGE.inativo;
              const nivel = REFEREE_CATEGORIES.find(c => c.value === ref.nivel);
              return (
                <div key={ref.id} style={{
                  display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr 80px",
                  padding: "12px 24px", borderBottom: `1px solid ${COLORS.grayLight}`, alignItems: "center",
                  opacity: ref.status === "inativo" ? 0.55 : 1,
                }}>
                  <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.dark, fontWeight: 500 }}>
                    {ref.name}
                    {!ref.profileComplete && <span style={{ fontSize: 10, color: "#e67e22", marginLeft: 6 }}>perfil incompleto</span>}
                  </div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{ref.email}</div>
                  <div>{nivel ? <Badge label={nivel.label} bg={`${nivel.color}15`} color={nivel.color} /> : "—"}</div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{ROLE_LABEL[ref.role] || ref.role}</div>
                  <div><Badge label={ref.profileComplete ? "Completo" : "Pendente"} bg={ref.profileComplete ? "#e6f9ee" : "#fef3c7"} color={ref.profileComplete ? "#007733" : "#92400e"} /></div>
                  <div><Badge label={st.label} bg={st.bg} color={st.color} /></div>
                  <div>
                    <button
                      onClick={() => navigate(`/admin/arbitros/${ref.id}`)}
                      title="Ver detalhes"
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "4px" }}
                    >👁️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ── Formulário de criação simplificado ────────────────────────────────────────

function CreateRefereeForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", nivel: "", role: "arbitro" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Nome é obrigatório."); return; }
    if (!form.email.trim()) { setError("E-mail é obrigatório."); return; }
    if (!form.password) { setError("Senha temporária é obrigatória."); return; }
    if (form.password.length < 6) { setError("Senha deve ter no mínimo 6 caracteres."); return; }
    setSaving(true); setError("");

    const r = await refereesAPI.create({
      ...form,
      status: "ativo",
      mustChangePassword: true,
      profileComplete: false,
    });
    setSaving(false);
    if (r.error) { setError(r.error); return; }
    onCreated();
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: 28, marginBottom: 24,
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `2px solid ${COLORS.primary}20`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, color: COLORS.dark, margin: 0, textTransform: "uppercase" }}>Novo Árbitro</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: COLORS.gray }}>✕</button>
      </div>

      <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 16px" }}>
        Informe apenas o mínimo. O árbitro completará os demais dados no primeiro acesso.
      </p>

      {error && <div style={{ background: "#fff0f0", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontFamily: FONTS.body, fontSize: 13, color: COLORS.primary }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <FormField label="Nome completo" required>
            <TextInput value={form.name} onChange={v => set("name", v)} placeholder="Nome completo do árbitro" />
          </FormField>
        </div>
        <FormField label="E-mail (login)" required>
          <TextInput value={form.email} onChange={v => set("email", v)} placeholder="email@exemplo.com" type="email" />
        </FormField>
        <FormField label="Senha temporária" required>
          <TextInput value={form.password} onChange={v => set("password", v)} placeholder="Mínimo 6 caracteres" type="password" />
        </FormField>
        <FormField label="Nível">
          <SelectInput value={form.nivel} onChange={v => set("nivel", v)} placeholder="Selecione..." options={REFEREE_CATEGORIES.map(c => ({ value: c.value, label: c.label }))} />
        </FormField>
        <FormField label="Função na intranet">
          <SelectInput value={form.role} onChange={v => set("role", v)} options={REFEREE_ROLES.map(r => ({ value: r.value, label: r.label }))} />
        </FormField>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <Button variant="primary" onClick={handleSubmit} loading={saving}>Criar Árbitro</Button>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
      </div>
    </div>
  );
}
