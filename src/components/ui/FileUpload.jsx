/**
 * FileUpload.jsx — Componente de upload com Firebase Storage
 *
 * Props:
 *   value      {string}   — URL atual do arquivo
 *   onChange   {fn}       — callback(url, path) chamado após upload
 *   label      {string}
 *   accept     {string}   — ex: "image/*" | ".pdf,.doc,.docx" | "*"
 *   hint       {string}
 *   preview    {bool}     — exibe preview de imagem
 *   folder     {string}   — pasta no Firebase Storage (ex: "noticias", "solicitacoes/sol1")
 *   mode       {string}   — "upload" | "url" | "both"
 *   maxMB      {number}   — tamanho máximo em MB (padrão: 10)
 */
import { useState, useRef } from "react";
import { COLORS, FONTS } from "../../styles/colors";
import Icon from "../../utils/icons";
import { uploadFile, deleteFile } from "../../services/storageService";

export default function FileUpload({
  value    = "",
  onChange,
  label,
  accept   = "image/*",
  hint,
  preview  = true,
  folder   = "uploads",
  mode     = "both",
  maxMB    = 10,
}) {
  const [activeMode, setActiveMode] = useState(mode === "url" ? "url" : "upload");
  const [dragging,   setDragging]   = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [error,      setError]      = useState("");
  const inputRef = useRef();

  const isImage = value && /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(value);
  const isDoc   = value && /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)(\?.*)?$/i.test(value);

  async function handleFile(file) {
    if (!file) return;
    setError("");

    // Validação de tamanho
    if (file.size > maxMB * 1024 * 1024) {
      setError(`Arquivo muito grande. Máximo: ${maxMB}MB.`);
      return;
    }

    setUploading(true);
    setProgress(0);

    const result = await uploadFile(file, folder, (pct) => setProgress(pct));

    setUploading(false);
    setProgress(0);

    if (result.error) {
      setError(result.error);
      return;
    }

    onChange(result.url, result.path);
  }

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {label && (
        <label style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark }}>
          {label}
        </label>
      )}

      {/* Toggle URL / Upload */}
      {mode === "both" && (
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "upload", label: "Upload" },
            { id: "url",    label: "Por URL" },
          ].map(m => (
            <button key={m.id} type="button" onClick={() => setActiveMode(m.id)} style={{
              padding: "4px 14px", borderRadius: 6,
              border: `1px solid ${activeMode === m.id ? COLORS.primary : COLORS.grayLight}`,
              background: activeMode === m.id ? COLORS.primary : "transparent",
              color: activeMode === m.id ? COLORS.white : COLORS.gray,
              fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
              cursor: "pointer", textTransform: "uppercase",
            }}>
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Upload area */}
      {activeMode === "upload" && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragging ? COLORS.primary : uploading ? "#86efac" : COLORS.grayLight}`,
            borderRadius: 10, padding: "28px 24px", textAlign: "center",
            cursor: uploading ? "default" : "pointer",
            background: dragging ? "#fff0f0" : uploading ? "#f0fdf4" : COLORS.offWhite || "#fafafa",
            transition: "all 0.2s",
          }}
        >
          {uploading ? (
            <>
              <div style={{ fontSize: 28, marginBottom: 8 }}><Icon name="Upload" size={28} /></div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.dark, marginBottom: 10 }}>
                Enviando… {progress}%
              </div>
              {/* Barra de progresso */}
              <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden", maxWidth: 280, margin: "0 auto" }}>
                <div style={{
                  height: "100%", background: "#22c55e", borderRadius: 3,
                  width: `${progress}%`, transition: "width 0.2s",
                }} />
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 32, marginBottom: 8 }}><Icon name="Folder" size={32} /></div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 14, color: COLORS.dark, fontWeight: 700 }}>
                Arraste ou clique para enviar
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 4 }}>
                {hint || `Aceita: ${accept} · Máx: ${maxMB}MB`}
              </div>
            </>
          )}
          <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }}
            onChange={e => handleFile(e.target.files[0])} />
        </div>
      )}

      {/* URL input */}
      {activeMode === "url" && (
        <input type="url" value={value} onChange={e => onChange(e.target.value)}
          placeholder="https://exemplo.com/arquivo.jpg"
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 8,
            border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body,
            fontSize: 14, outline: "none", boxSizing: "border-box",
          }}
          onFocus={e => e.currentTarget.style.borderColor = COLORS.primary}
          onBlur={e => e.currentTarget.style.borderColor = COLORS.grayLight}
        />
      )}

      {/* Erro */}
      {error && (
        <div style={{ color: "#cc0000", fontSize: 12, padding: "6px 10px",
          background: "#fee2e2", borderRadius: 6 }}>
          {error}
        </div>
      )}

      {/* Preview de imagem */}
      {preview && value && isImage && (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img src={value} alt="Preview"
            style={{ width: "100%", maxHeight: 200, objectFit: "cover",
              borderRadius: 8, border: `1px solid ${COLORS.grayLight}` }}
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
          <button type="button" onClick={() => {
            if (value && value.includes("firebasestorage.googleapis.com")) deleteFile(value).catch(() => {});
            onChange("");
          }} style={{
            position: "absolute", top: 8, right: 8,
            background: "rgba(0,0,0,0.6)", color: "#fff", border: "none",
            borderRadius: 4, padding: "3px 8px", cursor: "pointer",
            fontSize: 12, fontFamily: FONTS.body,
          }}>✕ Remover</button>
        </div>
      )}

      {/* Preview de documento */}
      {preview && value && isDoc && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
          background: "#f9fafb", borderRadius: 8, border: `1px solid ${COLORS.grayLight}` }}>
          <span style={{ fontSize: 24 }}><Icon name="File" size={24} /></span>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {value.split("/").pop().split("?")[0]}
            </div>
            <a href={value} target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: COLORS.primary, textDecoration: "none" }}>
              Visualizar arquivo ↗
            </a>
          </div>
          <button type="button" onClick={() => {
            if (value && value.includes("firebasestorage.googleapis.com")) deleteFile(value).catch(() => {});
            onChange("");
          }} style={{
            background: "none", border: "none", color: "#cc0000",
            cursor: "pointer", fontSize: 18, lineHeight: 1,
          }}>✕</button>
        </div>
      )}

      {hint && activeMode === "url" && (
        <span style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>{hint}</span>
      )}
    </div>
  );
}
