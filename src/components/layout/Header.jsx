import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";
import NavItem from "../ui/NavItem";
import { PUBLIC_NAV } from "../../config/navigation";
import { InstitutionalPagesService } from "../../services/index";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [institutionalPages, setInstitutionalPages] = useState([]);

  useEffect(() => {
    InstitutionalPagesService.list({ publishedOnly: true }).then(r => {
      if (r.data) setInstitutionalPages(r.data.filter(p => p.showInNav));
    });
  }, []);

  const resolvedNav = PUBLIC_NAV.map(item => {
    if (item.sub === "_dynamic_institutional") {
      return {
        ...item,
        sub: institutionalPages.map(p => ({
          label: p.menuLabel || p.title,
          link: `/institucional/${p.slug}`,
        })),
      };
    }
    return item;
  });

  return (
    <header style={{
      background: COLORS.primary,
      padding: "0 24px",
      boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
      position: "sticky",
      top: 0,
      zIndex: 999,
    }}>
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        height: 56,
      }}>
        {/* Logo — compacto */}
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: COLORS.white, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 18, color: COLORS.primaryDark,
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}>🏃</div>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 17, color: COLORS.white, lineHeight: 1.1, letterSpacing: 1 }}>FMA</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 8.5, color: "rgba(255,255,255,0.7)", letterSpacing: 0.4 }}>FED. MINEIRA DE ATLETISMO</div>
          </div>
        </Link>

        {/* Desktop Nav — sem wrap, ocupa o espaço disponível */}
        <nav style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "nowrap", flex: 1, justifyContent: "center" }}>
          {resolvedNav.map((item, i) => <NavItem key={i} item={item} />)}
        </nav>

        {/* CTA Permit/Chancela — compacto */}
        <Link
          to="/portal"
          style={{
            display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            padding: "6px 10px", borderRadius: 7,
            background: "rgba(255,255,255,0.15)",
            border: "1.5px solid rgba(255,255,255,0.35)",
            color: COLORS.white, textDecoration: "none",
            fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: 0.4,
            whiteSpace: "nowrap",
            transition: "background 0.2s, border-color 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.25)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.7)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; }}
        >
          <span style={{ fontSize: 13 }}>🏅</span>
          Permit / Chancela
        </Link>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Menu"
          style={{
            display: "none",
            background: "rgba(255,255,255,0.15)",
            border: "none", borderRadius: 6,
            color: COLORS.white, fontSize: 22, cursor: "pointer", padding: "4px 10px",
          }}
        >☰</button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{ background: COLORS.primaryDark, padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          {/* CTA mobile */}
          <Link
            to="/portal"
            onClick={() => setMobileOpen(false)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              margin: "8px 16px 12px", padding: "11px 16px", borderRadius: 8,
              background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.3)",
              color: COLORS.white, textDecoration: "none",
              fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: 0.5,
            }}
          >
            <span style={{ fontSize: 16 }}>🏅</span>
            Solicite seu Permit/Chancela
          </Link>
          {resolvedNav.map((item, i) => (
            <div key={i}>
              <Link
                to={item.link || "#"}
                style={{
                  display: "block", padding: "10px 24px",
                  color: COLORS.white, textDecoration: "none",
                  fontFamily: FONTS.heading, fontSize: 14, fontWeight: 600,
                  textTransform: "uppercase",
                  borderBottom: `1px solid rgba(255,255,255,0.07)`,
                }}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
              {Array.isArray(item.sub) && item.sub.map((sub, j) => (
                <Link
                  key={j}
                  to={sub.link}
                  style={{
                    display: "block", padding: "8px 36px",
                    color: "rgba(255,255,255,0.65)", textDecoration: "none",
                    fontFamily: FONTS.body, fontSize: 13,
                    borderBottom: `1px solid rgba(255,255,255,0.04)`,
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  {sub.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
