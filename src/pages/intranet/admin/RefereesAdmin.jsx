/**
 * RefereesAdmin.jsx — CRUD de árbitros na intranet (admin/coordenador).
 * Exporta: IntranetRefereeList, IntranetRefereeEditor
 * Rotas: /intranet/admin/arbitros  |  /intranet/admin/arbitros/:id
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import IntranetLayout from "../IntranetLayout";
import { RefereesService } from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";
import { REFEREE_CATEGORIES, REFEREE_ROLES, REFEREE_STATUS } from "../../../config/navigation";
import { notificarArbitroCadastro, notificarArbitroStatus } from "../../../services/emailService";

const roleMap  = Object.fromEntries((REFEREE_ROLES   || []).map(r => [r.value, r]));
const statusMap= Object.fromEntries((REFEREE_STATUS  || []).map(s => [s.value, s]));
const catMap   = Object.fromEntries((REFEREE_CATEGORIES||[]).map(c => [c.value, c]));

const inp = (extra = {}) => ({ width: "100%", padding: "10px 13px", borderRadius: 8, border: `1.5px solid #e8e8e8`, fontFamily: "'Barlow',sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box", ...extra });
const sel = (extra = {}) => ({ ...inp(), appearance: "none", cursor: "pointer", ...extra });

function Badge({ value, map }) {
  const item = map[value] || { label: value, color: COLORS.gray };
  return <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, background: `${item.color}18`, color: item.color }}>{item.label}</span>;
}

// ─── Lista ────────────────────────────────────────────────────────────────────
export function IntranetRefereeList() {
  const navigate = useNavigate();
  const [refs, setRefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await RefereesService.list();
    if (r.data) setRefs(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (id, status) => {
    await RefereesService.update(id, { status });
    const ref = refs.find(r => r.id === id);
    if (ref?.email) {
      notificarArbitroStatus({
        arbitroEmail: ref.email,
        arbitroNome: ref.name,
        novoStatus: status,
      }).catch(e => console.warn("Email status árbitro:", e));
    }
    load();
  };

  const handleDelete = async (ref) => {
    if (!confirm(`Excluir o árbitro "${ref.name}"? Esta ação é irreversível.`)) return;
    await RefereesService.delete(ref.id);
    load();
  };

  const filtered = refs.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRole && r.role !== filterRole) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  const statusCounts = { ativo: refs.filter(r => r.status === "ativo").length, inativo: refs.filter(r => r.status === "inativo").length, suspenso: refs.filter(r => r.status === "suspenso").length };

  return (
    <IntranetLayout requireRole="canManage">
      <div style={{ padding: 36 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>👥 Árbitros</h1>
            <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: 0 }}>Gerencie o cadastro, perfis e status dos árbitros.</p>
          </div>
          <button onClick={() => navigate("/intranet/admin/arbitros/novo")}
            style={{ padding: "11px 22px", borderRadius: 8, background: COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
            + Novo Árbitro
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Ativos", count: statusCounts.ativo, color: "#007733" },
            { label: "Inativos", count: statusCounts.inativo, color: COLORS.gray },
            { label: "Suspensos", count: statusCounts.suspenso, color: COLORS.primary },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", borderRadius: 10, padding: "14px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, color: s.color }}>{s.count}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <input placeholder="🔍 Buscar nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", minWidth: 220 }} />
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", cursor: "pointer" }}>
            <option value="">Todos os perfis</option>
            {REFEREE_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", cursor: "pointer" }}>
            <option value="">Todos os status</option>
            {REFEREE_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {(search || filterRole || filterStatus) && (
            <button onClick={() => { setSearch(""); setFilterRole(""); setFilterStatus(""); }}
              style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", cursor: "pointer", fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
              ✕ Limpar
            </button>
          )}
          <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginLeft: "auto", alignSelf: "center" }}>{filtered.length} árbitro(s)</span>
        </div>

        {/* Tabela */}
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: COLORS.gray, fontFamily: FONTS.body }}>⏳ Carregando...</div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.grayLight}` }}>
                  {["Nome / E-mail", "Perfil", "Categoria", "Cidade", "Status", ""].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>Nenhum árbitro encontrado.</td></tr>
                ) : filtered.map(ref => (
                  <tr key={ref.id} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, color: COLORS.dark }}>{ref.name}</div>
                      <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{ref.email}</div>
                      {ref.phone && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>{ref.phone}</div>}
                    </td>
                    <td style={{ padding: "14px 16px" }}><Badge value={ref.role} map={roleMap} /></td>
                    <td style={{ padding: "14px 16px" }}><span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark }}>{catMap[ref.nivel]?.label || ref.nivel || "—"}</span></td>
                    <td style={{ padding: "14px 16px" }}><span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark }}>{ref.city}</span></td>
                    <td style={{ padding: "14px 16px" }}><Badge value={ref.status} map={statusMap} /></td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {ref.status !== "ativo" && (
                          <button onClick={() => handleStatus(ref.id, "ativo")} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #007733", background: "#e6f9ee", color: "#007733", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>Ativar</button>
                        )}
                        {ref.status === "ativo" && (
                          <button onClick={() => handleStatus(ref.id, "inativo")} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>Inativar</button>
                        )}
                        <button onClick={() => navigate(`/intranet/admin/arbitros/${ref.id}`)} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.dark, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>Editar</button>
                        <button onClick={() => handleDelete(ref)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fff5f5", color: "#cc0000", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </IntranetLayout>
  );
}

// ─── Editor ───────────────────────────────────────────────────────────────────
const emptyRef = { name: "", email: "", password: "", nivel: "", role: "arbitro", status: "ativo", mustChangePassword: true, profileComplete: false, notes: "" };

export function IntranetRefereeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "novo";
  const [form, setForm] = useState({ ...emptyRef });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (isNew) return;
    RefereesService.get(id).then(r => {
      if (r.data) setForm({ ...emptyRef, ...r.data, password: "" });
      else navigate("/intranet/admin/arbitros");
      setLoading(false);
    });
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name || !form.email) { setError("Nome e e-mail são obrigatórios."); return; }
    if (isNew && !form.password) { setError("Senha temporária é obrigatória."); return; }
    if (isNew && form.password.length < 6) { setError("Senha deve ter no mínimo 6 caracteres."); return; }
    setSaving(true); setError("");

    const payload = isNew
      ? { ...form, mustChangePassword: true, profileComplete: false }
      : form;

    const r = isNew ? await RefereesService.create(payload) : await RefereesService.update(id, payload);
    setSaving(false);
    if (r.error) { setError(r.error); return; }
    if (isNew && form.email) {
      notificarArbitroCadastro({
        arbitroEmail: form.email,
        arbitroNome: form.name,
        senhaTemporaria: form.password,
      }).catch(e => console.warn("Email cadastro árbitro:", e));
    }
    navigate("/intranet/admin/arbitros");
  };

  const card = { background: "#fff", borderRadius: 12, padding: "24px 26px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20 };
  const section = (label) => <h2 style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.primary, margin: "0 0 18px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>{label}</h2>;
  const label = (txt, req) => <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, display: "block", marginBottom: 6 }}>{txt}{req && <span style={{ color: COLORS.primary }}> *</span>}</label>;

  if (loading) return <IntranetLayout><div style={{ padding: 40, fontFamily: FONTS.body, color: COLORS.gray }}>Carregando...</div></IntranetLayout>;

  return (
    <IntranetLayout requireRole="canManage">
      <div style={{ padding: 36, maxWidth: 800 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: 0 }}>
            {isNew ? "Novo Árbitro" : `Editando: ${form.name || "..."}`}
          </h1>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => navigate("/intranet/admin/arbitros")} style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>Cancelar</button>
            <button onClick={save} disabled={saving} style={{ padding: "10px 22px", borderRadius: 8, background: saving ? COLORS.gray : COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
              {saving ? "Salvando..." : isNew ? "Criar Árbitro" : "Salvar"}
            </button>
          </div>
        </div>

        {error && <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 16px", marginBottom: 16, color: "#991b1b", fontFamily: FONTS.body, fontSize: 13 }}>{error}</div>}

        {isNew ? (
          <>
            {/* ── Criação simplificada ── */}
            <div style={card}>
              {section("Dados de Acesso")}
              <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 16px" }}>
                Informe apenas o mínimo. O árbitro completará os demais dados no primeiro acesso.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  {label("Nome completo", true)}
                  <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nome completo do árbitro" style={inp()} />
                </div>
                <div>
                  {label("E-mail (login)", true)}
                  <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@exemplo.com" style={inp()} />
                </div>
                <div>
                  {label("Senha temporária", true)}
                  <input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Mínimo 6 caracteres" style={inp()} />
                </div>
                <div>
                  {label("Nível")}
                  <select value={form.nivel} onChange={e => set("nivel", e.target.value)} style={sel()}>
                    <option value="">Selecione...</option>
                    {REFEREE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  {label("Perfil / Role")}
                  <select value={form.role} onChange={e => set("role", e.target.value)} style={sel()}>
                    {REFEREE_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div style={card}>
              {section("Observações")}
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} placeholder="Observações internas (opcional)..."
                style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: `1.5px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            </div>
          </>
        ) : (
          <>
            {/* ── Edição: dados completos visíveis ── */}
            <div style={card}>
              {section("Dados Pessoais")}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  {label("Nome completo", true)}
                  <input value={form.name} onChange={e => set("name", e.target.value)} style={inp()} />
                </div>
                <div>
                  {label("E-mail (login)", true)}
                  <input type="email" value={form.email} onChange={e => set("email", e.target.value)} style={inp()} disabled />
                </div>
                <div>
                  {label("Telefone")}
                  <input value={form.phone || ""} onChange={e => set("phone", e.target.value)} style={inp()} />
                </div>
                <div>
                  {label("CPF")}
                  <input value={form.cpf || ""} disabled style={{ ...inp(), opacity: 0.6 }} />
                </div>
                <div>
                  {label("Data de Nascimento")}
                  <input value={form.dataNascimento || ""} disabled style={{ ...inp(), opacity: 0.6 }} />
                </div>
                <div>
                  {label("Cidade")}
                  <input value={form.city || ""} disabled style={{ ...inp(), opacity: 0.6 }} />
                </div>
                <div>
                  {label("UF")}
                  <input value={form.state || ""} disabled style={{ ...inp(), opacity: 0.6 }} />
                </div>
              </div>
              {!form.profileComplete && (
                <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "#fef3c7", fontFamily: FONTS.body, fontSize: 12, color: "#92400e" }}>
                  Este árbitro ainda não completou o perfil.
                </div>
              )}
            </div>

            <div style={card}>
              {section("Perfil e Acesso")}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <div>
                  {label("Nível")}
                  <select value={form.nivel || ""} onChange={e => set("nivel", e.target.value)} style={sel()}>
                    <option value="">Selecione...</option>
                    {REFEREE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  {label("Perfil / Role")}
                  <select value={form.role} onChange={e => set("role", e.target.value)} style={sel()}>
                    {REFEREE_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  {label("Status")}
                  <select value={form.status} onChange={e => set("status", e.target.value)} style={sel()}>
                    {REFEREE_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div style={card}>
              {section("Observações")}
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} placeholder="Informações adicionais sobre este árbitro..."
                style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: `1.5px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
            </div>
          </>
        )}
      </div>
    </IntranetLayout>
  );
}
