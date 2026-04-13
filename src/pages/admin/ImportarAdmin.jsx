/**
 * ImportarAdmin.jsx — Importação em massa do calendário via planilha XLSX
 * Rota: /admin/importar
 *
 * Fluxo:
 *  1. Upload da planilha .xlsx
 *  2. Parse e validação das linhas
 *  3. Preview com status de cada evento
 *  4. Para cada linha com link do Drive: faz download + upload para Firebase Storage
 *  5. Para cada linha com CEP: geocodifica via ViaCEP + Nominatim
 *  6. Importação em lote para o Firestore
 */
import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { COLORS, FONTS } from "../../styles/colors";
import { uploadFile } from "../../services/storageService";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MESES = {
  janeiro:1, fevereiro:2, março:3, marco:3, abril:4, maio:5, junho:6,
  julho:7, agosto:8, setembro:9, outubro:10, novembro:11, dezembro:12,
};

function parseDate(val) {
  if (!val) return "";
  const s = String(val).trim();

  // DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split("/");
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  // DD-MM-AAAA
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [d, m, y] = s.split("-");
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  // AAAA-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/AA
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(s)) {
    const [d, m, y] = s.split("/");
    return `20${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  // "25 de janeiro de 2026" ou "25 de janeiro 2026"
  const ext = s.toLowerCase().match(/^(\d{1,2})\s+de\s+([a-záéíóúãõç]+)\s+(?:de\s+)?(\d{4})$/);
  if (ext) {
    const dia = ext[1].padStart(2, "0");
    const mes = MESES[ext[2].normalize("NFD").replace(/[\u0300-\u036f]/g,"")];
    const ano = ext[3];
    if (mes) return `${ano}-${String(mes).padStart(2,"0")}-${dia}`;
  }
  // "janeiro 25, 2026" ou "25 janeiro 2026"
  const ext2 = s.toLowerCase().match(/^(\d{1,2})\s+([a-záéíóúãõç]+)\s+(\d{4})$/);
  if (ext2) {
    const dia = ext2[1].padStart(2, "0");
    const mes = MESES[ext2[2].normalize("NFD").replace(/[\u0300-\u036f]/g,"")];
    const ano = ext2[3];
    if (mes) return `${ano}-${String(mes).padStart(2,"0")}-${dia}`;
  }
  // Excel serial number
  if (!isNaN(Number(s)) && Number(s) > 1000) {
    const d = new Date((Number(s) - 25569) * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  return s;
}

function parseBool(val) {
  if (!val) return false;
  return String(val).trim().toUpperCase() === "SIM";
}

function parseModalidades(val) {
  if (!val) return [];
  return String(val).split(",").map(s => s.trim()).filter(Boolean);
}


function normalizeModalidade(val) {
  if (!val) return "Geral";
  const s = String(val).trim();

  // Já tem unidade — retorna como está (ex: "5km", "21km", "Sub-18", "Meia")
  if (/km|m|milha|miles|sub|cat|geral|open|elite|pcd|cadeira/i.test(s)) return s;

  // Só número → assume km (ex: "5" → "5km", "10.5" → "10,5km")
  if (/^[\d.,]+$/.test(s)) {
    const num = parseFloat(s.replace(",", "."));
    if (!isNaN(num)) {
      // Formata bonito: inteiros sem decimal, frações com vírgula
      const fmt = Number.isInteger(num) ? String(num) : String(num).replace(".", ",");
      return `${fmt}km`;
    }
  }

  // "5 km", "10 KM", "21 Km" → normaliza espaço
  const comEspaco = s.match(/^([\d.,]+)\s*km$/i);
  if (comEspaco) {
    const num = parseFloat(comEspaco[1].replace(",", "."));
    const fmt = Number.isInteger(num) ? String(num) : String(num).replace(".", ",");
    return `${fmt}km`;
  }

  // "meia" → "21km", "maratona" → "42km", "ultra" → "Ultra"
  const apelidos = {
    meia: "21km", "meia maratona": "21km", "meia-maratona": "21km",
    maratona: "42km", "42k": "42km", "ultra": "Ultra",
    "5k": "5km", "10k": "10km", "15k": "15km",
    "21k": "21km",
  };
  const lower = s.toLowerCase();
  if (apelidos[lower]) return apelidos[lower];

  // Fallback — retorna como está
  return s;
}

async function geocodeCep(cep, numero = "", complemento = "") {
  try {
    const raw = String(cep).replace(/\D/g, "");
    if (raw.length !== 8) return null;
    const via = await fetch(`https://viacep.com.br/ws/${raw}/json/`).then(r => r.json());
    if (via.erro) return null;

    const num = numero ? `, ${numero}` : "";
    const queries = [
      `${via.logradouro}${num}, ${via.bairro}, ${via.localidade}, ${via.uf}, Brasil`,
      `${via.logradouro}, ${via.localidade}, ${via.uf}, Brasil`,
      `${via.localidade}, ${via.uf}, Brasil`,
    ];
    let coords = null;
    for (const q of queries) {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=br`,
        { headers: { "User-Agent": "FMA-Site/1.0", "Accept-Language": "pt-BR" } }
      ).then(r => r.json());
      if (geo.length) { coords = { lat: parseFloat(geo[0].lat), lng: parseFloat(geo[0].lon) }; break; }
    }
    return {
      logradouro: via.logradouro || "",
      bairro: via.bairro || "",
      cidade: via.localidade || "",
      estado: via.uf || "",
      cep: via.cep || raw,
      location: [via.logradouro, numero, complemento, via.bairro].filter(Boolean).join(", "),
      ...coords,
    };
  } catch { return null; }
}



async function migrateFile(driveUrl, folder) {
  // Salva o link do Drive diretamente.
  // Eventos novos inseridos pelo admin usarão o Firebase Storage automaticamente.
  if (!driveUrl || !driveUrl.startsWith("http")) return null;
  return driveUrl;
}

const STATUS_ICON = { ok: "OK", erro: "X", aviso: "!", processando: "...", pendente: "○" };
const STATUS_COLOR = { ok: "#166534", erro: "#991b1b", aviso: "#92400e", processando: "#1e40af", pendente: "#6b7280" };
const STATUS_BG    = { ok: "#f0fdf4", erro: "#fef2f2", aviso: "#fffbeb", processando: "#eff6ff", pendente: "#f9fafb" };

// ── Componente principal ──────────────────────────────────────────────────────
export default function ImportarAdmin() {
  const [fase, setFase]           = useState("upload"); // upload | preview | importando | concluido
  const [rows, setRows]           = useState([]);
  const [rowStatus, setRowStatus] = useState({}); // { idx: { status, msg } }
  const [dragging, setDragging]   = useState(false);
  const [parseError, setParseError] = useState("");
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });
  const [resumo, setResumo]       = useState(null);
  const inputRef = useRef();

  const setStatus = useCallback((idx, status, msg = "") => {
    setRowStatus(prev => ({ ...prev, [idx]: { status, msg } }));
  }, []);

  // ── Parse da planilha ────────────────────────────────────────────────────────
  async function handleFile(file) {
    if (!file) return;
    setParseError("");
    try {
      const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { type: "array", cellDates: true });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      // Pula cabeçalhos (linhas 1-9) e lê dados a partir da linha 10
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 9 });

      // Detectar e pular linha de cabeçalho (ex: "Título", "Data", "Cidade"...)
      const rows = data.filter(r => r.some(c => c !== undefined && c !== ""));
      if (rows.length > 0) {
        const first = String(rows[0][0] || "").trim().toLowerCase();
        if (first === "título" || first === "titulo" || first === "title") {
          rows.shift();
        }
      }

      const parsed = rows
        .map((r, i) => ({
          _idx: i,
          titulo:         String(r[0] || "").trim(),
          data:           parseDate(r[1]),
          horario:        String(r[2] || "").trim(),
          category:       String(r[3] || "corrida").trim().toLowerCase(),
          status:         String(r[4] || "confirmado").trim().toLowerCase(),
          cep:            String(r[5] || "").replace(/\D/g, ""),
          numero:         String(r[6] || "").trim(),
          complemento:    String(r[7] || "").trim(),
          location:       String(r[8] || "").trim(),
          city:           String(r[9] || "").trim(),
          organizer:      String(r[10] || "").trim(),
          modalidade:     normalizeModalidade(r[11]),
          descricaoModalidade: String(r[12] || "").trim(),
          externalLink:   String(r[13] || "").trim(),
          _driveRegulamento: String(r[14] || "").trim(),
          _drivePermit:   String(r[15] || "").trim(),
          _driveResultado: String(r[16] || "").trim(),
          featured:       parseBool(r[17]),
          published:      parseBool(r[18]),
        }))
        .filter(r => r.titulo); // ignora linhas sem título

      if (parsed.length === 0) {
        setParseError("Nenhum evento encontrado. Verifique se a planilha está no formato correto.");
        return;
      }

      // Validação inicial
      const statusInit = {};
      parsed.forEach((row, i) => {
        const erros = [];
        if (!row.titulo)    erros.push("Título obrigatório");
        if (!row.data)      erros.push("Data obrigatória");
        if (!row.city)      erros.push("Cidade obrigatória");
        if (!row.modalidade) erros.push("Modalidade obrigatória");
        statusInit[i] = erros.length
          ? { status: "aviso", msg: erros.join(", ") }
          : { status: "pendente", msg: "" };
      });

      setRows(parsed);
      setRowStatus(statusInit);
      setFase("preview");
    } catch (e) {
      setParseError(`Erro ao ler planilha: ${e.message}`);
    }
  }

  // ── Importação ───────────────────────────────────────────────────────────────
  async function iniciarImportacao() {
    setFase("importando");
    setProgresso({ atual: 0, total: Object.keys(rows.reduce((g,r) => { const k=`${r.titulo}|||${r.data}`; g[k]=1; return g; }, {})).length });

    const { calendarAPI } = await import("../../data/api");
    let ok = 0, erros = 0;
    const eventosBatch = [];

    // Agrupar linhas por titulo + data
    const grupos = {};
    rows.forEach((row, i) => {
      const chave = `${row.titulo}|||${row.data}`;
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push({ row, i });
    });

    let eventoIdx = 0;
    const totalEventos = Object.keys(grupos).length;

    for (const [chave, linhas] of Object.entries(grupos)) {
      const primeiraLinha = linhas[0].row;
      const idxs = linhas.map(l => l.i);

      // Marca todas as linhas do grupo como processando
      idxs.forEach(i => setStatus(i, "processando", "Processando..."));
      setProgresso({ atual: ++eventoIdx, total: totalEventos });

      try {
        // 1. Geocodificar CEP (uma vez por evento)
        let geoData = {};
        if (primeiraLinha.cep) {
          idxs.forEach(i => setStatus(i, "processando", "Buscando endereço pelo CEP..."));
          const geo = await geocodeCep(primeiraLinha.cep, primeiraLinha.numero, primeiraLinha.complemento);
          if (geo) {
            geoData = {
              location: primeiraLinha.location || geo.location,
              city:     primeiraLinha.city     || geo.cidade,
              lat:      geo.lat,
              lng:      geo.lng,
            };
          }
        }

        // 2. Processar modalidades — cada uma com seus arquivos
        const modalidades = [];
        for (const { row, i } of linhas) {
          setStatus(i, "processando", `Processando modalidade ${row.modalidade}...`);

          let regulamentoUrl = row._driveRegulamento || "";
          let permitFileUrl  = row._drivePermit      || "";
          let resultsFileUrl = row._driveResultado   || "";

          if (row._driveRegulamento) {
            setStatus(i, "processando", `Migrando regulamento (${row.modalidade})...`);
            regulamentoUrl = await migrateFile(row._driveRegulamento, "eventos") || row._driveRegulamento;
          }
          if (row._drivePermit) {
            setStatus(i, "processando", `Migrando permit (${row.modalidade})...`);
            permitFileUrl = await migrateFile(row._drivePermit, "eventos") || row._drivePermit;
          }
          if (row._driveResultado) {
            setStatus(i, "processando", `Migrando resultado (${row.modalidade})...`);
            resultsFileUrl = await migrateFile(row._driveResultado, "eventos") || row._driveResultado;
          }

          modalidades.push({
            nome:          row.modalidade,
            descricao:     row.descricaoModalidade || "",
            regulamentoUrl,
            permitFileUrl,
            resultsFileUrl,
          });
        }

        // 3. Montar evento para gravação em lote
        const evento = {
          title:            primeiraLinha.titulo,
          date:             primeiraLinha.data,
          time:             primeiraLinha.horario,
          category:         primeiraLinha.category,
          status:           primeiraLinha.status,
          location:         geoData.location || primeiraLinha.location,
          city:             geoData.city     || primeiraLinha.city,
          lat:              geoData.lat      ?? null,
          lng:              geoData.lng      ?? null,
          organizer:        primeiraLinha.organizer,
          externalLink:     primeiraLinha.externalLink,
          modalities:       modalidades.map(m => m.nome),
          modalidadesDetalhes: modalidades,
          shortDescription: modalidades[0]?.descricao || "",
          featured:         linhas.some(l => l.row.featured),
          published:        true,
          importedAt:       new Date().toISOString(),
          source:           "importacao",
        };

        eventosBatch.push({ evento, idxs });
        idxs.forEach(i => setStatus(i, "processando", "Aguardando gravação em lote..."));
        ok++;
      } catch (e) {
        idxs.forEach(i => setStatus(i, "erro", e.message || "Erro desconhecido"));
        erros++;
      }
    }

    // 4. Gravar todos os eventos em lote
    if (eventosBatch.length > 0) {
      const allIdxs = eventosBatch.flatMap(b => b.idxs);
      allIdxs.forEach(i => setStatus(i, "processando", "Gravando em lote no Firestore..."));
      try {
        const r = await calendarAPI.createBatch(eventosBatch.map(b => b.evento));
        if (r.error) throw new Error(r.error);
        eventosBatch.forEach(b => {
          b.idxs.forEach(i => setStatus(i, "ok", `Modalidade ${rows[i].modalidade} importada`));
        });
      } catch (e) {
        eventosBatch.forEach(b => {
          b.idxs.forEach(i => setStatus(i, "erro", e.message || "Erro na gravação em lote"));
        });
        erros += eventosBatch.length;
        ok -= eventosBatch.length;
      }
    }

    setResumo({ ok, erros, total: rows.length });
    setFase("concluido");
  }

  // ── UI helpers ────────────────────────────────────────────────────────────────
  const contadores = rows.reduce((acc, _, i) => {
    const s = rowStatus[i]?.status || "pendente";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const podeImportar = rows.length > 0 && !rows.every((_, i) => rowStatus[i]?.status === "erro");

  return (
    <AdminLayout>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", fontFamily: FONTS.body }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <Link to="/admin" style={{ color: COLORS.primary, fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>← Admin</Link>
          <h1 style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 26, textTransform: "uppercase", color: COLORS.dark, margin: 0 }}>
            Importar Calendário
          </h1>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", gap: 0, marginBottom: 32, borderRadius: 10, overflow: "hidden", border: `1px solid ${COLORS.grayLight}` }}>
          {[
            { id: "upload",    label: "1. Upload" },
            { id: "preview",   label: "2. Preview" },
            { id: "importando",label: "3. Importar" },
            { id: "concluido", label: "4. Concluído" },
          ].map(step => {
            const ativo = fase === step.id;
            const passos = ["upload","preview","importando","concluido"];
            const feito  = passos.indexOf(fase) > passos.indexOf(step.id);
            return (
              <div key={step.id} style={{
                flex: 1, padding: "12px 8px", textAlign: "center",
                background: ativo ? COLORS.primary : feito ? "#f0fdf4" : "#fafafa",
                borderRight: `1px solid ${COLORS.grayLight}`,
              }}>
                <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12,
                  color: ativo ? "#fff" : feito ? "#166534" : COLORS.gray,
                  textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── FASE 1: UPLOAD ── */}
        {fase === "upload" && (
          <div>
            {/* Download da planilha modelo */}
            <div style={{ background: "#eff6ff", border: "1.5px solid #93c5fd", borderRadius: 10, padding: "18px 22px", marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 32 }}></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 14, color: "#1e3a8a" }}>
                  Ainda não tem a planilha modelo?
                </div>
                <div style={{ fontSize: 13, color: "#1e40af", marginTop: 2 }}>
                  Baixe o modelo, preencha com os dados do calendário atual e faça upload aqui.
                </div>
              </div>
              <button
                onClick={async () => {
                  const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
                  const rows = [
                    ["FMA – Federação Mineira de Atletismo"],
                    ["Planilha de Migração do Calendário"],
                    [""],
                    ["Instruções:"],
                    ["1. Preencha os dados a partir da linha 10 (não altere os cabeçalhos)."],
                    ["2. Uma mesma prova pode ter múltiplas modalidades: repita o título/data e mude apenas Modalidade e Descrição."],
                    ["3. Campos obrigatórios: Título, Data, Cidade e Modalidade."],
                    [""],
                    ["Título","Data","Horário","Categoria","Status","CEP","Número","Complemento","Local","Cidade","Organizador","Modalidade","Descrição Modalidade","Link Externo","Link Regulamento","Link Permit","Link Resultado","Destaque","Publicado"],
                    ["Corrida Exemplo","15/03/2025","07:00","corrida","confirmado","30130-000","100","Praça da Liberdade","Praça da Liberdade","Belo Horizonte","FMA","10km","Corrida de rua 10km","https://exemplo.com/evento","","","","Sim","Sim"],
                  ];
                  const ws = XLSX.utils.aoa_to_sheet(rows);
                  ws["!cols"] = [{wch:25},{wch:12},{wch:10},{wch:12},{wch:14},{wch:12},{wch:10},{wch:20},{wch:25},{wch:18},{wch:18},{wch:14},{wch:22},{wch:30},{wch:30},{wch:30},{wch:30},{wch:10},{wch:10}];
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Calendário");
                  XLSX.writeFile(wb, "FMA_Migracao_Calendario.xlsx");
                }}
                style={{ padding: "8px 20px", background: "#1e40af", color: "#fff", borderRadius: 8, fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                Baixar Modelo
              </button>
            </div>

            {parseError && (
              <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 8, padding: "12px 16px", marginBottom: 16, color: "#991b1b", fontSize: 13 }}>
                {parseError}
              </div>
            )}

            {/* Drop zone */}
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
              style={{
                border: `3px dashed ${dragging ? COLORS.primary : COLORS.grayLight}`,
                borderRadius: 16, padding: "56px 32px", textAlign: "center",
                cursor: "pointer", background: dragging ? "#fff0f0" : "#fafafa",
                transition: "all 0.2s",
              }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}></div>
              <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 18, color: COLORS.dark, marginBottom: 8 }}>
                Arraste a planilha aqui ou clique para selecionar
              </div>
              <div style={{ fontSize: 13, color: COLORS.gray }}>
                Aceita: .xlsx · Modelo FMA de migração do calendário
              </div>
              <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>
          </div>
        )}

        {/* ── FASE 2: PREVIEW ── */}
        {fase === "preview" && (
          <div>
            {/* Resumo */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Total",       val: rows.length,               bg: "#f3f4f6", color: COLORS.dark },
                { label: "Válidos",     val: contadores.pendente || 0,  bg: "#f0fdf4", color: "#166534" },
                { label: "Com aviso",   val: contadores.aviso || 0,     bg: "#fffbeb", color: "#92400e" },
                { label: "Com erro",    val: contadores.erro || 0,      bg: "#fef2f2", color: "#991b1b" },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "16px", textAlign: "center" }}>
                  <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 28, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 12, color: COLORS.gray, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Tabela de preview */}
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: 20 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: `2px solid ${COLORS.grayLight}` }}>
                      {["#", "Status", "Título", "Data", "Cidade", "Categoria", "Modalidade", "Arquivos"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontFamily: FONTS.heading, fontWeight: 700, fontSize: 11, color: COLORS.gray, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const st = rowStatus[i] || { status: "pendente", msg: "" };
                      const temArquivos = row._driveRegulamento || row._drivePermit || row._driveResultado;
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${COLORS.grayLight}`, background: STATUS_BG[st.status] }}>
                          <td style={{ padding: "10px 14px", fontSize: 12, color: COLORS.gray }}>{i + 1}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ fontSize: 16 }} title={st.msg}>{STATUS_ICON[st.status]}</span>
                            {st.msg && <div style={{ fontSize: 10, color: STATUS_COLOR[st.status], maxWidth: 140 }}>{st.msg}</div>}
                          </td>
                          <td style={{ padding: "10px 14px", fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, color: COLORS.dark, maxWidth: 240 }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.titulo}</div>
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 12, whiteSpace: "nowrap" }}>
                            {row.data ? new Date(row.data + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 12 }}>{row.city || "—"}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                              background: row.category === "corrida" ? "#fde8e8" : row.category === "pista" ? "#dbeafe" : row.category === "trail" ? "#dcfce7" : "#fef3c7",
                              color: row.category === "corrida" ? "#991b1b" : row.category === "pista" ? "#1e3a8a" : row.category === "trail" ? "#166534" : "#92400e",
                            }}>{row.category}</span>
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 12 }}>
                            {temArquivos ? (
                              <span style={{ color: "#166534" }}>
                                {[row._driveRegulamento && "Reg", row._drivePermit && "Permit", row._driveResultado && "Result"].filter(Boolean).join(" · ")}
                              </span>
                            ) : (
                              <span style={{ color: COLORS.gray }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => { setFase("upload"); setRows([]); setRowStatus({}); }}
                style={{ padding: "10px 24px", background: "#fff", color: COLORS.dark, border: `1.5px solid ${COLORS.grayLight}`, borderRadius: 8, fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                ← Voltar
              </button>
              <button onClick={iniciarImportacao} disabled={!podeImportar}
                style={{ padding: "10px 28px", background: podeImportar ? COLORS.primary : "#ccc", color: "#fff", border: "none", borderRadius: 8, fontFamily: FONTS.heading, fontWeight: 800, fontSize: 14, cursor: podeImportar ? "pointer" : "default", textTransform: "uppercase" }}>
                Importar {Object.keys(rows.reduce((g,r) => { const k=`${r.titulo}|||${r.data}`; g[k]=1; return g; }, {})).length} Eventos ({rows.filter((_,i) => rowStatus[i]?.status !== "erro").length} modalidades)
              </button>
            </div>
          </div>
        )}

        {/* ── FASE 3: IMPORTANDO ── */}
        {fase === "importando" && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ marginBottom: 16 }}></div>
            <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 22, color: COLORS.dark, marginBottom: 8 }}>
              Importando eventos…
            </div>
            <div style={{ fontSize: 14, color: COLORS.gray, marginBottom: 24 }}>
              {progresso.atual} de {progresso.total} — não feche esta janela.
            </div>
            {/* Barra */}
            <div style={{ height: 10, background: "#e5e7eb", borderRadius: 5, overflow: "hidden", maxWidth: 400, margin: "0 auto 32px" }}>
              <div style={{
                height: "100%", background: COLORS.primary, borderRadius: 5,
                width: `${progresso.total ? (progresso.atual / progresso.total) * 100 : 0}%`,
                transition: "width 0.3s",
              }} />
            </div>
            {/* Log em tempo real */}
            <div style={{ maxWidth: 600, margin: "0 auto", maxHeight: 300, overflowY: "auto", textAlign: "left" }}>
              {rows.map((row, i) => {
                const st = rowStatus[i];
                if (!st || st.status === "pendente") return null;
                return (
                  <div key={i} style={{ padding: "6px 12px", marginBottom: 4, borderRadius: 6,
                    background: STATUS_BG[st.status], fontSize: 12, color: STATUS_COLOR[st.status] }}>
                    {STATUS_ICON[st.status]} <strong>{row.titulo}</strong> — {st.msg}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── FASE 4: CONCLUÍDO ── */}
        {fase === "concluido" && resumo && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ marginBottom: 16 }}></div>
            <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 26, color: COLORS.dark, marginBottom: 8 }}>
              Importação concluída!
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", margin: "24px 0 32px" }}>
              <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "16px 28px" }}>
                <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 32, color: "#166534" }}>{resumo.ok}</div>
                <div style={{ fontSize: 12, color: "#166534" }}>Importados</div>
              </div>
              {resumo.erros > 0 && (
                <div style={{ background: "#fef2f2", borderRadius: 10, padding: "16px 28px" }}>
                  <div style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 32, color: "#991b1b" }}>{resumo.erros}</div>
                  <div style={{ fontSize: 12, color: "#991b1b" }}>Com erro</div>
                </div>
              )}
            </div>

            {/* Log final */}
            {resumo.erros > 0 && (
              <div style={{ maxWidth: 600, margin: "0 auto 24px", textAlign: "left" }}>
                <div style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, marginBottom: 8, color: COLORS.dark }}>Eventos com erro:</div>
                {rows.map((row, i) => {
                  const st = rowStatus[i];
                  if (st?.status !== "erro") return null;
                  return (
                    <div key={i} style={{ padding: "8px 12px", marginBottom: 4, borderRadius: 6, background: "#fef2f2", fontSize: 12, color: "#991b1b" }}>
                      <strong>{row.titulo}</strong> — {st.msg}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Link to="/admin/calendario"
                style={{ padding: "12px 28px", background: COLORS.primary, color: "#fff", borderRadius: 8, fontFamily: FONTS.heading, fontWeight: 800, fontSize: 14, textDecoration: "none", textTransform: "uppercase" }}>
                Ver Calendário →
              </Link>
              <button onClick={() => { setFase("upload"); setRows([]); setRowStatus({}); setResumo(null); }}
                style={{ padding: "12px 24px", background: "#fff", color: COLORS.dark, border: `1.5px solid ${COLORS.grayLight}`, borderRadius: 8, fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                Nova Importação
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
