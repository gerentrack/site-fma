import { Component } from "react";
import { COLORS, FONTS } from "../styles/colors";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Em produção, aqui poderia enviar para um serviço de monitoramento
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#f8f9fa", padding: 40, fontFamily: FONTS.body,
      }}>
        <div style={{
          background: "#fff", borderRadius: 16, padding: "48px 40px", maxWidth: 480,
          textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", background: "#fef2f2",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px", fontSize: 28, color: COLORS.primary,
          }}>!</div>
          <h1 style={{
            fontFamily: FONTS.heading, fontSize: 22, fontWeight: 800,
            color: COLORS.dark, margin: "0 0 12px", textTransform: "uppercase",
          }}>Algo deu errado</h1>
          <p style={{ fontSize: 14, color: COLORS.gray, margin: "0 0 28px", lineHeight: 1.6 }}>
            Ocorreu um erro inesperado. Tente recarregar a pagina.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 32px", borderRadius: 8, border: "none",
              background: COLORS.primary, color: "#fff", cursor: "pointer",
              fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700,
            }}
          >Recarregar pagina</button>
        </div>
      </div>
    );
  }
}
