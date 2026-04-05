/**
 * CookieBanner.jsx — Banner de consentimento de cookies (LGPD Art. 7, 8).
 * Exibido na primeira visita. Preferência salva em localStorage.
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";

const STORAGE_KEY = "fma_cookie_consent";

export function getCookieConsent() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getCookieConsent();
    if (!consent) setVisible(true);
  }, []);

  const respond = (value) => {
    try { localStorage.setItem(STORAGE_KEY, value); } catch {}
    setVisible(false);
    if (value === "accepted") window.location.reload();
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 99999,
      background: "rgba(26,26,26,0.97)", backdropFilter: "blur(8px)",
      borderTop: `3px solid ${COLORS.primary}`,
      padding: "20px 24px", boxShadow: "0 -4px 24px rgba(0,0,0,0.3)",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Privacidade e Cookies
          </div>
          <p style={{ fontFamily: FONTS.body, fontSize: 13, color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.6 }}>
            Utilizamos cookies e tecnologias semelhantes para melhorar sua experiência e analisar o uso do site.
            Ao aceitar, você concorda com o uso de cookies conforme nossa{" "}
            <Link to="/privacidade" style={{ color: COLORS.primaryLight, textDecoration: "underline" }}>
              Política de Privacidade
            </Link>.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={() => respond("rejected")}
            style={{
              padding: "10px 22px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.3)", background: "transparent",
              color: "rgba(255,255,255,0.7)", fontFamily: FONTS.heading, fontSize: 13,
              fontWeight: 700, cursor: "pointer",
            }}>
            Rejeitar
          </button>
          <button onClick={() => respond("accepted")}
            style={{
              padding: "10px 22px", borderRadius: 8,
              border: "none", background: COLORS.primary, color: "#fff",
              fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
            Aceitar cookies
          </button>
        </div>
      </div>
    </div>
  );
}
