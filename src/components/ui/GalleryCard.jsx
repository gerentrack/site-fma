import { useState } from "react";
import { Link } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";
export default function GalleryCard({ item }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link to={`/galeria/${item.id}`} style={{ display: "block", borderRadius: 10, overflow: "hidden", position: "relative", boxShadow: hovered ? "0 10px 30px rgba(0,0,0,0.2)" : "0 2px 10px rgba(0,0,0,0.1)", transition: "box-shadow 0.3s, transform 0.3s", transform: hovered ? "translateY(-3px)" : "translateY(0)", textDecoration: "none" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <img src={item.cover} alt={item.title} style={{ width: "100%", height: 180, objectFit: "cover", display: "block", transition: "transform 0.4s", transform: hovered ? "scale(1.08)" : "scale(1)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.75))", padding: "24px 14px 14px" }}>
        <p style={{ color: COLORS.white, fontFamily: FONTS.heading, fontWeight: 700, fontSize: 14, margin: 0, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{item.title}</p>
      </div>
    </Link>
  );
}
