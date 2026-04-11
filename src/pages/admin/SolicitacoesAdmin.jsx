/**
 * SolicitacoesAdmin.jsx — Painel admin de análise de solicitações de Permit e Chancela.
 * Exporta: SolicitacoesList, SolicitacaoEditor
 * Rotas:
 *   /admin/solicitacoes        → SolicitacoesList
 *   /admin/solicitacoes/:id    → SolicitacaoEditor
 *
 * SolicitacoesList:
 *   - Dashboard de contadores por status (clicáveis como filtro)
 *   - Tabela com busca, filtro por status/tipo, ordenação por data
 *   - Ações rápidas: mudar status direto na tabela
 *
 * SolicitacaoEditor (análise completa):
 *   - Aba 1: Dados da solicitação (evento + campos livres do organizador)
 *   - Aba 2: Arquivos (listagem, download, upload pela FMA, exclusão)
 *   - Aba 3: Análise FMA (responsável, parecer, protocolo, mudança de status)
 *   - Aba 4: Histórico completo (todas movimentações, incluindo as internas)
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { COLORS, FONTS } from "../../styles/colors";
import {
  SOLICITACAO_STATUS, SOLICITACAO_TIPOS, MOVIMENTACAO_TIPOS, ARQUIVO_CATEGORIAS,
  PAGAMENTO_STATUS,
} from "../../config/navigation";
import {
  SolicitacoesService, OrganizersService, ArquivosService, MovimentacoesService,
  CalendarService, TaxasConfigService, PagamentosService,
} from "../../services/index";
import { uploadFile, deleteFile } from "../../services/storageService";
import { normalizarCamposTecnicos, totalEstimativaInscritos, modalidadesLabel } from "../../utils/permitDefaults";
import { calcularTaxaTotal, formatarMoeda, TABELA_PADRAO, TABELA_ARBITRAGEM, PRAZOS } from "../../utils/taxaCalculator";
import { reservarNumeroRecibo, formatarNumeroRecibo } from "../../utils/reciboCounter";
import { gerarReciboPdf } from "../../services/reciboPdfService";
import { notificarStatusSolicitacao, notificarPagamentoConfirmado, notificarCobrancaPagamento, notificarArquivoFmaEnviado, notificarPermitGerado, notificarResultadoStatus } from "../../services/emailService";
import { getProximoNumero, reservarNumeros, setContador, formatarNumero } from "../../utils/permitCounter";
import { gerarPermitPdf, gerarChancelaPdf, preloadAssets } from "../../services/permitPdfService";

// ── Constantes e helpers ──────────────────────────────────────────────────────
const statusMap = Object.fromEntries(SOLICITACAO_STATUS.map(s => [s.value, s]));
const tipoMap   = Object.fromEntries(SOLICITACAO_TIPOS.map(t => [t.value, t]));
const movMap    = MOVIMENTACAO_TIPOS;

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDT(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function StatusBadge({ status, size = "md" }) {
  const s = statusMap[status] || { label: status, color: COLORS.gray, bg: "#f3f4f6", icon: "📋" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: size === "lg" ? "6px 14px" : "3px 9px",
      borderRadius: 20, fontSize: size === "lg" ? 13 : 11,
      fontFamily: FONTS.heading, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.color}30`,
    }}>
      {s.icon} {s.label}
    </span>
  );
}

function TipoBadge({ tipo }) {
  const t = tipoMap[tipo] || { label: tipo, icon: "📋" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px",
      borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700,
      background: tipo === "permit" ? "#fff3cd" : "#e3f8f0",
      color: tipo === "permit" ? "#856404" : "#065f46",
      border: `1px solid ${tipo === "permit" ? "#ffc10740" : "#34d39940"}` }}>
      {t.icon} {t.label}
    </span>
  );
}

// ── LISTA ─────────────────────────────────────────────────────────────────────
export function SolicitacoesList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [organizers, setOrganizers] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [rSol, rOrg] = await Promise.all([
      SolicitacoesService.list({}),
      OrganizersService.list(),
    ]);
    if (rSol.data) setItems(rSol.data);
    if (rOrg.data) {
      const map = {};
      rOrg.data.forEach(o => { map[o.id] = o; });
      setOrganizers(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(item => {
    if (filterStatus && item.status !== filterStatus) return false;
    if (filterTipo   && item.tipo !== filterTipo)     return false;
    if (search) {
      const q = search.toLowerCase();
      const org = organizers[item.organizerId];
      if (!item.nomeEvento?.toLowerCase().includes(q) &&
          !item.cidadeEvento?.toLowerCase().includes(q) &&
          !org?.name?.toLowerCase().includes(q) &&
          !org?.organization?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const toggleSelect = (id) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const allFilteredSelected = filtered.length > 0 && filtered.every(i => selected.has(i.id));
  const toggleSelectAll = () => setSelected(allFilteredSelected ? new Set() : new Set(filtered.map(i => i.id)));

  const handleBulkDelete = async (ids) => {
    if (!ids.length) return;
    if (!confirm(`Excluir ${ids.length} solicitação(ões) permanentemente?\nIsso inclui arquivos anexos e histórico de movimentações.`)) return;
    setBulkDeleting(true);
    for (const id of ids) {
      // 1. Excluir arquivos anexos do Storage + Firestore
      const arqRes = await ArquivosService.listBySolicitacao(id);
      for (const arq of (arqRes.data || [])) {
        if (arq.storagePath) await deleteFile(arq.storagePath).catch(() => {});
        else if (arq.url?.includes("firebasestorage.googleapis.com")) await deleteFile(arq.url).catch(() => {});
        await ArquivosService.delete(arq.id).catch(() => {});
      }
      // 2. Excluir movimentações do Firestore
      await MovimentacoesService.deleteBySolicitacao(id).catch(() => {});
      // 3. Excluir a solicitação do Firestore
      await SolicitacoesService.delete(id).catch(() => {});
    }
    setSelected(new Set());
    setBulkDeleting(false);
    load();
  };

  // Contadores por status
  const counts = SOLICITACAO_STATUS.filter(s => s.value).reduce((acc, s) => {
    acc[s.value] = items.filter(i => i.status === s.value).length;
    return acc;
  }, {});

  const card = { background: "#fff", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 28 };

  return (
    <AdminLayout>
      <div style={{ padding: "32px 32px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: COLORS.primary, marginBottom: 4 }}>Portal de Organizadores</div>
            <h1 style={{ fontFamily: FONTS.heading, fontSize: 28, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: 0 }}>Solicitações</h1>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/admin/organizadores" style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              🏢 Organizadores
            </Link>
            <a href="/portal" target="_blank" rel="noreferrer" style={{ padding: "10px 18px", borderRadius: 8, background: "#0f172a", color: "#60a5fa", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              🔗 Abrir Portal
            </a>
          </div>
        </div>

        {/* Dashboard de contadores */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 12, marginBottom: 28 }}>
          <button onClick={() => setFilterStatus("")}
            style={{ background: filterStatus === "" ? COLORS.dark : "#fff", border: `2px solid ${filterStatus === "" ? COLORS.dark : COLORS.grayLight}`, borderRadius: 12, padding: "16px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 900, color: filterStatus === "" ? "#fff" : COLORS.dark }}>{items.length}</div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: filterStatus === "" ? "rgba(255,255,255,0.7)" : COLORS.gray, marginTop: 2 }}>Total</div>
          </button>
          {SOLICITACAO_STATUS.filter(s => s.value).map(s => (
            <button key={s.value} onClick={() => setFilterStatus(filterStatus === s.value ? "" : s.value)}
              style={{ background: filterStatus === s.value ? s.bg : "#fff", border: `2px solid ${filterStatus === s.value ? s.color : COLORS.grayLight}`, borderRadius: 12, padding: "16px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: s.color }}>{counts[s.value] || 0}</div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: s.color, marginTop: 2, lineHeight: 1.2 }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ ...card, padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por evento, cidade ou organizador..."
              style={{ flex: 1, minWidth: 220, padding: "9px 13px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 14, outline: "none" }} />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: "9px 13px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, cursor: "pointer" }}>
              <option value="">Todos os status</option>
              {SOLICITACAO_STATUS.filter(s => s.value).map(s => (
                <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
              ))}
            </select>
            <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
              style={{ padding: "9px 13px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, cursor: "pointer" }}>
              <option value="">Permit e Chancela</option>
              {SOLICITACAO_TIPOS.map(t => (
                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
              ))}
            </select>
            {(search || filterStatus || filterTipo) && (
              <button onClick={() => { setSearch(""); setFilterStatus(""); setFilterTipo(""); }}
                style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, fontFamily: FONTS.body, fontSize: 13, cursor: "pointer" }}>
                ✕ Limpar
              </button>
            )}
          </div>
        </div>

        {/* Barra de seleção em lote */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, padding: "10px 16px", background: selected.size ? "#fff5f5" : "#f9fafb", borderRadius: 8, border: `1px solid ${selected.size ? "#fecaca" : COLORS.grayLight}` }}>
            <span style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: COLORS.dark }}>
              {selected.size ? `${selected.size} selecionada(s)` : `${filtered.length} solicitação(ões)`}
            </span>
            <div style={{ flex: 1 }} />
            {selected.size > 0 && (
              <>
                <button onClick={() => handleBulkDelete([...selected])} disabled={bulkDeleting}
                  style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: "#dc2626", color: "#fff", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: bulkDeleting ? "not-allowed" : "pointer" }}>
                  {bulkDeleting ? "Excluindo..." : `Excluir selecionadas (${selected.size})`}
                </button>
                <button onClick={() => setSelected(new Set())}
                  style={{ padding: "7px 16px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Cancelar
                </button>
              </>
            )}
            {!selected.size && (
              <button onClick={() => handleBulkDelete(filtered.map(i => i.id))} disabled={bulkDeleting}
                style={{ padding: "7px 16px", borderRadius: 7, border: "1px solid #fecaca", background: "#fff5f5", color: "#dc2626", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Excluir todas filtradas ({filtered.length})
              </button>
            )}
          </div>
        )}

        {/* Tabela */}
        <div style={card}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", fontFamily: FONTS.body, color: COLORS.gray }}>⏳ Carregando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", fontFamily: FONTS.body, color: COLORS.gray }}>Nenhuma solicitação encontrada.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${COLORS.grayLight}` }}>
                    <th style={{ padding: "10px 8px", width: 32 }}>
                      <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} style={{ cursor: "pointer" }} />
                    </th>
                    {["Tipo", "Evento", "Organizador", "Data Evento", "Status", "Protocolo", "Responsável FMA", "Enviado em", ""].map(h => (
                      <th key={h} style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => {
                    const org = organizers[item.organizerId];
                    return (
                      <tr key={item.id} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                        onMouseLeave={e => e.currentTarget.style.background = ""}>
                        <td style={{ padding: "12px 8px" }}>
                          <input type="checkbox" checked={selected.has(item.id)}
                            onChange={() => toggleSelect(item.id)} onClick={e => e.stopPropagation()}
                            style={{ cursor: "pointer" }} />
                        </td>
                        <td style={{ padding: "12px" }}><TipoBadge tipo={item.tipo} /></td>
                        <td style={{ padding: "12px", minWidth: 200 }}>
                          <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.dark }}>{item.nomeEvento}</div>
                          <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>📍 {item.cidadeEvento}</div>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark }}>{org?.name || item.organizerId}</div>
                          {org?.organization && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>{org.organization}</div>}
                        </td>
                        <td style={{ padding: "12px", fontFamily: FONTS.body, fontSize: 13, color: COLORS.grayDark, whiteSpace: "nowrap" }}>{fmt(item.dataEvento)}</td>
                        <td style={{ padding: "12px" }}><StatusBadge status={item.status} /></td>
                        <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                          {item.protocoloFMA ? (
                            <span style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800,
                              color: "#15803d", background: "#f0fdf4", padding: "3px 8px",
                              borderRadius: 6, border: "1px solid #86efac" }}>
                              🔖 {item.protocoloFMA}
                            </span>
                          ) : (
                            <span style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "12px", fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{item.responsavelFMA || "—"}</td>
                        <td style={{ padding: "12px", fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, whiteSpace: "nowrap" }}>{fmt(item.enviadoEm)}</td>
                        <td style={{ padding: "12px" }}>
                          <button onClick={() => navigate(`/admin/solicitacoes/${item.id}`)}
                            style={{ padding: "7px 14px", borderRadius: 6, background: COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                            Analisar →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: "12px 12px 0", fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
                {filtered.length} solicitação(ões) exibida(s) de {items.length} total
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

// ── EDITOR (análise completa) ─────────────────────────────────────────────────
export function SolicitacaoEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [sol, setSol] = useState(null);
  const [organizer, setOrganizer] = useState(null);
  const [arquivos, setArquivos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState("dados");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Formulário de análise FMA — protocoloFMA REMOVIDO: gerado automaticamente
  const [analise, setAnalise] = useState({
    responsavelFMA: "", parecerFMA: "", observacaoFMA: "",
  });
  const [novoStatus, setNovoStatus] = useState("");

  // Upload pela FMA
  const [uploading, setUploading] = useState(false);
  const [uploadDesc, setUploadDesc] = useState("");

  // Geração de permits
  const [permitNumbers, setPermitNumbers] = useState([]);     // [{ modalidade, numero, editado }]
  const [gerandoPermits, setGerandoPermits] = useState(false);

  // Vinculação de evento de calendário
  const [eventoVinculado, setEventoVinculado]     = useState(null);   // objeto EventoCalendario
  const [vinculoMode, setVinculoMode]             = useState(null);   // null | "buscar" | "criar"
  const [calendarioItems, setCalendarioItems]     = useState([]);     // lista para busca
  const [calendarioBusca, setCalendarioBusca]     = useState("");     // filtro de busca
  const [vinculoSaving, setVinculoSaving]         = useState(false);
  const [criarOpts, setCriarOpts]                 = useState({       // overrides ao criar
    published: false, featured: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await SolicitacoesService.get(id);
    if (r.error) { navigate("/admin/solicitacoes"); return; }
    setSol(r.data);
    setNovoStatus(r.data.status);
    setAnalise({
      responsavelFMA: r.data.responsavelFMA || "",
      parecerFMA: r.data.parecerFMA || "",
      observacaoFMA: r.data.observacaoFMA || "",
    });
    const [rOrg, rArq, rMov] = await Promise.all([
      OrganizersService.get(r.data.organizerId),
      ArquivosService.listBySolicitacao(id),
      MovimentacoesService.listBySolicitacao(id, { apenasVisiveis: false }),
    ]);
    if (rOrg.data) setOrganizer(rOrg.data);
    if (rArq.data) setArquivos(rArq.data);
    if (rMov.data) setMovimentacoes(rMov.data);

    // Carregar evento vinculado (se houver) e lista para busca
    if (r.data.eventoCalendarioId) {
      const rEvento = await CalendarService.get(r.data.eventoCalendarioId);
      setEventoVinculado(rEvento.data || null);
    } else {
      setEventoVinculado(null);
    }
    const rCal = await CalendarService.list({ publishedOnly: false });
    setCalendarioItems(rCal.data || []);

    setVinculoMode(null);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const flash = (text, type = "ok") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3500);
  };

  // ── Pré-preencher números de permit quando admin seleciona "aprovada" ──────
  useEffect(() => {
    if (novoStatus !== "aprovada" || !sol) { setPermitNumbers([]); return; }
    if (sol.permitsGerados) { setPermitNumbers([]); return; } // já gerados
    const ct = normalizarCamposTecnicos(sol);
    const mods = (ct.modalidades || []).filter(m => {
      const nome = (m.distancia || m.nome || "").toLowerCase();
      return nome !== "caminhada";
    });
    if (mods.length === 0) { setPermitNumbers([]); return; }
    const ano = new Date(sol.dataEvento || Date.now()).getFullYear();
    getProximoNumero(ano).then(proximo => {
      setPermitNumbers(mods.map((m, i) => ({
        modalidade: m.distancia || m.nome || `Modalidade ${i + 1}`,
        numero: proximo + i,
        ano,
        editado: false,
      })));
    });
  }, [novoStatus, sol]);

  // ── Salvar análise ──────────────────────────────────────────────────────────
  const handleSalvarAnalise = async () => {
    setSaving(true);
    // 1. Atualizar campos de análise (responsável, parecer, observação interna)
    const rUpdate = await SolicitacoesService.update(id, analise);
    if (rUpdate.error) { flash(rUpdate.error, "err"); setSaving(false); return; }

    // 2. Se status mudou, usar changeStatus
    //    Se o novo status for "em_analise", o protocolo é gerado automaticamente
    //    dentro de SolicitacoesService.changeStatus → api.changeStatus → garantirProtocolo
    let protocoloNovoMensagem = "";
    if (novoStatus !== sol.status) {
      const rStatus = await SolicitacoesService.changeStatus(id, novoStatus);
      if (rStatus.error) { flash(rStatus.error, "err"); setSaving(false); return; }

      // Capturar protocolo gerado nesta transição para mostrar no flash
      if (rStatus.data?._protocoloGerado) {
        protocoloNovoMensagem = ` Protocolo ${rStatus.data.protocoloFMA} gerado.`;
      }

      // Registrar movimentação de mudança de status
      await MovimentacoesService.registrar({
        solicitacaoId: id,
        tipoEvento: novoStatus === "pendencia" ? "pendencia_aberta" : "status_alterado",
        statusAnterior: sol.status,
        statusNovo: novoStatus,
        descricao: `Status alterado para "${statusMap[novoStatus]?.label || novoStatus}" pelo analista da FMA.${analise.parecerFMA ? ` Parecer: ${analise.parecerFMA.slice(0, 80)}${analise.parecerFMA.length > 80 ? "…" : ""}` : ""}`,
        autor: "fma",
        autorNome: analise.responsavelFMA || "Equipe FMA",
        autorId: "admin",
        visivel: true,
      });
      // Notificar organizador por email
      if (sol.organizadorEmail || sol.organizerEmail) {
        notificarStatusSolicitacao({
          organizadorEmail: sol.organizadorEmail || sol.organizerEmail,
          organizadorNome:  sol.organizadorNome  || sol.organizerName || "Organizador",
          protocolo:        rStatus.data?.protocoloFMA || sol.protocoloFMA || sol.id,
          evento:           sol.titulo || sol.title || "Evento",
          status:           novoStatus,
          observacao:       analise.parecerFMA || "",
        }).catch(e => console.warn("Email solicitação:", e));
      }
    }

    flash(`Análise salva com sucesso.${protocoloNovoMensagem}`, "ok");
    setSaving(false);
    load();
  };

  // ── Gerar Permits/Chancelas e Aprovar ───────────────────────────────────────
  const handleGerarPermitsEAprovar = async () => {
    if (!sol || permitNumbers.length === 0) return;
    setGerandoPermits(true);
    setSaving(true);
    try {
      // 1. Salvar campos de análise
      const rUpdate = await SolicitacoesService.update(id, analise);
      if (rUpdate.error) { flash(rUpdate.error, "err"); return; }

      // 2. Pré-carregar assets do PDF
      await preloadAssets();

      // 3. Dados comuns
      const ano = permitNumbers[0].ano;
      const orgName = organizer?.organization || organizer?.name || sol.organizadorNome || "";
      const dataEmissao = new Date().toISOString().slice(0, 10);
      const tipoDoc = sol.tipo; // "permit" ou "chancela"
      const gerarFn = tipoDoc === "chancela" ? gerarChancelaPdf : gerarPermitPdf;

      // 4. Gerar e fazer upload de cada PDF
      const modalidadesDetalhes = [];
      const numerosUsados = [];

      for (const pn of permitNumbers) {
        const numFormatado = formatarNumero(pn.numero, ano);
        const pdfBlob = await gerarFn({
          numero: numFormatado,
          organizador: orgName,
          nomeEvento: sol.nomeEvento || sol.titulo || sol.title || "",
          modalidade: pn.modalidade,
          dataEvento: sol.dataEvento || "",
          cidadeEvento: sol.cidadeEvento || "",
          dataEmissao,
        });

        const sanitizeP = (s) => (s || "sem-nome").replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, "").trim().replace(/\s+/g, "_");
        const fileName = `${tipoDoc}_${sanitizeP(sol.nomeEvento)}_${sanitizeP(pn.modalidade)}_${numFormatado.replace("/", "-")}.pdf`;
        const file = new File([pdfBlob], fileName, { type: "application/pdf" });
        const folderP = `solicitacoes/${ano}/${sanitizeP(organizer?.organization || organizer?.name || "")}/${sanitizeP(sol.nomeEvento)}`;
        const { url, path, error: uploadErr } = await uploadFile(file, folderP);
        if (uploadErr) { flash(`Erro ao enviar ${fileName}.`, "err"); return; }

        // Registrar como arquivo da solicitação
        await ArquivosService.create({
          solicitacaoId: id,
          nome: fileName,
          tamanho: file.size,
          tipo: "application/pdf",
          descricao: `${tipoDoc === "chancela" ? "Chancela" : "Permit"} N\u00BA ${numFormatado} \u2014 ${pn.modalidade}`,
          categoria: "resposta_fma",
          enviadoPor: "fma",
          enviadoById: "admin",
          enviadoPorNome: analise.responsavelFMA || "Sistema FMA",
          url,
          storagePath: path,
        });

        modalidadesDetalhes.push({
          nome: pn.modalidade,
          permitFileUrl: url,
          permitNumero: numFormatado,
          resultsFileUrl: "",
        });
        numerosUsados.push(numFormatado);
      }

      // 5. Atualizar contador para o maior número usado
      const maxNum = Math.max(...permitNumbers.map(p => p.numero));
      await setContador(ano, maxNum);

      // 6. Atualizar evento do calendário com modalidadesDetalhes
      const eventoId = sol.eventoCalendarioId || sol.eventoId;
      if (eventoId) {
        await CalendarService.update(eventoId, {
          modalidadesDetalhes,
          status: "confirmado",
        });
      }

      const jaEstaAprovada = sol.status === "aprovada";

      // 7. Mudar status para aprovada (só se ainda não está)
      if (!jaEstaAprovada) {
        const rStatus = await SolicitacoesService.changeStatus(id, "aprovada");
        if (rStatus.error) { flash(rStatus.error, "err"); return; }
      }

      // 8. Marcar permits como gerados na solicitação
      await SolicitacoesService.update(id, {
        permitsGerados: true,
        permitsNumeros: numerosUsados,
      });

      // 9. Registrar movimentações
      await MovimentacoesService.registrar({
        solicitacaoId: id,
        tipoEvento: "permit_gerado",
        statusAnterior: sol.status,
        statusNovo: "aprovada",
        descricao: `${tipoDoc === "chancela" ? "Chancela(s)" : "Permit(s)"} ${jaEstaAprovada ? "regerado(s)" : "gerado(s)"}: ${numerosUsados.join(", ")}.`,
        autor: "fma",
        autorNome: analise.responsavelFMA || "Equipe FMA",
        autorId: "admin",
        visivel: true,
      });

      if (!jaEstaAprovada) {
        await MovimentacoesService.registrar({
          solicitacaoId: id,
          tipoEvento: "status_alterado",
          statusAnterior: sol.status,
          statusNovo: "aprovada",
          descricao: `Status alterado para "Aprovada" pelo analista da FMA.`,
          autor: "fma",
          autorNome: analise.responsavelFMA || "Equipe FMA",
          autorId: "admin",
          visivel: true,
        });

        // 10. Notificar organizador (só na primeira aprovação)
        if (sol.organizadorEmail || sol.organizerEmail) {
          notificarStatusSolicitacao({
            organizadorEmail: sol.organizadorEmail || sol.organizerEmail,
            organizadorNome:  sol.organizadorNome  || sol.organizerName || "Organizador",
            protocolo:        sol.protocoloFMA || sol.id,
            evento:           sol.nomeEvento || sol.titulo || sol.title || "Evento",
            status:           "aprovada",
            observacao:       analise.parecerFMA || "",
          }).catch(e => console.warn("Email solicitação:", e));
        }
      }

      // Notificar organizador: permit/chancela gerado
      if (sol.organizadorEmail || sol.organizerEmail) {
        notificarPermitGerado({
          organizadorEmail: sol.organizadorEmail || sol.organizerEmail,
          organizadorNome:  sol.organizadorNome  || sol.organizerName || "Organizador",
          protocolo:        sol.protocoloFMA || sol.id,
          evento:           sol.nomeEvento || sol.titulo || sol.title || "Evento",
          tipo:             sol.tipo || "permit",
        }).catch(() => {});
      }

      flash(`${permitNumbers.length} ${tipoDoc === "chancela" ? "chancela(s)" : "permit(s)"} gerado(s) e solicitação aprovada!`, "ok");
      load();
    } catch (err) {
      console.error("Erro ao gerar permits:", err);
      flash("Erro ao gerar permits. Verifique o console.", "err");
    } finally {
      setGerandoPermits(false);
      setSaving(false);
    }
  };

  // ── Aprovar/Rejeitar resultado enviado pelo organizador ────────────────────
  const handleAprovarResultado = async () => {
    setSaving(true);
    try {
      const eventoId = sol.eventoCalendarioId || sol.eventoId;
      if (eventoId && sol.resultadoFileUrl) {
        // Copiar URL para o evento do calendário
        const updateData = { resultsFileUrl: sol.resultadoFileUrl };
        // Se o evento tem modalidadesDetalhes, atualizar resultsFileUrl em cada uma
        if (eventoVinculado?.modalidadesDetalhes?.length > 0) {
          updateData.modalidadesDetalhes = eventoVinculado.modalidadesDetalhes.map(m => ({
            ...m,
            resultsFileUrl: sol.resultadoFileUrl,
          }));
        }
        await CalendarService.update(eventoId, updateData);
      }
      await SolicitacoesService.update(id, {
        resultadoStatus: "aprovado",
        resultadoAprovadoEm: new Date().toISOString(),
      });
      await MovimentacoesService.registrar({
        solicitacaoId: id,
        tipoEvento: "resultado_aprovado",
        statusAnterior: sol.status, statusNovo: sol.status,
        descricao: "Resultado enviado pelo organizador foi aprovado e publicado no calendário.",
        autor: "fma", autorNome: analise.responsavelFMA || "Equipe FMA",
        autorId: "admin", visivel: true,
      });
      // Notificar organizador: resultado aprovado
      if (sol.organizadorEmail || sol.organizerEmail) {
        notificarResultadoStatus({
          organizadorEmail: sol.organizadorEmail || sol.organizerEmail,
          organizadorNome:  sol.organizadorNome  || sol.organizerName || "Organizador",
          evento:           sol.nomeEvento || sol.titulo || sol.title || "Evento",
          status:           "aprovado",
        }).catch(() => {});
      }
      flash("Resultado aprovado e publicado no calendário!", "ok");
      load();
    } catch (err) {
      flash("Erro ao aprovar resultado.", "err");
    } finally { setSaving(false); }
  };

  const handleRejeitarResultado = async () => {
    const motivo = prompt("Motivo da rejeição (será visível ao organizador):");
    if (motivo === null) return;
    setSaving(true);
    try {
      await SolicitacoesService.update(id, {
        resultadoStatus: "rejeitado",
      });
      await MovimentacoesService.registrar({
        solicitacaoId: id,
        tipoEvento: "resultado_rejeitado",
        statusAnterior: sol.status, statusNovo: sol.status,
        descricao: `Resultado rejeitado. Motivo: ${motivo || "Não informado."}`,
        autor: "fma", autorNome: analise.responsavelFMA || "Equipe FMA",
        autorId: "admin", visivel: true,
      });
      // Notificar organizador: resultado rejeitado
      if (sol.organizadorEmail || sol.organizerEmail) {
        notificarResultadoStatus({
          organizadorEmail: sol.organizadorEmail || sol.organizerEmail,
          organizadorNome:  sol.organizadorNome  || sol.organizerName || "Organizador",
          evento:           sol.nomeEvento || sol.titulo || sol.title || "Evento",
          status:           "rejeitado",
        }).catch(() => {});
      }
      flash("Resultado rejeitado. O organizador pode enviar novamente.", "ok");
      load();
    } catch (err) {
      flash("Erro ao rejeitar resultado.", "err");
    } finally { setSaving(false); }
  };

  // ── Upload pela FMA ─────────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { flash("Arquivo muito grande (máx. 5 MB).", "err"); return; }
    setUploading(true);
    const sanitize = (s) => (s || "sem-nome").replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, "").trim().replace(/\s+/g, "_");
    const ano = (sol.dataEvento || "").slice(0, 4) || String(new Date().getFullYear());
    const folder = `solicitacoes/${ano}/${sanitize(organizer?.organization || organizer?.name || "")}/${sanitize(sol.nomeEvento)}`;
    const { url, path, error: uploadError } = await uploadFile(file, folder);
    if (uploadError) { flash("Erro ao enviar arquivo.", "err"); setUploading(false); e.target.value = ""; return; }
    const r = await ArquivosService.create({
      solicitacaoId: id,
      nome: file.name,
      tamanho: file.size,
      tipo: file.type,
      descricao: uploadDesc || `Documento enviado pela FMA`,
      categoria: "resposta_fma",
      enviadoPor: "fma",
      enviadoById: "admin",
      enviadoPorNome: analise.responsavelFMA || "Equipe FMA",
      url, storagePath: path,
    });
    if (r.data) {
      await MovimentacoesService.registrar({
        solicitacaoId: id,
        tipoEvento: "arquivo_enviado",
        statusAnterior: sol.status, statusNovo: sol.status,
        descricao: `Arquivo "${file.name}" enviado pela FMA.`,
        autor: "fma", autorNome: analise.responsavelFMA || "Equipe FMA",
        autorId: "admin", visivel: true,
      });
      // Notificar organizador: arquivo enviado pela FMA
      if (sol.organizadorEmail || sol.organizerEmail) {
        notificarArquivoFmaEnviado({
          organizadorEmail: sol.organizadorEmail || sol.organizerEmail,
          organizadorNome:  sol.organizadorNome  || sol.organizerName || "Organizador",
          protocolo:        sol.protocoloFMA || sol.id,
          evento:           sol.nomeEvento || sol.titulo || sol.title || "Evento",
          nomeArquivo:      file.name,
        }).catch(() => {});
      }
      setUploadDesc("");
      load();
      flash(`"${file.name}" enviado com sucesso.`, "ok");
    } else {
      flash("Erro ao enviar arquivo.", "err");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDeleteArquivo = async (arq) => {
    if (!confirm(`Excluir "${arq.nome}"?`)) return;
    // Excluir do Storage se houver URL
    if (arq.storagePath) {
      await deleteFile(arq.storagePath).catch(() => {});
    } else if (arq.url && arq.url.includes("firebasestorage.googleapis.com")) {
      await deleteFile(arq.url).catch(() => {});
    }
    await ArquivosService.delete(arq.id);
    load();
  };

  // ── Status transitions permitidas ──────────────────────────────────────────
  const TRANSITIONS = {
    rascunho:   ["rascunho", "enviada", "em_analise"],
    enviada:    ["enviada", "em_analise"],
    em_analise: ["em_analise", "pendencia", "aprovada", "indeferida"],
    pendencia:  ["pendencia", "em_analise", "aprovada", "indeferida"],
    aprovada:   ["aprovada", "concluida"],
    indeferida: ["indeferida", "concluida"],
    concluida:  ["concluida"],
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: FONTS.body, color: COLORS.gray }}>⏳ Carregando solicitação...</div>
      </AdminLayout>
    );
  }

  const tipo = tipoMap[sol.tipo] || { label: sol.tipo, icon: "📋" };
  const abas = [
    { key: "dados",    label: "📄 Dados",    count: null },
    { key: "taxas",    label: "💰 Taxas",    count: null },
    { key: "arquivos", label: "📎 Arquivos",  count: arquivos.length },
    { key: "analise",  label: "🔍 Análise",   count: null },
    { key: "historico",label: "📋 Histórico", count: movimentacoes.length },
  ];

  const card = { background: "#fff", borderRadius: 12, padding: "24px 28px", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", marginBottom: 20 };
  const lbl = (text) => (
    <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase",
      letterSpacing: 1.5, color: COLORS.gray, marginBottom: 4 }}>{text}</div>
  );
  const val = (text) => (
    <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.dark, marginBottom: 14 }}>{text || "—"}</div>
  );
  const inp = (extra = {}) => ({
    width: "100%", padding: "10px 13px", borderRadius: 8, border: `1.5px solid ${COLORS.grayLight}`,
    fontFamily: FONTS.body, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff", ...extra,
  });

  return (
    <AdminLayout>
      <div style={{ padding: "32px 32px 60px", maxWidth: 980, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <Link to="/admin/solicitacoes" style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            ← Voltar para solicitações
          </Link>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <TipoBadge tipo={sol.tipo} />
                <StatusBadge status={sol.status} size="lg" />
              </div>
              <h1 style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: 0 }}>
                {sol.nomeEvento}
              </h1>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginTop: 4 }}>
                📍 {sol.cidadeEvento} · 📅 {fmt(sol.dataEvento)}
                {sol.responsavelFMA && ` · 👤 ${sol.responsavelFMA}`}
              </div>
            </div>
          </div>
        </div>

        {/* Flash message */}
        {msg.text && (
          <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, fontFamily: FONTS.body, fontSize: 13,
            background: msg.type === "ok" ? "#f0fdf4" : "#fff5f5",
            color: msg.type === "ok" ? "#15803d" : "#dc2626",
            border: `1px solid ${msg.type === "ok" ? "#86efac" : "#fca5a5"}` }}>
            {msg.type === "ok" ? "✅" : "⚠️"} {msg.text}
          </div>
        )}

        {/* Abas */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24, background: "#fff", borderRadius: 10, padding: "4px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          {abas.map(a => (
            <button key={a.key} onClick={() => setAba(a.key)}
              style={{ flex: 1, padding: "10px 8px", borderRadius: 7, border: "none", cursor: "pointer",
                fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, transition: "all 0.15s",
                background: aba === a.key ? COLORS.dark : "transparent",
                color: aba === a.key ? "#fff" : COLORS.gray }}>
              {a.label}{a.count !== null ? ` (${a.count})` : ""}
            </button>
          ))}
        </div>

        {/* ── ABA DADOS ────────────────────────────────────────────────────── */}
        {aba === "dados" && (
          <>
            {/* Dados do organizador */}
            <div style={card}>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: "0 0 18px", paddingBottom: 12, borderBottom: `1px solid ${COLORS.grayLight}` }}>
                🏢 Organizador
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                {lbl("Nome")}{val(organizer?.name)}
                {lbl("Organização")}{val(organizer?.organization)}
                {lbl("E-mail")}{val(organizer?.email)}
                {lbl("Telefone")}{val(organizer?.phone)}
                {lbl("Cidade / UF")}{val(`${organizer?.city || ""}${organizer?.state ? ` / ${organizer.state}` : ""}`)}
                {lbl("CPF / CNPJ")}{val(organizer?.cpfCnpj)}
              </div>
              {organizer && (
                <Link to={`/admin/organizadores/${organizer.id}`} style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: COLORS.primary, textDecoration: "none" }}>
                  Ver perfil completo →
                </Link>
              )}
            </div>

            {/* Dados do evento */}
            <div style={card}>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: "0 0 18px", paddingBottom: 12, borderBottom: `1px solid ${COLORS.grayLight}` }}>
                🏃 Dados do Evento
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                {lbl("Tipo de solicitação")}{val(`${tipo.icon} ${tipo.label}`)}
                {lbl("Nome do evento")}{val(sol.nomeEvento)}
                {lbl("Data do evento")}{val(fmt(sol.dataEvento))}
                {lbl("Cidade")}{val(sol.cidadeEvento)}
              </div>
              {lbl("Local / endereço")}{val(sol.localEvento)}
            </div>

            {/* Campos livres (objeto campos) */}
            {/* Campos técnicos estruturados (novo formato) */}
            <CamposTecnicosView sol={sol} card={card} lbl={lbl} val={val} fmt={fmt} />

            {/* Datas do ciclo de vida */}
            <div style={card}>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: "0 0 18px", paddingBottom: 12, borderBottom: `1px solid ${COLORS.grayLight}` }}>
                🕐 Ciclo de vida
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16 }}>
                {[
                  { label: "Criado em",    val: sol.criadoEm },
                  { label: "Enviado em",   val: sol.enviadoEm },
                  { label: "Em análise desde", val: sol.analisadoEm },
                  { label: "Encerrado em", val: sol.encerradoEm },
                  { label: "Última atualização", val: sol.atualizadoEm },
                ].map(item => (
                  <div key={item.label} style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontFamily: FONTS.body, fontSize: 13, color: item.val ? COLORS.dark : COLORS.gray, fontStyle: item.val ? "normal" : "italic" }}>{item.val ? fmtDT(item.val) : "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── ABA TAXAS ──────────────────────────────────────────────────────── */}
        {aba === "taxas" && (
          <AbaTaxas sol={sol} organizer={organizer} onSaved={load} flash={flash} card={card} lbl={lbl} val={val} inp={inp} />
        )}

        {/* ── ABA ARQUIVOS ─────────────────────────────────────────────────── */}
        {aba === "arquivos" && (
          <>
            {/* Upload pela FMA */}
            <div style={card}>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: "0 0 16px" }}>
                ⬆️ Enviar arquivo pela FMA
              </h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 5 }}>Descrição</div>
                  <input value={uploadDesc} onChange={e => setUploadDesc(e.target.value)}
                    placeholder="Ex: Contrato, Parecer técnico, Documento de resposta..."
                    style={inp()} />
                </div>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  style={{ padding: "10px 18px", borderRadius: 8, background: uploading ? COLORS.gray : "#0f172a", color: "#fff", border: "none", cursor: uploading ? "wait" : "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {uploading ? "⏳ Enviando..." : "📎 Selecionar arquivo"}
                </button>
                <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx" />
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 8 }}>
                Formatos: PDF, DOC, DOCX, JPG, PNG, XLS, XLSX · Máximo 5 MB
              </div>
            </div>

            {/* Listagem de arquivos */}
            <div style={card}>
              <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: "0 0 16px" }}>
                📁 Arquivos da solicitação ({arquivos.length})
              </h3>
              {arquivos.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray, fontStyle: "italic" }}>Nenhum arquivo enviado ainda.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {arquivos.map(arq => {
                    const isFma = arq.enviadoPor === "fma";
                    const isImg = arq.tipo?.startsWith("image/");
                    return (
                      <div key={arq.id} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px", borderRadius: 10, border: `1px solid ${isFma ? "#fed7aa" : COLORS.grayLight}`, background: isFma ? "#fff7ed" : "#fafafa" }}>
                        <div style={{ fontSize: 28, flexShrink: 0 }}>{isImg ? "🖼️" : arq.tipo?.includes("pdf") ? "📕" : arq.tipo?.includes("spreadsheet") || arq.tipo?.includes("excel") ? "📊" : "📄"}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.dark }}>{arq.nome}</div>
                          {arq.descricao && <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 2 }}>{arq.descricao}</div>}
                          <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <span>{fmtSize(arq.tamanho)}</span>
                            <span>·</span>
                            <span>{isFma ? `📋 Enviado pela FMA (${arq.enviadoPorNome})` : `👤 Enviado pelo organizador`}</span>
                            <span>·</span>
                            <span>{fmtDT(arq.uploadedAt)}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          {(arq.dataUrl || arq.url) && (
                            <a href={arq.dataUrl || arq.url} download={arq.nome} target="_blank" rel="noreferrer"
                              style={{ padding: "6px 12px", borderRadius: 6, background: "#0f172a", color: "#fff", textDecoration: "none", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>
                              ⬇️ Baixar
                            </a>
                          )}
                          <button onClick={() => handleDeleteArquivo(arq)}
                            style={{ padding: "6px 10px", borderRadius: 6, background: "#fff5f5", color: COLORS.primary, border: `1px solid #fca5a5`, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── ABA ANÁLISE FMA ──────────────────────────────────────────────── */}
        {aba === "analise" && (
          <div style={card}>
            <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: "0 0 24px", paddingBottom: 12, borderBottom: `1px solid ${COLORS.grayLight}` }}>
              🔍 Análise da FMA
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, display: "block", marginBottom: 5 }}>Analista responsável</label>
                <input value={analise.responsavelFMA} onChange={e => setAnalise(a => ({ ...a, responsavelFMA: e.target.value }))}
                  placeholder="Nome do analista da FMA" style={inp()} />
              </div>
              <div>
                <label style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, display: "block", marginBottom: 5 }}>
                  Número de protocolo
                  <span style={{ fontFamily: FONTS.body, fontSize: 10, fontWeight: 400, textTransform: "none", marginLeft: 6 }}>
                    (gerado automaticamente ao iniciar análise)
                  </span>
                </label>
                {sol.protocoloFMA ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "9px 16px", borderRadius: 8,
                      background: "#f0fdf4", border: "1.5px solid #86efac",
                      fontFamily: FONTS.heading, fontSize: 15, fontWeight: 900,
                      color: "#15803d", letterSpacing: 1,
                    }}>
                      🔖 {sol.protocoloFMA}
                    </span>
                    <span style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>
                      Protocolo emitido — não pode ser alterado.
                    </span>
                  </div>
                ) : (
                  <div style={{
                    padding: "10px 14px", borderRadius: 8,
                    background: "#fffbeb", border: "1.5px dashed #fcd34d",
                    fontFamily: FONTS.body, fontSize: 12, color: "#92400e",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    ⏳ Será gerado automaticamente ao mudar o status para <strong>Em análise</strong>.
                  </div>
                )}
              </div>
            </div>

            {/* ── SEÇÃO: EVENTO VINCULADO ────────────────────────────────── */}
            <EventoVinculadoSection
              sol={sol}
              organizer={organizer}
              eventoVinculado={eventoVinculado}
              vinculoMode={vinculoMode}
              setVinculoMode={setVinculoMode}
              calendarioItems={calendarioItems}
              calendarioBusca={calendarioBusca}
              setCalendarioBusca={setCalendarioBusca}
              criarOpts={criarOpts}
              setCriarOpts={setCriarOpts}
              vinculoSaving={vinculoSaving}
              setVinculoSaving={setVinculoSaving}
              onSuccess={(msg) => { flash(msg, "ok"); load(); }}
              onError={(msg) => flash(msg, "err")}
              inp={inp}
            />

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, display: "block", marginBottom: 5 }}>
                Parecer FMA <span style={{ fontFamily: FONTS.body, fontSize: 10, fontWeight: 400, textTransform: "none" }}>(visível ao organizador)</span>
              </label>
              <textarea value={analise.parecerFMA} onChange={e => setAnalise(a => ({ ...a, parecerFMA: e.target.value }))}
                rows={5} placeholder="Descreva o parecer técnico, documentos necessários, condicionantes da aprovação, motivo do indeferimento, etc."
                style={{ ...inp(), resize: "vertical", lineHeight: 1.5 }} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, display: "block", marginBottom: 5 }}>
                Observação interna <span style={{ fontFamily: FONTS.body, fontSize: 10, fontWeight: 400, textTransform: "none", color: COLORS.primary }}>(NÃO visível ao organizador)</span>
              </label>
              <textarea value={analise.observacaoFMA} onChange={e => setAnalise(a => ({ ...a, observacaoFMA: e.target.value }))}
                rows={3} placeholder="Anotações internas da equipe FMA (não aparecem para o organizador)..."
                style={{ ...inp({ borderColor: "#fed7aa", background: "#fff7ed" }), resize: "vertical", lineHeight: 1.5 }} />
            </div>

            {/* Mudança de status */}
            <div style={{ padding: "20px 20px", background: "#f9fafb", borderRadius: 10, marginBottom: 24, border: `1px solid ${COLORS.grayLight}` }}>
              <label style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, display: "block", marginBottom: 10 }}>
                Alterar status da solicitação
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(TRANSITIONS[sol.status] || [sol.status]).map(s => {
                  const st = statusMap[s];
                  if (!st) return null;
                  return (
                    <button key={s} onClick={() => setNovoStatus(s)}
                      style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, transition: "all 0.15s",
                        border: `2px solid ${novoStatus === s ? st.color : COLORS.grayLight}`,
                        background: novoStatus === s ? st.bg : "#fff",
                        color: novoStatus === s ? st.color : COLORS.gray }}>
                      {st.icon} {st.label}
                    </button>
                  );
                })}
              </div>
              {novoStatus !== sol.status && (
                <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: "#fffbeb", border: "1px solid #fde68a", fontFamily: FONTS.body, fontSize: 12, color: "#92400e" }}>
                  ⚠️ O status será alterado de <strong>{statusMap[sol.status]?.label}</strong> para <strong>{statusMap[novoStatus]?.label}</strong> ao salvar.
                </div>
              )}
            </div>

            {/* ── SEÇÃO: GERAR PERMITS (aparece ao selecionar "aprovada") ── */}
            {novoStatus === "aprovada" && !sol.permitsGerados && permitNumbers.length > 0 && (
              <div style={{ padding: 20, background: "#f0fdf4", borderRadius: 10, marginBottom: 24, border: "1.5px solid #86efac" }}>
                <label style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "#15803d", display: "block", marginBottom: 12 }}>
                  📋 {sol.tipo === "chancela" ? "Chancelas" : "Permits"} a gerar ({permitNumbers.length})
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 100px 32px", gap: 8, fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, padding: "0 4px" }}>
                    <span>Modalidade</span><span>Número</span><span>Tipo</span><span></span>
                  </div>
                  {permitNumbers.map((pn, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 140px 100px 32px", gap: 8, alignItems: "center", background: "#fff", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}` }}>
                      <span style={{ fontFamily: FONTS.body, fontSize: 13, fontWeight: 600 }}>{pn.modalidade}</span>
                      <input
                        type="number"
                        value={pn.numero}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          setPermitNumbers(prev => prev.map((p, j) => j === i ? { ...p, numero: val, editado: true } : p));
                        }}
                        style={{ ...inp(), padding: "6px 10px", fontSize: 13, fontWeight: 700, textAlign: "center" }}
                      />
                      <TipoBadge tipo={sol.tipo} />
                      <button type="button" onClick={() => setPermitNumbers(prev => prev.filter((_, j) => j !== i))}
                        title="Excluir desta emissão"
                        style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #fca5a5", background: "#fff5f5", color: "#dc2626", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontFamily: FONTS.body, fontSize: 11, color: "#065f46", flex: 1 }}>
                    Números editáveis. O contador será atualizado para o maior número usado.
                  </div>
                  <button onClick={async () => {
                    try {
                      await preloadAssets();
                      const ano = permitNumbers[0].ano;
                      const orgName = organizer?.organization || organizer?.name || sol.organizadorNome || "";
                      const dataEmissao = new Date().toISOString().slice(0, 10);
                      const gerarFn = sol.tipo === "chancela" ? gerarChancelaPdf : gerarPermitPdf;
                      const pn = permitNumbers[0];
                      const blob = await gerarFn({
                        numero: formatarNumero(pn.numero, ano),
                        organizador: orgName,
                        nomeEvento: sol.nomeEvento || sol.titulo || sol.title || "",
                        modalidade: pn.modalidade,
                        dataEvento: sol.dataEvento || "",
                        cidadeEvento: sol.cidadeEvento || "",
                        dataEmissao,
                      });
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank");
                    } catch (e) { console.error("Preview:", e); alert("Erro ao gerar preview."); }
                  }}
                    style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #86efac", background: "#fff", color: "#15803d", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    👁️ Preview PDF
                  </button>
                </div>
              </div>
            )}

            {/* ── SEÇÃO: PERMITS JÁ GERADOS ── */}
            {sol.permitsGerados && sol.permitsNumeros?.length > 0 && (
              <div style={{ padding: "14px 20px", background: "#f0fdf4", borderRadius: 10, marginBottom: 24, border: "1px solid #86efac" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800, color: "#15803d" }}>
                      {sol.tipo === "chancela" ? "Chancelas" : "Permits"} gerados
                    </div>
                    <div style={{ fontFamily: FONTS.body, fontSize: 12, color: "#065f46" }}>
                      {sol.permitsNumeros.join(", ")}
                    </div>
                  </div>
                  <button onClick={async () => {
                    if (!confirm("Deseja regerar os permits? Os PDFs anteriores serão excluídos.")) return;
                    // Excluir PDFs antigos de permits do Storage e do Firestore
                    const permitsAntigos = arquivos.filter(a =>
                      a.categoria === "resposta_fma" && a.nome?.startsWith("permit_") || a.nome?.startsWith("chancela_")
                    );
                    for (const arq of permitsAntigos) {
                      if (arq.storagePath) await deleteFile(arq.storagePath).catch(() => {});
                      else if (arq.url?.includes("firebasestorage.googleapis.com")) await deleteFile(arq.url).catch(() => {});
                      await ArquivosService.delete(arq.id);
                    }
                    // Limpar modalidadesDetalhes do evento vinculado
                    const eventoId = sol.eventoCalendarioId || sol.eventoId;
                    if (eventoId) {
                      await CalendarService.update(eventoId, { modalidadesDetalhes: [] });
                    }
                    await SolicitacoesService.update(id, { permitsGerados: false, permitsNumeros: [] });
                    load();
                  }}
                    style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #fca5a5", background: "#fff", color: COLORS.primary, fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                    🔄 Regerar
                  </button>
                  <button onClick={async () => {
                    if (!confirm(`Excluir ${sol.tipo === "chancela" ? "chancelas" : "permits"} gerados (${sol.permitsNumeros.join(", ")})? Os PDFs serão removidos permanentemente.`)) return;
                    const permitsAntigos = arquivos.filter(a =>
                      a.categoria === "resposta_fma" && (a.nome?.startsWith("permit_") || a.nome?.startsWith("chancela_"))
                    );
                    for (const arq of permitsAntigos) {
                      if (arq.storagePath) await deleteFile(arq.storagePath).catch(() => {});
                      else if (arq.url?.includes("firebasestorage.googleapis.com")) await deleteFile(arq.url).catch(() => {});
                      await ArquivosService.delete(arq.id);
                    }
                    const eventoId = sol.eventoCalendarioId || sol.eventoId;
                    if (eventoId) {
                      await CalendarService.update(eventoId, { modalidadesDetalhes: [] });
                    }
                    await SolicitacoesService.update(id, { permitsGerados: false, permitsNumeros: [] });
                    await MovimentacoesService.registrar({
                      solicitacaoId: sol.id, tipoEvento: "permit_excluido",
                      statusAnterior: sol.status, statusNovo: sol.status,
                      descricao: `${sol.tipo === "chancela" ? "Chancelas" : "Permits"} excluídos: ${sol.permitsNumeros.join(", ")}.`,
                      autor: "fma", autorNome: "Equipe FMA", autorId: "admin", visivel: false,
                    });
                    flash(`${sol.tipo === "chancela" ? "Chancelas" : "Permits"} excluídos.`);
                    load();
                  }}
                    style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #fca5a5", background: "#fff5f5", color: "#dc2626", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            )}

            {/* ── SEÇÃO: RESULTADO PENDENTE DE APROVAÇÃO ── */}
            {sol.resultadoStatus === "pendente_aprovacao" && (
              <div style={{ padding: 20, background: "#faf5ff", borderRadius: 10, marginBottom: 24, border: "1.5px solid #c4b5fd" }}>
                <label style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "#7c3aed", display: "block", marginBottom: 12 }}>
                  📊 Resultado pendente de aprovação
                </label>
                <div style={{ background: "#fff", padding: 14, borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, marginBottom: 12 }}>
                  <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.dark, marginBottom: 6 }}>
                    <strong>Arquivo:</strong>{" "}
                    <a href={sol.resultadoFileUrl} target="_blank" rel="noreferrer" style={{ color: COLORS.primary }}>
                      {sol.resultadoTipo === "link" ? "Link externo" : "Baixar arquivo"}
                    </a>
                  </div>
                  {sol.resultadoDescricao && (
                    <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
                      <strong>Descrição:</strong> {sol.resultadoDescricao}
                    </div>
                  )}
                  <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 4 }}>
                    Enviado em {fmtDT(sol.resultadoEnviadoEm)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={handleAprovarResultado} disabled={saving}
                    style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#15803d", color: "#fff", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
                    ✅ Aprovar Resultado
                  </button>
                  <button onClick={handleRejeitarResultado} disabled={saving}
                    style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fff5f5", color: COLORS.primary, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
                    ❌ Rejeitar
                  </button>
                </div>
              </div>
            )}

            {/* Resultado aprovado/rejeitado */}
            {sol.resultadoStatus === "aprovado" && (
              <div style={{ padding: "14px 20px", background: "#f0fdf4", borderRadius: 10, marginBottom: 24, border: "1px solid #86efac", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>📊</span>
                <div>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800, color: "#15803d" }}>Resultado aprovado e publicado</div>
                  <a href={sol.resultadoFileUrl} target="_blank" rel="noreferrer" style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.primary }}>Ver resultado</a>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={load}
                style={{ padding: "11px 20px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
                Descartar alterações
              </button>
              {novoStatus === "aprovada" && !sol.permitsGerados && permitNumbers.length > 0 && (
                <button onClick={handleGerarPermitsEAprovar} disabled={saving || gerandoPermits}
                  style={{ padding: "11px 28px", borderRadius: 8, border: "none", background: saving ? COLORS.gray : "#15803d", color: "#fff", cursor: saving ? "wait" : "pointer", fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700 }}>
                  {gerandoPermits ? "Gerando..." : `📋 Gerar ${sol.tipo === "chancela" ? "Chancelas" : "Permits"}`}
                </button>
              )}
              <button onClick={handleSalvarAnalise} disabled={saving}
                style={{ padding: "11px 28px", borderRadius: 8, border: "none", background: saving ? COLORS.gray : COLORS.primary, color: "#fff", cursor: saving ? "wait" : "pointer", fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700 }}>
                {saving ? "Salvando..." : "💾 Salvar análise"}
              </button>
            </div>
          </div>
        )}

        {/* ── ABA HISTÓRICO ────────────────────────────────────────────────── */}
        {aba === "historico" && (
          <div style={card}>
            <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: "0 0 20px", paddingBottom: 12, borderBottom: `1px solid ${COLORS.grayLight}` }}>
              📋 Trilha completa de movimentações ({movimentacoes.length})
            </h3>
            {movimentacoes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", fontFamily: FONTS.body, color: COLORS.gray, fontStyle: "italic" }}>Nenhuma movimentação registrada.</div>
            ) : (
              <div style={{ position: "relative" }}>
                {[...movimentacoes].reverse().map((mov, i, arr) => {
                  const mt = movMap[mov.tipoEvento] || { icon: "📋", color: COLORS.gray };
                  const isOrg = mov.autor === "organizador";
                  const isLast = i === arr.length - 1;
                  return (
                    <div key={mov.id} style={{ display: "flex", gap: 14, position: "relative" }}>
                      {!isLast && <div style={{ position: "absolute", left: 19, top: 40, bottom: -12, width: 2, background: COLORS.grayLight, zIndex: 0 }} />}
                      <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, zIndex: 1,
                        background: isOrg ? "#eff6ff" : "#fff5f5",
                        border: `2px solid ${isOrg ? "#93c5fd" : "#fca5a5"}`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                        {mt.icon}
                      </div>
                      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 24 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                          <span style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.dark }}>{mov.descricao}</span>
                          {!mov.visivel && <span style={{ padding: "2px 7px", borderRadius: 10, fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, background: "#fef3c7", color: "#92400e" }}>🔒 Interno</span>}
                        </div>
                        {mov.statusAnterior && mov.statusNovo && mov.statusAnterior !== mov.statusNovo && (
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                            <StatusBadge status={mov.statusAnterior} /><span style={{ fontSize: 11, color: COLORS.gray }}>→</span><StatusBadge status={mov.statusNovo} />
                          </div>
                        )}
                        <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>
                          {isOrg ? "👤" : "🏛️"} {mov.autorNome} · {fmtDT(mov.criadoEm)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ── COMPONENTE: Seção de Evento Vinculado ─────────────────────────────────────
/**
 * EventoVinculadoSection — Exibida dentro da aba Análise.
 *
 * Estados da seção:
 *   A) Sem evento vinculado + solicitação aprovada → alerta pendência + opções
 *   B) Sem evento vinculado + outros status → opções disponíveis
 *   C) Evento vinculado → card com dados + link + botão desvincular
 *   D) Mode "buscar" → input de busca + lista de eventos existentes
 *   E) Mode "criar"  → preview dos dados mapeados + confirmação
 */
function EventoVinculadoSection({
  sol, organizer, eventoVinculado,
  vinculoMode, setVinculoMode,
  calendarioItems, calendarioBusca, setCalendarioBusca,
  criarOpts, setCriarOpts,
  vinculoSaving, setVinculoSaving,
  onSuccess, onError, inp,
}) {
  const navigate = useNavigate();

  const sectionStyle = {
    marginBottom: 24,
    padding: "20px 20px",
    borderRadius: 10,
    border: "1.5px solid #e0e7ff",
    background: "#f5f7ff",
  };

  const btnBase = {
    padding: "8px 16px", borderRadius: 8, cursor: "pointer",
    fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700,
    border: "none", transition: "opacity 0.15s",
  };

  // Filtra eventos pelo texto de busca
  const eventosFiltrados = calendarioBusca.trim().length > 1
    ? calendarioItems.filter(e =>
        e.title?.toLowerCase().includes(calendarioBusca.toLowerCase()) ||
        e.city?.toLowerCase().includes(calendarioBusca.toLowerCase())
      ).slice(0, 8)
    : calendarioItems.slice(0, 6);

  const handleCriar = async () => {
    setVinculoSaving(true);
    const orgName = organizer?.name || organizer?.organization || "";
    const r = await SolicitacoesService.criarEVincularEvento(sol, orgName, criarOpts);
    setVinculoSaving(false);
    if (r.error) { onError("Erro ao criar evento: " + r.error); return; }
    onSuccess(`Evento criado e vinculado com sucesso! Acesse o calendário para publicar.`);
  };

  const handleVincular = async (evento) => {
    setVinculoSaving(true);
    const r = await SolicitacoesService.vincularEvento(sol.id, evento.id, evento.title, sol.status);
    setVinculoSaving(false);
    if (r.error) { onError("Erro ao vincular: " + r.error); return; }
    onSuccess(`Evento "${evento.title}" vinculado com sucesso.`);
  };

  const handleDesvincular = async () => {
    if (!confirm(`Desvincular o evento "${eventoVinculado?.title}"?\nO evento NÃO será excluído.`)) return;
    setVinculoSaving(true);
    const r = await SolicitacoesService.desvincularEvento(sol.id, eventoVinculado?.title, sol.status);
    setVinculoSaving(false);
    if (r.error) { onError("Erro ao desvincular: " + r.error); return; }
    onSuccess("Vínculo removido. O evento permanece no calendário.");
  };

  const labelStyle = {
    fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800,
    textTransform: "uppercase", letterSpacing: 1.5, color: "#4338ca",
    display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
  };

  return (
    <div style={sectionStyle}>
      <div style={labelStyle}>
        📅 Evento vinculado no calendário
      </div>

      {/* ── C: JÁ TEM EVENTO VINCULADO ──────────────────────────────────── */}
      {eventoVinculado ? (
        <div>
          <div style={{
            padding: "14px 16px", borderRadius: 8,
            background: "#fff", border: "1.5px solid #a5b4fc",
            display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, color: COLORS.dark, marginBottom: 4 }}>
                ✅ {eventoVinculado.title}
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginBottom: 8 }}>
                📍 {eventoVinculado.city}
                {eventoVinculado.date && ` · 📅 ${new Date(eventoVinculado.date + "T12:00:00").toLocaleDateString("pt-BR")}`}
                {" · "}
                <span style={{
                  padding: "1px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                  background: eventoVinculado.published ? "#f0fdf4" : "#fff7ed",
                  color: eventoVinculado.published ? "#15803d" : "#92400e",
                }}>
                  {eventoVinculado.published ? "Publicado" : "Não publicado"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => navigate(`/admin/calendario/${eventoVinculado.id}`)}
                  style={{ ...btnBase, background: "#4338ca", color: "#fff", fontSize: 11 }}>
                  ✏️ Editar evento
                </button>
                <button
                  onClick={() => window.open(`/eventos/${eventoVinculado.id}`, "_blank")}
                  style={{ ...btnBase, background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac", fontSize: 11 }}>
                  👁 Ver no site
                </button>
                <button
                  onClick={handleDesvincular}
                  disabled={vinculoSaving}
                  style={{ ...btnBase, background: "#fff5f5", color: "#dc2626", border: "1px solid #fca5a5", fontSize: 11 }}>
                  🔗 Desvincular
                </button>
              </div>
            </div>
          </div>

          {!eventoVinculado.published && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: "#fffbeb", border: "1px solid #fde68a", fontFamily: FONTS.body, fontSize: 12, color: "#92400e" }}>
              ⚠️ O evento ainda <strong>não está publicado</strong> no calendário público. Acesse o editor para publicá-lo quando estiver pronto.
            </div>
          )}
        </div>

      ) : (
        <div>
          {/* Alerta de pendência quando solicitação aprovada sem evento */}
          {["aprovada", "concluida"].includes(sol.status) && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fffbeb", border: "1.5px solid #fcd34d", fontFamily: FONTS.body, fontSize: 12, color: "#92400e", marginBottom: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <span>Solicitação <strong>aprovada sem evento vinculado</strong>. Crie ou vincule um evento para que o permit/chancela apareça no calendário público.</span>
            </div>
          )}

          {/* Botões de ação quando não há modo ativo */}
          {!vinculoMode && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => setVinculoMode("criar")}
                style={{ ...btnBase, background: "#4338ca", color: "#fff" }}>
                ✨ Criar evento automaticamente
              </button>
              <button
                onClick={() => setVinculoMode("buscar")}
                style={{ ...btnBase, background: "#fff", color: "#4338ca", border: "1.5px solid #a5b4fc" }}>
                🔍 Vincular evento existente
              </button>
            </div>
          )}

          {/* ── D: MODE BUSCAR ──────────────────────────────────────────── */}
          {vinculoMode === "buscar" && (
            <div>
              <input
                value={calendarioBusca}
                onChange={e => setCalendarioBusca(e.target.value)}
                placeholder="Buscar por título ou cidade do evento..."
                style={{ ...inp(), marginBottom: 10 }}
                autoFocus
              />
              <div style={{ maxHeight: 280, overflowY: "auto", borderRadius: 8, border: `1px solid ${COLORS.grayLight}` }}>
                {eventosFiltrados.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray }}>
                    Nenhum evento encontrado.
                  </div>
                ) : eventosFiltrados.map(ev => (
                  <div key={ev.id} style={{
                    padding: "12px 16px", borderBottom: `1px solid ${COLORS.grayLight}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    background: "#fff",
                  }}>
                    <div>
                      <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.dark }}>{ev.title}</div>
                      <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>
                        📍 {ev.city}
                        {ev.date && ` · ${new Date(ev.date + "T12:00:00").toLocaleDateString("pt-BR")}`}
                        {" · "}
                        <span style={{ color: ev.published ? "#15803d" : "#92400e" }}>
                          {ev.published ? "Publicado" : "Não publicado"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleVincular(ev)}
                      disabled={vinculoSaving}
                      style={{ ...btnBase, background: "#4338ca", color: "#fff", fontSize: 11, whiteSpace: "nowrap" }}>
                      Vincular →
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => { setVinculoMode(null); setCalendarioBusca(""); }}
                style={{ ...btnBase, marginTop: 10, background: "transparent", color: COLORS.gray, border: `1px solid ${COLORS.grayLight}` }}>
                ← Cancelar
              </button>
            </div>
          )}

          {/* ── E: MODE CRIAR ───────────────────────────────────────────── */}
          {vinculoMode === "criar" && (
            <div>
              <div style={{ padding: "14px 16px", borderRadius: 8, background: "#fff", border: `1px solid ${COLORS.grayLight}`, marginBottom: 12 }}>
                <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 10 }}>
                  Preview — dados que serão criados no calendário:
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "6px 12px", fontFamily: FONTS.body, fontSize: 12 }}>
                  {[
                    ["Título",    sol.nomeEvento    || "—"],
                    ["Data",      sol.dataEvento ? new Date(sol.dataEvento + "T12:00:00").toLocaleDateString("pt-BR") : "—"],
                    ["Cidade",    sol.cidadeEvento  || "—"],
                    ["Local",     sol.localEvento   || "—"],
                    ["Categoria", sol.tipo === "permit" ? "Corrida de Rua" : "Outros"],
                    ["Organizador", organizer?.name || organizer?.organization || "—"],
                  ].map(([label, valor]) => (
                    <React.Fragment key={label}>
                      <span style={{ color: COLORS.gray, fontWeight: 600 }}>{label}:</span>
                      <span style={{ color: COLORS.dark }}>{valor}</span>
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 6, background: "#eff6ff", border: "1px solid #93c5fd", fontFamily: FONTS.body, fontSize: 11, color: "#1e40af" }}>
                  <div style={{ marginBottom: 4 }}>📋 <strong>Status inicial:</strong> o evento será criado como <strong>Previsto</strong> e não publicado.</div>
                  <div>✅ <strong>Aprovação automática:</strong> quando esta solicitação for aprovada, o evento mudará automaticamente para <strong>Confirmado</strong>.</div>
                </div>

                {/* Opção: publicar imediatamente */}
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, cursor: "pointer", fontFamily: FONTS.body, fontSize: 12, color: COLORS.dark }}>
                  <input
                    type="checkbox"
                    checked={criarOpts.published}
                    onChange={e => setCriarOpts(o => ({ ...o, published: e.target.checked }))}
                  />
                  Publicar imediatamente no calendário público
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, cursor: "pointer", fontFamily: FONTS.body, fontSize: 12, color: COLORS.dark }}>
                  <input
                    type="checkbox"
                    checked={criarOpts.featured}
                    onChange={e => setCriarOpts(o => ({ ...o, featured: e.target.checked }))}
                  />
                  Marcar como destaque no calendário
                </label>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleCriar}
                  disabled={vinculoSaving}
                  style={{ ...btnBase, background: vinculoSaving ? COLORS.gray : "#4338ca", color: "#fff" }}>
                  {vinculoSaving ? "Criando..." : "✅ Confirmar criação"}
                </button>
                <button onClick={() => setVinculoMode(null)}
                  style={{ ...btnBase, background: "transparent", color: COLORS.gray, border: `1px solid ${COLORS.grayLight}` }}>
                  ← Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── COMPONENTE: Visualização de Campos Técnicos (aba Dados) ───────────────────
/**
 * CamposTecnicosView — Renderiza os camposTecnicos de uma solicitação.
 * Suporta: permit (view completa), chancela (view completa), legado (migra automaticamente).
 */
function CamposTecnicosView({ sol, card, lbl, val, fmt }) {
  const ct = normalizarCamposTecnicos(sol);
  if (!ct || !ct._tipo) return null;

  const Row = ({ label, children }) => (
    <>
      <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase",
        letterSpacing: 1.5, color: COLORS.gray, marginBottom: 4, marginTop: 2 }}>{label}</div>
      <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.dark, marginBottom: 14, lineHeight: 1.5 }}>
        {children || "—"}
      </div>
    </>
  );

  const SecHead = ({ children }) => (
    <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase",
      letterSpacing: 1.5, color: "#4338ca", marginBottom: 12, paddingBottom: 4,
      borderBottom: "1px solid #e0e7ff" }}>
      {children}
    </div>
  );

  const DocBadge = ({ doc, label }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8,
      background: doc?.temArquivo ? "#f0fdf4" : "#fff5f5",
      border: `1px solid ${doc?.temArquivo ? "#86efac" : "#fca5a5"}` }}>
      <span>{doc?.temArquivo ? "✅" : "❌"}</span>
      <div>
        <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, color: doc?.temArquivo ? "#15803d" : "#dc2626" }}>
          {label}
        </div>
        {doc?.nomeArquivo && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>{doc.nomeArquivo}</div>}
      </div>
    </div>
  );

  const ModalidadesTable = () => {
    const total = totalEstimativaInscritos(ct);
    if (!ct.modalidades?.length) return <Row label="Modalidades">—</Row>;
    return (
      <div style={{ marginBottom: 20 }}>
        <SecHead>🏃 Modalidades / Distâncias</SecHead>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
          <thead>
            <tr style={{ borderBottom: `1.5px solid ${COLORS.grayLight}` }}>
              <th style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, padding: "6px 12px", textAlign: "left" }}>Distância / Categoria</th>
              <th style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, padding: "6px 12px", textAlign: "right" }}>Estimativa</th>
            </tr>
          </thead>
          <tbody>
            {ct.modalidades.filter(m => m.distancia).map(m => (
              <tr key={m.id} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                <td style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.dark, padding: "8px 12px" }}>{m.distancia}</td>
                <td style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark, padding: "8px 12px", textAlign: "right" }}>
                  {m.estimativaInscritos ? Number(m.estimativaInscritos).toLocaleString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 0 && (
          <div style={{ textAlign: "right", fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
            Total estimado: <strong style={{ color: COLORS.dark }}>{total.toLocaleString("pt-BR")} inscritos</strong>
          </div>
        )}
      </div>
    );
  };

  // ── VIEW PERMIT ─────────────────────────────────────────────────────────────
  if (ct._tipo === "permit") {
    const docKeys = ["regulamento", "mapaPercurso"];
    const missingDocs = docKeys.filter(k => !ct[k]?.temArquivo);
    return (
      <div style={card}>
        <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: "0 0 20px", paddingBottom: 12, borderBottom: `1px solid ${COLORS.grayLight}` }}>
          🏃 Formulário Técnico – Permit
        </h3>
        <div style={{ marginBottom: 20 }}>
          <SecHead>⏰ Datas e Horários</SecHead>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <Row label="Encerramento das inscrições">{ct.dataEncerramentoInscricoes ? fmt(ct.dataEncerramentoInscricoes) : "—"}</Row>
            <Row label="Horário da largada">{ct.horarioLargada || "—"}</Row>
          </div>
        </div>
        <ModalidadesTable />
        <div style={{ marginBottom: 20 }}>
          <SecHead>💰 Financeiro</SecHead>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <Row label="Valor da inscrição">{ct.valorInscricao}</Row>
            <Row label="Premiação em dinheiro">{ct.premiacaoDinheiro ? <span style={{ color: "#15803d", fontWeight: 600 }}>✅ Sim — {ct.valorPremiacaoTotal || "valor não informado"}</span> : <span style={{ color: COLORS.gray }}>Não</span>}</Row>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <SecHead>⚙️ Aspectos Técnicos</SecHead>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <Row label="Sistema de apuração">{ct.sistemaApuracao}</Row>
            <Row label="Empresa de cronometragem">{ct.empresaCronometragem}</Row>
            <Row label="Aferição do percurso">{ct.formaMedicaoPercurso}</Row>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <SecHead>🏥 Infraestrutura e Seguro</SecHead>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <Row label="Posto médico">{ct.postoMedico ? <span style={{ color: "#15803d", fontWeight: 600 }}>✅ Sim — {ct.quantidadeAmbulancias ? `${ct.quantidadeAmbulancias} ambulância(s)` : "qtd. não informada"}</span> : <span style={{ color: COLORS.gray }}>Não informado</span>}</Row>
            <Row label="Nº da apólice de seguro">{ct.apoliceSeguros}</Row>
            <Row label="Lei de Incentivo">{ct.leiIncentivo ? <span style={{ color: "#15803d", fontWeight: 600 }}>✅ Sim</span> : <span style={{ color: COLORS.gray }}>Não</span>}</Row>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <SecHead>📋 Objetivo, Patrocinadores e Serviços</SecHead>
          <Row label="Objetivo do evento">{ct.objetivoEvento}</Row>
          <Row label="Patrocinadores">{ct.patrocinadores}</Row>
          <Row label="Kit do atleta">{ct.kitAtleta}</Row>
          <Row label="Empresas e serviços">{ct.empresasServicos}</Row>
        </div>
        <div>
          <SecHead>📁 Documentos Obrigatórios</SecHead>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <DocBadge doc={ct.regulamento} label="Regulamento do Evento" />
            <DocBadge doc={ct.mapaPercurso} label="Mapa do Percurso" />
          </div>
          {missingDocs.length > 0 && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: "#fff5f5", border: "1px solid #fca5a5", fontFamily: FONTS.body, fontSize: 12, color: "#dc2626" }}>
              ⚠️ Documentos pendentes: {missingDocs.map(k => k === "regulamento" ? "Regulamento" : "Mapa do Percurso").join(", ")}
            </div>
          )}
        </div>
        <FieldsCustomRows ct={ct} tipoBuiltinKeys={["_tipo","_versao","dataEncerramentoInscricoes","horarioLargada","modalidades","valorInscricao","premiacaoDinheiro","valorPremiacaoTotal","sistemaApuracao","empresaCronometragem","formaMedicaoPercurso","postoMedico","quantidadeAmbulancias","apoliceSeguros","leiIncentivo","objetivoEvento","patrocinadores","kitAtleta","empresasServicos","regulamento","mapaPercurso"]} Row={Row} />
      </div>
    );
  }

  // ── VIEW CHANCELA ────────────────────────────────────────────────────────────
  if (ct._tipo === "chancela") {
    const docKeys = ["regulamento","mapaPercurso","arquivoGPX","planoSegurancaResgate","planoMedico","comprovanteSeguros","declaracaoCaracterizacaoPercurso","regulamentoTecnico"];
    const docLabels = {
      regulamento: "Regulamento", mapaPercurso: "Mapa do Percurso",
      arquivoGPX: "Arquivo GPX/KML", planoSegurancaResgate: "Plano de Segurança e Resgate",
      planoMedico: "Plano Médico", comprovanteSeguros: "Comprovante de Seguro",
      autorizacaoAmbiental: "Autorização Ambiental",
      declaracaoCaracterizacaoPercurso: "Declaração de Caracterização do Percurso",
      regulamentoTecnico: "Regulamento Técnico",
    };
    const allDocKeys = [...docKeys, "autorizacaoAmbiental"];
    const missingRequired = docKeys.filter(k => !ct[k]?.temArquivo);
    return (
      <div style={card}>
        <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: "0 0 20px", paddingBottom: 12, borderBottom: `1px solid ${COLORS.grayLight}` }}>
          🏅 Formulário Técnico – Chancela
        </h3>
        <div style={{ marginBottom: 20 }}>
          <SecHead>🔗 Identificação</SecHead>
          <Row label="Link de divulgação">
            {ct.linkDivulgacao
              ? <a href={ct.linkDivulgacao} target="_blank" rel="noopener noreferrer" style={{ color: "#0066cc", wordBreak: "break-all" }}>{ct.linkDivulgacao}</a>
              : "—"}
          </Row>
          <Row label="Objetivo do evento">{ct.objetivoEvento}</Row>
        </div>
        <ModalidadesTable />
        <div style={{ marginBottom: 20 }}>
          <SecHead>💰 Financeiro</SecHead>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <Row label="Valor da inscrição">{ct.valorInscricao}</Row>
            <Row label="Premiação em dinheiro">{ct.premiacaoDinheiro ? <span style={{ color: "#15803d", fontWeight: 600 }}>✅ Sim — {ct.valorPremiacaoTotal || "valor não informado"}</span> : <span style={{ color: COLORS.gray }}>Não</span>}</Row>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <SecHead>⚙️ Aspectos Técnicos</SecHead>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <Row label="Sistema de apuração">{ct.sistemaApuracao}</Row>
            <Row label="Empresa de cronometragem">{ct.empresaCronometragem}</Row>
            <Row label="Aferição do percurso">{ct.formaMedicaoPercurso}</Row>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <SecHead>🏥 Equipe Médica</SecHead>
          <Row label="Médico responsável (Nome e CRM)">{ct.medicoResponsavel}</Row>
        </div>
        <div style={{ marginBottom: 20 }}>
          <SecHead>🧾 Dados Fiscais</SecHead>
          <Row label="Dados para emissão do recibo">{ct.dadosEmissaoRecibo}</Row>
        </div>
        <div style={{ marginBottom: 20 }}>
          <SecHead>🛡️ Seguro</SecHead>
          <Row label="Nº da apólice de seguro">{ct.apoliceSeguros}</Row>
        </div>
        <div>
          <SecHead>📁 Documentos</SecHead>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {allDocKeys.map(k => <DocBadge key={k} doc={ct[k]} label={docLabels[k] || k} />)}
          </div>
          {missingRequired.length > 0 && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: "#fff5f5", border: "1px solid #fca5a5", fontFamily: FONTS.body, fontSize: 12, color: "#dc2626" }}>
              ⚠️ Documentos obrigatórios pendentes: {missingRequired.map(k => docLabels[k]).join(", ")}
            </div>
          )}
        </div>
        <FieldsCustomRows ct={ct} tipoBuiltinKeys={["_tipo","_versao","linkDivulgacao","objetivoEvento","modalidades","valorInscricao","premiacaoDinheiro","valorPremiacaoTotal","sistemaApuracao","empresaCronometragem","formaMedicaoPercurso","medicoResponsavel","dadosEmissaoRecibo","apoliceSeguros","regulamento","mapaPercurso","arquivoGPX","planoSegurancaResgate","planoMedico","comprovanteSeguros","autorizacaoAmbiental","declaracaoCaracterizacaoPercurso","regulamentoTecnico"]} Row={Row} />
      </div>
    );
  }

  // Tipo desconhecido
  return (
    <div style={card}>
      <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray }}>
        Campos técnicos não disponíveis para este tipo de solicitação.
      </div>
    </div>
  );
}

/** Exibe campos customizados (adicionados pelo admin, não built-in) se existirem em ct. */
function FieldsCustomRows({ ct, tipoBuiltinKeys, Row }) {
  const customKeys = Object.keys(ct).filter(k => !tipoBuiltinKeys.includes(k) && k.startsWith("custom_"));
  if (customKeys.length === 0) return null;
  return (
    <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed #e2e8f0" }}>
      <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "#7c3aed", marginBottom: 12 }}>
        🔧 Campos Adicionais
      </div>
      {customKeys.map(k => {
        const v = ct[k];
        let display;
        if (typeof v === "object" && v !== null && "temArquivo" in v) {
          display = v.temArquivo ? `✅ ${v.nomeArquivo || "Arquivo enviado"}` : "❌ Arquivo não enviado";
        } else if (typeof v === "boolean") {
          display = v ? "Sim" : "Não";
        } else {
          display = String(v || "—");
        }
        return <Row key={k} label={k.replace(/^custom_[a-z]+_\d+$/, k)}>{display}</Row>;
      })}
    </div>
  );
}

// ─── Aba Taxas e Pagamento ───────────────────────────────────────────────────

const pagStatusMap = Object.fromEntries(PAGAMENTO_STATUS.map(s => [s.value, s]));

function AbaTaxas({ sol, organizer, onSaved, flash, card, lbl, val, inp }) {
  const ct = normalizarCamposTecnicos(sol);
  const taxas = sol.taxas || {};
  const pagamento = sol.pagamento || {};
  const isParceiro = organizer?.parceiro;

  const [expandido, setExpandido] = useState(null);
  const [ajusteAberto, setAjusteAberto] = useState(false);
  const [ajusteValor, setAjusteValor] = useState(taxas.total || 0);
  const [ajusteObs, setAjusteObs] = useState(taxas.observacaoAjuste || "");
  const [saving, setSaving] = useState(false);

  // Recalcular com base nos dados atuais
  const tabela = (isParceiro && organizer?.parceiroTipo === "tabela_customizada" && organizer?.tabelaTaxas)
    ? organizer.tabelaTaxas : TABELA_PADRAO;
  const desconto = isParceiro
    ? { tipo: organizer.parceiroTipo, percentual: organizer.parceiroDesconto || 0 }
    : null;
  const recalc = calcularTaxaTotal(ct.modalidades || [], sol.dataEvento, sol.tipo, tabela, desconto);

  const handleAjustar = async () => {
    setSaving(true);
    await SolicitacoesService.update(sol.id, {
      taxas: { ...taxas, total: Number(ajusteValor), ajustadoPorFMA: true, observacaoAjuste: ajusteObs, calculadoEm: new Date().toISOString() },
    });
    await MovimentacoesService.registrar({
      solicitacaoId: sol.id, tipoEvento: "taxa_calculada",
      statusAnterior: sol.status, statusNovo: sol.status,
      descricao: `Taxa ajustada manualmente para ${formatarMoeda(Number(ajusteValor))}. Motivo: ${ajusteObs || "—"}`,
      autor: "fma", autorNome: "Equipe FMA", autorId: "admin", visivel: false,
    });
    flash("Taxa ajustada!");
    setSaving(false);
    setAjusteAberto(false);
    onSaved();
  };

  const handleRecalcular = async () => {
    setSaving(true);
    const novaTaxa = {
      modalidades: recalc.modalidades,
      subtotal: recalc.subtotal,
      urgencia: recalc.urgencia,
      descontoTipo: recalc.desconto?.tipo || "",
      descontoValor: recalc.desconto?.valor || 0,
      descontoDescricao: recalc.desconto?.descricao || "",
      total: recalc.total,
      calculadoEm: new Date().toISOString(),
      ajustadoPorFMA: false,
      observacaoAjuste: "",
    };
    await SolicitacoesService.update(sol.id, { taxas: novaTaxa });
    await MovimentacoesService.registrar({
      solicitacaoId: sol.id, tipoEvento: "taxa_calculada",
      statusAnterior: sol.status, statusNovo: sol.status,
      descricao: `Taxa recalculada: ${formatarMoeda(recalc.total)}.`,
      autor: "fma", autorNome: "Sistema FMA", autorId: "sistema", visivel: false,
    });
    flash("Taxa recalculada!");
    setSaving(false);
    onSaved();
  };

  return (
    <>
      {/* Bloco Taxa */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, margin: 0 }}>
            💰 Calculo de Taxas
          </h3>
          {isParceiro && (
            <span style={{ padding: "4px 12px", borderRadius: 16, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
              Parceiro FMA — {organizer.parceiroDescricao || organizer.parceiroTipo}
            </span>
          )}
        </div>

        {/* Tabela por modalidade com detalhamento */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 12 }}>
          <thead>
            <tr style={{ background: COLORS.offWhite }}>
              <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 700 }}>Modalidade</th>
              <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, fontWeight: 700 }}>Inscritos</th>
              <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, fontWeight: 700 }}>Bruto</th>
              <th style={{ textAlign: "right", padding: "8px 12px", fontSize: 11, fontWeight: 700 }}>Final</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {recalc.modalidades.map(m => (
              <React.Fragment key={m.id}>
                <tr style={{ borderBottom: expandido === m.id ? "none" : `1px solid ${COLORS.grayLight}`, cursor: "pointer" }}
                  onClick={() => setExpandido(expandido === m.id ? null : m.id)}>
                  <td style={{ padding: "8px 12px" }}>{m.distancia}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{m.inscritos.toLocaleString("pt-BR")}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: COLORS.gray }}>{formatarMoeda(m.valorBruto)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>{formatarMoeda(m.valorFinal)}</td>
                  <td style={{ padding: "8px 4px", textAlign: "center", fontSize: 10, color: COLORS.gray }}>{expandido === m.id ? "▲" : "▼"}</td>
                </tr>
                {expandido === m.id && m.detalhamento && (
                  <tr>
                    <td colSpan={5} style={{ padding: "0 12px 10px", background: "#f8fafc" }}>
                      <div style={{ padding: "10px 14px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, fontSize: 12 }}>
                        <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 6 }}>Calculo por faixa</div>
                        {m.detalhamento.map((d, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span>
                              {d.qtd.toLocaleString("pt-BR")} inscritos x {formatarMoeda(d.valorUnitario)}/inscrito
                              <span style={{ fontSize: 10, color: COLORS.gray, marginLeft: 4 }}>(faixa: {d.faixaLabel})</span>
                            </span>
                            <span style={{ fontWeight: 600 }}>{formatarMoeda(d.subtotal)}</span>
                          </div>
                        ))}
                        {m.aplicouMinimo && <div style={{ fontSize: 11, color: "#d97706", marginTop: 4, padding: "4px 8px", background: "#fffbeb", borderRadius: 4 }}>Valor minimo aplicado: {formatarMoeda(m.valorBruto)} → {formatarMoeda(m.valorFinal)}</div>}
                        {m.aplicouMaximo && <div style={{ fontSize: 11, color: "#d97706", marginTop: 4, padding: "4px 8px", background: "#fffbeb", borderRadius: 4 }}>Valor maximo aplicado: {formatarMoeda(m.valorBruto)} → {formatarMoeda(m.valorFinal)}</div>}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Totais */}
        <div style={{ fontSize: 13, fontFamily: FONTS.body }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span>Subtotal</span><span>{formatarMoeda(recalc.subtotal)}</span>
          </div>
          {recalc.urgencia > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", color: "#92400e", marginBottom: 4 }}>
              <span>Taxa de urgencia ({recalc.diasAteEvento} dias ate o evento)</span><span>+{formatarMoeda(recalc.urgencia)}</span>
            </div>
          )}
          {recalc.desconto?.valor > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", color: "#15803d", marginBottom: 4 }}>
              <span>{recalc.desconto.descricao}</span><span>-{formatarMoeda(recalc.desconto.valor)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 18, marginTop: 8, paddingTop: 8, borderTop: `2px solid ${COLORS.grayLight}` }}>
            <span>Total (recalculado)</span><span style={{ color: COLORS.primary }}>{formatarMoeda(recalc.total)}</span>
          </div>
          {taxas.total > 0 && taxas.total !== recalc.total && !taxas.ajustadoPorFMA && (
            <div style={{ fontSize: 11, color: "#d97706", marginTop: 4 }}>
              Valor salvo na solicitacao: {formatarMoeda(taxas.total)} (difere do recalculo)
            </div>
          )}
          {taxas.ajustadoPorFMA && (
            <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 4 }}>
              Valor ajustado manualmente: {formatarMoeda(taxas.total)}{taxas.observacaoAjuste ? ` — ${taxas.observacaoAjuste}` : ""}
            </div>
          )}
        </div>

        {/* Alertas de prazo */}
        {recalc.isPrazoInsuficiente && (
          <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fca5a5", fontSize: 12, color: "#dc2626" }}>
            Prazo insuficiente ({recalc.diasAteEvento} dias). Solicitacao pode ser indeferida.
          </div>
        )}
        {recalc.isUrgente && !recalc.isPrazoInsuficiente && (
          <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fcd34d", fontSize: 12, color: "#92400e" }}>
            Prazo inferior a {recalc.prazos.urgenciaDias} dias — taxa de urgencia aplicada.
          </div>
        )}

        {/* Acoes */}
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <button onClick={handleRecalcular} disabled={saving}
            style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.grayDark, fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            🔄 Recalcular
          </button>
          <button onClick={() => { setAjusteAberto(!ajusteAberto); setAjusteValor(taxas.total || recalc.total); }}
            style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: "#7c3aed", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            ✏️ Ajustar valor
          </button>
        </div>

        {ajusteAberto && (
          <div style={{ marginTop: 12, padding: 14, background: COLORS.offWhite, borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.grayDark }}>Valor ajustado (R$)</span>
              <input type="number" min="0" step="0.01" value={ajusteValor} onChange={e => setAjusteValor(e.target.value)}
                style={inp({ width: 200 })} />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.grayDark }}>Justificativa</span>
              <input value={ajusteObs} onChange={e => setAjusteObs(e.target.value)} placeholder="Motivo do ajuste..."
                style={inp()} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAjustar} disabled={saving}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Salvar ajuste
              </button>
              <button onClick={() => setAjusteAberto(false)}
                style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bloco Pagamentos e Recibos */}
      <BlocoPagamentos sol={sol} organizer={organizer} taxas={taxas} recalc={recalc} onSaved={onSaved} flash={flash} card={card} inp={inp} />

      {/* Bloco Arbitragem (informativo) */}
      <div style={card}>
        <h3 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, margin: "0 0 4px" }}>
          ⚖️ Arbitragem — Referencia (Art. 6)
        </h3>
        <p style={{ fontSize: 12, color: COLORS.gray, margin: "0 0 12px" }}>
          Custeio integral do organizador (Art. 8), acrescido de transporte, hospedagem e alimentacao.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.grayDark, marginBottom: 6 }}>Corridas de Rua (ate 6h)</div>
            {TABELA_ARBITRAGEM.corridaDeRua6h.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                <span>{r.funcao}</span><span style={{ fontWeight: 600 }}>{formatarMoeda(r.diaria)}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.grayDark, marginBottom: 6 }}>Corridas de Rua (ate 12h)</div>
            {TABELA_ARBITRAGEM.corridaDeRua12h.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 2 }}>
                <span>{r.funcao}</span><span style={{ fontWeight: 600 }}>{formatarMoeda(r.diaria)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Bloco Pagamentos e Recibos ──────────────────────────────────────────────

function BlocoPagamentos({ sol, organizer, taxas, recalc, onSaved, flash, card, inp }) {
  const pagamento = sol.pagamento || {};
  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);
  const [novoValor, setNovoValor] = useState("");
  const [novoTipo, setNovoTipo] = useState("taxa_solicitacao");
  const [novoNatureza, setNovoNatureza] = useState("total");

  useEffect(() => {
    PagamentosService.listBySolicitacao(sol.id).then(r => { setPagamentos(r.data || []); setLoading(false); });
  }, [sol.id]);

  const totalPago = pagamentos.filter(p => p.status === "confirmado").reduce((a, p) => a + (p.valor || 0), 0);
  const taxaTotal = taxas.total || recalc.total || 0;
  const saldo = taxaTotal - totalPago;

  const handleRegistrarPagamento = async () => {
    if (!novoValor || Number(novoValor) <= 0) return;
    setSaving(true);
    const valor = Number(novoValor);
    const nat = valor >= saldo ? "total" : "parcial";

    await PagamentosService.create({
      solicitacaoId: sol.id,
      organizerId: sol.organizerId,
      valor,
      tipo: novoTipo,
      natureza: pagamentos.some(p => p.status === "confirmado") ? "complemento" : nat,
      comprovanteArquivoId: pagamento.comprovanteArquivoId || "",
      comprovanteNome: "",
      pagadorNome: pagamento.pagadorTerceiro ? pagamento.pagadorNome : (organizer?.name || ""),
      pagadorCpfCnpj: pagamento.pagadorTerceiro ? pagamento.pagadorCpfCnpj : (organizer?.cpfCnpj || ""),
      pagadorEndereco: pagamento.pagadorTerceiro ? pagamento.pagadorEndereco : (organizer?.address || ""),
      pagadorContato: pagamento.pagadorTerceiro ? pagamento.pagadorContato : (organizer?.email || ""),
      terceiro: pagamento.pagadorTerceiro || false,
      status: "confirmado",
      confirmadoPor: "Equipe FMA",
      confirmadoEm: new Date().toISOString(),
      observacaoFMA: "",
      reciboNumero: "",
      reciboArquivoId: "",
      reciboGeradoEm: "",
    });

    // Atualizar status do pagamento na solicitacao
    const novoTotal = totalPago + valor;
    const novoStatus = novoTotal >= taxaTotal ? "confirmado" : "comprovante_anexado";
    await SolicitacoesService.update(sol.id, {
      pagamento: { ...pagamento, status: novoStatus, confirmadoPor: "Equipe FMA", confirmadoEm: new Date().toISOString() },
    });

    await MovimentacoesService.registrar({
      solicitacaoId: sol.id, tipoEvento: "pagamento_confirmado",
      statusAnterior: sol.status, statusNovo: sol.status,
      descricao: `Pagamento de ${formatarMoeda(valor)} confirmado (${novoTotal >= taxaTotal ? "integral" : "parcial"}).`,
      autor: "fma", autorNome: "Equipe FMA", autorId: "admin", visivel: true,
    });

    // Notificar organizador: pagamento confirmado
    if (sol.organizadorEmail || sol.organizerEmail) {
      notificarPagamentoConfirmado({
        organizadorEmail: sol.organizadorEmail || sol.organizerEmail,
        organizadorNome:  sol.organizadorNome  || sol.organizerName || organizer?.name || "Organizador",
        protocolo:        sol.protocoloFMA || sol.id,
        evento:           sol.nomeEvento || sol.titulo || sol.title || "Evento",
        valor,
      }).catch(() => {});
    }

    flash("Pagamento registrado!");
    setSaving(false);
    setNovoAberto(false);
    setNovoValor("");
    // Recarregar
    const r = await PagamentosService.listBySolicitacao(sol.id);
    setPagamentos(r.data || []);
    onSaved();
  };

  const handleGerarRecibo = async (pag) => {
    setSaving(true);
    try {
      const ano = new Date().getFullYear();
      const num = await reservarNumeroRecibo(ano);
      const reciboNumero = formatarNumeroRecibo(num, ano);

      // Buscar config para assinatura
      const cfgRes = await TaxasConfigService.get();
      const cfg = cfgRes.data || {};

      const blob = await gerarReciboPdf({
        reciboNumero,
        valor: pag.valor,
        tipo: pag.tipo,
        natureza: pag.natureza,
        pagadorNome: pag.pagadorNome,
        pagadorCpfCnpj: pag.pagadorCpfCnpj,
        pagadorEndereco: pag.pagadorEndereco,
        nomeEvento: sol.nomeEvento,
        dataEvento: sol.dataEvento,
        protocoloFMA: sol.protocoloFMA,
        organizadorNome: organizer?.name || "",
        tipoSolicitacao: sol.tipo,
        assinaturaUrl: cfg.assinaturaPresidenteUrl || "",
        presidenteNome: cfg.presidenteNome || "",
        presidenteCargo: cfg.presidenteCargo || "",
      });

      // Upload do PDF
      const nomeEvento = (sol.nomeEvento || "evento").replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, "").trim().replace(/\s+/g, "_");
      const fileName = `Recibo_${reciboNumero.replace("/", "-")}_${nomeEvento}.pdf`;
      const file = new File([blob], fileName, { type: "application/pdf" });
      const sanitizeR = (s) => (s || "sem-nome").replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, "").trim().replace(/\s+/g, "_");
      const anoR = (sol.dataEvento || "").slice(0, 4) || String(new Date().getFullYear());
      const folderR = `solicitacoes/${anoR}/${sanitizeR(organizer?.organization || organizer?.name || "")}/${sanitizeR(sol.nomeEvento)}`;
      const { url, path } = await uploadFile(file, folderR);

      const arqR = await ArquivosService.upload({
        solicitacaoId: sol.id, nome: fileName,
        tamanho: file.size, tipo: "application/pdf",
        descricao: `Recibo ${reciboNumero}`, categoria: "resposta_fma",
        url, storagePath: path,
        enviadoPor: "fma", enviadoPorId: "admin",
      });

      await PagamentosService.update(pag.id, {
        reciboNumero,
        reciboArquivoId: arqR.data?.id || "",
        reciboGeradoEm: new Date().toISOString(),
      });

      await MovimentacoesService.registrar({
        solicitacaoId: sol.id, tipoEvento: "pagamento_confirmado",
        statusAnterior: sol.status, statusNovo: sol.status,
        descricao: `Recibo ${reciboNumero} gerado — ${formatarMoeda(pag.valor)}.`,
        autor: "fma", autorNome: "Equipe FMA", autorId: "admin", visivel: true,
      });

      flash(`Recibo ${reciboNumero} gerado!`);
      // Abrir PDF
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch (e) {
      console.error("Erro ao gerar recibo:", e);
      flash("Erro ao gerar recibo.");
    }
    setSaving(false);
    const r = await PagamentosService.listBySolicitacao(sol.id);
    setPagamentos(r.data || []);
    onSaved();
  };

  const handleExcluirRecibo = async (pag) => {
    if (!confirm(`Excluir recibo ${pag.reciboNumero}? O arquivo será removido permanentemente.`)) return;
    setSaving(true);
    try {
      // 1. Excluir arquivo do Storage e do Firestore
      if (pag.reciboArquivoId) {
        const arqR = await ArquivosService.get(pag.reciboArquivoId);
        if (arqR.data) {
          if (arqR.data.storagePath) await deleteFile(arqR.data.storagePath).catch(() => {});
          else if (arqR.data.url?.includes("firebasestorage.googleapis.com")) await deleteFile(arqR.data.url).catch(() => {});
          await ArquivosService.delete(pag.reciboArquivoId);
        }
      }
      // 2. Limpar campos do pagamento
      await PagamentosService.update(pag.id, {
        reciboNumero: "",
        reciboArquivoId: "",
        reciboGeradoEm: "",
      });
      // 3. Registrar movimentação
      await MovimentacoesService.registrar({
        solicitacaoId: sol.id, tipoEvento: "recibo_excluido",
        statusAnterior: sol.status, statusNovo: sol.status,
        descricao: `Recibo ${pag.reciboNumero} excluído.`,
        autor: "fma", autorNome: "Equipe FMA", autorId: "admin", visivel: false,
      });
      flash(`Recibo ${pag.reciboNumero} excluído.`);
    } catch (e) {
      console.error("Erro ao excluir recibo:", e);
      flash("Erro ao excluir recibo.");
    }
    setSaving(false);
    const r = await PagamentosService.listBySolicitacao(sol.id);
    setPagamentos(r.data || []);
    onSaved();
  };

  const handleCobrar = async () => {
    setSaving(true);
    await MovimentacoesService.registrar({
      solicitacaoId: sol.id, tipoEvento: "pagamento_cobrado",
      statusAnterior: sol.status, statusNovo: sol.status,
      descricao: `Cobranca de pagamento: ${formatarMoeda(saldo > 0 ? saldo : taxaTotal)}. Por favor, anexe o comprovante.`,
      autor: "fma", autorNome: "Equipe FMA", autorId: "admin", visivel: true,
    });
    // Notificar organizador: cobrança de pagamento
    if (sol.organizadorEmail || sol.organizerEmail) {
      notificarCobrancaPagamento({
        organizadorEmail: sol.organizadorEmail || sol.organizerEmail,
        organizadorNome:  sol.organizadorNome  || sol.organizerName || organizer?.name || "Organizador",
        protocolo:        sol.protocoloFMA || sol.id,
        evento:           sol.nomeEvento || sol.titulo || sol.title || "Evento",
        valor:            saldo > 0 ? saldo : taxaTotal,
      }).catch(() => {});
    }

    flash("Cobranca registrada e visivel ao organizador.");
    setSaving(false);
    onSaved();
  };

  const tipoLabels = { taxa_solicitacao: "Solicitacao", taxa_arbitragem: "Arbitragem", complemento: "Complemento" };
  const natLabels = { total: "Integral", parcial: "Parcial", complemento: "Complementar" };

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, margin: 0 }}>
          🧾 Pagamentos e Recibos
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {saldo > 0 && (
            <span style={{ fontSize: 12, fontFamily: FONTS.heading, fontWeight: 700, color: "#d97706", padding: "4px 10px", borderRadius: 12, background: "#fffbeb", border: "1px solid #fcd34d" }}>
              Saldo: {formatarMoeda(saldo)}
            </span>
          )}
          {saldo <= 0 && totalPago > 0 && (
            <span style={{ fontSize: 12, fontFamily: FONTS.heading, fontWeight: 700, color: "#15803d", padding: "4px 10px", borderRadius: 12, background: "#f0fdf4", border: "1px solid #86efac" }}>
              ✅ Quitado
            </span>
          )}
        </div>
      </div>

      {/* Terceiro pagador */}
      {pagamento.pagadorTerceiro && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fcd34d" }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#92400e", marginBottom: 8 }}>
            ⚠️ Pagamento por terceiro
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", fontSize: 13, fontFamily: FONTS.body }}>
            <div><strong>Permit emitido para:</strong></div>
            <div>{organizer?.name || "—"} ({organizer?.cpfCnpj || "—"})</div>
            <div><strong>Recibo emitido para:</strong></div>
            <div>{pagamento.pagadorNome || "—"} ({pagamento.pagadorCpfCnpj || "—"})</div>
            {pagamento.pagadorContato && <><div><strong>Contato:</strong></div><div>{pagamento.pagadorContato}</div></>}
            {pagamento.pagadorEndereco && <><div><strong>Endereco:</strong></div><div>{pagamento.pagadorEndereco}</div></>}
          </div>
          {pagamento.anuenciaAceita && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#15803d" }}>
              ✅ Anuencia aceita em {pagamento.anuenciaAceitaEm ? new Date(pagamento.anuenciaAceitaEm).toLocaleString("pt-BR") : "—"}
            </div>
          )}
        </div>
      )}

      {/* Resumo financeiro */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ padding: "10px 14px", background: COLORS.offWhite, borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.gray, textTransform: "uppercase" }}>Taxa total</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.dark }}>{formatarMoeda(taxaTotal)}</div>
        </div>
        <div style={{ padding: "10px 14px", background: "#f0fdf4", borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#15803d", textTransform: "uppercase" }}>Pago</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#15803d" }}>{formatarMoeda(totalPago)}</div>
        </div>
        <div style={{ padding: "10px 14px", background: saldo > 0 ? "#fffbeb" : COLORS.offWhite, borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: saldo > 0 ? "#d97706" : COLORS.gray, textTransform: "uppercase" }}>Saldo</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: saldo > 0 ? "#d97706" : COLORS.gray }}>{formatarMoeda(saldo > 0 ? saldo : 0)}</div>
        </div>
      </div>

      {/* Lista de pagamentos */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 20, color: COLORS.gray }}>Carregando...</div>
      ) : pagamentos.length === 0 ? (
        <div style={{ textAlign: "center", padding: 20, color: COLORS.gray, fontSize: 13 }}>Nenhum pagamento registrado.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {pagamentos.map((pag, i) => (
            <div key={pag.id} style={{ padding: "12px 16px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: COLORS.dark }}>#{i + 1}</span>
                  <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: "#eff6ff", color: "#0066cc" }}>
                    {tipoLabels[pag.tipo] || pag.tipo}
                  </span>
                  <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: pag.natureza === "total" ? "#f0fdf4" : "#fffbeb", color: pag.natureza === "total" ? "#15803d" : "#d97706" }}>
                    {natLabels[pag.natureza] || pag.natureza}
                  </span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: COLORS.primary }}>{formatarMoeda(pag.valor)}</span>
              </div>
              <div style={{ fontSize: 12, color: COLORS.gray, marginBottom: 6 }}>
                Pagador: {pag.pagadorNome} ({pag.pagadorCpfCnpj}){pag.terceiro ? " (terceiro)" : ""} — {pag.confirmadoEm ? new Date(pag.confirmadoEm).toLocaleDateString("pt-BR") : "—"}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {pag.reciboNumero ? (
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#15803d", display: "flex", alignItems: "center", gap: 4 }}>
                    📄 {pag.reciboNumero}
                    {pag.reciboArquivoId && (
                      <button onClick={async () => {
                        const r = await ArquivosService.get(pag.reciboArquivoId);
                        if (r.data?.url) window.open(r.data.url, "_blank");
                      }} style={{ background: "none", border: "none", color: "#0066cc", cursor: "pointer", fontSize: 11, textDecoration: "underline", padding: 0 }}>
                        Baixar
                      </button>
                    )}
                    <button onClick={() => handleExcluirRecibo(pag)} disabled={saving}
                      style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 11, textDecoration: "underline", padding: 0 }}>
                      Excluir
                    </button>
                  </span>
                ) : (
                  <button onClick={() => handleGerarRecibo(pag)} disabled={saving}
                    style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#0066cc", color: "#fff", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    📄 Gerar recibo
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Acoes */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => { setNovoAberto(!novoAberto); setNovoValor(saldo > 0 ? String(saldo) : ""); }}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#15803d", color: "#fff", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          ✅ Registrar pagamento
        </button>
        {saldo > 0 && (
          <button onClick={handleCobrar} disabled={saving}
            style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#d97706", color: "#fff", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            📨 Cobrar {pagamentos.length > 0 ? "complemento" : "pagamento"}
          </button>
        )}
      </div>

      {/* Formulario novo pagamento */}
      {novoAberto && (
        <div style={{ marginTop: 12, padding: 14, background: COLORS.offWhite, borderRadius: 8, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.grayDark }}>Valor (R$)</span>
              <input type="number" min="0" step="0.01" value={novoValor} onChange={e => setNovoValor(e.target.value)} style={inp()} />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.grayDark }}>Tipo</span>
              <select value={novoTipo} onChange={e => setNovoTipo(e.target.value)} style={inp({ cursor: "pointer" })}>
                <option value="taxa_solicitacao">Taxa de Solicitacao de Permit/Chancela</option>
                <option value="taxa_arbitragem">Taxa de Arbitragem</option>
                <option value="complemento">Complemento</option>
              </select>
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.grayDark }}>Natureza</span>
              <select value={novoNatureza} onChange={e => setNovoNatureza(e.target.value)} style={inp({ cursor: "pointer" })}>
                <option value="total">Integral</option>
                <option value="parcial">Parcial</option>
                <option value="complemento">Complementar</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleRegistrarPagamento} disabled={saving}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#15803d", color: "#fff", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {saving ? "Salvando..." : "Confirmar"}
            </button>
            <button onClick={() => setNovoAberto(false)}
              style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.gray, fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
