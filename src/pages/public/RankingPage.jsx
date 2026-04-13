/**
 * RankingPage.jsx — Página pública de Rankings e Recordes Estaduais da FMA.
 *
 * Exports:
 *   RankingPage   → /ranking        (tabela de melhores marcas por temporada)
 *   RecordesPage  → /ranking/recordes (recordes estaduais históricos)
 *
 * Ambas as páginas usam dados estáticos representativos enquanto não há
 * backend de resultados estruturado. A lista de links para PDFs de resultado
 * está integrada via resultadosAPI para manter coerência com os dados reais.
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";
import Icon from "../../utils/icons";

// ─── Dados estáticos de recordes ──────────────────────────────────────────────
// Fonte: recordes estaduais mineiros homologados — atualize via PDF oficial.

const RECORDES_PISTA = [
  // Masculino
  { prova: "100m rasos",      cat: "Adulto Masc.", marca: "10s38",       atleta: "Rafael M. Silva",     clube: "SESI/MG",           ano: 2022 },
  { prova: "200m rasos",      cat: "Adulto Masc.", marca: "20s71",       atleta: "Carlos A. Ferreira",  clube: "AABB BH",           ano: 2023 },
  { prova: "400m rasos",      cat: "Adulto Masc.", marca: "45s84",       atleta: "Diego L. Mendes",     clube: "Vila Velha AC",     ano: 2021 },
  { prova: "800m",            cat: "Adulto Masc.", marca: "1:47.62",     atleta: "Henrique P. Costa",   clube: "SESI/MG",           ano: 2023 },
  { prova: "1500m",           cat: "Adulto Masc.", marca: "3:42.10",     atleta: "Lucas A. Prado",      clube: "Unimed BH",         ano: 2024 },
  { prova: "5000m",           cat: "Adulto Masc.", marca: "13:51.43",    atleta: "Tiago R. Oliveira",   clube: "Manhuaçu AC",       ano: 2022 },
  { prova: "10000m",          cat: "Adulto Masc.", marca: "28:34.87",    atleta: "Tiago R. Oliveira",   clube: "Manhuaçu AC",       ano: 2023 },
  { prova: "110m c/ barreiras", cat: "Adulto Masc.", marca: "13s78",    atleta: "André F. Rocha",      clube: "SESI/MG",           ano: 2022 },
  { prova: "400m c/ barreiras", cat: "Adulto Masc.", marca: "50s12",    atleta: "Bruno N. Lima",       clube: "AABB BH",           ano: 2023 },
  { prova: "3000m c/ obs.",   cat: "Adulto Masc.", marca: "8:43.22",     atleta: "Victor H. Santos",    clube: "Manhuaçu AC",       ano: 2021 },
  { prova: "Salto em altura", cat: "Adulto Masc.", marca: "2,21m",       atleta: "Fábio C. Azevedo",    clube: "SESI/MG",           ano: 2023 },
  { prova: "Salto com vara",  cat: "Adulto Masc.", marca: "5,42m",       atleta: "Rodrigo T. Moura",    clube: "Unimed BH",         ano: 2024 },
  { prova: "Salto em comprimento", cat: "Adulto Masc.", marca: "7,91m", atleta: "Leandro F. Cruz",     clube: "AABB BH",           ano: 2022 },
  { prova: "Triplo salto",    cat: "Adulto Masc.", marca: "16,34m",      atleta: "Leandro F. Cruz",     clube: "AABB BH",           ano: 2023 },
  { prova: "Arremesso de peso", cat: "Adulto Masc.", marca: "18,47m",   atleta: "Eduardo G. Campos",   clube: "SESI/MG",           ano: 2022 },
  { prova: "Lançamento de disco", cat: "Adulto Masc.", marca: "56,38m", atleta: "Eduardo G. Campos",   clube: "SESI/MG",           ano: 2023 },
  { prova: "Lançamento de dardo", cat: "Adulto Masc.", marca: "72,14m", atleta: "Marcelo P. Viana",    clube: "Vila Velha AC",     ano: 2021 },
  { prova: "Lançamento de martelo", cat: "Adulto Masc.", marca: "61,02m", atleta: "Gustavo R. Braga",  clube: "SESI/MG",           ano: 2022 },
  // Feminino
  { prova: "100m rasos",      cat: "Adulto Fem.",  marca: "11s42",       atleta: "Camila A. Ramos",     clube: "SESI/MG",           ano: 2023 },
  { prova: "200m rasos",      cat: "Adulto Fem.",  marca: "23s01",       atleta: "Camila A. Ramos",     clube: "SESI/MG",           ano: 2023 },
  { prova: "400m rasos",      cat: "Adulto Fem.",  marca: "52s47",       atleta: "Fernanda C. Lemos",   clube: "Unimed BH",         ano: 2022 },
  { prova: "800m",            cat: "Adulto Fem.",  marca: "2:02.88",     atleta: "Juliana M. Alves",    clube: "AABB BH",           ano: 2024 },
  { prova: "1500m",           cat: "Adulto Fem.",  marca: "4:18.35",     atleta: "Priscila V. Torres",  clube: "Manhuaçu AC",       ano: 2023 },
  { prova: "5000m",           cat: "Adulto Fem.",  marca: "15:42.71",    atleta: "Renata B. Gomes",     clube: "SESI/MG",           ano: 2022 },
  { prova: "10000m",          cat: "Adulto Fem.",  marca: "32:18.04",    atleta: "Renata B. Gomes",     clube: "SESI/MG",           ano: 2023 },
  { prova: "Salto em altura", cat: "Adulto Fem.",  marca: "1,89m",       atleta: "Natália C. Fonseca",  clube: "SESI/MG",           ano: 2024 },
  { prova: "Salto com vara",  cat: "Adulto Fem.",  marca: "4,28m",       atleta: "Amanda L. Rocha",     clube: "Unimed BH",         ano: 2023 },
  { prova: "Salto em comprimento", cat: "Adulto Fem.", marca: "6,54m",  atleta: "Sara M. Peixoto",     clube: "SESI/MG",           ano: 2022 },
  { prova: "Arremesso de peso", cat: "Adulto Fem.", marca: "15,82m",    atleta: "Patrícia G. Nunes",   clube: "SESI/MG",           ano: 2023 },
  { prova: "Lançamento de disco", cat: "Adulto Fem.", marca: "48,91m",  atleta: "Patrícia G. Nunes",   clube: "SESI/MG",           ano: 2022 },
];

const RECORDES_CORRIDA = [
  { prova: "5km",        cat: "Masculino", marca: "14:02",  atleta: "Adriano C. Lima",    clube: "Corredores BH",    ano: 2025 },
  { prova: "5km",        cat: "Feminino",  marca: "16:14",  atleta: "Marta R. Pereira",   clube: "SESI/MG",          ano: 2024 },
  { prova: "10km",       cat: "Masculino", marca: "29:18",  atleta: "Adriano C. Lima",    clube: "Corredores BH",    ano: 2025 },
  { prova: "10km",       cat: "Feminino",  marca: "33:44",  atleta: "Marta R. Pereira",   clube: "SESI/MG",          ano: 2025 },
  { prova: "15km",       cat: "Masculino", marca: "45:31",  atleta: "Paulo E. Duarte",    clube: "Manhuaçu AC",      ano: 2023 },
  { prova: "15km",       cat: "Feminino",  marca: "52:07",  atleta: "Ana L. Cardoso",     clube: "Corredores BH",    ano: 2024 },
  { prova: "Meia maratona", cat: "Masculino", marca: "1:04:38", atleta: "Paulo E. Duarte", clube: "Manhuaçu AC",    ano: 2024 },
  { prova: "Meia maratona", cat: "Feminino",  marca: "1:14:22", atleta: "Ana L. Cardoso",  clube: "Corredores BH",  ano: 2024 },
  { prova: "Maratona",   cat: "Masculino", marca: "2:18:54", atleta: "Wellington S. Neto", clube: "Manhuaçu AC",    ano: 2023 },
  { prova: "Maratona",   cat: "Feminino",  marca: "2:42:11", atleta: "Carla M. Ferreira",  clube: "AABB BH",        ano: 2023 },
];

// ─── Utilitários ──────────────────────────────────────────────────────────────

const fmtAno = (a) => a || "—";

// ─── Hero genérico ────────────────────────────────────────────────────────────

function PageHero({ icon, title, subtitle, children }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #1a1a1a 0%, #2d1a1a 50%, #1a1a2e 100%)",
      padding: "52px 0 44px",
      marginBottom: 40,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", right: -10, top: "50%",
        transform: "translateY(-50%)",
        fontFamily: FONTS.heading, fontWeight: 900,
        fontSize: "clamp(5rem, 12vw, 9rem)",
        color: "rgba(255,255,255,0.03)",
        userSelect: "none", pointerEvents: "none", lineHeight: 1,
      }}></div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
        <div style={{
          fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: 2,
          color: "rgba(255,255,255,0.4)", marginBottom: 20,
        }}>
          <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>FMA</Link>
          {" › "}
          <span style={{ color: COLORS.primaryLight }}>Competições</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 32, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <span><Icon name={icon} size={40} /></span>
              <h1 style={{
                fontFamily: FONTS.heading,
                fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
                fontWeight: 900, color: "#fff",
                margin: 0, textTransform: "uppercase",
                letterSpacing: 2, lineHeight: 1,
              }}>
                {title}
              </h1>
            </div>
            <p style={{
              fontFamily: FONTS.body, fontSize: 14,
              color: "rgba(255,255,255,0.6)",
              margin: 0, maxWidth: 540, lineHeight: 1.6,
            }}>
              {subtitle}
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Abas de navegação ranking/recordes ──────────────────────────────────────

function NavAbas({ ativa }) {
  const navigate = useNavigate();
  const abas = [
    { id: "ranking",   label: "Ranking", path: "/ranking", icon: "Trophy" },
    { id: "recordes",  label: "Recordes Estaduais", path: "/ranking/recordes", icon: "Star" },
  ];
  return (
    <div style={{
      display: "flex", gap: 0,
      background: "#fff", borderRadius: 10, padding: 4,
      boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
      border: `1px solid ${COLORS.grayLight}`,
      marginBottom: 28, width: "fit-content",
    }}>
      {abas.map(a => (
        <button key={a.id} onClick={() => navigate(a.path)}
          style={{
            padding: "9px 22px", borderRadius: 8, border: "none",
            cursor: "pointer", fontFamily: FONTS.heading,
            fontSize: 13, fontWeight: 700, transition: "all 0.15s",
            background: ativa === a.id ? COLORS.dark : "transparent",
            color: ativa === a.id ? "#fff" : COLORS.gray,
          }}>
          <Icon name={a.icon} size={14} /> {a.label}
        </button>
      ))}
    </div>
  );
}

// ─── Tabela de recordes ───────────────────────────────────────────────────────

function TabelaRecordes({ dados, colunas }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", marginBottom: 24 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: COLORS.dark }}>
            {colunas.map(c => (
              <th key={c.key} style={{
                padding: "12px 16px", textAlign: "left",
                fontFamily: FONTS.heading, fontSize: 10,
                fontWeight: 800, textTransform: "uppercase",
                letterSpacing: 1, color: "rgba(255,255,255,0.7)",
              }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.map((row, i) => (
            <tr key={i} style={{
              borderBottom: `1px solid ${COLORS.grayLight}`,
              background: i % 2 === 0 ? "#fff" : "#fafafa",
            }}>
              {colunas.map(c => (
                <td key={c.key} style={{
                  padding: "11px 16px",
                  fontFamily: c.bold ? FONTS.heading : FONTS.body,
                  fontWeight: c.bold ? 700 : 400,
                  fontSize: c.big ? 15 : 13,
                  color: c.color ? COLORS.primary : COLORS.dark,
                }}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Aviso de dados oficiais ──────────────────────────────────────────────────

function AvisoOficial({ docUrl }) {
  return (
    <div style={{
      display: "flex", gap: 14, alignItems: "flex-start",
      background: "#fffbeb", border: "1.5px solid #fde68a",
      borderRadius: 12, padding: "16px 20px", marginBottom: 28,
    }}>
      <span style={{ flexShrink: 0 }}><Icon name="AlertTriangle" size={22} /></span>
      <div style={{ fontFamily: FONTS.body, fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
        <strong>Dados ilustrativos.</strong> Esta página exibe marcas e recordes estaduais representativos
        enquanto o sistema de resultados estruturados está em implantação.
        Para a tabela oficial de recordes homologados, consulte o{" "}
        {docUrl ? (
          <a href={docUrl} target="_blank" rel="noreferrer" style={{ color: "#0066cc" }}>
            documento oficial da FMA
          </a>
        ) : (
          <Link to="/documentos" style={{ color: "#0066cc" }}>
            setor de documentos
          </Link>
        )}.
      </div>
    </div>
  );
}

// ─── RANKING PAGE ─────────────────────────────────────────────────────────────

export function RankingPage() {
  useEffect(() => { document.title = "Ranking | FMA"; }, []);

  const [catAtiva, setCatAtiva] = useState("corrida");

  const CATS = [
    { value: "corrida", label: "Corridas de Rua", icon: "Medal" },
    { value: "pista",   label: "Pista e Campo",   icon: "Building" },
    { value: "trail",   label: "Trail Run",        icon: "Mountain" },
  ];

  // Melhores marcas 2026 — dados representativos por categoria
  const RANKING_CORRIDA = [
    { pos: 1, atleta: "Adriano C. Lima",     clube: "Corredores BH",    cidade: "BH",            prova: "10km", marca: "29:18", pontos: 980 },
    { pos: 2, atleta: "Paulo E. Duarte",     clube: "Manhuaçu AC",      cidade: "Manhuaçu",      prova: "10km", marca: "29:44", pontos: 960 },
    { pos: 3, atleta: "Jorge F. Carvalho",   clube: "Uberaba Run",      cidade: "Uberaba",       prova: "10km", marca: "30:02", pontos: 940 },
    { pos: 4, atleta: "Roberto M. Assis",    clube: "SESI/MG",          cidade: "BH",            prova: "10km", marca: "30:21", pontos: 920 },
    { pos: 5, atleta: "Daniel K. Souza",     clube: "Montes Claros AC", cidade: "Montes Claros", prova: "10km", marca: "30:47", pontos: 900 },
    { pos: 6, atleta: "Fábio R. Teixeira",   clube: "AABB BH",          cidade: "BH",            prova: "10km", marca: "31:03", pontos: 880 },
    { pos: 7, atleta: "Marcos V. Ribeiro",   clube: "Uberlândia AC",    cidade: "Uberlândia",    prova: "10km", marca: "31:28", pontos: 860 },
    { pos: 8, atleta: "Sergio H. Barbosa",   clube: "Corredores BH",    cidade: "BH",            prova: "10km", marca: "31:51", pontos: 840 },
    { pos: 9, atleta: "Nilton C. Guerra",    clube: "Juiz de Fora Run", cidade: "JF",            prova: "10km", marca: "32:10", pontos: 820 },
    { pos: 10, atleta: "Renato A. Campos",   clube: "Unimed BH",        cidade: "BH",            prova: "10km", marca: "32:29", pontos: 800 },
  ];

  const RANKING_CORRIDA_FEM = [
    { pos: 1, atleta: "Marta R. Pereira",    clube: "SESI/MG",          cidade: "BH",            prova: "10km", marca: "33:44", pontos: 980 },
    { pos: 2, atleta: "Ana L. Cardoso",      clube: "Corredores BH",    cidade: "BH",            prova: "10km", marca: "34:11", pontos: 960 },
    { pos: 3, atleta: "Beatriz O. Martins",  clube: "Manhuaçu AC",      cidade: "Manhuaçu",      prova: "10km", marca: "34:42", pontos: 940 },
    { pos: 4, atleta: "Cristiane P. Freitas", clube: "AABB BH",         cidade: "BH",            prova: "10km", marca: "35:08", pontos: 920 },
    { pos: 5, atleta: "Larissa V. Diniz",    clube: "Unimed BH",        cidade: "BH",            prova: "10km", marca: "35:44", pontos: 900 },
  ];

  const RANKING_PISTA = [
    { pos: 1, atleta: "Rafael M. Silva",     clube: "SESI/MG",     cidade: "BH",       prova: "100m",  marca: "10s38", pontos: 1000 },
    { pos: 2, atleta: "Carlos A. Ferreira",  clube: "AABB BH",     cidade: "BH",       prova: "200m",  marca: "20s71", pontos: 980 },
    { pos: 3, atleta: "Lucas A. Prado",      clube: "Unimed BH",   cidade: "BH",       prova: "1500m", marca: "3:42",  pontos: 960 },
    { pos: 4, atleta: "Diego L. Mendes",     clube: "Vila Velha",  cidade: "BH",       prova: "400m",  marca: "45s84", pontos: 940 },
    { pos: 5, atleta: "Rodrigo T. Moura",    clube: "Unimed BH",   cidade: "BH",       prova: "Vara",  marca: "5,42m", pontos: 920 },
    { pos: 1, atleta: "Camila A. Ramos",     clube: "SESI/MG",     cidade: "BH",       prova: "100m",  marca: "11s42", pontos: 1000 },
    { pos: 2, atleta: "Fernanda C. Lemos",   clube: "Unimed BH",   cidade: "BH",       prova: "400m",  marca: "52s47", pontos: 980 },
    { pos: 3, atleta: "Natália C. Fonseca",  clube: "SESI/MG",     cidade: "BH",       prova: "Altura","marca": "1,89m",pontos: 960 },
  ];

  const RANKING_TRAIL = [
    { pos: 1, atleta: "Thiago M. Correia",   clube: "MG Trail",    cidade: "BH",       prova: "42km",  marca: "3h14min", pontos: 980 },
    { pos: 2, atleta: "Gustavo F. Silveira", clube: "Serra Run",   cidade: "Itabira",  prova: "42km",  marca: "3h22min", pontos: 960 },
    { pos: 3, atleta: "Alexandre P. Costa",  clube: "MG Trail",    cidade: "BH",       prova: "42km",  marca: "3h31min", pontos: 940 },
    { pos: 1, atleta: "Camila T. Moreira",   clube: "Serra Run",   cidade: "Itabira",  prova: "42km",  marca: "3h58min", pontos: 980 },
    { pos: 2, atleta: "Luciana R. Faria",    clube: "MG Trail",    cidade: "BH",       prova: "42km",  marca: "4h07min", pontos: 960 },
  ];

  const rankings = {
    corrida: { masc: RANKING_CORRIDA, fem: RANKING_CORRIDA_FEM },
    pista:   { masc: RANKING_PISTA.filter((_, i) => i < 5), fem: RANKING_PISTA.filter((_, i) => i >= 5) },
    trail:   { masc: RANKING_TRAIL.filter((_, i) => i < 3), fem: RANKING_TRAIL.filter((_, i) => i >= 3) },
  };

  const cols = [
    { key: "pos",    label: "Pos.", bold: true, render: r => `#${r.pos}` },
    { key: "atleta", label: "Atleta", bold: true },
    { key: "clube",  label: "Clube / Equipe" },
    { key: "prova",  label: "Melhor prova" },
    { key: "marca",  label: "Melhor marca", bold: true, color: true },
    { key: "pontos", label: "Pontos FMA" },
  ];

  const cat = CATS.find(c => c.value === catAtiva) || CATS[0];
  const data = rankings[catAtiva] || { masc: [], fem: [] };

  return (
    <>
      <PageHero
        icon="Trophy"
        title="Rankings 2026"
        subtitle="Classificação dos melhores atletas mineiros por categoria e prova na temporada atual."
      />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 72px" }}>
        <NavAbas ativa="ranking" />
        <AvisoOficial />

        {/* Abas de categoria */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 28 }}>
          {CATS.map(c => (
            <button key={c.value} onClick={() => setCatAtiva(c.value)}
              style={{
                padding: "8px 18px", borderRadius: 9, border: "none",
                fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800,
                textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s",
                background: catAtiva === c.value ? COLORS.dark : "#fff",
                color: catAtiva === c.value ? "#fff" : COLORS.gray,
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}>
              <Icon name={c.icon} size={14} /> {c.label}
            </button>
          ))}
        </div>

        {/* Temporada 2026 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 3, height: 18, background: "#0066cc", borderRadius: 2, display: "inline-block" }} />
              Masculino
            </div>
            <TabelaRecordes dados={data.masc} colunas={cols} />
          </div>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: COLORS.dark, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 3, height: 18, background: "#cc0000", borderRadius: 2, display: "inline-block" }} />
              Feminino
            </div>
            <TabelaRecordes dados={data.fem} colunas={cols} />
          </div>
        </div>

        {/* Link para resultados completos */}
        <div style={{ background: "#f0f9ff", border: "1.5px solid #bae6fd", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 800, textTransform: "uppercase", color: "#0369a1", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}><Icon name="BarChart3" size={14} /> Resultados completos por prova</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 13, color: "#0c4a6e" }}>Acesse os PDFs e planilhas de resultado de cada competição da temporada.</div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/resultados/corridas" style={{ padding: "9px 18px", borderRadius: 8, background: COLORS.primary, color: "#fff", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textDecoration: "none", textTransform: "uppercase" }}>
              Corridas
            </Link>
            <Link to="/resultados/pista" style={{ padding: "9px 18px", borderRadius: 8, background: "#0066cc", color: "#fff", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textDecoration: "none", textTransform: "uppercase" }}>
              Pista
            </Link>
            <Link to="/resultados/trail" style={{ padding: "9px 18px", borderRadius: 8, background: "#15803d", color: "#fff", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textDecoration: "none", textTransform: "uppercase" }}>
              Trail
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── RECORDES PAGE ────────────────────────────────────────────────────────────

export function RecordesPage() {
  useEffect(() => { document.title = "Recordes Estaduais | FMA"; }, []);

  const [aba, setAba] = useState("pista");
  const [filtCat, setFiltCat] = useState("");
  const [busca, setBusca] = useState("");

  const ABAS = [
    { id: "pista",   label: "Pista e Campo", icon: "Building" },
    { id: "corrida", label: "Corridas de Rua", icon: "Medal" },
  ];

  const dados = aba === "pista" ? RECORDES_PISTA : RECORDES_CORRIDA;
  const cats  = [...new Set(dados.map(r => r.cat))];

  const filtrados = dados.filter(r => {
    if (filtCat && r.cat !== filtCat) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return r.prova.toLowerCase().includes(q) || r.atleta.toLowerCase().includes(q) || r.clube.toLowerCase().includes(q);
    }
    return true;
  });

  const colsPista = [
    { key: "prova",  label: "Prova",          bold: true },
    { key: "cat",    label: "Categoria" },
    { key: "marca",  label: "Recorde",         bold: true, color: true },
    { key: "atleta", label: "Atleta",          bold: true },
    { key: "clube",  label: "Clube / Equipe" },
    { key: "ano",    label: "Ano",             render: r => fmtAno(r.ano) },
  ];

  return (
    <>
      <PageHero
        icon="Star"
        title="Recordes Estaduais"
        subtitle="Melhores marcas homologadas em competições realizadas em Minas Gerais ou por atletas filiados a clubes mineiros."
      />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 72px" }}>
        <NavAbas ativa="recordes" />
        <AvisoOficial docUrl={null} />

        {/* Abas pista/corrida */}
        <div style={{ display: "flex", gap: 0, background: "#fff", borderRadius: 10, padding: 4, boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: `1px solid ${COLORS.grayLight}`, marginBottom: 24, width: "fit-content" }}>
          {ABAS.map(a => (
            <button key={a.id} onClick={() => { setAba(a.id); setFiltCat(""); setBusca(""); }}
              style={{ padding: "9px 22px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, transition: "all 0.15s", background: aba === a.id ? COLORS.dark : "transparent", color: aba === a.id ? "#fff" : COLORS.gray }}>
              <Icon name={a.icon} size={14} /> {a.label}
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por prova, atleta ou clube..."
            style={{ flex: 1, minWidth: 220, padding: "9px 13px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none" }}
          />
          <select value={filtCat} onChange={e => setFiltCat(e.target.value)}
            style={{ padding: "9px 13px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, fontFamily: FONTS.body, fontSize: 13, outline: "none", cursor: "pointer" }}>
            <option value="">Todas as categorias</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Contador */}
        <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginBottom: 14 }}>
          {filtrados.length} recorde{filtrados.length !== 1 ? "s" : ""} exibido{filtrados.length !== 1 ? "s" : ""}
          {(filtCat || busca) && (
            <button onClick={() => { setFiltCat(""); setBusca(""); }}
              style={{ marginLeft: 12, background: "none", border: "none", color: "#0066cc", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Limpar filtros ×
            </button>
          )}
        </div>

        {filtrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", background: "#fff", borderRadius: 16, border: `1.5px dashed ${COLORS.grayLight}` }}>
            <div style={{ marginBottom: 12 }}></div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 700, color: COLORS.dark }}>Nenhum recorde encontrado</div>
          </div>
        ) : (
          <TabelaRecordes dados={filtrados} colunas={colsPista} />
        )}

        {/* Links relacionados */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 32 }}>
          <Link to="/documentos" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 9, border: `1.5px solid ${COLORS.grayLight}`, color: COLORS.dark, fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textDecoration: "none", background: "#fff" }}>
            <Icon name="FileText" size={14} /> Tabela oficial (PDF)
          </Link>
          <Link to="/ranking" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 9, border: `1.5px solid ${COLORS.grayLight}`, color: COLORS.dark, fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textDecoration: "none", background: "#fff" }}>
            <Icon name="Trophy" size={14} /> Ranking 2026
          </Link>
        </div>
      </div>
    </>
  );
}
