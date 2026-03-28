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
 * Faz upload de um arquivo para o Firebase Storage.
 *
 * @param {File}     file        — arquivo a enviar
 * @param {string}   folder      — pasta no Storage (ex: "noticias", "solicitacoes/sol123")
 * @param {function} onProgress  — callback (percent: 0-100) opcional
 * @returns {{ url: string|null, path: string|null, error: string|null }}
 */
export async function uploadFile(file, folder = "uploads", onProgress = null) {
  try {
    const name     = uniqueName(file);
    const path     = `${folder}/${name}`;
    const fileRef  = ref(storage, path);
    const task     = uploadBytesResumable(fileRef, file);

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
    console.error("storageService.uploadFile:", e);
    return { url: null, path: null, error: e.message || "Erro no upload." };
  }
}

/**
 * Remove um arquivo do Firebase Storage pela URL ou path.
 *
 * @param {string} urlOrPath — URL do Firebase ou path relativo (ex: "noticias/img_123.jpg")
 */
export async function deleteFile(urlOrPath) {
  try {
    const fileRef = urlOrPath.startsWith("http")
      ? ref(storage, urlOrPath)
      : ref(storage, urlOrPath);
    await deleteObject(fileRef);
    return { error: null };
  } catch (e) {
    console.error("storageService.deleteFile:", e);
    return { error: e.message };
  }
}

/**
 * Mapeamento de pasta por contexto de uso.
 * Facilita chamar uploadFile sem lembrar o nome da pasta.
 */
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
  redeSocial:   "redes-sociais",
};
