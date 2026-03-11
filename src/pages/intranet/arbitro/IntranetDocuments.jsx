/**
 * IntranetDocuments.jsx — Documentos e comunicados visíveis na intranet.
 * Rota: /intranet/documentos
 * Reutiliza o conteúdo público de árbitros (categoria documento/comunicado/formulario)
 * filtrado — sem precisar de um segundo banco de dados.
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import IntranetLayout from "../IntranetLayout";
import { RefereeContentService } from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";
import { REFEREE_CONTENT_CATEGORIES } from "../../../config/navigation";

const catMap = Object.fromEntries(REFEREE_CONTENT_CATEGORIES.filter(c => c.value).map(c => [c.value, c]));
const DOC_CATS = ["formulario", "documento", "comunicado", "material"];

export default function IntranetDocuments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    RefereeContentService.list({ publishedOnly: true }).then(r => {
      if (r.data) setItems(r.data.filter(i => DOC_CATS.includes(i.category)));
      setLoading(false);
    });
  }, []);

  const filtered = activeTab ? items.filter(i => i.category === activeTab) : items;

  return (
    <IntranetLayout>
      <div style={{ padding: 36 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>📄 Documentos e Comunicados</h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: 0 }}>Formulários, regulamentos, comunicados e materiais de referência para árbitros.</p>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          <button onClick={() => setActiveTab("")}
            style={{ padding: "7px 16px", borderRadius: 20, border: `2px solid ${!activeTab ? COLORS.primary : COLORS.grayLight}`, background: !activeTab ? COLORS.primary : "#fff", color: !activeTab ? "#fff" : COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
            📋 Todos ({items.length})
          </button>
          {DOC_CATS.map(cat => {
            const c = catMap[cat];
            const count = items.filter(i => i.category === cat).length;
            if (!c || !count) return null;
            return (
              <button key={cat} onClick={() => setActiveTab(activeTab === cat ? "" : cat)}
                style={{ padding: "7px 16px", borderRadius: 20, border: `2px solid ${activeTab === cat ? c.color : COLORS.grayLight}`, background: activeTab === cat ? c.color : "#fff", color: activeTab === cat ? "#fff" : COLORS.gray, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
                {c.icon} {c.label} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: COLORS.gray, fontFamily: FONTS.body }}>⏳ Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🗂️</div>
            <p style={{ fontFamily: FONTS.body, color: COLORS.gray }}>Nenhum documento disponível no momento.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(item => {
              const cat = catMap[item.category] || { color: COLORS.gray, icon: "📋" };
              return (
                <div key={item.id} style={{ background: "#fff", borderRadius: 10, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 14, borderLeft: `3px solid ${cat.color}` }}>
                  <div style={{ fontSize: 20, flexShrink: 0 }}>{cat.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, color: COLORS.dark }}>{item.title}</div>
                    {item.summary && <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 2 }}>{item.summary}</div>}
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, fontFamily: FONTS.heading, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: `${cat.color}15`, color: cat.color }}>{cat.label}</span>
                      {item.publishedAt && <span style={{ fontSize: 10, fontFamily: FONTS.body, color: COLORS.gray }}>{new Date(item.publishedAt + "T12:00:00").toLocaleDateString("pt-BR")}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {item.fileUrl && (
                      <a href={item.fileUrl} target="_blank" rel="noreferrer"
                        style={{ padding: "8px 14px", borderRadius: 7, background: COLORS.primary, color: "#fff", textDecoration: "none", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
                        📎 Baixar
                      </a>
                    )}
                    {item.externalLink && (
                      <a href={item.externalLink} target="_blank" rel="noreferrer"
                        style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, color: COLORS.dark, textDecoration: "none", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
                        🔗 Link
                      </a>
                    )}
                    <Link to={`/arbitros/conteudo/${item.id}`} target="_blank"
                      style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${COLORS.grayLight}`, color: COLORS.dark, textDecoration: "none", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
                      Ver →
                    </Link>
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
