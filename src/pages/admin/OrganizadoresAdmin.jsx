/**
 * OrganizadoresAdmin.jsx — Painel admin de gestão de organizadores.
 * Exporta: OrganizadoresList, OrganizadorEditor
 * Rotas:
 *   /admin/organizadores        → OrganizadoresList
 *   /admin/organizadores/:id    → OrganizadorEditor
 *
 * OrganizadoresList:
 *   - Tabela de todos os organizadores cadastrados
 *   - Busca por nome/e-mail/organização
 *   - Toggle ativo/inativo inline
 *   - Contador de solicitações por organizador
 *
 * OrganizadorEditor:
 *   - Dados cadastrais completos (leitura — edição de senha vedada ao admin)
 *   - Histórico de todas as solicitações do organizador
 *   - Ações: ativar/desativar conta
 */
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { COLORS, FONTS } from "../../styles/colors";
import { SOLICITACAO_STATUS, SOLICITACAO_TIPOS } from "../../config/navigation";
import { OrganizersService, SolicitacoesService, ArquivosService, MovimentacoesService } from "../../services/index";
import { deleteFile } from "../../services/storageService";
import { calcularTaxaModalidade, formatarMoeda, TABELA_PADRAO } from "../../utils/taxaCalculator";

// ── helpers ───────────────────────────────────────────────────────────────────
const statusMap = Object.fromEntries(SOLICITACAO_STATUS.map(s => [s.value, s]));
const tipoMap   = Object.fromEntries(SOLICITACAO_TIPOS.map(t => [t.value, t]));

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDT(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function maskDoc(v = "") {
  const d = v.replace(/\D/g, "");
  if (d.length <= 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function StatusBadge({ status }) {
  const s = statusMap[status] || { label: status, color: COLORS.gray, bg: "#f3f4f6", icon: "📋" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px",
      borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}>
      {s.icon} {s.label}
    </span>
  );
}

// ── LISTA ─────────────────────────────────────────────────────────────────────
export function OrganizadoresList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [solCounts, setSolCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [rOrg, rSol] = await Promise.all([
      OrganizersService.list(),
      SolicitacoesService.list({}),
    ]);
    if (rOrg.data) setItems(rOrg.data);
    if (rSol.data) {
      const counts = {};
      rSol.data.forEach(s => { counts[s.organizerId] = (counts[s.organizerId] || 0) + 1; });
      setSolCounts(counts);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (item) => {
    await OrganizersService.setActive(item.id, !item.active);
    load();
  };

  const filtered = items.filter(item => {
    if (filterActive === "ativo"   && !item.active) return false;
    if (filterActive === "inativo" &&  item.active) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!item.name?.toLowerCase().includes(q) &&
          !item.email?.toLowerCase().includes(q) &&
          !item.organization?.toLowerCase().includes(q) &&
          !item.city?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const card = { background: "#fff", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 24 };
  const stats = { total: items.length, ativos: items.filter(i => i.active).length, inativos: items.filter(i => !i.active).length };

  return (
    <AdminLayout>
      <div style={{ padding: "32px 32px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: COLORS.primary, marginBottom: 4 }}>Portal de Organizadores</div>
            <h1 style={{ fontFamily: FONTS.heading, fontSize: 28, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: 0 }}>Organizadores</h1>
          </div>
          <Link to="/admin/solicitacoes" style={{ padding: "10px 18px", borderRadius: 8, background: COLORS.primary, color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            📋 Ver Solicitações
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total cadastrado", value: stats.total, color: COLORS.dark, bg: "#f9fafb" },
            { label: "Ativos",  value: stats.ativos,   color: "#15803d", bg: "#f0fdf4" },
            { label: "Inativos",value: stats.inativos, color: "#6b7280", bg: "#f3f4f6" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: s.color, opacity: 0.75, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail, organização ou cidade..."
              style={{ flex: 1, minWidth: 220, padding: "9px 13px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 14, outline: "none" }} />
            <select value={filterActive} onChange={e => setFilterActive(e.target.value)}
              style={{ padding: "9px 13px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, cursor: "pointer" }}>
              <option value="">Todos</option>
              <option value="ativo">✅ Ativos</option>
              <option value="inativo">🔒 Inativos</option>
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div style={card}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", fontFamily: FONTS.body, color: COLORS.gray }}>⏳ Carregando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", fontFamily: FONTS.body, color: COLORS.gray }}>Nenhum organizador encontrado.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${COLORS.grayLight}` }}>
                    {["Organizador", "Tipo", "Cidade / UF", "Solicitações", "Cadastrado em", "Status", ""].map(h => (
                      <th key={h} style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.dark }}>{item.name}</div>
                        <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>{item.email}</div>
                        {item.organization && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, fontStyle: "italic" }}>{item.organization}</div>}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: item.tipoPessoa === "pj" ? "#eff6ff" : "#f0fdf4", color: item.tipoPessoa === "pj" ? "#1d4ed8" : "#15803d" }}>
                          {item.tipoPessoa === "pj" ? "🏢 PJ" : "👤 PF"}
                        </span>
                      </td>
                      <td style={{ padding: "12px", fontFamily: FONTS.body, fontSize: 13, color: COLORS.grayDark }}>{item.city}{item.state ? ` / ${item.state}` : ""}</td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <span style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 900, color: (solCounts[item.id] || 0) > 0 ? COLORS.primary : COLORS.grayLight }}>
                          {solCounts[item.id] || 0}
                        </span>
                      </td>
                      <td style={{ padding: "12px", fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, whiteSpace: "nowrap" }}>{fmt(item.createdAt)}</td>
                      <td style={{ padding: "12px" }}>
                        <button onClick={() => toggleActive(item)}
                          style={{ padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, transition: "all 0.15s",
                            background: item.active ? "#f0fdf4" : "#f3f4f6",
                            color: item.active ? "#15803d" : "#6b7280" }}>
                          {item.active ? "✅ Ativo" : "🔒 Inativo"}
                        </button>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <button onClick={() => navigate(`/admin/organizadores/${item.id}`)}
                          style={{ padding: "7px 14px", borderRadius: 6, background: "#0f172a", color: "#60a5fa", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                          Ver detalhes →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: "12px 12px 0", fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
                {filtered.length} organizador(es) exibido(s) de {items.length} total
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

// ── EDITOR (perfil completo) ──────────────────────────────────────────────────
export function OrganizadorEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organizer, setOrganizer] = useState(null);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const [rOrg, rSol] = await Promise.all([
      OrganizersService.get(id),
      SolicitacoesService.list({ organizerId: id }),
    ]);
    if (rOrg.error) { navigate("/admin/organizadores"); return; }
    setOrganizer(rOrg.data);
    if (rSol.data) setSolicitacoes(rSol.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const flash = (text, type = "ok") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "" }), 3000); };

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateMotivo, setDeactivateMotivo] = useState("");
  const [deactivating, setDeactivating] = useState(false);

  const handleToggleActive = async () => {
    if (organizer.active) {
      setDeactivateMotivo("");
      setShowDeactivateModal(true);
      return;
    }
    const r = await OrganizersService.setActive(id, true);
    if (r.data) { flash("Conta ativada com sucesso.", "ok"); load(); }
    else flash(r.error, "err");
  };

  const confirmDeactivate = async () => {
    setDeactivating(true);
    const r = await OrganizersService.setActive(id, false, deactivateMotivo);
    setDeactivating(false);
    setShowDeactivateModal(false);
    if (r.data) { flash("Conta desativada com sucesso.", "ok"); load(); }
    else flash(r.error, "err");
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    // 1. Excluir todas as solicitações e dados relacionados
    for (const sol of solicitacoes) {
      const arqRes = await ArquivosService.listBySolicitacao(sol.id);
      for (const arq of (arqRes.data || [])) {
        if (arq.storagePath) await deleteFile(arq.storagePath).catch(() => {});
        else if (arq.url?.includes("firebasestorage.googleapis.com")) await deleteFile(arq.url).catch(() => {});
        await ArquivosService.delete(arq.id).catch(() => {});
      }
      await MovimentacoesService.deleteBySolicitacao(sol.id).catch(() => {});
      await SolicitacoesService.delete(sol.id).catch(() => {});
    }
    // 2. Excluir o organizador
    await OrganizersService.delete(id);
    setDeleting(false);
    setShowDeleteModal(false);
    navigate("/admin/organizadores");
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: FONTS.body, color: COLORS.gray }}>⏳ Carregando...</div>
      </AdminLayout>
    );
  }

  const card = { background: "#fff", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", marginBottom: 20 };
  const lbl = (text) => <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, marginBottom: 3 }}>{text}</div>;
  const val = (text) => <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.dark, marginBottom: 14 }}>{text || "—"}</div>;

  const statusCounts = SOLICITACAO_STATUS.filter(s => s.value).reduce((acc, s) => {
    acc[s.value] = solicitacoes.filter(sol => sol.status === s.value).length;
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div style={{ padding: "32px 32px 60px", maxWidth: 860, margin: "0 auto" }}>
        <Link to="/admin/organizadores" style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          ← Voltar para organizadores
        </Link>

        {/* Header */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: organizer.tipoPessoa === "pj" ? "#eff6ff" : "#f0fdf4", color: organizer.tipoPessoa === "pj" ? "#1d4ed8" : "#15803d" }}>
                {organizer.tipoPessoa === "pj" ? "🏢 Pessoa Jurídica" : "👤 Pessoa Física"}
              </span>
              <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: organizer.active ? "#f0fdf4" : "#f3f4f6", color: organizer.active ? "#15803d" : "#6b7280" }}>
                {organizer.active ? "✅ Conta ativa" : "🔒 Conta inativa"}
              </span>
              {!organizer.active && organizer.motivoDesativacao && (
                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: "#fff5f5", color: "#dc2626" }}>
                  Motivo: {organizer.motivoDesativacao}
                </span>
              )}
            </div>
            <h1 style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 4px" }}>{organizer.name}</h1>
            {organizer.organization && <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray }}>{organizer.organization}</div>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleToggleActive}
              style={{ padding: "10px 18px", borderRadius: 8, border: `2px solid ${organizer.active ? "#fca5a5" : "#86efac"}`, background: "#fff", color: organizer.active ? COLORS.primary : "#15803d", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
              {organizer.active ? "🔒 Desativar conta" : "✅ Ativar conta"}
            </button>
            <button onClick={() => setShowDeleteModal(true)}
              style={{ padding: "10px 18px", borderRadius: 8, border: "2px solid #dc2626", background: "#fff", color: "#dc2626", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
              🗑️ Excluir conta
            </button>
          </div>
        </div>

        {msg.text && (
          <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontFamily: FONTS.body, fontSize: 13, background: msg.type === "ok" ? "#f0fdf4" : "#fff5f5", color: msg.type === "ok" ? "#15803d" : "#dc2626", border: `1px solid ${msg.type === "ok" ? "#86efac" : "#fca5a5"}` }}>
            {msg.type === "ok" ? "✅" : "⚠️"} {msg.text}
          </div>
        )}

        {/* Dados cadastrais */}
        <div style={card}>
          <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: "0 0 18px", paddingBottom: 12, borderBottom: `1px solid ${COLORS.grayLight}` }}>
            📋 Dados cadastrais
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            {lbl("Nome completo / Razão social")}{val(organizer.name)}
            {lbl("E-mail")}{val(organizer.email)}
            {lbl("CPF / CNPJ")}{val(maskDoc(organizer.cpfCnpj))}
            {lbl("Telefone")}{val(organizer.phone)}
            {lbl("Cidade")}{val(organizer.city)}
            {lbl("Estado")}{val(organizer.state)}
            {lbl("Organização / Nome fantasia")}{val(organizer.organization)}
            {lbl("Site")}<div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.dark, marginBottom: 14 }}>{organizer.website ? <a href={organizer.website} target="_blank" rel="noreferrer" style={{ color: "#0066cc" }}>{organizer.website}</a> : "—"}</div>
          </div>
          {lbl("Endereço")}{val(organizer.address)}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px", marginTop: 8, borderTop: `1px solid ${COLORS.grayLight}`, paddingTop: 16 }}>
            {lbl("Cadastrado em")}{val(fmtDT(organizer.createdAt))}
            {lbl("Última atualização")}{val(fmtDT(organizer.updatedAt))}
            {lbl("E-mail verificado")}{val(organizer.emailVerified ? "✅ Sim" : "⏳ Não")}
          </div>
        </div>

        {/* Parceria FMA */}
        <ParceriaSection organizer={organizer} organizerId={id} onSaved={load} flash={flash} card={card} />

        {/* Solicitações do organizador */}
        <div style={card}>
          <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: "0 0 16px", paddingBottom: 12, borderBottom: `1px solid ${COLORS.grayLight}` }}>
            📋 Solicitações ({solicitacoes.length})
          </h3>

          {/* Mini-dashboard de status */}
          {solicitacoes.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {SOLICITACAO_STATUS.filter(s => s.value && statusCounts[s.value] > 0).map(s => (
                <div key={s.value} style={{ padding: "8px 14px", borderRadius: 8, background: s.bg, border: `1px solid ${s.color}30` }}>
                  <span style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 900, color: s.color }}>{statusCounts[s.value]}</span>
                  <span style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: s.color, marginLeft: 6 }}>{s.icon} {s.label}</span>
                </div>
              ))}
            </div>
          )}

          {solicitacoes.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray, fontStyle: "italic" }}>Este organizador ainda não fez nenhuma solicitação.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {solicitacoes.map(sol => {
                const tipo = tipoMap[sol.tipo] || { label: sol.tipo, icon: "📋" };
                return (
                  <div key={sol.id} style={{ display: "flex", gap: 14, alignItems: "center", padding: "12px 14px", borderRadius: 10, border: `1px solid ${COLORS.grayLight}`, background: "#fafafa", flexWrap: "wrap" }}>
                    <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: sol.tipo === "permit" ? "#fff3cd" : "#e3f8f0", color: sol.tipo === "permit" ? "#856404" : "#065f46", flexShrink: 0 }}>{tipo.icon} {tipo.label}</span>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.dark }}>{sol.nomeEvento}</div>
                      <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>📅 {fmt(sol.dataEvento)} · 📍 {sol.cidadeEvento}</div>
                    </div>
                    <StatusBadge status={sol.status} />
                    <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, whiteSpace: "nowrap" }}>{fmt(sol.criadoEm)}</div>
                    <Link to={`/admin/solicitacoes/${sol.id}`}
                      style={{ padding: "6px 12px", borderRadius: 6, background: COLORS.primary, color: "#fff", textDecoration: "none", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      Analisar →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de exclusão */}
      {showDeleteModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setShowDeleteModal(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, padding: "28px 32px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 28 }}>🗑️</span>
              <div>
                <h3 style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 900, color: "#dc2626", margin: 0, textTransform: "uppercase" }}>Excluir conta</h3>
                <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "4px 0 0" }}>{organizer.name}</p>
              </div>
            </div>
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "14px 16px", marginBottom: 20 }}>
              <p style={{ fontFamily: FONTS.body, fontSize: 13, color: "#991b1b", margin: 0, lineHeight: 1.6 }}>
                Esta ação é <strong>irreversível</strong>. Serão excluídos permanentemente:
              </p>
              <ul style={{ fontFamily: FONTS.body, fontSize: 13, color: "#991b1b", margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.8 }}>
                <li>Dados do organizador</li>
                <li>{solicitacoes.length} solicitação(ões) e seus arquivos</li>
                <li>Todo o histórico de movimentações</li>
              </ul>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowDeleteModal(false)}
                style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.6 : 1 }}>
                {deleting ? "Excluindo..." : "Excluir permanentemente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de desativação */}
      {showDeactivateModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setShowDeactivateModal(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, padding: "28px 32px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 28 }}>🔒</span>
              <div>
                <h3 style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 900, color: COLORS.dark, margin: 0, textTransform: "uppercase" }}>Desativar conta</h3>
                <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "4px 0 0" }}>{organizer.name}</p>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, display: "block", marginBottom: 8 }}>
                Motivo da desativação
              </label>
              <textarea
                value={deactivateMotivo}
                onChange={e => setDeactivateMotivo(e.target.value)}
                placeholder="Informe o motivo (será exibido ao organizador ao fazer login)..."
                rows={3}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                autoFocus
              />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowDeactivateModal(false)}
                style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={confirmDeactivate} disabled={deactivating}
                style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: deactivating ? "not-allowed" : "pointer", opacity: deactivating ? 0.6 : 1 }}>
                {deactivating ? "Desativando..." : "Confirmar desativação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// ─── Seção Parceria FMA ──────────────────────────────────────────────────────

function ParceriaSection({ organizer, organizerId, onSaved, flash, card }) {
  const [parceiro, setParceiro] = useState(organizer.parceiro || false);
  const [descricao, setDescricao] = useState(organizer.parceiroDescricao || "");
  const [tipo, setTipo] = useState(organizer.parceiroTipo || "desconto");
  const [percentual, setPercentual] = useState(organizer.parceiroDesconto || 0);
  const [tabelaCustom, setTabelaCustom] = useState(organizer.tabelaTaxas || {
    faixas: [{ ate: 500, valor: 1.50 }, { ate: 1000, valor: 2.00 }, { ate: Infinity, valor: 2.50 }],
    minimo: 500, maximo: 4500,
  });
  const [saving, setSaving] = useState(false);
  const [simInscritos, setSimInscritos] = useState(800);

  const handleSave = async () => {
    setSaving(true);
    await OrganizersService.update(organizerId, {
      parceiro,
      parceiroDescricao: parceiro ? descricao : "",
      parceiroTipo: parceiro ? tipo : "",
      parceiroDesconto: parceiro && tipo === "desconto" ? percentual : 0,
      tabelaTaxas: parceiro && tipo === "tabela_customizada" ? tabelaCustom : null,
    });
    flash("Dados de parceria atualizados!", "ok");
    setSaving(false);
    onSaved();
  };

  // Simulacao
  const simTabela = tipo === "tabela_customizada" ? tabelaCustom : TABELA_PADRAO;
  const simResult = calcularTaxaModalidade(simInscritos, simTabela);
  let simFinal = simResult.valorFinal;
  if (tipo === "isencao") simFinal = 0;
  else if (tipo === "desconto") simFinal = Math.round(simResult.valorFinal * (1 - percentual / 100) * 100) / 100;

  const inp = (extra = {}) => ({
    width: "100%", padding: "10px 13px", borderRadius: 8, border: `1.5px solid ${COLORS.grayLight}`,
    fontFamily: FONTS.body, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff", ...extra,
  });

  return (
    <div style={card}>
      <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: "0 0 16px", paddingBottom: 12, borderBottom: `1px solid ${COLORS.grayLight}` }}>
        🤝 Parceria FMA
      </h3>

      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: FONTS.body, fontSize: 14, marginBottom: 16 }}>
        <input type="checkbox" checked={parceiro} onChange={e => setParceiro(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: COLORS.primary }} />
        <span style={{ fontWeight: 600 }}>Este organizador e parceiro da FMA</span>
      </label>

      {parceiro && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, marginBottom: 4 }}>Descricao do acordo</div>
            <input value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Convenio 2026 - apoio marketing" style={inp()} />
          </div>

          <div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, marginBottom: 4 }}>Tipo de beneficio</div>
            <select value={tipo} onChange={e => setTipo(e.target.value)} style={inp({ cursor: "pointer" })}>
              <option value="isencao">Isencao total</option>
              <option value="desconto">Desconto percentual</option>
              <option value="tabela_customizada">Tabela customizada</option>
            </select>
          </div>

          {tipo === "desconto" && (
            <div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, marginBottom: 4 }}>Percentual de desconto</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="number" min="0" max="100" value={percentual} onChange={e => setPercentual(Number(e.target.value))}
                  style={inp({ width: 100 })} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>%</span>
              </div>
            </div>
          )}

          {tipo === "tabela_customizada" && (
            <div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, marginBottom: 8 }}>Faixas customizadas</div>
              {tabelaCustom.faixas.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: COLORS.gray, width: 60 }}>Ate {f.ate === Infinity ? "∞" : f.ate}</span>
                  <span style={{ fontSize: 12, color: COLORS.gray }}>R$</span>
                  <input type="number" min="0" step="0.01" value={f.valor}
                    onChange={e => {
                      const novas = [...tabelaCustom.faixas];
                      novas[i] = { ...novas[i], valor: Number(e.target.value) };
                      setTabelaCustom(t => ({ ...t, faixas: novas }));
                    }}
                    style={inp({ width: 100 })} />
                  <span style={{ fontSize: 12, color: COLORS.gray }}>/inscrito</span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <div>
                  <span style={{ fontSize: 11, color: COLORS.gray }}>Minimo (R$)</span>
                  <input type="number" min="0" value={tabelaCustom.minimo}
                    onChange={e => setTabelaCustom(t => ({ ...t, minimo: Number(e.target.value) }))}
                    style={inp({ width: 100 })} />
                </div>
                <div>
                  <span style={{ fontSize: 11, color: COLORS.gray }}>Maximo (R$)</span>
                  <input type="number" min="0" value={tabelaCustom.maximo}
                    onChange={e => setTabelaCustom(t => ({ ...t, maximo: Number(e.target.value) }))}
                    style={inp({ width: 100 })} />
                </div>
              </div>
            </div>
          )}

          {/* Simulador */}
          <div style={{ padding: 12, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#15803d" }}>Simulacao</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <input type="number" min="0" value={simInscritos} onChange={e => setSimInscritos(Number(e.target.value) || 0)}
                style={inp({ width: 100 })} />
              <span style={{ fontSize: 12 }}>inscritos =</span>
              <strong style={{ fontSize: 14, color: "#15803d" }}>{formatarMoeda(simFinal)}</strong>
              {tipo !== "isencao" && simFinal !== simResult.valorFinal && (
                <span style={{ fontSize: 11, color: COLORS.gray }}>(tabela padrao: {formatarMoeda(calcularTaxaModalidade(simInscritos).valorFinal)})</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Salvando..." : "Salvar parceria"}
        </button>
      </div>
    </div>
  );
}
