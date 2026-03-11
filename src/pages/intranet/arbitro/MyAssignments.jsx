/**
 * MyAssignments.jsx — Minhas escalas (visão do árbitro).
 * Rota: /intranet/escalas
 */
import { useState, useEffect } from "react";
import IntranetLayout from "../IntranetLayout";
import { useIntranet } from "../../../context/IntranetContext";
import { RefereeAssignmentsService } from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";
import { CALENDAR_CATEGORIES, REFEREE_FUNCTIONS } from "../../../config/navigation";

const catMap = Object.fromEntries((CALENDAR_CATEGORIES || []).filter(c => c.value).map(c => [c.value, c]));
const fnMap = Object.fromEntries((REFEREE_FUNCTIONS || []).map(f => [f.value, f.label]));

const STATUS_STYLE = {
  confirmado: { bg: "#e6f9ee", color: "#007733", label: "Confirmado" },
  pendente:   { bg: "#fff7ed", color: "#884400", label: "Pendente" },
  cancelado:  { bg: "#fff5f5", color: "#cc0000", label: "Cancelado" },
};

export default function MyAssignments() {
  const { refereeId } = useIntranet();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    RefereeAssignmentsService.getByReferee(refereeId).then(r => {
      if (r.data) setAssignments(r.data);
      setLoading(false);
    });
  }, [refereeId]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = assignments.filter(a => a.event?.date >= today);
  const past = assignments.filter(a => a.event?.date < today);
  const list = showPast ? past : upcoming;

  return (
    <IntranetLayout>
      <div style={{ padding: 36 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>📋 Minhas Escalas</h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: 0 }}>Provas em que você foi escalado pela coordenação da FMA.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[
            { key: false, label: `Próximas (${upcoming.length})` },
            { key: true,  label: `Histórico (${past.length})` },
          ].map(t => (
            <button key={String(t.key)} onClick={() => setShowPast(t.key)}
              style={{ padding: "8px 20px", borderRadius: 20, border: `2px solid ${showPast === t.key ? COLORS.primary : COLORS.grayLight}`, background: showPast === t.key ? COLORS.primary : "#fff", color: showPast === t.key ? "#fff" : COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: COLORS.gray, fontFamily: FONTS.body }}>⏳ Carregando...</div>
        ) : list.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>📋</div>
            <p style={{ fontFamily: FONTS.body, color: COLORS.gray }}>
              {showPast ? "Sem histórico de escalas." : "Você não tem escalas futuras no momento."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {list.map(asgn => {
              const evt = asgn.event;
              if (!evt) return null;
              const cat = catMap[evt.category] || { color: COLORS.gray, icon: "📅", label: evt.category };
              const statusStyle = STATUS_STYLE[asgn.status] || STATUS_STYLE.pendente;
              return (
                <div key={asgn.id} style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", borderLeft: `4px solid ${statusStyle.color}` }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 52, flexShrink: 0, textAlign: "center", background: `${cat.color}12`, borderRadius: 8, padding: "8px 4px" }}>
                      <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: cat.color, lineHeight: 1 }}>{new Date(evt.date + "T12:00:00").getDate()}</div>
                      <div style={{ fontFamily: FONTS.heading, fontSize: 9, fontWeight: 700, color: cat.color, textTransform: "uppercase" }}>{new Date(evt.date + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" })}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 9, fontFamily: FONTS.heading, fontWeight: 700, background: `${cat.color}15`, color: cat.color }}>{cat.icon} {cat.label}</span>
                        <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 9, fontFamily: FONTS.heading, fontWeight: 700, background: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</span>
                      </div>
                      <div style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.dark }}>{evt.title}</div>
                      <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 4 }}>
                        📍 {evt.city}{evt.location ? ` — ${evt.location}` : ""}{evt.time ? ` • ${evt.time}` : ""}
                      </div>
                      <div style={{ fontFamily: FONTS.heading, fontSize: 13, color: COLORS.primary, marginTop: 8, background: `${COLORS.primary}10`, display: "inline-block", padding: "4px 12px", borderRadius: 20 }}>
                        ⚖️ Função: {fnMap[asgn.refereeFunction] || asgn.refereeFunction}
                      </div>
                      {asgn.notes && <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 6, fontStyle: "italic" }}>Obs: {asgn.notes}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </IntranetLayout>
  );
}
