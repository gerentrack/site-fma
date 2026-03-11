import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { newsAPI, galleryAPI, calendarAPI, documentsAPI, bannersAPI } from "../../data/api";
import { COLORS, FONTS } from "../../styles/colors";

function StatCard({ icon, label, value, to, color = COLORS.primary }) {
  return (
    <Link to={to} style={{
      background: COLORS.white, borderRadius: 12, padding: "24px",
      textDecoration: "none", display: "block",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      borderLeft: `4px solid ${color}`,
      transition: "transform 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: FONTS.heading, fontSize: 32, fontWeight: 800, color: COLORS.dark }}>{value}</div>
      <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginTop: 4 }}>{label}</div>
    </Link>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ news: 0, gallery: 0, calendar: 0, documents: 0, banners: 0 });

  useEffect(() => {
    Promise.all([
      newsAPI.list({ publishedOnly: false }),
      galleryAPI.list({ publishedOnly: false }),
      calendarAPI.list({ publishedOnly: false }),
      documentsAPI.list({ publishedOnly: false }),
      bannersAPI.list({ activeOnly: false }),
    ]).then(([n, g, c, d, b]) => {
      setStats({
        news: n.data?.length || 0,
        gallery: g.data?.length || 0,
        calendar: c.data?.length || 0,
        documents: d.data?.length || 0,
        banners: b.data?.length || 0,
      });
    });
  }, []);

  return (
    <AdminLayout>
      <div style={{ padding: "40px 40px 60px" }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 28, fontWeight: 800, color: COLORS.dark, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>
            Dashboard
          </h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: "6px 0 0" }}>
            Bem-vindo ao painel administrativo da Federação Mineira de Atletismo.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20, marginBottom: 40 }}>
          <StatCard icon="📰" label="Notícias cadastradas" value={stats.news} to="/admin/noticias" color={COLORS.primary} />
          <StatCard icon="📷" label="Álbuns na galeria" value={stats.gallery} to="/admin/galeria" color="#3a3a3a" />
          <StatCard icon="🗓️" label="Eventos no calendário" value={stats.calendar} to="/admin/calendario" color="#0066cc" />
          <StatCard icon="📄" label="Documentos" value={stats.documents} to="/admin/documentos" color="#007733" />
          <StatCard icon="🖼️" label="Banners ativos" value={stats.banners} to="/admin/banners" color="#884400" />
        </div>

        <div style={{ background: COLORS.white, borderRadius: 12, padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 700, color: COLORS.dark, margin: "0 0 20px", textTransform: "uppercase" }}>
            Ações Rápidas
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {[
              { label: "Nova Notícia", to: "/admin/noticias/novo", icon: "📰" },
              { label: "Novo Álbum", to: "/admin/galeria/novo", icon: "📷" },
              { label: "Novo Evento", to: "/admin/calendario/novo", icon: "🗓️" },
              { label: "Novo Documento", to: "/admin/documentos/novo", icon: "📄" },
              { label: "Novo Banner", to: "/admin/banners/novo", icon: "🖼️" },
            ].map((a, i) => (
              <Link key={i} to={a.to} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 18px", background: COLORS.primary, color: COLORS.white,
                borderRadius: 8, textDecoration: "none", fontFamily: FONTS.heading,
                fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
                transition: "background 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = COLORS.primaryDark}
                onMouseLeave={e => e.currentTarget.style.background = COLORS.primary}
              >
                <span>{a.icon}</span> {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
