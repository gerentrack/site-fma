import { useNavigate } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";
import Button from "./Button";

/**
 * Cabeçalho padrão de páginas do admin.
 *
 * Uso:
 *   <PageHeader
 *     title="Notícias"
 *     subtitle="Gerencie as notícias publicadas no site."
 *     action={{ label: "+ Nova Notícia", onClick: () => navigate("/admin/noticias/novo") }}
 *     backTo="/admin"
 *   />
 *
 * action aceita: { label, onClick, loading?, variant? }
 * actions (array): [{ label, onClick, variant, loading }]
 */
export default function PageHeader({ title, subtitle, action, backTo, actions = [] }) {
  const navigate = useNavigate();

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 28,
      gap: 16,
      flexWrap: "wrap",
    }}>
      <div>
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            style={{
              background: "transparent", border: "none",
              cursor: "pointer", fontFamily: FONTS.body,
              fontSize: 13, color: COLORS.gray,
              marginBottom: 8, display: "flex", alignItems: "center", gap: 4,
              padding: 0,
            }}
          >
            ← Voltar
          </button>
        )}
        <h1 style={{
          fontFamily: FONTS.heading,
          fontSize: 26,
          fontWeight: 800,
          color: COLORS.dark,
          margin: 0,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}>{title}</h1>
        {subtitle && (
          <p style={{
            fontFamily: FONTS.body,
            fontSize: 14,
            color: COLORS.gray,
            margin: "6px 0 0",
          }}>{subtitle}</p>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {actions.map((a, i) => (
          <Button key={i} variant={a.variant || "ghost"} onClick={a.onClick} size="md" loading={a.loading || false}>
            {a.label}
          </Button>
        ))}
        {action && (
          <Button variant={action.variant || "primary"} onClick={action.onClick} size="md" loading={action.loading || false}>
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
