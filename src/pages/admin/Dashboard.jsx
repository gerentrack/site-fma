import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../hooks/useAuth";
import {
  newsAPI, galleryAPI, calendarAPI, documentsAPI, bannersAPI,
  organizersAPI, refereesAPI, refereeEventsAPI, resultadosAPI, equipesAPI,
} from "../../data/api";
import { SolicitacoesService } from "../../services/index";
import { COLORS, FONTS } from "../../styles/colors";

function StatCard({ icon, label, value, to, color = COLORS.primary }) {
  return (
    <Link to={to} style={{
      background: COLORS.white, borderRadius: 12, padding: "20px 24px",
      textDecoration: "none", display: "block",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      borderLeft: `4px solid ${color}`,
      transition: "transform 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: FONTS.heading, fontSize: 28, fontWeight: 800, color: COLORS.dark }}>{value}</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 4 }}>{label}</div>
        </div>
        <div style={{ fontSize: 24, opacity: 0.7 }}>{icon}</div>
      </div>
    </Link>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, color: COLORS.grayDark,
      margin: "0 0 16px", textTransform: "uppercase", letterSpacing: 1,
    }}>
      {children}
    </h2>
  );
}

export default function Dashboard() {
  const { user, isMaster, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    news: 0, gallery: 0, calendar: 0, documents: 0, banners: 0, resultados: 0,
    organizers: 0, solicitacoes: 0, solicitacoesPendentes: 0,
    referees: 0, refereesAtivos: 0, eventosAbertos: 0, equipes: 0,
  });

  useEffect(() => {
    const loads = [
      newsAPI.list({ publishedOnly: false }),
      galleryAPI.list({ publishedOnly: false }),
      calendarAPI.list({ publishedOnly: false }),
      documentsAPI.list({ publishedOnly: false }),
      bannersAPI.list({ activeOnly: false }),
      resultadosAPI.list({ publishedOnly: false }),
    ];

    // Stats adicionais para admin+
    if (isAdmin) {
      loads.push(
        organizersAPI.list(),
        SolicitacoesService.list(),
        refereesAPI.list(),
        refereeEventsAPI.list({ upcoming: true }),
        equipesAPI.list({ publishedOnly: false }),
      );
    }

    Promise.all(loads).then(results => {
      const [n, g, c, d, b, res, org, sol, ref, revt, eq] = results;
      const solData = sol?.data || [];
      const refData = ref?.data || [];
      setStats({
        news: n.data?.length || 0,
        gallery: g.data?.length || 0,
        calendar: c.data?.length || 0,
        documents: d.data?.length || 0,
        banners: b.data?.length || 0,
        resultados: res?.data?.length || 0,
        organizers: org?.data?.length || 0,
        solicitacoes: solData.length,
        solicitacoesPendentes: solData.filter(s => ["enviada", "em_analise", "pendencia"].includes(s.status)).length,
        referees: refData.length,
        refereesAtivos: refData.filter(r => r.status === "ativo" && r.profileComplete).length,
        eventosAbertos: revt?.data?.length || 0,
        equipes: eq?.data?.length || 0,
      });
    });
  }, [isAdmin]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <AdminLayout>
      <div style={{ padding: "36px 40px 60px" }}>
        {/* Header com saudação */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 800, color: COLORS.dark, margin: 0 }}>
            {greeting()}, {user?.name || "Admin"}
          </h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "6px 0 0" }}>
            Painel administrativo da Federação Mineira de Atletismo
          </p>
        </div>

        {/* Stats: Conteúdo */}
        <SectionTitle>Conteúdo</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
          <StatCard icon="" label="Notícias" value={stats.news} to="/admin/noticias" color={COLORS.primary} />
          <StatCard icon="" label="Eventos" value={stats.calendar} to="/admin/calendario" color="#0066cc" />
          <StatCard icon="" label="Resultados" value={stats.resultados} to="/admin/resultados" color="#007733" />
          <StatCard icon="" label="Álbuns" value={stats.gallery} to="/admin/galeria" color="#3a3a3a" />
          <StatCard icon="" label="Documentos" value={stats.documents} to="/admin/documentos" color="#884400" />
        </div>

        {/* Stats: Portal + Intranet (admin+) */}
        {isAdmin && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
              {/* Portal */}
              <div>
                <SectionTitle>Portal do Organizador</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <StatCard icon="" label="Solicitações" value={stats.solicitacoes} to="/admin/solicitacoes" color="#0066cc" />
                  <StatCard
                    icon="" label="Pendentes"
                    value={stats.solicitacoesPendentes}
                    to="/admin/solicitacoes"
                    color={stats.solicitacoesPendentes > 0 ? "#cc0000" : "#007733"}
                  />
                  <StatCard icon="" label="Organizadores" value={stats.organizers} to="/admin/organizadores" color="#5a3e8a" />
                  <StatCard icon="" label="Financeiro" value="—" to="/admin/financeiro" color="#884400" />
                </div>
              </div>

              {/* Intranet */}
              <div>
                <SectionTitle>Intranet de Arbitragem</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <StatCard icon="" label="Árbitros" value={stats.referees} to="/admin/arbitros" color="#0066cc" />
                  <StatCard icon="" label="Ativos" value={stats.refereesAtivos} to="/admin/arbitros" color="#007733" />
                  <StatCard icon="" label="Eventos abertos" value={stats.eventosAbertos} to="/admin/escalas" color="#884400" />
                  <StatCard icon="" label="Equipes" value={stats.equipes} to="/admin/equipes" color="#3a3a3a" />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Ações Rápidas */}
        <SectionTitle>Ações Rápidas</SectionTitle>
        <div style={{ background: COLORS.white, borderRadius: 12, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              { label: "Nova Notícia", to: "/admin/noticias/novo", icon: "" },
              { label: "Novo Evento", to: "/admin/calendario/novo", icon: "" },
              { label: "Novo Álbum", to: "/admin/galeria/novo", icon: "" },
              { label: "Novo Documento", to: "/admin/documentos/novo", icon: "" },
              ...(isAdmin ? [
                { label: "Ver Solicitações", to: "/admin/solicitacoes", icon: "" },
                { label: "Ver Escalas", to: "/admin/escalas", icon: "" },
              ] : []),
              ...(isMaster ? [
                { label: "Gerenciar Usuários", to: "/admin/usuarios", icon: "" },
              ] : []),
            ].map((a, i) => (
              <Link key={i} to={a.to} style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 16px", background: COLORS.primary, color: COLORS.white,
                borderRadius: 8, textDecoration: "none", fontFamily: FONTS.heading,
                fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
                transition: "background 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = COLORS.primaryDark}
                onMouseLeave={e => e.currentTarget.style.background = COLORS.primary}
              >
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
