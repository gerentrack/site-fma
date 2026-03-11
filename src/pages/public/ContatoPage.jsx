/**
 * ContatoPage.jsx — Página pública de contato da FMA.
 * Rota: /contato
 *
 * Exibe endereço, telefone, whatsapp, email e horário lidos do FooterConfig
 * (mesmo modelo gerenciado pelo admin em /admin/rodape), garantindo que os
 * dados estejam sempre sincronizados com o rodapé do site.
 */
import { useState, useEffect } from "react";
import { FooterConfigService } from "../../services/index";
import { COLORS, FONTS } from "../../styles/colors";

// ─── Config de seções de contato ─────────────────────────────────────────────
function buildContatos(cfg) {
  return [
    cfg.phone && {
      icon: "📞",
      title: "Telefone",
      value: cfg.phone,
      href: cfg.phoneLink || `tel:${cfg.phone.replace(/\D/g, "")}`,
      cta: "Ligar agora",
    },
    cfg.whatsapp && {
      icon: "💬",
      title: "WhatsApp",
      value: cfg.whatsapp,
      href: cfg.whatsappLink || `https://wa.me/55${cfg.whatsapp.replace(/\D/g, "")}`,
      cta: "Abrir WhatsApp",
      color: "#15803d",
      bg: "#f0fdf4",
      border: "#86efac",
    },
    cfg.email && {
      icon: "📧",
      title: "E-mail",
      value: cfg.email,
      href: cfg.emailLink || `mailto:${cfg.email}`,
      cta: "Enviar e-mail",
      color: "#0066cc",
      bg: "#eff6ff",
      border: "#bfdbfe",
    },
  ].filter(Boolean);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <>
      <style>{`@keyframes sh{0%,100%{opacity:1}50%{opacity:.55}}`}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 18 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 130, borderRadius: 14, background: "linear-gradient(135deg,#f0f0f0,#e4e4e4)", animation: "sh 1.5s ease-in-out infinite" }} />
        ))}
      </div>
    </>
  );
}

// ─── Card de contato ──────────────────────────────────────────────────────────
function ContatoCard({ icon, title, value, href, cta, color = COLORS.primary, bg = "#fff5f5", border = "#fecaca" }) {
  const [hov, setHov] = useState(false);
  return (
    <a
      href={href}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "block", textDecoration: "none",
        background: hov ? bg : "#fff",
        border: `1.5px solid ${hov ? border : COLORS.grayLight}`,
        borderRadius: 14, padding: "22px 24px",
        boxShadow: hov ? "0 8px 28px rgba(0,0,0,0.1)" : "0 2px 10px rgba(0,0,0,0.06)",
        transform: hov ? "translateY(-3px)" : "none",
        transition: "all 0.2s",
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, marginBottom: 5 }}>
        {title}
      </div>
      <div style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 700, color: hov ? color : COLORS.dark, marginBottom: 12, lineHeight: 1.3 }}>
        {value}
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: hov ? color : COLORS.grayLight, color: hov ? "#fff" : COLORS.gray, fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, transition: "all 0.2s" }}>
        {cta} →
      </div>
    </a>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function ContatoPage() {
  const [cfg,     setCfg]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Contato | FMA";
    FooterConfigService.get().then(r => {
      if (r.data) setCfg(r.data);
      setLoading(false);
    });
  }, []);

  const contatos = cfg ? buildContatos(cfg) : [];

  return (
    <>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a2e 100%)",
        padding: "52px 0 44px", marginBottom: 48,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)",
          fontFamily: FONTS.heading, fontWeight: 900,
          fontSize: "clamp(6rem, 14vw, 11rem)",
          color: "rgba(255,255,255,0.03)", lineHeight: 1,
          userSelect: "none", pointerEvents: "none",
        }}>📬</div>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
            FMA › <span style={{ color: COLORS.primaryLight }}>Contato</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
            <span style={{ fontSize: 40 }}>📬</span>
            <h1 style={{ fontFamily: FONTS.heading, fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, color: "#fff", margin: 0, textTransform: "uppercase", letterSpacing: 2, lineHeight: 1 }}>
              Entre em Contato
            </h1>
          </div>
          <p style={{ fontFamily: FONTS.body, fontSize: 15, color: "rgba(255,255,255,0.6)", margin: 0, maxWidth: 540, lineHeight: 1.6 }}>
            A Federação Mineira de Atletismo está disponível pelos canais abaixo para atender atletas, clubes, organizadores e árbitros.
          </p>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 32px 72px" }}>

        {/* Cards de contato */}
        {loading ? <Skeleton /> : (
          contatos.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18, marginBottom: 48 }}>
              {contatos.map((c, i) => <ContatoCard key={i} {...c} />)}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 24px", background: "#fff", borderRadius: 14, marginBottom: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray }}>Informações de contato não configuradas.</p>
            </div>
          )
        )}

        {/* Endereço + Horários */}
        {cfg && (cfg.address || cfg.hours) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 48 }}>
            {cfg.address && (
              <div style={{ background: "#fff", borderRadius: 14, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1px solid ${COLORS.grayLight}` }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>📍</div>
                <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, marginBottom: 8 }}>Endereço</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 15, color: COLORS.dark, lineHeight: 1.6 }}>
                  {cfg.address}
                  {cfg.city && <><br />{cfg.city}</>}
                </div>
                {cfg.address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent([cfg.address, cfg.city].filter(Boolean).join(", "))}`}
                    target="_blank" rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: "#0066cc", textDecoration: "none" }}
                  >
                    Ver no mapa →
                  </a>
                )}
              </div>
            )}
            {cfg.hours && (
              <div style={{ background: "#fff", borderRadius: 14, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1px solid ${COLORS.grayLight}` }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>🕐</div>
                <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.gray, marginBottom: 8 }}>Horário de atendimento</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 15, color: COLORS.dark, lineHeight: 1.6 }}>{cfg.hours}</div>
                <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 20, background: "#f0fdf4", border: "1px solid #86efac" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#15803d", display: "block" }} />
                  <span style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, color: "#15803d" }}>Atendimento presencial e remoto</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Seção de formulário de contato — placeholder institucional */}
        <div style={{
          background: "linear-gradient(135deg, #1a1a1a, #2d2d2d)",
          borderRadius: 16, padding: "36px 40px",
          display: "grid", gridTemplateColumns: "1fr auto",
          gap: 24, alignItems: "center",
        }}>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>
              Portal de Organizadores
            </div>
            <h2 style={{ fontFamily: FONTS.heading, fontSize: "clamp(1.2rem,3vw,1.8rem)", fontWeight: 900, color: "#fff", margin: "0 0 10px", textTransform: "uppercase" }}>
              Quer organizar um evento?
            </h2>
            <p style={{ fontFamily: FONTS.body, fontSize: 14, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.6 }}>
              Solicite seu Permit ou Chancela diretamente pelo Portal de Organizadores. Acompanhe o status da solicitação em tempo real.
            </p>
          </div>
          <a
            href="/portal"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 24px", borderRadius: 10,
              background: COLORS.primary, color: "#fff",
              fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800,
              textDecoration: "none", textTransform: "uppercase",
              letterSpacing: 0.5, whiteSpace: "nowrap",
              boxShadow: "0 4px 20px rgba(204,0,0,0.4)",
            }}
          >
            Acessar o Portal →
          </a>
        </div>

        {/* Aviso filiação */}
        <div style={{ marginTop: 20, padding: "18px 24px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>ℹ️</span>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#92400e", marginBottom: 4 }}>Filiação de Atletas e Clubes</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 13, color: "#78350f", lineHeight: 1.6 }}>
              Processos de filiação, desfiliação e transferência de atletas e clubes são realizados diretamente pela{" "}
              <a href="https://www.cbat.org.br" target="_blank" rel="noreferrer" style={{ color: "#92400e", fontWeight: 700 }}>CBAT (Confederação Brasileira de Atletismo)</a>.
              A FMA é o ponto de apoio regional — entre em contato pelos canais acima para orientações.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
