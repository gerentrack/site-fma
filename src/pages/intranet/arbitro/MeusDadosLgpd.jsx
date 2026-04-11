/**
 * MeusDadosLgpd.jsx — Direitos do titular (LGPD Art. 18).
 * Rota: /intranet/lgpd
 * - Visualização de todos os dados pessoais armazenados
 * - Exportação (portabilidade) em JSON
 * - Solicitação de exclusão de dados
 */
import { useState, useEffect } from "react";
import IntranetLayout from "../IntranetLayout";
import { useIntranet } from "../../../context/IntranetContext";
import { RefereesService } from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";

const card = { background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20 };
const sectionTitle = (t) => (
  <h3 style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 800, textTransform: "uppercase",
    letterSpacing: 2, color: COLORS.dark, margin: "0 0 16px", paddingBottom: 10,
    borderBottom: `2px solid ${COLORS.grayLight}` }}>{t}</h3>
);

const LABELS = {
  name: "Nome completo", email: "E-mail", phone: "Telefone",
  cpf: "CPF", rg: "RG", rgOrgao: "Orgao expedidor", rgUf: "UF do RG", rgDataExpedicao: "Data expedição RG",
  nisPis: "NIS/PIS/NIT", dataNascimento: "Data de nascimento", sexo: "Sexo",
  estadoCivil: "Estado civil", cor: "Cor/Raça", escolaridade: "Escolaridade",
  municipioNascimento: "Municipio de nascimento", ufNascimento: "UF nascimento",
  nomePai: "Nome do pai", nomeMae: "Nome da mae",
  cep: "CEP", logradouro: "Logradouro", numero: "Numero", complemento: "Complemento",
  bairro: "Bairro", city: "Cidade", state: "Estado",
  banco: "Banco", bancoNome: "Nome do banco", tipoConta: "Tipo de conta",
  agencia: "Agencia", contaDigito: "Conta", chavePix: "Chave PIX", chavePixTipo: "Tipo chave PIX",
  nivel: "Nivel", registroCbat: "Registro CBAT", tamanhoCamisa: "Tamanho camisa",
  tipoSanguineo: "Tipo sanguineo", contatoEmergenciaNome: "Contato emergencia",
  contatoEmergenciaTelefone: "Telefone emergencia", disponibilidadeDeslocamento: "Disponibilidade deslocamento",
  foto: "Foto 3x4",
  lgpdConsentAt: "Consentimento LGPD em", lgpdConsentVersion: "Versao politica aceita",
  termosConsentVersion: "Versao termos aceita",
  lgpdSensitiveConsentAt: "Consentimento dados sensiveis em",
  confidentialityConsentAt: "Consentimento confidencialidade em",
  createdAt: "Cadastrado em", updatedAt: "Atualizado em",
};

const PERSONAL_FIELDS = [
  "name", "email", "phone", "cpf", "rg", "rgOrgao", "rgUf", "rgDataExpedicao", "nisPis",
  "dataNascimento", "sexo", "estadoCivil", "cor", "escolaridade",
  "municipioNascimento", "ufNascimento", "nomePai", "nomeMae",
];
const ADDRESS_FIELDS = ["cep", "logradouro", "numero", "complemento", "bairro", "city", "state"];
const BANK_FIELDS = ["banco", "bancoNome", "tipoConta", "agencia", "contaDigito", "chavePix", "chavePixTipo"];
const PROFESSIONAL_FIELDS = ["nivel", "registroCbat", "tamanhoCamisa", "tipoSanguineo", "contatoEmergenciaNome", "contatoEmergenciaTelefone", "disponibilidadeDeslocamento"];
const CONSENT_FIELDS = ["lgpdConsentAt", "lgpdConsentVersion", "termosConsentVersion", "lgpdSensitiveConsentAt", "confidentialityConsentAt"];

function maskCpf(v) {
  if (!v) return "";
  const d = v.replace(/\D/g, "");
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "***.$2.$3-**");
}

function DataTable({ fields, data }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <tbody>
        {fields.map(key => {
          let val = data[key];
          if (val === undefined || val === null) val = "";
          if (key === "cpf") val = maskCpf(val);
          if (key === "foto" && val) val = "(arquivo armazenado)";
          if (typeof val === "object") val = JSON.stringify(val);
          return (
            <tr key={key} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
              <td style={{ padding: "8px 12px", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: COLORS.gray, width: 220, whiteSpace: "nowrap" }}>
                {LABELS[key] || key}
              </td>
              <td style={{ padding: "8px 12px", fontFamily: FONTS.body, fontSize: 13, color: COLORS.dark, wordBreak: "break-word" }}>
                {String(val) || "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function MeusDadosLgpd() {
  const { refereeId } = useIntranet();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exclusaoSolicitada, setExclusaoSolicitada] = useState(false);
  const [confirmExclusao, setConfirmExclusao] = useState(false);

  useEffect(() => {
    if (!refereeId) return;
    RefereesService.get(refereeId).then(r => {
      if (r.data) setData(r.data);
      setLoading(false);
    });
  }, [refereeId]);

  const exportarDados = () => {
    if (!data) return;
    // Montar objeto com apenas dados pessoais (sem campos internos)
    const exportFields = [...PERSONAL_FIELDS, ...ADDRESS_FIELDS, ...BANK_FIELDS, ...PROFESSIONAL_FIELDS, ...CONSENT_FIELDS, "createdAt", "updatedAt"];
    const exportData = {};
    exportFields.forEach(key => { if (data[key] !== undefined) exportData[key] = data[key]; });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meus-dados-fma-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const solicitarExclusao = async () => {
    // Marca no Firestore que o titular solicitou exclusão
    await RefereesService.update(refereeId, {
      lgpdExclusaoSolicitadaEm: new Date().toISOString(),
      lgpdExclusaoStatus: "solicitada",
    });
    setExclusaoSolicitada(true);
    setConfirmExclusao(false);
  };

  if (loading) {
    return (
      <IntranetLayout>
        <div style={{ textAlign: "center", padding: 60, fontFamily: FONTS.body, color: COLORS.gray }}>Carregando...</div>
      </IntranetLayout>
    );
  }

  if (!data) {
    return (
      <IntranetLayout>
        <div style={{ textAlign: "center", padding: 60, fontFamily: FONTS.body, color: COLORS.gray }}>Dados nao encontrados.</div>
      </IntranetLayout>
    );
  }

  return (
    <IntranetLayout>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px" }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, color: COLORS.dark, margin: "0 0 6px" }}>
          Meus Dados Pessoais
        </h1>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 28px" }}>
          Conforme a Lei Geral de Protecao de Dados (LGPD), voce tem direito de acessar, exportar e solicitar a exclusao dos seus dados pessoais.
        </p>

        {/* Botoes de acao */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <button onClick={exportarDados}
            style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff",
              cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
            Exportar meus dados (JSON)
          </button>
          {!exclusaoSolicitada && !data.lgpdExclusaoSolicitadaEm && (
            <button onClick={() => setConfirmExclusao(true)}
              style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fff5f5", color: "#cc0000",
                cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
              Solicitar exclusao dos meus dados
            </button>
          )}
          {(exclusaoSolicitada || data.lgpdExclusaoSolicitadaEm) && (
            <div style={{ padding: "10px 20px", borderRadius: 8, background: "#fef3c7", border: "1px solid #fde68a",
              fontFamily: FONTS.body, fontSize: 13, color: "#92400e" }}>
              Exclusao solicitada em {new Date(data.lgpdExclusaoSolicitadaEm || new Date()).toLocaleDateString("pt-BR")}.
              A FMA tera ate 15 dias para processar sua solicitacao.
            </div>
          )}
        </div>

        {/* Confirmacao de exclusao */}
        {confirmExclusao && (
          <div style={{ ...card, background: "#fef2f2", border: "1px solid #fca5a5" }}>
            <p style={{ fontFamily: FONTS.body, fontSize: 14, color: "#991b1b", margin: "0 0 16px" }}>
              <strong>Atencao:</strong> Ao solicitar a exclusao, seus dados pessoais serao removidos do sistema da FMA.
              Dados necessarios para obrigacoes legais (fiscais, contratuais) poderao ser mantidos pelo prazo legal.
              Esta acao nao pode ser desfeita.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={solicitarExclusao}
                style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#cc0000", color: "#fff",
                  cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
                Confirmar exclusao
              </button>
              <button onClick={() => setConfirmExclusao(false)}
                style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "#fff",
                  color: COLORS.dark, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Dados pessoais */}
        <div style={card}>
          {sectionTitle("Dados Pessoais")}
          <DataTable fields={PERSONAL_FIELDS} data={data} />
        </div>

        {/* Endereco */}
        <div style={card}>
          {sectionTitle("Endereco")}
          <DataTable fields={ADDRESS_FIELDS} data={data} />
        </div>

        {/* Dados bancarios */}
        <div style={card}>
          {sectionTitle("Dados Bancarios")}
          <DataTable fields={BANK_FIELDS} data={data} />
        </div>

        {/* Dados profissionais */}
        <div style={card}>
          {sectionTitle("Dados Profissionais e Emergencia")}
          <DataTable fields={PROFESSIONAL_FIELDS} data={data} />
        </div>

        {/* Consentimentos */}
        <div style={card}>
          {sectionTitle("Consentimentos")}
          <DataTable fields={CONSENT_FIELDS} data={data} />
        </div>

        <p style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, textAlign: "center", marginTop: 16 }}>
          Para duvidas sobre seus dados, entre em contato: mg@cbat.org.br (assunto: Direitos LGPD)
        </p>
      </div>
    </IntranetLayout>
  );
}
