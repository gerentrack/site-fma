/**
 * OuvidoriaPage.jsx — Portal da Transparência: Ouvidoria FMA.
 *
 * Rota: /transparencia/ouvidoria
 *
 * Página institucional com informações de contato e canal de ouvidoria.
 * O conteúdo detalhado pode ser completado no admin como página institucional.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";

const ITENS = [
  {
    icon: "📧",
    titulo: "E-mail da Ouvidoria",
    descricao: "Para manifestações formais, sugestões ou denúncias.",
    acao: "mg@cbat.org.br",
    href: "mailto:mg@cbat.org.br",
    tipo: "email",
  },
  {
    icon: "📋",
    titulo: "Como funciona a Ouvidoria",
    descricao: "A Ouvidoria da FMA recebe manifestações de atletas, clubes, árbitros, organizadores e demais partes interessadas. Todas as mensagens são tratadas com sigilo e respondidas em até 10 dias úteis.",
    tipo: "info",
  },
  {
    icon: "🔒",
    titulo: "Sigilo e Proteção",
    descricao: "O nome do solicitante é mantido em sigilo. As informações são utilizadas exclusivamente para tratamento da manifestação e não são compartilhadas com terceiros.",
    tipo: "info",
  },
  {
    icon: "📌",
    titulo: "O que pode ser encaminhado",
    descricao: "Reclamações sobre condutas, sugestões de melhoria, denúncias de irregularidades, elogios, solicitações de informação e pedidos de acesso a documentos públicos.",
    tipo: "info",
  },
];

export default function OuvidoriaPage() {
  const [formData, setFormData] = useState({ nome: "", email: "", assunto: "", mensagem: "", anonimo: false });
  const [enviado, setEnviado] = useState(false);

  const handleChange = (field, value) => setFormData(f => ({ ...f, [field]: value }));

  const handleSubmit = () => {
    if (!formData.email || !formData.assunto || !formData.mensagem) {
      alert("Preencha os campos obrigatórios: e-mail, assunto e mensagem.");
      return;
    }
    // Simulação — em produção: POST para API
    setEnviado(true);
  };

  return (
    <>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 60%, #1a1a2e 100%)",
        padding: "52px 0 44px", marginBottom: 40,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 2,
            color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
            <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>FMA</Link>
            {" › "}
            <span style={{ color: "rgba(255,255,255,0.6)" }}>Portal da Transparência</span>
            {" › "}
            <span style={{ color: COLORS.primaryLight }}>Ouvidoria</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <span style={{ fontSize: 40 }}>📣</span>
            <h1 style={{ fontFamily: FONTS.heading,
              fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 900,
              color: "#fff", margin: 0, textTransform: "uppercase", letterSpacing: 2 }}>
              Ouvidoria
            </h1>
          </div>
          <p style={{ fontFamily: FONTS.body, fontSize: 15,
            color: "rgba(255,255,255,0.65)", margin: 0, maxWidth: 540 }}>
            Canal de comunicação direta entre a comunidade do atletismo mineiro e a Federação Mineira de Atletismo.
          </p>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 32px 72px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start" }}>

          {/* Informações */}
          <div>
            <h2 style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 800,
              textTransform: "uppercase", color: COLORS.dark,
              margin: "0 0 20px", letterSpacing: 0.5 }}>
              Canal da Ouvidoria
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {ITENS.map((item, i) => (
                <div key={i} style={{
                  padding: "16px 18px", borderRadius: 12,
                  background: "#fff", border: `1.5px solid ${COLORS.grayLight}`,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800,
                        textTransform: "uppercase", color: COLORS.dark,
                        letterSpacing: 0.3, marginBottom: 4 }}>
                        {item.titulo}
                      </div>
                      <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray,
                        margin: 0, lineHeight: 1.6 }}>
                        {item.descricao}
                      </p>
                      {item.href && (
                        <a href={item.href}
                          style={{ display: "inline-block", marginTop: 8,
                            fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700,
                            color: COLORS.primary, textDecoration: "none" }}>
                          {item.acao} →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formulário */}
          <div>
            <h2 style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 800,
              textTransform: "uppercase", color: COLORS.dark,
              margin: "0 0 20px", letterSpacing: 0.5 }}>
              Enviar Manifestação
            </h2>

            {enviado ? (
              <div style={{ padding: "32px 24px", borderRadius: 14,
                background: "#f0fdf4", border: "1.5px solid #86efac",
                textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h3 style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 800,
                  color: "#15803d", textTransform: "uppercase", margin: "0 0 8px" }}>
                  Manifestação enviada!
                </h3>
                <p style={{ fontFamily: FONTS.body, fontSize: 14, color: "#166534", margin: 0 }}>
                  Sua mensagem foi recebida. Responderemos em até 10 dias úteis no e-mail informado.
                </p>
                <button onClick={() => { setEnviado(false); setFormData({ nome: "", email: "", assunto: "", mensagem: "", anonimo: false }); }}
                  style={{ marginTop: 16, padding: "9px 22px", borderRadius: 9,
                    border: "none", background: "#15803d", color: "#fff",
                    fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Nova manifestação
                </button>
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 14,
                border: `1.5px solid ${COLORS.grayLight}`,
                padding: "24px" }}>

                {/* Anônimo toggle */}
                <label style={{ display: "flex", alignItems: "center", gap: 10,
                  marginBottom: 20, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.anonimo}
                    onChange={e => handleChange("anonimo", e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark }}>
                    Enviar anonimamente
                  </span>
                </label>

                {!formData.anonimo && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontFamily: FONTS.heading, fontSize: 11,
                      fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
                      color: COLORS.gray, marginBottom: 5 }}>Nome</label>
                    <input type="text" value={formData.nome}
                      onChange={e => handleChange("nome", e.target.value)}
                      style={{ width: "100%", boxSizing: "border-box",
                        padding: "9px 12px", borderRadius: 8,
                        border: `1.5px solid ${COLORS.grayLight}`,
                        fontFamily: FONTS.body, fontSize: 13, outline: "none" }} />
                  </div>
                )}

                {[
                  { field: "email", label: "E-mail *", type: "email" },
                  { field: "assunto", label: "Assunto *", type: "text" },
                ].map(({ field, label, type }) => (
                  <div key={field} style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontFamily: FONTS.heading, fontSize: 11,
                      fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
                      color: COLORS.gray, marginBottom: 5 }}>{label}</label>
                    <input type={type} value={formData[field]}
                      onChange={e => handleChange(field, e.target.value)}
                      style={{ width: "100%", boxSizing: "border-box",
                        padding: "9px 12px", borderRadius: 8,
                        border: `1.5px solid ${COLORS.grayLight}`,
                        fontFamily: FONTS.body, fontSize: 13, outline: "none" }} />
                  </div>
                ))}

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontFamily: FONTS.heading, fontSize: 11,
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
                    color: COLORS.gray, marginBottom: 5 }}>Mensagem *</label>
                  <textarea value={formData.mensagem}
                    onChange={e => handleChange("mensagem", e.target.value)}
                    rows={5}
                    style={{ width: "100%", boxSizing: "border-box",
                      padding: "9px 12px", borderRadius: 8,
                      border: `1.5px solid ${COLORS.grayLight}`,
                      fontFamily: FONTS.body, fontSize: 13, outline: "none",
                      resize: "vertical" }} />
                </div>

                <button onClick={handleSubmit}
                  style={{ width: "100%", padding: "12px",
                    borderRadius: 9, border: "none",
                    background: COLORS.primary, color: "#fff",
                    fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: 0.5,
                    cursor: "pointer" }}>
                  📣 Enviar Manifestação
                </button>

                <p style={{ fontFamily: FONTS.body, fontSize: 11,
                  color: COLORS.grayMid, margin: "12px 0 0", textAlign: "center" }}>
                  Campos marcados com * são obrigatórios.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
