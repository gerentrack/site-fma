import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useMobileDrawer(breakpoint = 768) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Fechar ao navegar
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Fechar ao redimensionar acima do breakpoint
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > breakpoint) setOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  // Bloquear scroll do body quando aberto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return { open, setOpen, toggle: () => setOpen(o => !o) };
}
