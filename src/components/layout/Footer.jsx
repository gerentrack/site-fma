import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";
import { FooterConfigService, SocialLinksService } from "../../services/index";

export default function Footer() {
  const [config, setConfig] = useState(null);
  const [socialLinks, setSocialLinks] = useState([]);
  const [email, setEmail] = useState("");

  useEffect(() => {
    FooterConfigService.get().then(r => r.data && setConfig(r.data));
    SocialLinksService.list({ activeOnly: true }).then(r => r.data && setSocialLinks(r.data));
  }, []);

  const handleNewsletter = () => {
    if (!email || !email.includes("@")) { alert("Insira um e-mail válido."); return; }
    alert(`${email} inscrito com sucesso!`);
    setEmail("");
  };

  // Renderiza enquanto carrega (evita flash de conteúdo vazio)
  const c = config || {};

  const contactItems = [
    c.phone    && { icon: "📞", text: c.phone,    link: c.phoneLink },
    c.whatsapp && { icon: "💬", text: c.whatsapp,  link: c.whatsappLink },
    c.email    && { icon: "✉️", text: c.email,     link: c.emailLink },
    c.address  && { icon: "📍", text: c.address + (c.city ? `, ${c.city}` : ""), link: null },
    c.hours    && { icon: "🕐", text: c.hours,     link: null },
  ].filter(Boolean);

  return (
    <footer style={{ background: COLORS.dark, color: "#fff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 40 }}>

        {/* Coluna 1 — Identidade e contato */}
        <div>
          <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 800, color: COLORS.primary, letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>FMA</div>
          {c.institutionalText && (
            <p style={{ fontFamily: FONTS.body, fontSize: 13.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, margin: "0 0 16px" }}>
              {c.institutionalText}
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {contactItems.map((item, i) => (
              item.link
                ? <a key={i} href={item.link} style={{ display: "flex", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: FONTS.body, textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                    onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
                  ><span>{item.icon}</span><span>{item.text}</span></a>
                : <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: FONTS.body }}>
                    <span>{item.icon}</span><span>{item.text}</span>
                  </div>
            ))}
          </div>
        </div>

        {/* Coluna 2 — Links úteis */}
        {c.showUsefulLinks !== false && (c.usefulLinks || []).length > 0 && (
          <div>
            <h4 style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, marginTop: 0 }}>Acesse Também</h4>
            {c.usefulLinks.map((link, i) => (
              link.to?.startsWith("http")
                ? <a key={i} href={link.to} target="_blank" rel="noreferrer"
                    style={{ display: "block", fontFamily: FONTS.body, fontSize: 13.5, color: "rgba(255,255,255,0.65)", textDecoration: "none", marginBottom: 8, transition: "color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                    onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.65)"}
                  >{link.label}</a>
                : <Link key={i} to={link.to || "/"} style={{ display: "block", fontFamily: FONTS.body, fontSize: 13.5, color: "rgba(255,255,255,0.65)", textDecoration: "none", marginBottom: 8, transition: "color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                    onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.65)"}
                  >{link.label}</Link>
            ))}
          </div>
        )}

        {/* Coluna 3 — Redes sociais + newsletter */}
        <div>
          {c.showSocialLinks !== false && socialLinks.length > 0 && (
            <>
              <h4 style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14, marginTop: 0 }}>Redes Sociais</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
                {socialLinks.map(s => (
                  <a key={s.id} href={s.url} target="_blank" rel="noreferrer"
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 16px", textDecoration: "none", color: "#fff", fontFamily: FONTS.body, fontSize: 11, gap: 5, transition: "background 0.2s" }}
                    title={s.label}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                  >
                    <span style={{ fontSize: 20 }}>{s.icon}</span>
                    <span>{s.label}</span>
                  </a>
                ))}
              </div>
            </>
          )}

          {c.showNewsletter !== false && c.newsletterEnabled !== false && (
            <>
              <h4 style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, marginTop: 0 }}>
                {c.newsletterTitle || "Newsletter"}
              </h4>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={c.newsletterPlaceholder || "Seu e-mail"}
                  onKeyDown={e => e.key === "Enter" && handleNewsletter()}
                  style={{ flex: 1, padding: "9px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "#fff", fontFamily: FONTS.body, fontSize: 13, outline: "none" }}
                />
                <button onClick={handleNewsletter}
                  style={{ background: COLORS.primary, color: "#fff", border: "none", padding: "9px 16px", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13 }}>
                  {c.newsletterButtonLabel || "OK"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Barra inferior */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", textAlign: "center", padding: "16px 24px", fontFamily: FONTS.body, fontSize: 12, color: "rgba(255,255,255,0.35)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, maxWidth: 1100, margin: "0 auto" }}>
        <span>
          © {new Date().getFullYear()} {c.copyrightText || "Federação Mineira de Atletismo"}.
          {c.developerCredit && (
            <>
              {" "}
              {c.developerLink && c.developerLink !== "#"
                ? <a href={c.developerLink} target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>{c.developerCredit}</a>
                : <span>{c.developerCredit}</span>
              }
            </>
          )}
        </span>
        <Link to="/admin" style={{ color: "rgba(255,255,255,0.2)", textDecoration: "none", fontSize: 11 }}>Painel Admin</Link>
      </div>
    </footer>
  );
}
