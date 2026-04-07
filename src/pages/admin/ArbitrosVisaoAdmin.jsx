/**
 * ArbitrosVisaoAdmin.jsx
 * Visão dos árbitros dentro do painel admin.
 * Permite ao admin/master ver o quadro de árbitros, status e categorias
 * sem precisar logar na intranet separadamente.
 */
import { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/Badge";
import Table, { TableActions } from "../../components/ui/Table";
import { refereesAPI } from "../../data/api";
import { COLORS, FONTS } from "../../styles/colors";

const STATUS_BADGE = {
  ativo:   { label: "Ativo",   bg: "#e6f9ee", color: "#007733" },
  inativo: { label: "Inativo", bg: "#f5f5f5", color: "#6b7280" },
  suspenso:{ label: "Suspenso",bg: "#fff0f0", color: "#cc0000" },
};

const CATEGORY_LABEL = {
  "corrida-rua": "Corrida de Rua",
  "pista-campo": "Pista e Campo",
  "trail":       "Trail",
  "marcha":      "Marcha Atlética",
  "todos":       "Todas",
};

const ROLE_LABEL = {
  admin:       "Admin",
  coordenador: "Coordenador",
  arbitro:     "Árbitro",
};

export default function ArbitrosVisaoAdmin() {
  const [referees, setReferees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos"); // todos | ativo | inativo | suspenso

  useEffect(() => {
    refereesAPI.list().then(r => {
      if (r.data) setReferees(r.data);
      setLoading(false);
    });
  }, []);

  const filtered = filter === "todos" ? referees : referees.filter(r => r.status === filter);

  const totals = {
    total: referees.length,
    ativos: referees.filter(r => r.status === "ativo").length,
    inativos: referees.filter(r => r.status === "inativo").length,
    suspensos: referees.filter(r => r.status === "suspenso").length,
  };

  const columns = [
    { key: "name", label: "Nome", wrap: true },
    { key: "email", label: "E-mail",
      render: (v) => <span style={{ fontSize: 12, color: COLORS.gray }}>{v}</span>,
    },
    { key: "phone", label: "Telefone",
      render: (v) => v || "—",
    },
    { key: "category", label: "Categoria",
      render: (v) => CATEGORY_LABEL[v] || v || "—",
    },
    { key: "city", label: "Cidade",
      render: (v) => v || "—",
    },
    { key: "role", label: "Função",
      render: (v) => <Badge label={ROLE_LABEL[v] || v}
        bg={v === "admin" ? "#dbeafe" : v === "coordenador" ? "#fef3c7" : "#f5f5f5"}
        color={v === "admin" ? "#1e40af" : v === "coordenador" ? "#92400e" : "#6b7280"} />,
    },
    { key: "status", label: "Status",
      render: (v) => {
        const s = STATUS_BADGE[v] || STATUS_BADGE.inativo;
        return <Badge label={s.label} bg={s.bg} color={s.color} />;
      },
    },
  ];

  return (
    <AdminLayout minLevel="admin">
      <div style={{ padding: 40 }}>
        <PageHeader
          title="Árbitros"
          subtitle="Visão geral do quadro de arbitragem"
        />

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

        <Table columns={columns} rows={filtered} loading={loading} emptyMessage="Nenhum árbitro encontrado." />

        <div style={{ marginTop: 20, fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
          Para gestão completa (escalar, editar, cadastrar árbitros), acesse a <a href="/intranet" style={{ color: COLORS.primary }}>Intranet</a>.
        </div>
      </div>
    </AdminLayout>
  );
}
