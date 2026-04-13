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
  const [showImport, setShowImport] = useState(false);

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
            <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>Árbitros</h1>
            <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: 0 }}>Gerencie o cadastro, perfis e status dos árbitros.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowImport(true)}
              style={{ padding: "11px 22px", borderRadius: 8, background: "#0066cc", color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
              Importar Planilha
            </button>
            <button onClick={() => navigate("/intranet/admin/arbitros/novo")}
              style={{ padding: "11px 22px", borderRadius: 8, background: COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
              + Novo Árbitro
            </button>
          </div>
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
          <input placeholder="Buscar nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)}
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
          <div style={{ padding: "60px 0", textAlign: "center", color: COLORS.gray, fontFamily: FONTS.body }}>Carregando...</div>
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

      {/* Modal Importação Planilha */}
      {showImport && <ImportModal onClose={() => { setShowImport(false); load(); }} existingEmails={refs.map(r => r.email?.toLowerCase())} />}
    </IntranetLayout>
  );
}

// ─── Modal de Importação via Planilha ────────────────────────────────────────

function ImportModal({ onClose, existingEmails }) {
  const [step, setStep] = useState("upload"); // upload | preview | importing | done
  const [rows, setRows] = useState([]);        // dados parseados
  const [results, setResults] = useState([]);   // resultado por linha
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

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

    // Mapear colunas (flexível)
    const mapped = parsed.map(row => {
      const nome  = row.nome || row.name || row["nome completo"] || "";
      const email = row.email || row["e-mail"] || "";
      const nivel = NIVEL_ALIASES[(row.nivel || row.categoria || row["nível"] || "").toLowerCase()] || "";
      const role  = ROLE_ALIASES[(row.funcao || row.perfil || row.role || row["função"] || "arbitro").toLowerCase()] || "arbitro";
      const city  = row.cidade || row.city || "";
      const phone = row.telefone || row.phone || row.celular || "";
      const senha = row.senha || row.password || generatePassword();
      const duplicate = existingEmails.includes(email.toLowerCase());
      const valid = nome && email && email.includes("@");
      return { nome, email, nivel, role, city, phone, senha, valid, duplicate, status: duplicate ? "duplicado" : valid ? "ok" : "inválido" };
    });

    setRows(mapped);
    setStep("preview");
  };

  const startImport = async () => {
    const toImport = rows.filter(r => r.status === "ok");
    if (!toImport.length) return;
    setStep("importing");
    setProgress(0);
    const res = [];

    for (let i = 0; i < toImport.length; i++) {
      const r = toImport[i];
      try {
        const result = await RefereesService.create({
          name: r.nome, email: r.email, password: r.senha,
          nivel: r.nivel, role: r.role, city: r.city, phone: r.phone,
          status: "ativo", mustChangePassword: true, profileComplete: false,
        });
        if (result.error) {
          res.push({ ...r, result: "erro", msg: result.error });
        } else {
          // Enviar e-mail com credenciais
          notificarArbitroCadastro({
            arbitroEmail: r.email, arbitroNome: r.nome, senhaTemporaria: r.senha,
          }).catch(() => {});
          res.push({ ...r, result: "criado", msg: "Conta criada e e-mail enviado" });
        }
      } catch (err) {
        res.push({ ...r, result: "erro", msg: err.message });
      }
      setProgress(Math.round(((i + 1) / toImport.length) * 100));
    }

    setResults(res);
    setStep("done");
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
          {step !== "importing" && (
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: COLORS.gray }}>✕</button>
          )}
        </div>

        {/* Step: Upload */}
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
                    ["Nivel", "opcional", "A, B, C ou NI"],
                    ["Funcao", "opcional", "arbitro, coordenador ou admin (padrão: arbitro)"],
                    ["Cidade", "opcional", "Cidade do árbitro"],
                    ["Telefone", "opcional", "Telefone/celular"],
                    ["Senha", "opcional", "Se vazio, gera senha aleatória de 8 caracteres"],
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
                  Nome;Email;Nivel;Cidade<br />
                  João Silva;joao@email.com;A;Belo Horizonte
                </code>
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <input type="file" accept=".xlsx,.xls,.csv,.txt" onChange={handleFile}
                style={{ fontFamily: FONTS.body, fontSize: 14 }} />
              <button onClick={downloadModelo} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, background: "#0066cc", color: "#fff" }}>
                Baixar modelo .xlsx
              </button>
            </div>
            {error && <p style={{ color: "#dc2626", fontFamily: FONTS.body, fontSize: 13, margin: "8px 0 0" }}>{error}</p>}
          </>
        )}

        {/* Step: Preview */}
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
                <thead>
                  <tr style={{ borderBottom: `2px solid ${COLORS.grayLight}` }}>
                    <th style={th}>Status</th>
                    <th style={th}>Nome</th>
                    <th style={th}>E-mail</th>
                    <th style={th}>Nível</th>
                    <th style={th}>Função</th>
                    <th style={th}>Cidade</th>
                    <th style={th}>Senha</th>
                  </tr>
                </thead>
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
                      <td style={td}>{r.nome || <span style={{ color: "#dc2626" }}>—</span>}</td>
                      <td style={td}>{r.email || <span style={{ color: "#dc2626" }}>—</span>}</td>
                      <td style={td}>{catMap[r.nivel]?.label || r.nivel || "—"}</td>
                      <td style={td}>{roleMap[r.role]?.label || r.role}</td>
                      <td style={td}>{r.city || "—"}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{r.senha}</td>
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

        {/* Step: Importing */}
        {step === "importing" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 700, color: COLORS.dark, marginBottom: 16 }}>
              Criando contas... {progress}%
            </div>
            <div style={{ background: COLORS.grayLight, borderRadius: 8, height: 12, overflow: "hidden", maxWidth: 400, margin: "0 auto" }}>
              <div style={{ background: "#15803d", height: "100%", width: `${progress}%`, transition: "width 0.3s", borderRadius: 8 }} />
            </div>
            <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginTop: 12 }}>
              Criando contas Firebase Auth e enviando e-mails com credenciais...
            </p>
          </div>
        )}

        {/* Step: Done */}
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
                <thead>
                  <tr style={{ borderBottom: `2px solid ${COLORS.grayLight}` }}>
                    <th style={th}>Resultado</th>
                    <th style={th}>Nome</th>
                    <th style={th}>E-mail</th>
                    <th style={th}>Senha</th>
                    <th style={th}>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${COLORS.grayLight}`, background: r.result === "criado" ? "transparent" : "#fef2f2" }}>
                      <td style={td}>
                        <span style={{ fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                          background: r.result === "criado" ? "#f0fdf4" : "#fef2f2",
                          color: r.result === "criado" ? "#15803d" : "#dc2626" }}>
                          {r.result === "criado" ? "Criado" : "Erro"}
                        </span>
                      </td>
                      <td style={td}>{r.nome}</td>
                      <td style={td}>{r.email}</td>
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
