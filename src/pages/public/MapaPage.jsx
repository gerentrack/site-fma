/**
 * MapaPage.jsx — Mapa interativo FMA
 * Abas: Eventos · Equipes Filiadas · Pistas Homologadas
 * Usa react-leaflet + OpenStreetMap (gratuito, sem API key)
 */
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";

// Coordenadas de cidades de MG (fallback quando não há lat/lng no dado)
const CIDADES_MG = {
  "Belo Horizonte":        { lat: -19.9167, lng: -43.9345 },
  "Uberlândia":            { lat: -18.9186, lng: -48.2772 },
  "Contagem":              { lat: -19.9317, lng: -44.0536 },
  "Juiz de Fora":          { lat: -21.7642, lng: -43.3503 },
  "Betim":                 { lat: -19.9678, lng: -44.1983 },
  "Montes Claros":         { lat: -16.7286, lng: -43.8619 },
  "Uberaba":               { lat: -19.7475, lng: -47.9315 },
  "Governador Valadares":  { lat: -18.8511, lng: -41.9494 },
  "Ipatinga":              { lat: -19.4594, lng: -42.5367 },
  "Sete Lagoas":           { lat: -19.4658, lng: -44.2481 },
  "Divinópolis":           { lat: -20.1386, lng: -44.8853 },
  "Poços de Caldas":       { lat: -21.7869, lng: -46.5618 },
  "Varginha":              { lat: -21.5515, lng: -45.4303 },
  "Ribeirão das Neves":    { lat: -19.7692, lng: -44.0853 },
  "Ouro Preto":            { lat: -20.3855, lng: -43.5031 },
  "Coronel Fabriciano":    { lat: -19.5208, lng: -42.6278 },
  "Itabira":               { lat: -19.6203, lng: -43.2267 },
  "Patos de Minas":        { lat: -18.5789, lng: -46.5178 },
  "Ibituruna":             { lat: -21.1528, lng: -44.7497 },
  "Ponte Nova":            { lat: -20.4153, lng: -42.9028 },
};

function coordsFromCidade(cidade) {
  if (!cidade) return null;
  const exact = CIDADES_MG[cidade];
  if (exact) return exact;
  const key = Object.keys(CIDADES_MG).find(k => cidade.toLowerCase().includes(k.toLowerCase()));
  return key ? CIDADES_MG[key] : null;
}

const TABS = [
  { id: "eventos",   label: "Eventos",           icon: "🏃" },
  { id: "equipes",   label: "Equipes Filiadas",  icon: "🏟️" },
  { id: "pistas",    label: "Pistas Homologadas", icon: "🔵" },
];

const CATEGORY_COLORS = {
  corrida:     "#cc0000",
  pista:       "#0066cc",
  trail:       "#007733",
  marcha:      "#884400",
  default:     "#6b7280",
};

export default function MapaPage() {
  const [activeTab, setActiveTab]     = useState("eventos");
  const [eventos, setEventos]         = useState([]);
  const [equipes, setEquipes]         = useState([]);
  const [pistas, setPistas]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const mapRef    = useRef(null);
  const mapObjRef = useRef(null);
  const markersRef = useRef([]);

  // Dynamic import of Leaflet
  useEffect(() => {
    Promise.all([
      import("leaflet"),
      import("leaflet/dist/leaflet.css"),
    ]).then(([L]) => {
      window._L = L.default || L;
      // Fix default icon path issue with bundlers
      delete window._L.Icon.Default.prototype._getIconUrl;
      window._L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      setLeafletReady(true);
    }).catch(() => setLeafletReady(false));
  }, []);

  // Load data
  useEffect(() => {
    setLoading(true);
    (async () => {
      const { calendarAPI, equipesAPI, pistasHomologadasAPI } = await import("../../data/api");
      const [evR, eqR, piR] = await Promise.all([
        calendarAPI.list({ published: true }),
        equipesAPI.list({ published: true }),
        pistasHomologadasAPI ? pistasHomologadasAPI.list({}) : Promise.resolve({ data: [] }),
      ]);
      setEventos((evR.data || []).filter(e => coordsFromCidade(e.city) || (e.lat && e.lng)));
      setEquipes((eqR.data || []).filter(e => coordsFromCidade(e.cidade) || (e.lat && e.lng)));
      setPistas((piR.data || []).filter(p => p.lat && p.lng));
      setLoading(false);
    })();
  }, []);

  // Init/update map
  useEffect(() => {
    if (!leafletReady || !mapRef.current || loading) return;
    const L = window._L;

    if (!mapObjRef.current) {
      mapObjRef.current = L.map(mapRef.current, {
        center: [-19.5, -44.5],
        zoom: 7,
        zoomControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(mapObjRef.current);
    }

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const items = activeTab === "eventos" ? eventos
                : activeTab === "equipes" ? equipes
                : pistas;

    items.forEach(item => {
      let coords;
      if (item.lat && item.lng) {
        coords = { lat: item.lat, lng: item.lng };
      } else if (activeTab === "eventos") {
        coords = coordsFromCidade(item.city);
      } else if (activeTab === "equipes") {
        coords = coordsFromCidade(item.cidade);
      }
      if (!coords) return;

      // Custom colored icon
      const color = activeTab === "eventos"
        ? (CATEGORY_COLORS[item.category] || CATEGORY_COLORS.default)
        : activeTab === "equipes" ? "#0066cc"
        : "#cc0000";

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:28px;height:28px;border-radius:50% 50% 50% 0;
          background:${color};border:3px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,0.35);
          transform:rotate(-45deg);
          cursor:pointer;
        "></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -30],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon });

      // Build popup content
      let popupHtml = "";
      if (activeTab === "eventos") {
        const dataFmt = item.date ? new Date(item.date + "T12:00:00").toLocaleDateString("pt-BR") : "";
        popupHtml = `
          <div style="font-family:sans-serif;min-width:180px;">
            <div style="font-weight:700;font-size:14px;color:#111;margin-bottom:4px;">${item.title}</div>
            <div style="font-size:12px;color:#555;">📍 ${item.city}${item.location ? ` — ${item.location}` : ""}</div>
            ${dataFmt ? `<div style="font-size:12px;color:#555;">📅 ${dataFmt}</div>` : ""}
            ${item.category ? `<div style="font-size:11px;color:${color};font-weight:600;margin-top:4px;text-transform:uppercase">${item.category}</div>` : ""}
          </div>`;
      } else if (activeTab === "equipes") {
        popupHtml = `
          <div style="font-family:sans-serif;min-width:160px;">
            <div style="font-weight:700;font-size:14px;color:#111;margin-bottom:4px;">${item.title}</div>
            <div style="font-size:12px;color:#555;">📍 ${item.cidade}</div>
            ${item.fundacao ? `<div style="font-size:12px;color:#555;">📅 Desde ${item.fundacao}</div>` : ""}
          </div>`;
      } else {
        popupHtml = `
          <div style="font-family:sans-serif;min-width:180px;">
            <div style="font-weight:700;font-size:14px;color:#111;margin-bottom:4px;">${item.nome}</div>
            <div style="font-size:12px;color:#555;">📍 ${item.cidade}</div>
            ${item.comprimento ? `<div style="font-size:12px;color:#555;">📏 ${item.comprimento}m</div>` : ""}
            ${item.tipo ? `<div style="font-size:11px;color:#cc0000;font-weight:600;margin-top:4px;text-transform:uppercase">${item.tipo}</div>` : ""}
          </div>`;
      }

      marker.bindPopup(popupHtml, { maxWidth: 260 });
      marker.on("click", () => setSelected(item));
      marker.addTo(mapObjRef.current);
      markersRef.current.push(marker);
    });

    // Fit bounds if markers exist
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapObjRef.current.fitBounds(group.getBounds().pad(0.15));
    }
  }, [leafletReady, loading, activeTab, eventos, equipes, pistas]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapObjRef.current) {
        mapObjRef.current.remove();
        mapObjRef.current = null;
      }
    };
  }, []);

  const activeItems = activeTab === "eventos" ? eventos
                    : activeTab === "equipes" ? equipes
                    : pistas;

  return (
    <div style={{ fontFamily: FONTS.body, background: "#f5f5f5", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: COLORS.primary, padding: "32px 24px 0", color: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <Link to="/" style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, textDecoration: "none" }}>Home</Link>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>›</span>
            <span style={{ color: "#fff", fontSize: 13 }}>Mapa FMA</span>
          </div>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 32, fontWeight: 800, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>
            🗺️ Mapa FMA
          </h1>
          <p style={{ margin: "0 0 0", opacity: 0.85, fontSize: 15 }}>
            Eventos, equipes filiadas e pistas de atletismo em Minas Gerais
          </p>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 20 }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelected(null); }}
                style={{
                  padding: "10px 22px", border: "none", cursor: "pointer",
                  fontFamily: FONTS.heading, fontWeight: 700, fontSize: 14,
                  letterSpacing: 0.5, textTransform: "uppercase",
                  borderRadius: "8px 8px 0 0",
                  background: activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.15)",
                  color: activeTab === tab.id ? COLORS.primary : "#fff",
                  transition: "all 0.2s",
                }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 40px" }}>
        <div style={{ background: "#fff", borderRadius: "0 8px 8px 8px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", overflow: "hidden" }}>

          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: COLORS.gray }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 16 }}>Carregando dados do mapa…</div>
            </div>
          ) : !leafletReady ? (
            <div style={{ padding: 60, textAlign: "center", color: COLORS.gray }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 16 }}>Mapa não disponível.</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>Instale a dependência: <code>npm install leaflet</code></div>
            </div>
          ) : (
            <div style={{ display: "flex", height: 580 }}>

              {/* Sidebar */}
              <div style={{ width: 280, borderRight: `1px solid ${COLORS.grayLight}`, overflowY: "auto", flexShrink: 0 }}>
                <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.grayLight}`, background: "#fafafa" }}>
                  <span style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, color: COLORS.dark, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {activeItems.length} {activeTab === "eventos" ? "evento(s)" : activeTab === "equipes" ? "equipe(s)" : "pista(s)"}
                  </span>
                </div>
                {activeItems.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: COLORS.gray, fontSize: 13 }}>
                    Nenhum item encontrado.
                  </div>
                ) : activeItems.map((item, i) => {
                  const name = item.title || item.nome || "—";
                  const sub  = activeTab === "eventos" ? item.city
                              : activeTab === "equipes" ? item.cidade
                              : item.cidade;
                  const isSelected = selected?.id === item.id;
                  const color = activeTab === "eventos"
                    ? (CATEGORY_COLORS[item.category] || CATEGORY_COLORS.default)
                    : activeTab === "equipes" ? "#0066cc"
                    : "#cc0000";
                  return (
                    <div key={item.id || i}
                      onClick={() => {
                        setSelected(item);
                        const coords = item.lat && item.lng
                          ? { lat: item.lat, lng: item.lng }
                          : coordsFromCidade(activeTab === "equipes" ? item.cidade : item.city);
                        if (coords && mapObjRef.current) {
                          mapObjRef.current.setView([coords.lat, coords.lng], 12, { animate: true });
                          // Open popup for matching marker
                          markersRef.current.forEach(m => {
                            const ml = m.getLatLng();
                            if (Math.abs(ml.lat - coords.lat) < 0.01 && Math.abs(ml.lng - coords.lng) < 0.01) {
                              m.openPopup();
                            }
                          });
                        }
                      }}
                      style={{
                        padding: "12px 16px", cursor: "pointer", borderBottom: `1px solid ${COLORS.grayLight}`,
                        background: isSelected ? `${color}10` : "#fff",
                        borderLeft: isSelected ? `3px solid ${color}` : "3px solid transparent",
                        transition: "all 0.15s",
                      }}>
                      <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, color: COLORS.dark, lineHeight: 1.3, marginBottom: 3 }}>{name}</div>
                      <div style={{ fontSize: 11, color: COLORS.gray }}>📍 {sub}</div>
                      {activeTab === "eventos" && item.date && (
                        <div style={{ fontSize: 11, color: COLORS.gray }}>
                          📅 {new Date(item.date + "T12:00:00").toLocaleDateString("pt-BR")}
                        </div>
                      )}
                      {activeTab === "pistas" && item.comprimento && (
                        <div style={{ fontSize: 11, color: COLORS.gray }}>📏 {item.comprimento}m</div>
                      )}
                      {activeTab === "eventos" && item.category && (
                        <span style={{ display: "inline-block", marginTop: 4, padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase", background: color, color: "#fff" }}>
                          {item.category}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Map */}
              <div ref={mapRef} style={{ flex: 1, background: "#e5e3df" }} />
            </div>
          )}

          {/* Legend */}
          {!loading && leafletReady && (
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${COLORS.grayLight}`, background: "#fafafa", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 11, color: COLORS.gray, textTransform: "uppercase", letterSpacing: 0.5 }}>Legenda:</span>
              {activeTab === "eventos" && Object.entries(CATEGORY_COLORS).filter(([k]) => k !== "default").map(([cat, color]) => (
                <span key={cat} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.dark }}>
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: color, display: "inline-block" }} />
                  {cat === "corrida" ? "Corrida de Rua" : cat === "pista" ? "Pista e Campo" : cat === "trail" ? "Trail Run" : "Marcha Atlética"}
                </span>
              ))}
              {activeTab === "equipes" && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.dark }}>
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#0066cc", display: "inline-block" }} />
                  Equipe filiada
                </span>
              )}
              {activeTab === "pistas" && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.dark }}>
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#cc0000", display: "inline-block" }} />
                  Pista homologada FMA
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
