/**
 * AntidopagemPage.jsx — Antidopagem FMA.
 *
 * Rota: /antidopagem
 *
 * Página com links e documentos sobre antidopagem.
 * Itens configurados aqui como placeholder — serão preenchidos pela FMA.
 * Estrutura suporta: link externo, PDF upload, ou página informativa.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DocumentsService } from "../../services/index";
import { COLORS, FONTS } from "../../styles/colors";

// ─── Links externos fixos (atualizar com URLs reais) ──────────────────────────

const LINKS_EXTERNOS = [
  {
    icon: "🌍",
    titulo: "WADA — World Anti-Doping Agency",
    descricao: "Agência Mundial Antidopagem. Consulte a lista de substâncias proibidas e as regras internacionais.",
    url: "https://www.wada-ama.org",
    label: "Acessar WADA",
    cor: "#0066cc",
  },
  {
    icon: "🇧🇷",
    titulo: "ABCD — Autoridade Brasileira de Controle de Dopagem",
    descricao: "Organismo nacional responsável pelo controle de dopagem no Brasil.",
    url: "https://www.abcd.gov.br",
    label: "Acessar ABCD",
    cor: "#007733",
  },
  {
    icon: "🏃",
    titulo: "World Athletics — Antidopagem",
    descricao: "Regras e programas de controle de dopagem da federação internacional de atletismo.",
    url: "https://worldathletics.org/about-iaaf/integrity/anti-doping",
    label: "Acessar World Athletics",
    cor: "#cc0000",
  },
  {
    icon: "📋",
    titulo: "Whereabouts — ADAMS",
    descricao: "Sistema de localização de atletas para controle de dopagem fora de competição.",
    url: "https://adams.wada-ama.org",
    label: "Acessar ADAMS",
    cor: "#5a3e8a",
  },
];

const INFO_CARDS = [
  {
    icon: "🔬",
    titulo: "O que é dopagem?",
    texto: "Dopagem é o uso de substâncias ou métodos proibidos pelas regras antidopagem com o objetivo de aumentar artificialmente o desempenho esportivo. A lista de substâncias proibidas é atualizada anualmente pela WADA.",
  },
  {
    icon: "🛡️",
    titulo: "Direitos do Atleta",
    texto: "Todo atleta tem o direito de ser informado sobre as regras antidopagem, de ser acompanhado durante a coleta de amostras, de solicitar a análise da amostra B e de ser representado em processos disciplinares.",
  },
  {
    icon: "⚠️",
    titulo: "Responsabilidade Pessoal",
    texto: "Cada atleta é pessoalmente responsável por qualquer substância encontrada em sua amostra. Alegações de uso inadvertido não excluem a responsabilidade do atleta.",
  },
  {
    icon: "📞",
    titulo: "Denúncias",
    texto: "Suspeitas de dopagem podem ser reportadas de forma anônima à ABCD ou diretamente à WADA pelo canal SPEAK UP, disponível no site da WADA.",
  },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <>
      <style>{`@keyframes sh2{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ height: 72, borderRadius: 10,
            background: "linear-gradient(135deg,#f0f0f0,#e8e8e8)",
            animation: "sh2 1.5s ease-in-out infinite" }} />
        ))}
      </div>
    </>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function AntidopagemPage() {
  const [docs,    setDocs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Antidopagem | FMA";
    DocumentsService.list({ publishedOnly: true }).then(r => {
      if (!r.error) {
        setDocs(r.data.filter(d => d.category === "antidopagem"));
      }
      setLoading(false);
    });
  }, []);

  return (
    <>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 60%, #1a1a2e 100%)",
        padding: "52px 0 44px", marginBottom: 40,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 2,
            color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
            <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>FMA</Link>
            {" › "}
            <span style={{ color: COLORS.primaryLight }}>Antidopagem</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <span style={{ fontSize: 40 }}>🔬</span>
            <h1 style={{ fontFamily: FONTS.heading,
              fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 900,
              color: "#fff", margin: 0, textTransform: "uppercase", letterSpacing: 2 }}>
              Antidopagem
            </h1>
          </div>
          <p style={{ fontFamily: FONTS.body, fontSize: 15,
            color: "rgba(255,255,255,0.65)", margin: 0, maxWidth: 560 }}>
            A FMA apoia e segue as regras antidopagem da WADA e da World Athletics.
            Informações, documentos e links para atletas, técnicos e clubes filiados.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 72px" }}>

        {/* Informações gerais */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 800,
            textTransform: "uppercase", color: COLORS.dark, margin: "0 0 20px",
            letterSpacing: 0.5 }}>
            Informações Gerais
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))",
            gap: 16,
          }}>
            {INFO_CARDS.map((card, i) => (
              <div key={i} style={{ padding: "18px 18px 20px",
                borderRadius: 12, background: "#fff",
                border: `1.5px solid ${COLORS.grayLight}` }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{card.icon}</div>
                <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800,
                  textTransform: "uppercase", color: COLORS.dark,
                  letterSpacing: 0.3, marginBottom: 8 }}>
                  {card.titulo}
                </div>
                <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray,
                  margin: 0, lineHeight: 1.6 }}>
                  {card.texto}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Links externos */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 800,
            textTransform: "uppercase", color: COLORS.dark, margin: "0 0 20px",
            letterSpacing: 0.5 }}>
            Organismos e Recursos
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {LINKS_EXTERNOS.map((item, i) => (
              <LinkCard key={i} item={item} />
            ))}
          </div>
        </section>

        {/* Documentos da FMA */}
        <section>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 800,
            textTransform: "uppercase", color: COLORS.dark, margin: "0 0 20px",
            letterSpacing: 0.5 }}>
            Documentos FMA — Antidopagem
          </h2>
          {loading ? (
            <Skeleton />
          ) : docs.length === 0 ? (
            <div style={{ padding: "32px 24px", borderRadius: 14,
              background: "#fff", border: `1.5px dashed ${COLORS.grayLight}`,
              textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
              <p style={{ fontFamily: FONTS.heading, fontSize: 14,
                fontWeight: 700, color: COLORS.gray, margin: "0 0 4px" }}>
                Nenhum documento publicado ainda.
              </p>
              <p style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.grayMid, margin: 0 }}>
                Os documentos serão disponibilizados pela FMA em breve.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {docs.map(doc => (
                <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 18px", borderRadius: 10,
                  background: "#fff", border: `1.5px solid ${COLORS.grayLight}` }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700,
                      textTransform: "uppercase", color: COLORS.dark }}>
                      {doc.title}
                    </div>
                    {doc.description && (
                      <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
                        {doc.description}
                      </div>
                    )}
                  </div>
                  {doc.fileUrl && (
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                      style={{ padding: "7px 16px", borderRadius: 8,
                        background: COLORS.primary, color: "#fff",
                        fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700,
                        textDecoration: "none", textTransform: "uppercase", flexShrink: 0 }}>
                      ⬇ Baixar
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function LinkCard({ item }) {
  const [hov, setHov] = useState(false);
  return (
    <a href={item.url} target="_blank" rel="noreferrer"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "16px 20px", borderRadius: 12,
        background: hov ? `${item.cor}08` : "#fff",
        border: `1.5px solid ${hov ? item.cor : COLORS.grayLight}`,
        textDecoration: "none", transition: "all 0.15s",
      }}>
      <span style={{ fontSize: 28, flexShrink: 0 }}>{item.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800,
          color: hov ? item.cor : COLORS.dark,
          textTransform: "uppercase", letterSpacing: 0.3,
          transition: "color 0.15s" }}>
          {item.titulo}
        </div>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray,
          margin: "4px 0 0", lineHeight: 1.5 }}>
          {item.descricao}
        </p>
      </div>
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 8,
        background: hov ? item.cor : COLORS.offWhite,
        color: hov ? "#fff" : COLORS.gray,
        fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
        textTransform: "uppercase", transition: "all 0.15s" }}>
        🔗 {item.label}
      </div>
    </a>
  );
}
