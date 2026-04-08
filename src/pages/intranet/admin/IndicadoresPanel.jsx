/**
 * IndicadoresPanel.jsx — Painel de indicadores da coordenação.
 * Rota: /intranet/admin/indicadores
 */
import { useState, useEffect } from "react";
import IntranetLayout from "../IntranetLayout";
import { RefereesService, RefereeAssignmentsService, RefereeEventsService, RefereeAvailabilityService, AnuidadesService } from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderTop: `3px solid ${color}` }}>
      <div style={{ fontFamily: FONTS.heading, fontSize: 28, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function BarChart({ data, label }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, marginBottom: 12 }}>{label}</div>
      {data.map(d => (
        <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, width: 80, textAlign: "right" }}>{d.label}</span>
          <div style={{ flex: 1, background: COLORS.offWhite, borderRadius: 4, height: 20 }}>
            <div style={{ width: `${(d.value / max) * 100}%`, background: d.color || COLORS.primary, borderRadius: 4, height: 20, minWidth: d.value > 0 ? 20 : 0, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{d.value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function IndicadoresPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const ano = new Date().getFullYear();

  useEffect(() => {
    const fetch = async () => {
      const [rRes, asgRes, evRes, anRes] = await Promise.all([
        RefereesService.list(),
        RefereeAssignmentsService.list(),
        RefereeEventsService.list(),
        AnuidadesService.list({ ano }),
      ]);
      const refs = rRes.data || [];
      const asgs = asgRes.data || [];
      const evts = evRes.data || [];
      const anuidades = anRes.data || [];

      const ativos = refs.filter(r => r.status === "ativo");
      const porNivel = { A: 0, B: 0, C: 0, NI: 0 };
      ativos.forEach(r => { if (porNivel[r.nivel] !== undefined) porNivel[r.nivel]++; });

      const today = new Date().toISOString().slice(0, 10);
      const escalacoesFuturas = asgs.filter(a => a.event?.date >= today).length;
      const escalacoesPast = asgs.filter(a => a.event?.date < today).length;
      const eventosFuturos = evts.filter(e => e.date >= today).length;

      // Escalações por mês (últimos 6 meses)
      const porMes = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const m = d.getMonth();
        const y = d.getFullYear();
        const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
        const count = asgs.filter(a => {
          if (!a.event?.date) return false;
          const ed = new Date(a.event.date + "T12:00:00");
          return ed.getMonth() === m && ed.getFullYear() === y;
        }).length;
        porMes.push({ label: `${label}/${y}`, value: count, color: "#0066cc" });
      }

      // Anuidades
      const anuidPago = anuidades.filter(a => a.status === "pago").length;
      const anuidPendente = anuidades.filter(a => a.status === "pendente" || a.status === "vencido").length;
      const anuidIsento = anuidades.filter(a => a.status === "isento").length;

      setStats({
        total: refs.length, ativos: ativos.length,
        inativos: refs.filter(r => r.status === "inativo").length,
        suspensos: refs.filter(r => r.status === "suspenso").length,
        porNivel, escalacoesFuturas, escalacoesPast, eventosFuturos,
        porMes, anuidPago, anuidPendente, anuidIsento,
        perfilCompleto: refs.filter(r => r.profileComplete).length,
        perfilIncompleto: refs.filter(r => !r.profileComplete).length,
      });
      setLoading(false);
    };
    fetch();
  }, []);

  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 20 };

  return (
    <IntranetLayout requireRole="canManage">
      <div style={{ padding: 36 }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>
          Indicadores
        </h1>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 28px" }}>Visao geral da arbitragem.</p>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.gray }}>Carregando...</div>
        ) : stats && (
          <>
            {/* Resumo geral */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
              <StatCard label="Total de arbitros" value={stats.total} color={COLORS.dark} />
              <StatCard label="Ativos" value={stats.ativos} color="#007733" />
              <StatCard label="Inativos" value={stats.inativos} color="#6b7280" />
              <StatCard label="Suspensos" value={stats.suspensos} color="#dc2626" />
              <StatCard label="Perfil completo" value={stats.perfilCompleto} color="#0066cc" />
              <StatCard label="Perfil incompleto" value={stats.perfilIncompleto} color="#d97706" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Por nível */}
              <div style={card}>
                <BarChart label="Arbitros por Nivel" data={[
                  { label: "Nivel A", value: stats.porNivel.A, color: "#cc0000" },
                  { label: "Nivel B", value: stats.porNivel.B, color: "#0066cc" },
                  { label: "Nivel C", value: stats.porNivel.C, color: "#007733" },
                  { label: "NI", value: stats.porNivel.NI, color: "#6b7280" },
                ]} />
              </div>

              {/* Anuidades */}
              <div style={card}>
                <BarChart label={`Anuidades ${ano}`} data={[
                  { label: "Pagas", value: stats.anuidPago, color: "#15803d" },
                  { label: "Pendentes", value: stats.anuidPendente, color: "#d97706" },
                  { label: "Isentas", value: stats.anuidIsento, color: "#6b7280" },
                ]} />
              </div>

              {/* Escalações por mês */}
              <div style={{ ...card, gridColumn: "1 / -1" }}>
                <BarChart label="Escalacoes por Mes (ultimos 6 meses)" data={stats.porMes} />
              </div>
            </div>

            {/* Escalações resumo */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14 }}>
              <StatCard label="Escalacoes futuras" value={stats.escalacoesFuturas} color="#0066cc" />
              <StatCard label="Escalacoes realizadas" value={stats.escalacoesPast} color="#007733" />
              <StatCard label="Eventos futuros" value={stats.eventosFuturos} color="#884400" />
            </div>
          </>
        )}
      </div>
    </IntranetLayout>
  );
}
