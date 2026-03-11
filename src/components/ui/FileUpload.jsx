import { useState, useRef } from "react";
import { COLORS, FONTS } from "../../styles/colors";

/**
 * Componente de upload de arquivo/imagem.
 *
 * Atualmente aceita URL manual (modo URL) ou seleção de arquivo local (modo File).
 * Quando houver backend: substituir handleFile por upload real via fetch/FormData.
 *
 * Uso:
 *   <FileUpload
 *     value={imageUrl}
 *     onChange={(url) => set("image", url)}
 *     label="Imagem de Capa"
 *     accept="image/*"
 *     hint="JPG, PNG ou WebP. Recomendado: 800x440px."
 *   />
 */
export default function FileUpload({
  value = "",
  onChange,
  label,
  accept = "image/*",
  hint,
  preview = true,
  mode = "url", // "url" | "file" | "both"
}) {
  const [activeMode, setActiveMode] = useState(mode === "both" ? "url" : mode);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const isImage = value && /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(value);

  const handleFile = (file) => {
    if (!file) return;
    // TODO: substituir por upload real ao backend
    // Por enquanto, cria uma URL local temporária
    const url = URL.createObjectURL(file);
    onChange(url);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {label && (
        <label style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark }}>
          {label}
        </label>
      )}

      {/* Mode toggle */}
      {mode === "both" && (
        <div style={{ display: "flex", gap: 8 }}>
          {["url", "file"].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setActiveMode(m)}
              style={{
                padding: "4px 14px", borderRadius: 6,
                border: `1px solid ${activeMode === m ? COLORS.primary : COLORS.grayLight}`,
                background: activeMode === m ? COLORS.primary : "transparent",
                color: activeMode === m ? COLORS.white : COLORS.gray,
                fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
                cursor: "pointer", textTransform: "uppercase",
              }}
            >
              {m === "url" ? "Por URL" : "Upload"}
            </button>
          ))}
        </div>
      )}

      {/* URL input */}
      {activeMode === "url" && (
        <input
          type="url"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://exemplo.com/imagem.jpg"
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 8,
            border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body,
            fontSize: 14, outline: "none", boxSizing: "border-box",
          }}
          onFocus={e => e.currentTarget.style.borderColor = COLORS.primaryLight}
          onBlur={e => e.currentTarget.style.borderColor = COLORS.grayLight}
        />
      )}

      {/* File drop zone */}
      {activeMode === "file" && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragging ? COLORS.primary : COLORS.grayLight}`,
            borderRadius: 10,
            padding: "32px 24px",
            textAlign: "center",
            cursor: "pointer",
            background: dragging ? "#fff0f0" : COLORS.offWhite,
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
          <div style={{ fontFamily: FONTS.heading, fontSize: 14, color: COLORS.dark, fontWeight: 700 }}>
            Arraste um arquivo ou clique para selecionar
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginTop: 4 }}>
            {hint || accept}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            style={{ display: "none" }}
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>
      )}

      {/* Preview */}
      {preview && value && isImage && (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img
            src={value}
            alt="Preview"
            style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8, border: `1px solid ${COLORS.grayLight}` }}
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            style={{
              position: "absolute", top: 8, right: 8,
              background: "rgba(0,0,0,0.6)", color: "#fff",
              border: "none", borderRadius: 4, padding: "3px 8px",
              cursor: "pointer", fontSize: 12, fontFamily: FONTS.body,
            }}
          >
            ✕ Remover
          </button>
        </div>
      )}

      {hint && activeMode === "url" && (
        <span style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>{hint}</span>
      )}
    </div>
  );
}
