import { COLORS, FONTS } from "../../styles/colors";

/**
 * Banner de aviso de expiração de sessão.
 * Aparece no topo da tela quando o timeout está próximo.
 */
export default function SessionWarning({ secondsLeft, onDismiss }) {
  if (secondsLeft <= 0) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = minutes > 0
    ? `${minutes}min ${seconds.toString().padStart(2, "0")}s`
    : `${seconds}s`;

  const urgent = secondsLeft <= 60;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
      background: urgent ? "#dc2626" : "#f59e0b",
      color: urgent ? "#fff" : "#1a1a1a",
      padding: "10px 24px",
      display: "flex", justifyContent: "center", alignItems: "center", gap: 16,
      fontFamily: FONTS.body, fontSize: 13, fontWeight: 500,
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      animation: urgent ? "pulse 1s infinite" : "none",
    }}>
      <span>
        Sua sessão expira em <strong style={{ fontFamily: FONTS.heading, fontSize: 14 }}>{timeStr}</strong>
      </span>
      <button
        onClick={onDismiss}
        style={{
          padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer",
          background: urgent ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)",
          color: urgent ? "#fff" : "#1a1a1a",
          fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: 0.5,
        }}
      >
        Continuar
      </button>
    </div>
  );
}
