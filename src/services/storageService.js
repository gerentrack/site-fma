/**
 * storageService.js — Upload de arquivos para o Firebase Storage
 *
 * Organização das pastas no Storage:
 *   logos/           — logo e favicon do site
 *   banners/         — imagens de banners
 *   noticias/        — imagens de notícias
 *   galeria/         — fotos da galeria
 *   eventos/         — imagens de capa de eventos do calendário
 *   documentos/      — documentos públicos
 *   solicitacoes/{id}/ — arquivos das solicitações (regulamentos, mapas etc.)
 *   resultados/      — arquivos de resultados
 *   parceiros/       — logos de parceiros
 *   equipes/         — logos e capas de equipes
 *   pistas/          — fotos de pistas homologadas
 *   arbitros/        — documentos e fotos de árbitros
 *
 * Uso:
 *   const { url, error } = await uploadFile(file, "noticias");
 *   const { url, error } = await uploadFile(file, "solicitacoes/sol123");
 */

import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../firebase";

/**
 * Gera nome de arquivo único com timestamp.
 */
function uniqueName(file) {
  const ext  = file.name.split(".").pop().toLowerCase();
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  return `${base}_${Date.now()}.${ext}`;
}

/**
 * Comprime uma imagem no browser antes do upload.
 * Redimensiona para maxSize e converte para JPEG com qualidade 0.7.
 * Retorna o File original se não for imagem.
 */
async function compressImage(file, maxSize = 1200, quality = 0.7) {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  // Não comprimir PNGs pequenos (podem ser ícones/assinaturas com transparência)
  if (file.type === "image/png" && file.size < 200 * 1024) return file;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        const scale = maxSize / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (blob && blob.size < file.size) {
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        } else {
          resolve(file); // Original é menor, manter
        }
      }, "image/jpeg", quality);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Faz upload de um arquivo para o Firebase Storage.
 * Imagens são comprimidas automaticamente antes do envio.
 *
 * @param {File}     file        — arquivo a enviar
 * @param {string}   folder      — pasta no Storage (ex: "noticias", "solicitacoes/sol123")
 * @param {function} onProgress  — callback (percent: 0-100) opcional
 * @returns {{ url: string|null, path: string|null, error: string|null }}
 */
export async function uploadFile(file, folder = "uploads", onProgress = null) {
  try {
    const processedFile = await compressImage(file);
    const name     = uniqueName(processedFile);
    const path     = `${folder}/${name}`;
    const fileRef  = ref(storage, path);
    const task     = uploadBytesResumable(fileRef, processedFile);

    await new Promise((resolve, reject) => {
      task.on(
        "state_changed",
        (snap) => {
          if (onProgress) {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            onProgress(pct);
          }
        },
        reject,
        resolve
      );
    });

    const url = await getDownloadURL(fileRef);
    return { url, path, error: null };
  } catch (e) {
    return { url: null, path: null, error: e.message || "Erro no upload." };
  }
}

/**
 * Remove um arquivo do Firebase Storage pela URL ou path.
 *
 * @param {string} urlOrPath — URL do Firebase ou path relativo (ex: "noticias/img_123.jpg")
 */
export async function deleteFile(urlOrPath) {
  if (!urlOrPath) return { error: null };
  // Ignorar URLs que não são do Firebase Storage
  if (urlOrPath.startsWith("http") && !urlOrPath.includes("firebasestorage.googleapis.com")) {
    return { error: null };
  }
  try {
    const fileRef = ref(storage, urlOrPath);
    await deleteObject(fileRef);
    return { error: null };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Mapeamento de pasta por contexto de uso.
 * Facilita chamar uploadFile sem lembrar o nome da pasta.
 */
/**
 * Move um arquivo no Storage: baixa da URL antiga e faz upload no novo path.
 * Retorna { url, path } do novo local.
 */
export async function moveFile(oldUrl, newFolder, fileName) {
  try {
    const res = await fetch(oldUrl);
    if (!res.ok) throw new Error("Falha ao baixar arquivo.");
    const blob = await res.blob();
    const path = `${newFolder}/${fileName}`;
    const fileRef = ref(storage, path);
    await uploadBytesResumable(fileRef, blob);
    const url = await getDownloadURL(fileRef);
    // Excluir o antigo
    try { await deleteObject(ref(storage, oldUrl)); } catch (_) { /* ignora se não achar */ }
    return { url, path, error: null };
  } catch (e) {
    return { url: null, path: null, error: e.message };
  }
}

export const STORAGE_FOLDERS = {
  logo:         "logos",
  favicon:      "logos",
  banner:       "banners",
  noticia:      "noticias",
  galeria:      "galeria",
  evento:       "eventos",
  documento:    "documentos",
  resultado:    "resultados",
  parceiro:     "parceiros",
  equipe:       "equipes",
  pista:        "pistas",
  arbitro:      "arbitros",
  solicitacao:  (id) => `solicitacoes/${id}`,
  solicitacaoOrganizada: (ano, organizador, nomeEvento) => {
    const sanitize = (s) => (s || "sem-nome").replace(/[^a-zA-Z0-9\u00C0-\u024F\s-]/g, "").trim().replace(/\s+/g, "_");
    return `solicitacoes/${ano}/${sanitize(organizador)}/${sanitize(nomeEvento)}`;
  },
  redeSocial:   "redes-sociais",
};
