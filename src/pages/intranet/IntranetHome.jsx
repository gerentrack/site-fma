/**
 * IntranetHome.jsx — Dashboard inicial da intranet.
 * Rota: /intranet
 * Conteúdo varia com o role do usuário.
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import IntranetLayout from "./IntranetLayout";
import { useIntranet } from "../../context/IntranetContext";
import {
  RefereeEventsService, RefereeAvailabilityService,
  RefereeAssignmentsService, RefereesService, AnuidadesService,
  EnvioDocumentosService, MuralAvisosService,
  ReembolsosService, RelatoriosService,
} from "../../services/index";
import { COLORS, FONTS } from "../../styles/colors";
import { CALENDAR_CATEGORIES, ANUIDADE_STATUS } from "../../config/navigation";

const catMap = Object.fromEntries((CALENDAR_CATEGORIES || []).filter(c => c.value).map(c => [c.value, c]));

function StatCard({ label, value, icon, color, to }) {
  const inner = (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderTop: `3px solid ${color}`, transition: "transform 0.2s, box-shadow 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: FONTS.heading, fontSize: 32, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginTop: 4 }}>{label}</div>
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: "none" }}>{inner}</Link> : inner;
}

function EventRow({ event, myAvail }) {
  const cat = catMap[event.category] || { color: COLORS.gray, icon: "📅" };
  const avail = myAvail?.find(a => a.eventId === event.id);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: `1px solid ${COLORS.grayLight}` }}>
      <div style={{ width: 50, flexShrink: 0, textAlign: "center" }}>
        <div style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 900, color: cat.color, lineHeight: 1 }}>
          {new Date(event.date + "T12:00:00").getDate()}
        </div>
        <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, color: COLORS.gray, textTransform: "uppercase" }}>
          {new Date(event.date + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" })}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, color: COLORS.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.title}</div>
        <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>{event.city} {event.time && `• ${event.time}`}</div>
      </div>
      {avail !== undefined && (
        <span style={{
          padding: "3px 10px", borderRadius: 20, fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, flexShrink: 0,
          background: avail ? (avail.available ? "#e6f9ee" : "#fff5f5") : "#f3f4f6",
          color: avail ? (avail.available ? "#007733" : "#cc0000") : COLORS.gray,
        }}>
          {avail ? (avail.available ? "✓ Disponível" : "✗ Indisponível") : "Pendente"}
        </span>
      )}
    </div>
  );
}

export default function IntranetHome() {
  const { canManage, refereeId, name, role } = useIntranet();
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, assigned: 0 });
  const [myAvail, setMyAvail] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [anuidade, setAnuidade] = useState(null);
  const [docsNaoLidos, setDocsNaoLidos] = useState(0);
  const [avisos, setAvisos] = useState([]);
  const [pendencias, setPendencias] = useState(null);

  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    if (!refereeId) return;
    RefereeEventsService.list({ upcoming: true }).then(r => { if (r.data) setEvents(r.data.slice(0, 5)); });
    MuralAvisosService.list({ apenasAtivos: true }).then(r => { if (r.data) setAvisos(r.data); }).catch(() => {});
    if (canManage) {
      RefereesService.list().then(r => {
        if (r.data) setStats(s => ({ ...s, total: r.data.length, active: r.data.filter(x => x.status === "ativo").length }));
      });
      Promise.all([
        RefereeAssignmentsService.list(),
        RefereeEventsService.list({ upcoming: true }),
        AnuidadesService.list({ ano: anoAtual }),
        ReembolsosService.list({ status: "pendente" }),
        RelatoriosService.list(),
      ]).then(([aRes, eRes, anRes, reembRes, relRes]) => {
        const allAsgn = aRes.data || [];
        const futureEventIds = new Set((eRes.data || []).map(e => e.id));
        const ativas = allAsgn.filter(a => futureEventIds.has(a.eventId));
        setStats(s => ({ ...s, assigned: ativas.length }));

        const today = new Date().toISOString().slice(0, 10);
        const passadas = allAsgn.filter(a => a.event?.date < today);
        const relatorioIds = new Set((relRes.data || []).map(r => r.assignmentId));
        const semRelatorio = passadas.filter(a => !relatorioIds.has(a.id)).length;
        const anuidadesVencidas = (anRes.data || []).filter(a => a.status === "vencido").length;
        const anuidadesPendentes = (anRes.data || []).filter(a => a.status === "pendente").length;
        const reembolsosPendentes = (reembRes.data || []).length;
        const diariasPendentes = passadas.filter(a => (a.valorDiaria || 0) > 0 && !a.diariaPaga).length;

        setPendencias({ semRelatorio, anuidadesVencidas, anuidadesPendentes, reembolsosPendentes, diariasPendentes });
      });
    } else {
      RefereeAvailabilityService.list({ refereeId }).then(r => { if (r.data) setMyAvail(r.data); });
      RefereeAssignmentsService.getByReferee(refereeId).then(r => { if (r.data) setMyAssignments(r.data.filter(a => a.event?.date >= new Date().toISOString().slice(0, 10))); });
      AnuidadesService.getByRefereeAno(refereeId, anoAtual).then(r => { if (r.data) setAnuidade(r.data); });
      RefereesService.get(refereeId).then(rRef => {
        const nv = rRef.data?.nivel || "";
        EnvioDocumentosService.listByReferee(refereeId, nv).then(r => {
          const naoLidos = (r.data || []).filter(d => !(d.leituras || {})[refereeId]).length;
          setDocsNaoLidos(naoLidos);
        });
      });
    }
  }, [refereeId, canManage]);

  return (
    <IntranetLayout>
      <div style={{ padding: 36 }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, color: COLORS.primary, marginBottom: 6 }}>
            {role === "admin" ? "Administrador" : role === "coordenador" ? "Coordenador" : "Árbitro"}
          </div>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: "clamp(1.5rem,3vw,2.2rem)", fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: 0 }}>
            Olá, {name.split(" ")[0]}!
          </h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: "6px 0 0" }}>
            {canManage ? "Painel de gerenciamento da intranet de árbitros." : "Sua área pessoal na intranet FMA."}
          </p>
        </div>

        {/* Pendências do admin */}
        {canManage && pendencias && (pendencias.semRelatorio > 0 || pendencias.anuidadesVencidas > 0 || pendencias.anuidadesPendentes > 0 || pendencias.reembolsosPendentes > 0 || pendencias.diariasPendentes > 0) && (
          <div style={{ background: "#fff", borderRadius: 12, padding: "18px 22px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 24, borderLeft: `4px solid #d97706` }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#d97706", marginBottom: 10 }}>
              Pendencias
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {pendencias.reembolsosPendentes > 0 && (
                <Link to="/intranet/admin/reembolsos" style={{ fontSize: 13, color: COLORS.dark, textDecoration: "none", fontFamily: FONTS.body }}>
                  <strong style={{ color: "#d97706" }}>{pendencias.reembolsosPendentes}</strong> reembolso(s) aguardando aprovacao
                </Link>
              )}
              {pendencias.semRelatorio > 0 && (
                <Link to="/intranet/admin/relatorios-arbitragem" style={{ fontSize: 13, color: COLORS.dark, textDecoration: "none", fontFamily: FONTS.body }}>
                  <strong style={{ color: "#d97706" }}>{pendencias.semRelatorio}</strong> escalacao(oes) sem relatorio preenchido
                </Link>
              )}
              {pendencias.diariasPendentes > 0 && (
                <Link to="/intranet/admin/diarias" style={{ fontSize: 13, color: COLORS.dark, textDecoration: "none", fontFamily: FONTS.body }}>
                  <strong style={{ color: "#d97706" }}>{pendencias.diariasPendentes}</strong> diaria(s) pendente(s) de pagamento
                </Link>
              )}
              {pendencias.anuidadesVencidas > 0 && (
                <Link to="/admin/anuidades" style={{ fontSize: 13, color: COLORS.dark, textDecoration: "none", fontFamily: FONTS.body }}>
                  <strong style={{ color: "#dc2626" }}>{pendencias.anuidadesVencidas}</strong> anuidade(s) vencida(s)
                </Link>
              )}
              {pendencias.anuidadesPendentes > 0 && (
                <Link to="/admin/anuidades" style={{ fontSize: 13, color: COLORS.dark, textDecoration: "none", fontFamily: FONTS.body }}>
                  <strong style={{ color: "#d97706" }}>{pendencias.anuidadesPendentes}</strong> anuidade(s) pendente(s)
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Mural de avisos */}
        {avisos.length > 0 && (
          <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 8 }}>
            {avisos.map(aviso => {
              const cores = { info: { color: "#0066cc", bg: "#eff6ff", border: "#bfdbfe" }, alerta: { color: "#d97706", bg: "#fffbeb", border: "#fde68a" }, urgente: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" } };
              const c = cores[aviso.tipo] || cores.info;
              return (
                <div key={aviso.id} style={{ padding: "12px 16px", borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{aviso.tipo === "urgente" ? "🔴" : aviso.tipo === "alerta" ? "🟡" : "🔵"}</span>
                  <div>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: c.color }}>{aviso.titulo}</div>
                    {aviso.mensagem && <div style={{ fontFamily: FONTS.body, fontSize: 12, color: c.color, opacity: 0.8, marginTop: 2 }}>{aviso.mensagem}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats — admin/coordenador */}
        {canManage && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16, marginBottom: 36 }}>
            <StatCard label="Árbitros cadastrados" value={stats.total} icon="👥" color={COLORS.primary} to="/intranet/admin/arbitros" />
            <StatCard label="Árbitros ativos" value={stats.active} icon="✅" color="#007733" to="/intranet/admin/arbitros" />
            <StatCard label="Próximos eventos" value={events.length} icon="🗓️" color="#0066cc" to="/intranet/admin/eventos" />
            <StatCard label="Escalações ativas" value={stats.assigned} icon="📋" color="#884400" to="/intranet/admin/escalacao" />
          </div>
        )}

        {/* Stats — árbitro */}
        {!canManage && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16, marginBottom: 36 }}>
            <StatCard label="Disponibilidades registradas" value={myAvail.length} icon="📅" color="#0066cc" to="/intranet/disponibilidade" />
            <StatCard label="Próximas escalas" value={myAssignments.length} icon="📋" color="#007733" to="/intranet/escalas" />
          </div>
        )}

        {/* Card anuidade — árbitro */}
        {!canManage && anuidade && (() => {
          const st = (ANUIDADE_STATUS || []).find(s => s.value === anuidade.status) || { label: anuidade.status, color: COLORS.gray, bg: "#f3f4f6" };
          const pendente = anuidade.status === "pendente" || anuidade.status === "vencido";
          return (
            <Link to="/intranet/anuidade" style={{ textDecoration: "none", display: "block", marginBottom: 24 }}>
              <div style={{
                background: "#fff", borderRadius: 12, padding: "16px 22px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                borderLeft: `4px solid ${st.color}`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                transition: "transform 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={e => e.currentTarget.style.transform = ""}>
                <div>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, color: COLORS.dark, textTransform: "uppercase" }}>
                    Anuidade {anoAtual}
                  </div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginTop: 2 }}>
                    {pendente ? "Regularize sua anuidade para manter o cadastro ativo." : st.label}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{
                    padding: "4px 12px", borderRadius: 20, fontSize: 12,
                    fontFamily: FONTS.heading, fontWeight: 700, color: st.color, background: st.bg,
                  }}>{st.label}</span>
                  <span style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 900, color: COLORS.dark }}>
                    {(anuidade.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
              </div>
            </Link>
          );
        })()}

        {/* Próximos eventos */}
        <div style={{ display: "grid", gridTemplateColumns: canManage ? "1fr 1fr" : "1fr", gap: 24 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "22px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: 0 }}>
                📅 Próximos Eventos
              </h2>
              <Link to={canManage ? "/intranet/admin/eventos" : "/intranet/disponibilidade"} style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, color: COLORS.primary, textDecoration: "none" }}>Ver todos →</Link>
            </div>
            {events.length === 0 ? (
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, padding: "16px 0" }}>Nenhum evento futuro cadastrado.</div>
            ) : (
              events.map(evt => <EventRow key={evt.id} event={evt} myAvail={!canManage ? myAvail : undefined} />)
            )}
          </div>

          {/* Ações rápidas */}
          <div style={{ background: "#fff", borderRadius: 12, padding: "22px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, margin: "0 0 16px" }}>
              ⚡ Ações Rápidas
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(canManage ? [
                { to: "/intranet/admin/arbitros/novo", icon: "👤", label: "Cadastrar novo árbitro" },
                { to: "/intranet/admin/eventos/novo", icon: "🗓️", label: "Criar evento manual" },
                { to: "/intranet/admin/escalacao", icon: "📋", label: "Gerenciar escalações" },
                { to: "/intranet/mensagens", icon: "📨", label: "Mensagens" },
                { to: "/intranet/admin/eventos", icon: "📥", label: "Importar do calendário FMA" },
              ] : [
                { to: "/intranet/disponibilidade", icon: "📅", label: "Registrar disponibilidade" },
                { to: "/intranet/escalas", icon: "📋", label: "Ver minhas escalas" },
                { to: "/intranet/mensagens", icon: "📨", label: docsNaoLidos > 0 ? `Mensagens (${docsNaoLidos} nova${docsNaoLidos > 1 ? "s" : ""})` : "Mensagens" },
                { to: "/intranet/anuidade", icon: "💳", label: "Minha anuidade" },
                { to: "/intranet/perfil", icon: "👤", label: "Atualizar meus dados" },
                { to: "/intranet/documentos", icon: "📄", label: "Acessar documentos" },
              ]).map(a => (
                <Link key={a.to} to={a.to} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, textDecoration: "none", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 600, color: COLORS.dark, transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f7f7f7"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: 16 }}>{a.icon}</span>{a.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </IntranetLayout>
  );
}
