/**
 * CalendarioEscalas.jsx — Calendário visual mensal das escalas do árbitro.
 * Rota: /intranet/calendario
 */
import { useState, useEffect } from "react";
import IntranetLayout from "../IntranetLayout";
import { useIntranet } from "../../../context/IntranetContext";
import { RefereeAssignmentsService } from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";
import { REFEREE_FUNCTIONS } from "../../../config/navigation";

const fnMap = Object.fromEntries((REFEREE_FUNCTIONS || []).map(f => [f.value, f.label]));
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const MESES = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarioEscalas() {
  const { refereeId } = useIntranet();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    RefereeAssignmentsService.getByReferee(refereeId).then(r => {
      setAssignments(r.data || []);
      setLoading(false);
    });
  }, [refereeId]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Map de escalas por dia
  const byDay = {};
  assignments.forEach(a => {
    if (!a.event?.date) return;
    const d = a.event.date; // "YYYY-MM-DD"
    const [y, m] = d.split("-").map(Number);
    if (y === year && m - 1 === month) {
      const day = Number(d.split("-")[2]);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(a);
    }
  });

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const next = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <IntranetLayout>
      <div style={{ padding: 36, maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 24px" }}>
          Calendario de Escalas
        </h1>

        {/* Nav mês */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <button onClick={prev} style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "transparent", cursor: "pointer", fontSize: 14 }}>&#8249;</button>
          <span style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 800, color: COLORS.dark }}>{MESES[month]} {year}</span>
          <button onClick={next} style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "transparent", cursor: "pointer", fontSize: 14 }}>&#8250;</button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.gray }}>Carregando...</div>
        ) : (
          <>
            {/* Grid do calendário */}
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              {/* Header dias */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: `1px solid ${COLORS.grayLight}` }}>
                {DIAS_SEMANA.map(d => (
                  <div key={d} style={{ padding: "10px 4px", textAlign: "center", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, color: COLORS.gray, textTransform: "uppercase" }}>{d}</div>
                ))}
              </div>
              {/* Dias */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} style={{ minHeight: 70 }} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isToday = dateStr === todayStr;
                  const hasEscala = byDay[day] && byDay[day].length > 0;
                  return (
                    <div key={day}
                      onClick={() => hasEscala ? setSelected(byDay[day]) : setSelected(null)}
                      style={{
                        minHeight: 70, padding: 6, borderRight: `1px solid ${COLORS.grayLight}`, borderBottom: `1px solid ${COLORS.grayLight}`,
                        background: isToday ? `${COLORS.primary}08` : "transparent",
                        cursor: hasEscala ? "pointer" : "default",
                      }}>
                      <div style={{
                        fontFamily: FONTS.heading, fontSize: 13, fontWeight: isToday ? 900 : 500,
                        color: isToday ? COLORS.primary : COLORS.dark,
                        marginBottom: 4,
                      }}>{day}</div>
                      {hasEscala && byDay[day].map((a, idx) => (
                        <div key={idx} style={{
                          padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700,
                          background: `${COLORS.primary}15`, color: COLORS.primary,
                          marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          fontFamily: FONTS.heading,
                        }}>
                          {a.event?.title?.slice(0, 18)}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detalhe selecionado */}
            {selected && (
              <div style={{ marginTop: 20, background: "#fff", borderRadius: 12, padding: "18px 22px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, color: COLORS.dark, margin: 0, textTransform: "uppercase" }}>Detalhes do dia</h3>
                  <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.gray, fontSize: 18 }}>X</button>
                </div>
                {selected.map(a => (
                  <div key={a.id} style={{ padding: "10px 0", borderBottom: `1px solid ${COLORS.grayLight}` }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.dark }}>{a.event?.title}</div>
                    <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
                      {a.event?.city} {a.event?.time && `• ${a.event.time}`} — Funcao: {fnMap[a.refereeFunction] || a.refereeFunction}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </IntranetLayout>
  );
}
