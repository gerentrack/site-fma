import { useState } from "react";
import { Link } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";
import DropdownMenu from "./DropdownMenu";

export default function NavItem({ item }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        to={item.link || "#"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          color: COLORS.white,
          textDecoration: "none",
          fontSize: 11.5,
          fontWeight: 700,
          fontFamily: FONTS.heading,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          padding: "5px 7px",
          borderRadius: 4,
          whiteSpace: "nowrap",
          transition: "background 0.15s",
          background: open ? "rgba(255,255,255,0.1)" : "transparent",
        }}
      >
        {item.label}
        {item.sub && <span style={{ fontSize: 9, marginTop: 1, opacity: 0.8 }}>▾</span>}
      </Link>
      {item.sub && <DropdownMenu items={item.sub} visible={open} />}
    </div>
  );
}
