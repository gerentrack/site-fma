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
import { RefereesService } from "../../services/index";
import { collection, getDocs, deleteDoc } from "firebase/firestore";
import { db, deleteAuthUserFn } from "../../firebase";
import { deleteFile } from "../../services/storageService";
import { REFEREE_CATEGORIES, REFEREE_ROLES, REFEREE_STATUS } from "../../config/navigation";
import { COLORS, FONTS } from "../../styles/colors";
import Icon from "../../utils/icons";
import { useConfirm } from "../../components/ui/ConfirmModal";
import { notificarArbitroCadastro } from "../../services/emailService";

const NIVEL_ALIASES = { a: "A", b: "B", c: "C", ni: "NI", nar: "NI", "nível a": "A", "nível b": "B", "nível c": "C" };
const ROLE_ALIASES  = { admin: "admin", administrador: "admin", coord: "coordenador", coordenador: "coordenador", arbitro: "arbitro", árbitro: "arbitro" };
function generatePassword() { const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; let p = ""; for (let i = 0; i < 8; i++) p += chars[Math.floor(Math.random() * chars.length)]; return p; }
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
  return lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.trim().replace(/^["']|["']$/g, ""));
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ""; });
    return row;
  });
}

const STATUS_BADGE = {
  ativo:   { label: "Ativo",   bg: "#e6f9ee", color: "#007733" },
  inativo: { label: "Inativo", bg: "#f5f5f5", color: "#6b7280" },
  suspenso:{ label: "Suspenso",bg: "#fff0f0", color: "#cc0000" },
};

const ROLE_LABEL = { admin: "Admin", coordenador: "Coordenador", arbitro: "Árbitro" };

export default function ArbitrosVisaoAdmin() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [pageAtivos, setPageAtivos] = useState(1);
  const [pageInativos, setPageInativos] = useState(1);
  const PER_PAGE = 15;

  const load = useCallback(async () => {
    setLoading(true);
    const r = await refereesAPI.list();
    if (r.data) setReferees(r.data);
    setLoading(false);
  }, []);

  const handleStatusChange = async (ref, newStatus) => {
    if (ref.status === newStatus) return;
    setActionLoading(ref.id);
    await refereesAPI.update(ref.id, { status: newStatus });
    setReferees(prev => prev.map(r => r.id === ref.id ? { ...r, status: newStatus } : r));
    setActionLoading(null);
  };

  const handleDelete = async (ref) => {
    if (!await confirm(
      `Excluir o árbitro "${ref.name}"?\n\nIsso removerá permanentemente:\n- Conta de autenticação\n- Dados pessoais\n- Escalas, disponibilidade, reembolsos\n- Anuidades, relatórios, avaliações\n- Foto e documentos`,
      { danger: true, confirmLabel: "Excluir árbitro" }
    )) return;
    setActionLoading(ref.id);
    // 1. Auth
    await deleteAuthUserFn({ email: ref.email }).catch(() => {});
    // 2. Foto
    if (ref.fotoPath) await deleteFile(ref.fotoPath).catch(() => {});
    else if (ref.foto?.includes("firebasestorage.googleapis.com")) await deleteFile(ref.foto).catch(() => {});
    // 3. Dados relacionados
    const deleteByRefereeId = async (colName) => {
      const snap = await getDocs(collection(db, colName));
      const docs = snap.docs.filter(d => d.data().refereeId === ref.id);
      await Promise.all(docs.map(d => deleteDoc(d.ref)));
    };
    await Promise.all([
      deleteByRefereeId("refereeAssignments"),
      deleteByRefereeId("refereeAvailability"),
      deleteByRefereeId("reembolsos"),
      deleteByRefereeId("anuidades"),
      deleteByRefereeId("relatoriosArbitragem"),
      deleteByRefereeId("avaliacoes"),
      deleteByRefereeId("envioDocumentos"),
    ]).catch(() => {});
    // 4. Doc do árbitro
    await RefereesService.delete(ref.id);
    setReferees(prev => prev.filter(r => r.id !== ref.id));
    setActionLoading(null);
  };

  useEffect(() => { load(); }, [load]);

  // Perfil pendente = inativo efetivo
  const efetivo = (ref) => (!ref.profileComplete && ref.status === "ativo") ? "inativo" : (ref.status || "inativo");
  const ativos   = referees.filter(r => efetivo(r) === "ativo");
  const inativos = referees.filter(r => efetivo(r) !== "ativo"); // inativo + suspenso + perfil pendente

  const totals = { total: referees.length, ativos: ativos.length, inativos: inativos.length };

  const totalPagesAtivos   = Math.max(1, Math.ceil(ativos.length / PER_PAGE));
  const totalPagesInativos = Math.max(1, Math.ceil(inativos.length / PER_PAGE));
  const pagedAtivos   = ativos.slice((pageAtivos - 1) * PER_PAGE, pageAtivos * PER_PAGE);
  const pagedInativos = inativos.slice((pageInativos - 1) * PER_PAGE, pageInativos * PER_PAGE);

  const gridCols = "2fr 2fr 1fr 1fr 1fr 80px";
  const headers = ["Nome", "E-mail", "Nível", "Função", "Status", ""];

  const renderHeader = () => (
    <div style={{
      display: "grid", gridTemplateColumns: gridCols,
      padding: "12px 24px", background: COLORS.offWhite, borderBottom: `1px solid ${COLORS.grayLight}`,
    }}>
      {headers.map(h => (
        <div key={h} style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray }}>{h}</div>
      ))}
    </div>
  );

  const renderRow = (ref) => {
    const st = STATUS_BADGE[ref.status] || STATUS_BADGE.inativo;
    const nivel = REFEREE_CATEGORIES.find(c => c.value === ref.nivel);
    const isInativo = efetivo(ref) !== "ativo";
    return (
      <div key={ref.id} style={{
        display: "grid", gridTemplateColumns: gridCols,
        padding: "12px 24px", borderBottom: `1px solid ${COLORS.grayLight}`, alignItems: "center",
        opacity: isInativo ? 0.55 : 1,
      }}>
        <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.dark, fontWeight: 500 }}>
          {ref.name}
          {!ref.profileComplete && <span style={{ fontSize: 10, color: "#e67e22", marginLeft: 6 }}>perfil incompleto</span>}
        </div>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{ref.email}</div>
        <div>{nivel ? <Badge label={nivel.label} bg={`${nivel.color}15`} color={nivel.color} /> : "—"}</div>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{ROLE_LABEL[ref.role] || ref.role}</div>
        <div>
          <select
            value={ref.status || "inativo"}
            onChange={e => handleStatusChange(ref, e.target.value)}
            disabled={actionLoading === ref.id}
            style={{
              padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
              fontFamily: FONTS.heading, border: "1.5px solid #d1d5db", cursor: "pointer",
              background: st.bg, color: st.color, outline: "none",
            }}
          >
            {REFEREE_STATUS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => navigate(`/admin/arbitros/${ref.id}`)} title="Ver detalhes"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "4px" }}>
            <Icon name="Eye" size={14} />
          </button>
          <button onClick={() => handleDelete(ref)} title="Excluir árbitro" disabled={actionLoading === ref.id}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "4px", color: "#cc0000", opacity: actionLoading === ref.id ? 0.4 : 1 }}>
            <Icon name="Trash2" size={14} />
          </button>
        </div>
      </div>
    );
  };

  const renderPagination = (page, totalPages, setPage) => totalPages <= 1 ? null : (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "14px 24px", borderTop: `1px solid ${COLORS.grayLight}` }}>
      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
        style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: page === 1 ? "#f5f5f5" : "#fff", cursor: page === 1 ? "default" : "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: page === 1 ? COLORS.grayLight : COLORS.dark }}>
        Anterior
      </button>
      <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray }}>
        Página {page} de {totalPages}
      </span>
      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
        style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: page === totalPages ? "#f5f5f5" : "#fff", cursor: page === totalPages ? "default" : "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: page === totalPages ? COLORS.grayLight : COLORS.dark }}>
        Próxima
      </button>
    </div>
  );

  const sectionTitle = (title, count, color) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <h2 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color, margin: 0 }}>{title}</h2>
      <span style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, background: `${color}15`, color, padding: "2px 10px", borderRadius: 10 }}>{count}</span>
    </div>
  );

  return (
    <AdminLayout minLevel="admin">
      <div style={{ padding: 40 }}>
        <PageHeader
          title="Árbitros"
          subtitle="Gestão do quadro de arbitragem"
          actions={[
            { label: "Importar Planilha", onClick: () => setShowImport(true), variant: "secondary" },
            { label: "+ Novo Árbitro", onClick: () => setShowForm(true) },
          ]}
        />

        {/* Formulário de criação */}
        {showForm && <CreateRefereeForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />}

        {/* Modal Importação Planilha */}
        {showImport && <ImportModal onClose={() => { setShowImport(false); load(); }} existingEmails={referees.map(r => r.email?.toLowerCase())} />}

        {/* Resumo */}
        <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
          {[
            { label: "Total", value: totals.total, color: COLORS.dark },
            { label: "Ativos", value: totals.ativos, color: "#007733" },
            { label: "Inativos / Suspensos", value: totals.inativos, color: "#6b7280" },
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

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>Carregando...</div>
        ) : (
          <>
            {/* ── Ativos ── */}
            {sectionTitle("Ativos", ativos.length, "#007733")}
            {ativos.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray, background: "#fff", borderRadius: 12, marginBottom: 32 }}>Nenhum árbitro ativo.</div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 32 }}>
                {renderHeader()}
                {pagedAtivos.map(renderRow)}
                {renderPagination(pageAtivos, totalPagesAtivos, setPageAtivos)}
              </div>
            )}

            {/* ── Inativos / Suspensos ── */}
            {sectionTitle("Inativos / Suspensos", inativos.length, "#6b7280")}
            {inativos.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray, background: "#fff", borderRadius: 12 }}>Nenhum árbitro inativo.</div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                {renderHeader()}
                {pagedInativos.map(renderRow)}
                {renderPagination(pageInativos, totalPagesInativos, setPageInativos)}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

// ── Formulário de criação simplificado ────────────────────────────────────────

// ── Modal de Importação via Planilha ─────────────────────────────────────────

function ImportModal({ onClose, existingEmails }) {
  const [step, setStep] = useState("upload"); // upload | preview | importing | done
  const [rows, setRows] = useState([]);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const catMap = Object.fromEntries(REFEREE_CATEGORIES.map(c => [c.value, c]));
  const roleLabel = { admin: "Admin", coordenador: "Coordenador", arbitro: "Árbitro" };

  const downloadModelo = async () => {
    const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
    const data = [
      ["Nome", "Email", "Senha", "Nivel", "Funcao"],
      ["João Silva", "joao@email.com", "Senha123", "A", "arbitro"],
      ["Maria Souza", "maria@email.com", "", "B", "arbitro"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Arbitros");
    XLSX.writeFile(wb, "modelo_importacao_arbitros.xlsx");
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    let parsed = [];
    if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
      const text = await file.text();
      parsed = parseCSV(text);
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      try {
        const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        // Normalizar headers para lowercase
        parsed = rows.map(row => {
          const norm = {};
          Object.keys(row).forEach(k => { norm[k.trim().toLowerCase()] = String(row[k]).trim(); });
          return norm;
        });
      } catch (err) { setError("Erro ao ler arquivo Excel: " + err.message); return; }
    } else {
      setError("Formato não suportado. Use .xlsx, .xls ou .csv");
      return;
    }
    if (!parsed.length) { setError("Nenhuma linha encontrada no arquivo."); return; }

    const mapped = parsed.map(row => {
      const nome  = row.nome || row.name || row["nome completo"] || "";
      const email = row.email || row["e-mail"] || "";
      const nivel = NIVEL_ALIASES[(row.nivel || row.categoria || row["nível"] || "").toLowerCase()] || "";
      const role  = ROLE_ALIASES[(row.funcao || row.perfil || row.role || row["função"] || "arbitro").toLowerCase()] || "arbitro";
      const senha = row.senha || row.password || generatePassword();
      const duplicate = existingEmails.includes(email.toLowerCase());
      const valid = nome && email && email.includes("@") && senha.length >= 6;
      return { nome, email, nivel, role, senha, valid, duplicate, status: duplicate ? "duplicado" : valid ? "ok" : "inválido" };
    });
    setRows(mapped);
    setStep("preview");
  };

  const startImport = async () => {
    const toImport = rows.filter(r => r.status === "ok");
    if (!toImport.length) return;
    setStep("importing"); setProgress(0);
    const res = [];
    for (let i = 0; i < toImport.length; i++) {
      const r = toImport[i];
      try {
        const senhaAuto = (() => { const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; let s = ""; for (let j = 0; j < 8; j++) s += c[Math.floor(Math.random() * c.length)]; return s; })();
        const result = await refereesAPI.create({
          name: r.nome, email: r.email, password: senhaAuto,
          nivel: r.nivel, role: r.role, status: "ativo",
          mustChangePassword: true, profileComplete: false,
        });
        if (result.error) {
          res.push({ ...r, result: "erro", msg: result.error });
        } else {
          notificarArbitroCadastro({ arbitroEmail: r.email, arbitroNome: r.nome, senhaTemporaria: senhaAuto }).catch(() => {});
          res.push({ ...r, result: "criado", msg: "Conta criada e e-mail enviado" });
        }
      } catch (err) { res.push({ ...r, result: "erro", msg: err.message }); }
      setProgress(Math.round(((i + 1) / toImport.length) * 100));
    }
    setResults(res); setStep("done");
  };

  const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 };
  const modal = { background: "#fff", borderRadius: 16, padding: "28px 32px", maxWidth: 800, width: "95%", maxHeight: "85vh", overflow: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.2)" };
  const th = { padding: "8px 10px", fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, textAlign: "left" };
  const td = { padding: "8px 10px", fontFamily: FONTS.body, fontSize: 12, color: COLORS.dark };
  const btn = (bg, color) => ({ padding: "10px 22px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, background: bg, color });

  const validCount = rows.filter(r => r.status === "ok").length;
  const dupCount   = rows.filter(r => r.status === "duplicado").length;
  const invCount   = rows.filter(r => r.status === "inválido").length;

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && step !== "importing" && onClose()}>
      <div style={modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 900, color: COLORS.dark, margin: 0, textTransform: "uppercase" }}>
            Importar Árbitros via Planilha
          </h2>
          {step !== "importing" && <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: COLORS.gray }}>✕</button>}
        </div>

        {step === "upload" && (
          <>
            <div style={{ background: "#f8f9fa", borderRadius: 12, padding: "24px 28px", marginBottom: 20, border: `1px dashed ${COLORS.grayLight}` }}>
              <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.dark, margin: "0 0 12px" }}>
                <strong>Formato esperado:</strong> arquivo CSV com as colunas:
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
                <tbody>
                  {[
                    ["Nome", "obrigatório", "Nome completo do árbitro"],
                    ["Email", "obrigatório", "E-mail para login"],
                    ["Senha", "opcional", "Mín. 6 caracteres (se vazio, gera automática)"],
                    ["Nivel", "opcional", "A, B, C ou NAR"],
                    ["Funcao", "opcional", "arbitro, coordenador ou admin (padrão: arbitro)"],
                  ].map(([col, req, desc]) => (
                    <tr key={col} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                      <td style={{ padding: "6px 8px", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: COLORS.dark, width: 80 }}>{col}</td>
                      <td style={{ padding: "6px 8px", width: 80 }}>
                        <span style={{ fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: req === "obrigatório" ? "#fef2f2" : "#f0fdf4", color: req === "obrigatório" ? "#dc2626" : "#15803d" }}>{req}</span>
                      </td>
                      <td style={{ padding: "6px 8px", fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, margin: "8px 0 0" }}>
                Separador: vírgula ou ponto-e-vírgula. Exemplo:<br />
                <code style={{ fontSize: 11, background: "#e8e8e8", padding: "4px 8px", borderRadius: 4, display: "inline-block", marginTop: 4 }}>
                  Nome;Email;Nivel;Funcao<br />
                  João Silva;joao@email.com;A;arbitro
                </code>
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <input type="file" accept=".xlsx,.xls,.csv,.txt" onChange={handleFile} style={{ fontFamily: FONTS.body, fontSize: 14 }} />
              <button onClick={downloadModelo} style={{ ...btn("#0066cc", "#fff"), fontSize: 12, padding: "8px 16px" }}>
                Baixar modelo .xlsx
              </button>
            </div>
            {error && <p style={{ color: "#dc2626", fontFamily: FONTS.body, fontSize: 13, margin: "8px 0 0" }}>{error}</p>}
          </>
        )}

        {step === "preview" && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Válidos", count: validCount, color: "#15803d", bg: "#f0fdf4" },
                { label: "Duplicados", count: dupCount, color: "#b45309", bg: "#fffbeb" },
                { label: "Inválidos", count: invCount, color: "#dc2626", bg: "#fef2f2" },
              ].map(s => (
                <div key={s.label} style={{ padding: "8px 16px", borderRadius: 8, background: s.bg, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: s.color }}>
                  {s.count} {s.label}
                </div>
              ))}
            </div>
            <div style={{ maxHeight: 350, overflow: "auto", marginBottom: 20 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: `2px solid ${COLORS.grayLight}` }}>
                  <th style={th}>Status</th><th style={th}>Nome</th><th style={th}>E-mail</th><th style={th}>Senha</th><th style={th}>Nível</th><th style={th}>Função</th>
                </tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${COLORS.grayLight}`, background: r.status === "ok" ? "transparent" : r.status === "duplicado" ? "#fffbeb" : "#fef2f2" }}>
                      <td style={td}>
                        <span style={{ fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                          background: r.status === "ok" ? "#f0fdf4" : r.status === "duplicado" ? "#fffbeb" : "#fef2f2",
                          color: r.status === "ok" ? "#15803d" : r.status === "duplicado" ? "#b45309" : "#dc2626" }}>
                          {r.status === "ok" ? "OK" : r.status === "duplicado" ? "Duplicado" : "Inválido"}
                        </span>
                      </td>
                      <td style={td}>{r.nome || "—"}</td>
                      <td style={td}>{r.email || "—"}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{r.senha}</td>
                      <td style={td}>{catMap[r.nivel]?.label || r.nivel || "—"}</td>
                      <td style={td}>{roleLabel[r.role] || r.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setStep("upload"); setRows([]); }} style={btn(COLORS.grayLight, COLORS.dark)}>Voltar</button>
              <button onClick={startImport} disabled={!validCount}
                style={btn(validCount ? "#15803d" : COLORS.grayLight, validCount ? "#fff" : COLORS.gray)}>
                Criar {validCount} conta(s)
              </button>
            </div>
          </>
        )}

        {step === "importing" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 700, color: COLORS.dark, marginBottom: 16 }}>Criando contas... {progress}%</div>
            <div style={{ background: COLORS.grayLight, borderRadius: 8, height: 12, overflow: "hidden", maxWidth: 400, margin: "0 auto" }}>
              <div style={{ background: "#15803d", height: "100%", width: `${progress}%`, transition: "width 0.3s", borderRadius: 8 }} />
            </div>
            <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginTop: 12 }}>Criando contas Firebase Auth e enviando e-mails com credenciais...</p>
          </div>
        )}

        {step === "done" && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Criados", count: results.filter(r => r.result === "criado").length, color: "#15803d", bg: "#f0fdf4" },
                { label: "Erros", count: results.filter(r => r.result === "erro").length, color: "#dc2626", bg: "#fef2f2" },
              ].map(s => (
                <div key={s.label} style={{ padding: "8px 16px", borderRadius: 8, background: s.bg, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: s.color }}>
                  {s.count} {s.label}
                </div>
              ))}
            </div>
            <div style={{ maxHeight: 350, overflow: "auto", marginBottom: 20 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: `2px solid ${COLORS.grayLight}` }}>
                  <th style={th}>Resultado</th><th style={th}>Nome</th><th style={th}>E-mail</th><th style={th}>Senha</th><th style={th}>Detalhes</th>
                </tr></thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${COLORS.grayLight}`, background: r.result === "criado" ? "transparent" : "#fef2f2" }}>
                      <td style={td}>
                        <span style={{ fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                          background: r.result === "criado" ? "#f0fdf4" : "#fef2f2", color: r.result === "criado" ? "#15803d" : "#dc2626" }}>
                          {r.result === "criado" ? "Criado" : "Erro"}
                        </span>
                      </td>
                      <td style={td}>{r.nome}</td><td style={td}>{r.email}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{r.result === "criado" ? r.senha : "—"}</td>
                      <td style={{ ...td, fontSize: 11, color: r.result === "criado" ? "#15803d" : "#dc2626" }}>{r.msg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={onClose} style={btn(COLORS.primary, "#fff")}>Fechar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Formulário de criação simplificado ────────────────────────────────────────

function CreateRefereeForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", nivel: "", role: "arbitro" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const gerarSenhaTemp = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let s = "";
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Nome e obrigatorio."); return; }
    if (!form.email.trim()) { setError("E-mail e obrigatorio."); return; }
    setSaving(true); setError("");

    const senhaTemp = gerarSenhaTemp();
    const r = await refereesAPI.create({
      ...form,
      password: senhaTemp,
      status: "ativo",
      mustChangePassword: true,
      profileComplete: false,
    });
    setSaving(false);
    if (r.error) { setError(r.error); return; }
    notificarArbitroCadastro({
      arbitroEmail: form.email,
      arbitroNome: form.name,
      senhaTemporaria: senhaTemp,
    }).catch(() => {});
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
        <div style={{ padding: "10px 14px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
          <span style={{ fontFamily: FONTS.body, fontSize: 12, color: "#15803d" }}>Uma senha temporaria sera gerada automaticamente e enviada por e-mail ao arbitro.</span>
        </div>
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
