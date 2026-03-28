import { useState, useEffect } from "react";
import { COLORS, FONTS } from "../../styles/colors";
export default function HeroBanner({ banners = [] }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => { if (banners.length < 2) return; const t = setInterval(() => setCurrent(c => (c + 1) % banners.length), 4500); return () => clearInterval(t); }, [banners.length]);
  if (!banners.length) return null;
  const b = banners[current];
  return (
    <div style={{ background: b.bg, minHeight: 340, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center", padding: "60px 24px", position: "relative", overflow: "hidden", transition: "background 0.8s ease" }}>
      {b.image && <img src={b.image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 0, transparent 50%)", backgroundSize: "20px 20px", pointerEvents: "none" }} />
      <div style={{ fontSize: 72, marginBottom: 16, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))", position: "relative", zIndex: 1 }}>{b.icon}</div>
      <h1 style={{ fontFamily: FONTS.heading, fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, color: COLORS.white, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 2, textShadow: "0 2px 16px rgba(0,0,0,0.3)", position: "relative", zIndex: 1 }}>{b.title}</h1>
      <p style={{ fontFamily: FONTS.body, fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "rgba(255,255,255,0.9)", maxWidth: 560, margin: "0 0 28px", lineHeight: 1.5, position: "relative", zIndex: 1 }}>{b.subtitle}</p>
      <a href={b.ctaLink || "#"} style={{ background: COLORS.white, color: COLORS.primaryDark, padding: "13px 34px", borderRadius: 40, fontWeight: 700, fontFamily: FONTS.heading, textDecoration: "none", fontSize: 15, letterSpacing: 1, textTransform: "uppercase", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", transition: "transform 0.2s, box-shadow 0.2s", position: "relative", zIndex: 1 }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.3)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)"; }}
      >{b.cta}</a>
      {banners.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 28, position: "relative", zIndex: 1 }}>
          {banners.map((_, i) => <button key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? 28 : 8, height: 8, borderRadius: 4, border: "none", background: i === current ? COLORS.white : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.3s ease", padding: 0 }} />)}
        </div>
      )}
    </div>
  );
}
