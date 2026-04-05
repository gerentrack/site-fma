/**
 * PdfModal.jsx
 * Modal para visualizar PDFs embutidos na página, sem expor a URL de origem.
 * Uso: <PdfModal url={pdfModal.url} title={pdfModal.title} onClose={closePdf} />
 */
import { useState, useEffect } from "react";
import { COLORS, FONTS } from "../../styles/colors";

export default function PdfModal({ url, title, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  useEffect(() => {
    if (!url) { setBlobUrl(null); return; }
    let revoked = false;
    fetch(url).then(r => r.blob()).then(blob => {
      if (revoked) return;
      setBlobUrl(URL.createObjectURL(blob));
    });
    return () => { revoked = true; if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [url]);
  if (!url) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 900, height: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${COLORS.grayLight}` }}>
          <span style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 14, color: COLORS.dark, textTransform: "uppercase" }}>{title}</span>
          <div style={{ display: "flex", gap: 8 }}>
            {blobUrl && <a href={blobUrl} download={(title || "documento") + ".pdf"}
              style={{ padding: "6px 14px", borderRadius: 6, background: COLORS.primary, color: "#fff", textDecoration: "none", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Baixar
            </a>}
            <button onClick={onClose}
              style={{ padding: "6px 14px", borderRadius: 6, background: COLORS.grayLight, border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: COLORS.dark }}>
              Fechar
            </button>
          </div>
        </div>
        {blobUrl
          ? <iframe src={blobUrl + "#toolbar=0&navpanes=0"} title={title} style={{ flex: 1, border: "none", width: "100%" }} />
          : <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTS.body, color: COLORS.gray }}>Carregando...</div>}
      </div>
    </div>
  );
}

/** Hook para controlar o estado do modal PDF */
export function usePdfModal() {
  const [pdfModal, setPdfModal] = useState({ url: null, title: "" });
  const openPdf = (url, title) => setPdfModal({ url, title });
  const closePdf = () => setPdfModal({ url: null, title: "" });
  return { pdfModal, openPdf, closePdf };
}
