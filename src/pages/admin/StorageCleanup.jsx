/**
 * StorageCleanup.jsx — Ferramenta de limpeza Firebase (Storage + Firestore).
 * Rota: /admin/storage-cleanup
 *
 * Aba "Storage":       arquivos no Storage sem referência no Firestore (órfãos)
 * Aba "Firestore":     documentos no Firestore com URLs de Storage que não existem mais (referências quebradas)
 * Aba "Docs Órfãos":   documentos filhos (pagamentos, movimentações, arquivos) cuja solicitação não existe mais
 */
import { useState } from "react";
import { ref, listAll, getDownloadURL, deleteObject, getMetadata } from "firebase/storage";
import { collection, getDocs, doc as docRef, updateDoc, deleteDoc } from "firebase/firestore";
import { storage, db } from "../../firebase";
import { deleteFile } from "../../services/storageService";
import AdminLayout from "../../components/admin/AdminLayout";
import { COLORS, FONTS } from "../../styles/colors";

// ─── Config compartilhada ────────────────────────────────────────────────────

const STORAGE_FOLDERS = [
  "banners", "noticias", "galeria", "eventos", "documentos",
  "resultados", "parceiros", "equipes", "pistas", "arbitros",
  "redes-sociais", "institucional", "atletas", "logos", "solicitacoes",
];

const FIRESTORE_SCAN = [
  { col: "banners",                fields: ["image"] },
  { col: "news",                   fields: ["image", "gallery"] },
  { col: "gallery",                fields: ["cover", "images"] },
  { col: "calendar",              fields: ["coverImage", "permitFileUrl", "chancelaFileUrl", "resultsFileUrl", "modalidadesDetalhes"] },
  { col: "documents",             fields: ["fileUrl"] },
  { col: "partners",              fields: ["logo"] },
  { col: "socialLinks",           fields: ["icon"] },
  { col: "institutionalSections", fields: ["image", "fileUrl"] },
  { col: "referees",              fields: ["photo"] },
  { col: "equipes",               fields: ["image", "coverImage"] },
  { col: "resultados",            fields: ["fileUrl"] },
  { col: "pistasHomologadas",     fields: ["image"] },
  { col: "solicitacoes",          fields: ["resultadoFileUrl"] },
  { col: "solicitacaoArquivos",   fields: ["url"] },
  { col: "config",                fields: ["logo", "favicon", "image"] },
];

/** Extrai { field, url } de um doc */
function extractUrlEntries(data, fields) {
  const entries = [];
  for (const field of fields) {
    const val = data[field];
    if (!val) continue;
    if (typeof val === "string" && val.includes("firebasestorage.googleapis.com")) {
      entries.push({ field, url: val });
    } else if (Array.isArray(val)) {
      val.forEach((item, i) => {
        if (typeof item === "string" && item.includes("firebasestorage.googleapis.com")) {
          entries.push({ field: `${field}[${i}]`, url: item });
        } else if (item?.url?.includes("firebasestorage.googleapis.com")) {
          entries.push({ field: `${field}[${i}].url`, url: item.url });
        }
        if (item?.permitFileUrl?.includes("firebasestorage.googleapis.com"))
          entries.push({ field: `${field}[${i}].permitFileUrl`, url: item.permitFileUrl });
        if (item?.resultsFileUrl?.includes("firebasestorage.googleapis.com"))
          entries.push({ field: `${field}[${i}].resultsFileUrl`, url: item.resultsFileUrl });
      });
    }
  }
  return entries;
}

/** Lista recursivamente todos os arquivos de uma pasta no Storage */
async function listAllFiles(folderRef) {
  const result = await listAll(folderRef);
  let files = [...result.items];
  for (const prefix of result.prefixes) {
    files = files.concat(await listAllFiles(prefix));
  }
  return files;
}

/** Verifica se uma URL do Storage ainda existe */
async function urlExists(url) {
  try {
    const fileRef = ref(storage, url);
    await getMetadata(fileRef);
    return true;
  } catch {
    return false;
  }
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const sty = {
  card: { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20 },
  btn: { padding: "10px 22px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, textTransform: "uppercase" },
  btnSm: { padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase" },
  logBox: { background: "#1a1a1a", color: "#aaa", borderRadius: 8, padding: 16, maxHeight: 200, overflow: "auto", fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap" },
  th: { padding: "8px 6px", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: COLORS.gray },
};

// ─── Aba Storage (órfãos) ────────────────────────────────────────────────────

function StorageTab() {
  const [status, setStatus] = useState("idle");
  const [log, setLog] = useState([]);
  const [orphans, setOrphans] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState(null);

  const addLog = (msg) => setLog(p => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const scan = async () => {
    setStatus("scanning"); setLog([]); setOrphans([]); setSelected(new Set()); setStats(null);
    try {
      addLog("Coletando URLs do Firestore...");
      const allUrls = new Set();
      for (const { col, fields } of FIRESTORE_SCAN) {
        if (!fields.length) continue;
        try {
          const snap = await getDocs(collection(db, col));
          snap.forEach(d => extractUrlEntries(d.data(), fields).forEach(e => allUrls.add(e.url.split("?")[0])));
          addLog(`  ${col}: ${snap.size} docs`);
        } catch (e) { addLog(`  ${col}: erro - ${e.message}`); }
      }
      addLog(`URLs referenciadas: ${allUrls.size}`);
      addLog("Listando arquivos no Storage...");
      let totalFiles = 0;
      const orphanList = [];
      for (const folder of STORAGE_FOLDERS) {
        try {
          const files = await listAllFiles(ref(storage, folder));
          totalFiles += files.length;
          addLog(`  ${folder}/: ${files.length} arquivos`);
          for (const fileRef of files) {
            try {
              const url = await getDownloadURL(fileRef);
              if (!allUrls.has(url.split("?")[0])) {
                orphanList.push({ ref: fileRef, url, path: fileRef.fullPath, folder });
              }
            } catch { /* deletado entre listAll e getDownloadURL */ }
          }
        } catch (e) { addLog(`  ${folder}/: erro - ${e.message}`); }
      }
      addLog(`Total: ${totalFiles} arquivos | ${orphanList.length} órfãos`);
      setOrphans(orphanList);
      setStats({ totalFiles, totalUrls: allUrls.size, totalOrphans: orphanList.length });
      setStatus("done");
    } catch (e) { addLog(`ERRO: ${e.message}`); setStatus("error"); }
  };

  const toggleSelect = (path) => setSelected(p => { const n = new Set(p); n.has(path) ? n.delete(path) : n.add(path); return n; });
  const selectAll = () => setSelected(selected.size === orphans.length ? new Set() : new Set(orphans.map(o => o.path)));

  const deleteSelected = async () => {
    if (!selected.size || !confirm(`Excluir ${selected.size} arquivo(s) órfão(s)? Irreversível.`)) return;
    setDeleting(true);
    let deleted = 0;
    for (const o of orphans) {
      if (!selected.has(o.path)) continue;
      try { await deleteObject(o.ref); deleted++; addLog(`Excluído: ${o.path}`); }
      catch (e) { addLog(`Erro: ${o.path} - ${e.message}`); }
    }
    addLog(`${deleted} arquivo(s) excluído(s).`);
    setOrphans(p => p.filter(o => !selected.has(o.path)));
    setSelected(new Set()); setDeleting(false);
  };

  return (
    <>
      <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: "0 0 20px" }}>
        Arquivos no Storage que <strong>nenhum documento</strong> no Firestore referencia.
      </p>
      <div style={{ marginBottom: 24 }}>
        <button onClick={scan} disabled={status === "scanning"}
          style={{ ...sty.btn, background: COLORS.primary, color: "#fff", opacity: status === "scanning" ? 0.6 : 1 }}>
          {status === "scanning" ? "Varrendo..." : "Iniciar Varredura"}
        </button>
      </div>
      {stats && (
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Arquivos no Storage", value: stats.totalFiles, color: COLORS.dark },
            { label: "URLs no Firestore", value: stats.totalUrls, color: "#0066cc" },
            { label: "Órfãos", value: stats.totalOrphans, color: stats.totalOrphans > 0 ? "#dc2626" : "#15803d" },
          ].map((s, i) => (
            <div key={i} style={{ ...sty.card, flex: 1, textAlign: "center", marginBottom: 0 }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: 32, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {orphans.length > 0 && (
        <div style={sty.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, color: COLORS.dark, margin: 0, textTransform: "uppercase" }}>
              Órfãos ({orphans.length})
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={selectAll} style={{ ...sty.btnSm, background: COLORS.grayLight, color: COLORS.dark }}>
                {selected.size === orphans.length ? "Desmarcar" : "Selecionar todos"}
              </button>
              <button onClick={deleteSelected} disabled={!selected.size || deleting}
                style={{ ...sty.btnSm, background: selected.size ? "#dc2626" : COLORS.grayLight, color: selected.size ? "#fff" : COLORS.gray }}>
                {deleting ? "Excluindo..." : `Excluir (${selected.size})`}
              </button>
            </div>
          </div>
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONTS.body, fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.grayLight}`, textAlign: "left" }}>
                  <th style={{ ...sty.th, width: 32 }}></th>
                  <th style={sty.th}>Pasta</th>
                  <th style={sty.th}>Arquivo</th>
                  <th style={sty.th}>Preview</th>
                </tr>
              </thead>
              <tbody>
                {orphans.map(o => {
                  const name = o.path.split("/").pop();
                  const isImg = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
                  return (
                    <tr key={o.path} onClick={() => toggleSelect(o.path)}
                      style={{ borderBottom: `1px solid ${COLORS.grayLight}`, cursor: "pointer", background: selected.has(o.path) ? "#fff5f5" : "transparent" }}>
                      <td style={{ padding: "8px 6px" }}><input type="checkbox" checked={selected.has(o.path)} readOnly /></td>
                      <td style={{ padding: "8px 6px" }}><span style={{ padding: "2px 8px", borderRadius: 4, background: COLORS.grayLight, fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700 }}>{o.folder}</span></td>
                      <td style={{ padding: "8px 6px", wordBreak: "break-all", color: COLORS.dark }}>{name}</td>
                      <td style={{ padding: "8px 6px" }}>
                        {isImg ? <img src={o.url} alt="" style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 4 }} />
                          : <span style={{ fontSize: 11, color: COLORS.gray }}>{/\.pdf$/i.test(name) ? "PDF" : "Arquivo"}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {status === "done" && orphans.length === 0 && (
        <div style={{ ...sty.card, textAlign: "center", padding: "48px 24px" }}>
          <p style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 700, color: "#15803d", margin: 0 }}>Nenhum arquivo órfão!</p>
        </div>
      )}
      {log.length > 0 && (
        <div style={sty.card}>
          <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, color: COLORS.dark, margin: "0 0 12px", textTransform: "uppercase" }}>Log</h3>
          <div style={sty.logBox}>{log.join("\n")}</div>
        </div>
      )}
    </>
  );
}

// ─── Aba Firestore (referências quebradas) ───────────────────────────────────

function FirestoreTab() {
  const [status, setStatus] = useState("idle");
  const [log, setLog] = useState([]);
  const [broken, setBroken] = useState([]); // { col, docId, field, url, title }
  const [selected, setSelected] = useState(new Set());
  const [cleaning, setCleaning] = useState(false);
  const [stats, setStats] = useState(null);

  const addLog = (msg) => setLog(p => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const scan = async () => {
    setStatus("scanning"); setLog([]); setBroken([]); setSelected(new Set()); setStats(null);
    try {
      addLog("Varrendo documentos do Firestore...");
      let totalDocs = 0, totalUrls = 0;
      const brokenList = [];

      for (const { col, fields } of FIRESTORE_SCAN) {
        if (!fields.length) continue;
        try {
          const snap = await getDocs(collection(db, col));
          addLog(`  ${col}: ${snap.size} docs`);
          totalDocs += snap.size;

          for (const d of snap.docs) {
            const data = d.data();
            const entries = extractUrlEntries(data, fields);
            totalUrls += entries.length;

            for (const { field, url } of entries) {
              const exists = await urlExists(url);
              if (!exists) {
                brokenList.push({
                  col,
                  docId: d.id,
                  field,
                  url,
                  title: data.title || data.name || data.nome || data.nomeEvento || d.id,
                });
                addLog(`    QUEBRADO: ${col}/${d.id} → ${field}`);
              }
            }
          }
        } catch (e) { addLog(`  ${col}: erro - ${e.message}`); }
      }

      addLog(`Total: ${totalDocs} docs | ${totalUrls} URLs | ${brokenList.length} quebradas`);
      setBroken(brokenList);
      setStats({ totalDocs, totalUrls, totalBroken: brokenList.length });
      setStatus("done");
    } catch (e) { addLog(`ERRO: ${e.message}`); setStatus("error"); }
  };

  const key = (b) => `${b.col}/${b.docId}/${b.field}`;
  const toggleSelect = (k) => setSelected(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const selectAll = () => setSelected(selected.size === broken.length ? new Set() : new Set(broken.map(key)));

  const cleanSelected = async () => {
    if (!selected.size || !confirm(`Limpar ${selected.size} referência(s) quebrada(s) no Firestore?\nOs campos serão definidos como vazio ("").`)) return;
    setCleaning(true);
    let cleaned = 0;
    for (const b of broken) {
      if (!selected.has(key(b))) continue;
      try {
        // Tratar campos simples (field) e campos em array (field[i].prop)
        const simpleField = b.field.match(/^([a-zA-Z]+)$/);
        if (simpleField) {
          await updateDoc(docRef(db, b.col, b.docId), { [b.field]: "" });
          cleaned++;
          addLog(`Limpo: ${b.col}/${b.docId}.${b.field}`);
        } else {
          // Campo dentro de array — precisa ler, modificar e salvar
          const snap = await getDocs(collection(db, b.col));
          const d = snap.docs.find(d => d.id === b.docId);
          if (d) {
            const data = d.data();
            const match = b.field.match(/^(\w+)\[(\d+)\](?:\.(\w+))?$/);
            if (match) {
              const [, arrField, idx, prop] = match;
              const arr = [...(data[arrField] || [])];
              if (prop) {
                arr[+idx] = { ...arr[+idx], [prop]: "" };
              } else {
                arr[+idx] = "";
              }
              await updateDoc(docRef(db, b.col, b.docId), { [arrField]: arr });
              cleaned++;
              addLog(`Limpo: ${b.col}/${b.docId}.${b.field}`);
            }
          }
        }
      } catch (e) { addLog(`Erro: ${b.col}/${b.docId}.${b.field} - ${e.message}`); }
    }
    addLog(`${cleaned} referência(s) limpa(s).`);
    setBroken(p => p.filter(b => !selected.has(key(b))));
    setSelected(new Set()); setCleaning(false);
  };

  return (
    <>
      <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: "0 0 20px" }}>
        Documentos no Firestore que referenciam arquivos que <strong>não existem mais</strong> no Storage.
      </p>
      <div style={{ marginBottom: 24 }}>
        <button onClick={scan} disabled={status === "scanning"}
          style={{ ...sty.btn, background: "#0066cc", color: "#fff", opacity: status === "scanning" ? 0.6 : 1 }}>
          {status === "scanning" ? "Varrendo..." : "Iniciar Varredura"}
        </button>
      </div>
      {stats && (
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Documentos varridos", value: stats.totalDocs, color: COLORS.dark },
            { label: "URLs verificadas", value: stats.totalUrls, color: "#0066cc" },
            { label: "Referências quebradas", value: stats.totalBroken, color: stats.totalBroken > 0 ? "#dc2626" : "#15803d" },
          ].map((s, i) => (
            <div key={i} style={{ ...sty.card, flex: 1, textAlign: "center", marginBottom: 0 }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: 32, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {broken.length > 0 && (
        <div style={sty.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, color: COLORS.dark, margin: 0, textTransform: "uppercase" }}>
              Referências quebradas ({broken.length})
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={selectAll} style={{ ...sty.btnSm, background: COLORS.grayLight, color: COLORS.dark }}>
                {selected.size === broken.length ? "Desmarcar" : "Selecionar todos"}
              </button>
              <button onClick={cleanSelected} disabled={!selected.size || cleaning}
                style={{ ...sty.btnSm, background: selected.size ? "#dc2626" : COLORS.grayLight, color: selected.size ? "#fff" : COLORS.gray }}>
                {cleaning ? "Limpando..." : `Limpar campos (${selected.size})`}
              </button>
            </div>
          </div>
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONTS.body, fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.grayLight}`, textAlign: "left" }}>
                  <th style={{ ...sty.th, width: 32 }}></th>
                  <th style={sty.th}>Coleção</th>
                  <th style={sty.th}>Documento</th>
                  <th style={sty.th}>Campo</th>
                  <th style={sty.th}>URL quebrada</th>
                </tr>
              </thead>
              <tbody>
                {broken.map(b => {
                  const k = key(b);
                  return (
                    <tr key={k} onClick={() => toggleSelect(k)}
                      style={{ borderBottom: `1px solid ${COLORS.grayLight}`, cursor: "pointer", background: selected.has(k) ? "#fff5f5" : "transparent" }}>
                      <td style={{ padding: "8px 6px" }}><input type="checkbox" checked={selected.has(k)} readOnly /></td>
                      <td style={{ padding: "8px 6px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 4, background: "#eff6ff", color: "#0066cc", fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700 }}>{b.col}</span>
                      </td>
                      <td style={{ padding: "8px 6px", color: COLORS.dark, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={b.docId}>
                        {b.title}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <code style={{ fontSize: 11, background: "#f5f5f5", padding: "2px 6px", borderRadius: 4 }}>{b.field}</code>
                      </td>
                      <td style={{ padding: "8px 6px", fontSize: 11, color: "#dc2626", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={b.url}>
                        {b.url.split("/o/")[1]?.split("?")[0]?.replace(/%2F/g, "/") || b.url}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {status === "done" && broken.length === 0 && (
        <div style={{ ...sty.card, textAlign: "center", padding: "48px 24px" }}>
          <p style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 700, color: "#15803d", margin: 0 }}>Nenhuma referencia quebrada!</p>
        </div>
      )}
      {log.length > 0 && (
        <div style={sty.card}>
          <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, color: COLORS.dark, margin: "0 0 12px", textTransform: "uppercase" }}>Log</h3>
          <div style={sty.logBox}>{log.join("\n")}</div>
        </div>
      )}
    </>
  );
}

// ─── Aba Docs Órfãos (pagamentos, movimentações, arquivos sem solicitação) ──

const ORPHAN_COLLECTIONS = [
  // Filhos de solicitações
  { col: "solicitacaoArquivos", fk: "solicitacaoId", parent: "solicitacoes", label: "Arquivos de solicitação", hasStorage: true },
  { col: "pagamentos",         fk: "solicitacaoId", parent: "solicitacoes", label: "Pagamentos",              hasStorage: false },
  { col: "movimentacoes",      fk: "solicitacaoId", parent: "solicitacoes", label: "Movimentações",           hasStorage: false },
  // Eventos de arbitragem órfãos (calendarRef → calendar inexistente)
  { col: "refereeEvents",       fk: "calendarRef", parent: "calendar", label: "Eventos árbitro (sem evento calendário)", hasStorage: false, fkOptional: true },
  // Filhos de eventos de arbitragem
  { col: "refereeAssignments",  fk: "eventId", parent: "refereeEvents", label: "Escalações (diárias)",     hasStorage: false },
  { col: "refereeAvailability", fk: "eventId", parent: "refereeEvents", label: "Disponibilidades árbitro", hasStorage: false },
  { col: "reembolsos",          fk: "eventId", parent: "refereeEvents", label: "Reembolsos",               hasStorage: false },
  { col: "relatoriosArbitragem",fk: "eventId", parent: "refereeEvents", label: "Relatórios arbitragem",    hasStorage: false },
  { col: "diarias",             fk: "eventId", parent: "refereeEvents", label: "Diárias",                  hasStorage: false },
  { col: "avaliacoes",          fk: "eventId", parent: "refereeEvents", label: "Avaliações",               hasStorage: false },
];

function OrphanDocsTab() {
  const [status, setStatus] = useState("idle");
  const [log, setLog] = useState([]);
  const [orphans, setOrphans] = useState([]); // { col, docId, fk, label, title, data }
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState(null);

  const addLog = (msg) => setLog(p => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const scan = async () => {
    setStatus("scanning"); setLog([]); setOrphans([]); setSelected(new Set()); setStats(null);
    try {
      // Carregar IDs das coleções-pai
      const parentCols = [...new Set(ORPHAN_COLLECTIONS.map(c => c.parent))];
      const parentIds = {};
      for (const p of parentCols) {
        const snap = await getDocs(collection(db, p));
        parentIds[p] = new Set(snap.docs.map(d => d.id));
        addLog(`${p}: ${parentIds[p].size} docs`);
      }

      let totalDocs = 0;
      const orphanList = [];

      for (const { col, fk, parent, label, hasStorage, fkOptional } of ORPHAN_COLLECTIONS) {
        try {
          const snap = await getDocs(collection(db, col));
          addLog(`  ${col}: ${snap.size} docs`);
          totalDocs += snap.size;
          const ids = parentIds[parent];

          for (const d of snap.docs) {
            const data = d.data();
            const refId = data[fk];
            // Se FK é opcional (ex: refereeEvents manuais sem calendarRef), pular docs sem FK
            if (!refId) { if (!fkOptional) continue; else continue; }
            if (!ids.has(refId)) {
              orphanList.push({
                col, docId: d.id, fk: refId, label, hasStorage, parent,
                title: data.nome || data.descricao || data.tipo || data.title || data.event || d.id,
                storageUrl: data.url || data.storagePath || "",
              });
            }
          }
        } catch (e) { addLog(`  ${col}: erro - ${e.message}`); }
      }

      addLog(`Total: ${totalDocs} docs varridos | ${orphanList.length} órfãos`);
      setOrphans(orphanList);
      const totalParents = Object.values(parentIds).reduce((s, set) => s + set.size, 0);
      setStats({ totalDocs, totalOrphans: orphanList.length, totalParents });
      setStatus("done");
    } catch (e) { addLog(`ERRO: ${e.message}`); setStatus("error"); }
  };

  const key = (o) => `${o.col}/${o.docId}`;
  const toggleSelect = (k) => setSelected(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const selectAll = () => setSelected(selected.size === orphans.length ? new Set() : new Set(orphans.map(key)));

  // Coleções filhas de refereeEvents para cascata
  const REF_EVENT_CHILDREN = ["refereeAssignments", "refereeAvailability", "reembolsos", "relatoriosArbitragem", "diarias", "avaliacoes"];

  const deleteSelected = async () => {
    if (!selected.size || !confirm(`Excluir ${selected.size} documento(s) órfão(s) do Firestore?\nArquivos no Storage também serão removidos.\nAção irreversível.`)) return;
    setDeleting(true);
    let deleted = 0;
    const removedKeys = new Set();
    for (const o of orphans) {
      if (!selected.has(key(o))) continue;
      try {
        // Se for arquivo com Storage, excluir do Storage primeiro
        if (o.hasStorage && o.storageUrl) {
          await deleteFile(o.storageUrl).catch(() => {});
        }
        // Se for refereeEvent, excluir filhos em cascata
        if (o.col === "refereeEvents") {
          for (const childCol of REF_EVENT_CHILDREN) {
            const childSnap = await getDocs(collection(db, childCol));
            const children = childSnap.docs.filter(d => d.data().eventId === o.docId);
            for (const c of children) {
              await deleteDoc(docRef(db, childCol, c.id));
              addLog(`  Cascata: ${childCol}/${c.id}`);
              deleted++;
              removedKeys.add(`${childCol}/${c.id}`);
            }
          }
        }
        await deleteDoc(docRef(db, o.col, o.docId));
        deleted++;
        removedKeys.add(key(o));
        addLog(`Excluído: ${o.col}/${o.docId}`);
      } catch (e) { addLog(`Erro: ${o.col}/${o.docId} - ${e.message}`); }
    }
    addLog(`${deleted} documento(s) excluído(s).`);
    setOrphans(p => p.filter(o => !selected.has(key(o)) && !removedKeys.has(key(o))));
    setSelected(new Set()); setDeleting(false);
  };

  // Agrupar por coleção para exibição
  const grouped = ORPHAN_COLLECTIONS.map(c => ({
    ...c,
    items: orphans.filter(o => o.col === c.col),
  })).filter(g => g.items.length > 0);

  return (
    <>
      <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: "0 0 20px" }}>
        Documentos no Firestore (pagamentos, movimentações, arquivos) cuja <strong>solicitação não existe mais</strong>.
      </p>
      <div style={{ marginBottom: 24 }}>
        <button onClick={scan} disabled={status === "scanning"}
          style={{ ...sty.btn, background: "#7c3aed", color: "#fff", opacity: status === "scanning" ? 0.6 : 1 }}>
          {status === "scanning" ? "Varrendo..." : "Iniciar Varredura"}
        </button>
      </div>
      {stats && (
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Docs-pai ativos", value: stats.totalParents, color: COLORS.dark },
            { label: "Docs filhos varridos", value: stats.totalDocs, color: "#7c3aed" },
            { label: "Órfãos", value: stats.totalOrphans, color: stats.totalOrphans > 0 ? "#dc2626" : "#15803d" },
          ].map((s, i) => (
            <div key={i} style={{ ...sty.card, flex: 1, textAlign: "center", marginBottom: 0 }}>
              <div style={{ fontFamily: FONTS.heading, fontSize: 32, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {orphans.length > 0 && (
        <div style={sty.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, color: COLORS.dark, margin: 0, textTransform: "uppercase" }}>
              Documentos órfãos ({orphans.length})
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={selectAll} style={{ ...sty.btnSm, background: COLORS.grayLight, color: COLORS.dark }}>
                {selected.size === orphans.length ? "Desmarcar" : "Selecionar todos"}
              </button>
              <button onClick={deleteSelected} disabled={!selected.size || deleting}
                style={{ ...sty.btnSm, background: selected.size ? "#dc2626" : COLORS.grayLight, color: selected.size ? "#fff" : COLORS.gray }}>
                {deleting ? "Excluindo..." : `Excluir (${selected.size})`}
              </button>
            </div>
          </div>
          <div style={{ maxHeight: 500, overflow: "auto" }}>
            {grouped.map(g => (
              <div key={g.col} style={{ marginBottom: 20 }}>
                <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, color: "#7c3aed", margin: "0 0 8px", textTransform: "uppercase" }}>
                  {g.label} ({g.items.length})
                </h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONTS.body, fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${COLORS.grayLight}`, textAlign: "left" }}>
                      <th style={{ ...sty.th, width: 32 }}></th>
                      <th style={sty.th}>Doc ID</th>
                      <th style={sty.th}>Descrição</th>
                      <th style={sty.th}>Pai inexistente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map(o => {
                      const k = key(o);
                      return (
                        <tr key={k} onClick={() => toggleSelect(k)}
                          style={{ borderBottom: `1px solid ${COLORS.grayLight}`, cursor: "pointer", background: selected.has(k) ? "#fff5f5" : "transparent" }}>
                          <td style={{ padding: "8px 6px" }}><input type="checkbox" checked={selected.has(k)} readOnly /></td>
                          <td style={{ padding: "8px 6px", color: COLORS.dark, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, fontFamily: "monospace" }}
                            title={o.docId}>{o.docId}</td>
                          <td style={{ padding: "8px 6px", color: COLORS.dark }}>{o.title}</td>
                          <td style={{ padding: "8px 6px", fontSize: 11, color: "#dc2626", fontFamily: "monospace" }}
                            title={`${o.parent}/${o.fk}`}>
                            <span style={{ color: COLORS.gray }}>{o.parent}/</span>{o.fk.substring(0, 16)}...
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
      {status === "done" && orphans.length === 0 && (
        <div style={{ ...sty.card, textAlign: "center", padding: "48px 24px" }}>
          <p style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 700, color: "#15803d", margin: 0 }}>Nenhum documento orfao!</p>
        </div>
      )}
      {log.length > 0 && (
        <div style={sty.card}>
          <h3 style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, color: COLORS.dark, margin: "0 0 12px", textTransform: "uppercase" }}>Log</h3>
          <div style={sty.logBox}>{log.join("\n")}</div>
        </div>
      )}
    </>
  );
}

// ─── Componente principal com abas ───────────────────────────────────────────

export default function StorageCleanup() {
  const [tab, setTab] = useState("storage");

  const tabBtn = (id, label, icon, color) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: "10px 24px", borderRadius: "8px 8px 0 0", border: "none",
        borderBottom: tab === id ? `3px solid ${color}` : "3px solid transparent",
        background: tab === id ? "#fff" : "transparent",
        color: tab === id ? color : COLORS.gray,
        fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800,
        cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.5,
      }}>
      {icon} {label}
    </button>
  );

  return (
    <AdminLayout>
      <div style={{ padding: 40 }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, color: COLORS.dark, margin: "0 0 24px", textTransform: "uppercase" }}>
          Limpeza Firebase
        </h1>

        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: `1px solid ${COLORS.grayLight}` }}>
          {tabBtn("storage", "Storage", "", COLORS.primary)}
          {tabBtn("firestore", "Firestore", "", "#0066cc")}
          {tabBtn("orphans", "Docs Orfaos", "", "#7c3aed")}
        </div>

        {tab === "storage" && <StorageTab />}
        {tab === "firestore" && <FirestoreTab />}
        {tab === "orphans" && <OrphanDocsTab />}
      </div>
    </AdminLayout>
  );
}
