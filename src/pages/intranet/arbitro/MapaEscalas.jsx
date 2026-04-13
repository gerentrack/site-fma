/**
 * MapaEscalas.jsx — Mapa das próximas escalas do árbitro.
 * Rota: /intranet/mapa
 * Mostra no mapa os eventos em que o árbitro está escalado.
 */
import { useState, useEffect, useRef } from "react";
import IntranetLayout from "../IntranetLayout";
import { useIntranet } from "../../../context/IntranetContext";
import { RefereeAssignmentsService } from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";
import { CALENDAR_CATEGORIES, REFEREE_FUNCTIONS } from "../../../config/navigation";

const catMap = Object.fromEntries((CALENDAR_CATEGORIES || []).filter(c => c.value).map(c => [c.value, c]));
const fnMap = Object.fromEntries((REFEREE_FUNCTIONS || []).map(f => [f.value, f.label]));

export default function MapaEscalas() {
  const { refereeId } = useIntranet();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leafletReady, setLeafletReady] = useState(false);
  const [selected, setSelected] = useState(null);
  const mapRef = useRef(null);
  const mapObjRef = useRef(null);
  const markersRef = useRef([]);

  // Importar Leaflet dinamicamente
  useEffect(() => {
    Promise.all([
      import("leaflet"),
      import("leaflet/dist/leaflet.css"),
    ]).then(([L]) => {
      window._L = L.default || L;
      delete window._L.Icon.Default.prototype._getIconUrl;
      window._L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      setLeafletReady(true);
    }).catch(() => {});
  }, []);

  // Carregar dados
  useEffect(() => {
    if (!refereeId) return;
    RefereeAssignmentsService.getByReferee(refereeId).then(r => {
      const today = new Date().toISOString().slice(0, 10);
      const futuras = (r.data || []).filter(a => a.event?.date >= today);
      setAssignments(futuras);
      setLoading(false);
    });
  }, [refereeId]);

  // Coordenadas de cidades (importar de MapaPage seria ideal, mas inline para simplicidade)
  const coordsFromCidade = (cidade) => {
    if (!cidade) return null;
    // Usa a função global importada via MapaPage se disponível,
    // senão tenta geocoding básico de cidades MG conhecidas
    const CIDADES = {
      "Belo Horizonte": { lat: -19.9167, lng: -43.9345 },
      "Uberlândia": { lat: -18.9186, lng: -48.2772 },
      "Juiz de Fora": { lat: -21.7642, lng: -43.3503 },
      "Montes Claros": { lat: -16.7286, lng: -43.8619 },
      "Contagem": { lat: -19.9317, lng: -44.0536 },
      "Betim": { lat: -19.9678, lng: -44.1983 },
      "Uberaba": { lat: -19.7475, lng: -47.9315 },
      "Governador Valadares": { lat: -18.8511, lng: -41.9494 },
      "Ipatinga": { lat: -19.4594, lng: -42.5367 },
      "Sete Lagoas": { lat: -19.4658, lng: -44.2481 },
      "Divinópolis": { lat: -20.1386, lng: -44.8853 },
      "Poços de Caldas": { lat: -21.7869, lng: -46.5618 },
      "Pouso Alegre": { lat: -22.2300, lng: -45.9369 },
      "Varginha": { lat: -21.5515, lng: -45.4303 },
      "Lavras": { lat: -21.2453, lng: -45.0000 },
      "Ouro Preto": { lat: -20.3855, lng: -43.5031 },
      "Nova Lima": { lat: -19.9858, lng: -43.8467 },
      "Patos de Minas": { lat: -18.5789, lng: -46.5178 },
      "Araxá": { lat: -19.5932, lng: -46.9406 },
      "Itabira": { lat: -19.6203, lng: -43.2267 },
    };
    const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cn = norm(cidade);
    const exact = CIDADES[cidade];
    if (exact) return exact;
    const key = Object.keys(CIDADES).find(k => cn.includes(norm(k)) || norm(k).includes(cn));
    return key ? CIDADES[key] : null;
  };

  // Renderizar mapa
  useEffect(() => {
    if (!leafletReady || !mapRef.current || loading) return;
    const L = window._L;

    if (!mapObjRef.current) {
      mapObjRef.current = L.map(mapRef.current, { center: [-19.5, -44.5], zoom: 7, zoomControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(mapObjRef.current);
    }

    // Limpar markers antigos
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = [];
    assignments.forEach(asgn => {
      const evt = asgn.event;
      if (!evt) return;
      const coords = evt.lat && evt.lng ? { lat: evt.lat, lng: evt.lng } : coordsFromCidade(evt.city);
      if (!coords) return;

      const cat = catMap[evt.category] || { color: COLORS.gray };
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${cat.color};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(mapObjRef.current);
      marker.on("click", () => setSelected(asgn));
      markersRef.current.push(marker);
      bounds.push([coords.lat, coords.lng]);
    });

    if (bounds.length > 0) {
      mapObjRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [leafletReady, loading, assignments]);

  return (
    <IntranetLayout>
      <div style={{ padding: 36 }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>
          Mapa das Escalas
        </h1>
        <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: "0 0 20px" }}>
          Seus proximos eventos no mapa. Clique em um marcador para detalhes.
        </p>

        <div style={{ display: "flex", gap: 20 }}>
          {/* Mapa */}
          <div style={{ flex: 1, minHeight: 500 }}>
            <div ref={mapRef} style={{ width: "100%", height: 500, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.1)" }} />
          </div>

          {/* Detalhe do selecionado */}
          {selected && selected.event && (
            <div style={{ width: 280, background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", alignSelf: "flex-start" }}>
              <button onClick={() => setSelected(null)} style={{ float: "right", background: "none", border: "none", fontSize: 16, cursor: "pointer", color: COLORS.gray }}>✕</button>
              <div style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, color: COLORS.dark, marginBottom: 8 }}>
                {selected.event.title}
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginBottom: 4 }}>
                {new Date(selected.event.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginBottom: 8 }}>
                {selected.event.city}{selected.event.location ? ` — ${selected.event.location}` : ""}
              </div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: COLORS.primary, background: `${COLORS.primary}10`, display: "inline-block", padding: "4px 12px", borderRadius: 20, marginBottom: 8 }}>
                {fnMap[selected.refereeFunction] || selected.refereeFunction}
              </div>
              {selected.event.time && (
                <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>Horario: {selected.event.time}</div>
              )}
            </div>
          )}
        </div>

        {/* Lista abaixo do mapa */}
        {!loading && assignments.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: COLORS.gray, fontFamily: FONTS.body }}>
            Nenhuma escala futura para exibir no mapa.
          </div>
        )}
      </div>
    </IntranetLayout>
  );
}
