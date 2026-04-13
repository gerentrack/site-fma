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

  const svgPhone = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>;
  const svgChat = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
  const svgMail = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
  const svgPin = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
  const svgClock = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

  const contactItems = [
    c.phone    && { icon: svgPhone, text: c.phone,    link: c.phoneLink },
    c.whatsapp && { icon: svgChat,  text: c.whatsapp,  link: c.whatsappLink },
    c.email    && { icon: svgMail,  text: c.email,     link: c.emailLink },
    c.address  && { icon: svgPin,   text: c.address + (c.city ? `, ${c.city}` : ""), link: null },
    c.hours    && { icon: svgClock, text: c.hours,     link: null },
  ].filter(Boolean);

  return (
    <footer style={{ background: COLORS.dark, color: "#fff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 40 }}>

        {/* Coluna 1 — Identidade e contato */}
        <div>
          {c.logoUrl ? (
            <img
              src={c.logoUrl}
              alt={c.logoAlt || "FMA"}
              style={{ height: 52, maxWidth: 180, objectFit: "contain", marginBottom: 14 }}
            />
          ) : (
            <div style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 800, color: COLORS.primary, letterSpacing: 2, marginBottom: 14, textTransform: "uppercase" }}>
              {c.siteName || "FMA"}
            </div>
          )}
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
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.07)", borderRadius: 10, width: 80, height: 70, textDecoration: "none", color: "#fff", fontFamily: FONTS.body, fontSize: 11, gap: 5, transition: "background 0.2s" }}
                    title={s.label}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                  >
                    {s.icon && (s.icon.startsWith("http") || s.icon.startsWith("data:"))
                      ? <img src={s.icon} alt={s.label} style={{ maxWidth: "85%", maxHeight: "85%", objectFit: "contain" }} />
                      : <><span style={{ fontSize: 20 }}>{s.icon}</span><span>{s.label}</span></>}
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
          {(c.developerCredit || c.developerLogo) && (
            <>
              {c.developerLogo ? " | Desenvolvido por " : " "}
              {c.developerLink && c.developerLink !== "#"
                ? <a href={c.developerLink} target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, verticalAlign: "middle" }}>
                    {c.developerLogo && <img src={c.developerLogo} alt={c.developerCredit || "Desenvolvedor"} style={{ height: 56, objectFit: "contain" }} />}
                    {!c.developerLogo && c.developerCredit}
                  </a>
                : <>
                    {c.developerLogo && <img src={c.developerLogo} alt={c.developerCredit || "Desenvolvedor"} style={{ height: 56, objectFit: "contain", verticalAlign: "middle" }} />}
                    {!c.developerLogo && <span>{c.developerCredit}</span>}
                  </>
              }
            </>
          )}
        </span>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link to="/privacidade" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none", fontSize: 11 }}>Política de Privacidade</Link>
          <Link to="/termos" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none", fontSize: 11 }}>Termos de Uso</Link>
          <Link to="/transparencia/ouvidoria" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none", fontSize: 11 }}>Ouvidoria</Link>
          <Link to="/admin" style={{ color: "rgba(255,255,255,0.2)", textDecoration: "none", fontSize: 11 }}>Painel Admin</Link>
        </div>
      </div>
    </footer>
  );
}
