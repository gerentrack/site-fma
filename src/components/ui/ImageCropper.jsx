/**
 * ImageCropper.jsx — Modal de recorte de imagem.
 * Usa react-easy-crop. Aspect ratio configurável (padrão 3:4 para foto 3x4).
 */
import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { COLORS, FONTS } from "../../styles/colors";

function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

async function getCroppedBlob(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
  });
}

export default function ImageCropper({ imageSrc, aspect = 3 / 4, onCropDone, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
    onCropDone(blob);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <div style={{ background: "#1a1a1a", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff", fontSize: 13, fontFamily: FONTS.body }}>
          <span>Zoom:</span>
          <input type="range" min={1} max={3} step={0.1} value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ width: 120, accentColor: COLORS.primary }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel}
            style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONTS.heading }}>
            Cancelar
          </button>
          <button onClick={handleConfirm}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.heading }}>
            Recortar e Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
