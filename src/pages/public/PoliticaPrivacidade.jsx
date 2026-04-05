/**
 * PoliticaPrivacidade.jsx — Política de Privacidade e Proteção de Dados (LGPD).
 * Rota: /privacidade
 */
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";

const S = {
  page: { maxWidth: 860, margin: "0 auto", padding: "48px 32px 80px" },
  h1: { fontFamily: FONTS.heading, fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 900, color: COLORS.dark, textTransform: "uppercase", margin: "0 0 8px" },
  h2: { fontFamily: FONTS.heading, fontSize: 18, fontWeight: 800, color: COLORS.dark, textTransform: "uppercase", margin: "40px 0 12px", letterSpacing: 0.5 },
  h3: { fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.dark, margin: "24px 0 8px" },
  p: { fontFamily: FONTS.body, fontSize: 14.5, color: "#374151", lineHeight: 1.8, margin: "0 0 14px" },
  ul: { fontFamily: FONTS.body, fontSize: 14.5, color: "#374151", lineHeight: 1.8, margin: "0 0 14px", paddingLeft: 24 },
  card: { background: "#f9fafb", borderRadius: 12, padding: "20px 24px", border: `1px solid ${COLORS.grayLight}`, marginBottom: 20 },
};

export default function PoliticaPrivacidade() {
  useEffect(() => { document.title = "Política de Privacidade | FMA"; }, []);

  return (
    <div style={S.page}>
      <nav style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginBottom: 24 }}>
        <Link to="/" style={{ color: COLORS.gray, textDecoration: "none" }}>Início</Link> {" / "}
        <span style={{ color: COLORS.dark }}>Política de Privacidade</span>
      </nav>

      <h1 style={S.h1}>Política de Privacidade e Proteção de Dados Pessoais</h1>
      <p style={{ ...S.p, color: COLORS.gray, fontSize: 13 }}>Última atualização: abril de 2026</p>

      <div style={S.card}>
        <p style={{ ...S.p, margin: 0 }}>
          A Federação Mineira de Atletismo (FMA) está comprometida com a proteção dos dados pessoais
          de seus usuários, em conformidade com a Lei Geral de Proteção de Dados Pessoais
          (Lei nº 13.709/2018 — LGPD). Esta política descreve como coletamos, utilizamos,
          armazenamos e protegemos suas informações.
        </p>
      </div>

      <h2 style={S.h2}>1. Identificação do Controlador</h2>
      <p style={S.p}>
        <strong>Controlador:</strong> Federação Mineira de Atletismo (FMA)<br />
        <strong>CNPJ:</strong> A definir<br />
        <strong>Endereço:</strong> Belo Horizonte, Minas Gerais<br />
        <strong>E-mail de contato:</strong> mg@cbat.org.br
      </p>

      <h2 style={S.h2}>2. Encarregado pelo Tratamento de Dados (DPO)</h2>
      <p style={S.p}>
        Conforme o Art. 41 da LGPD, a FMA indica como Encarregado pelo Tratamento de Dados Pessoais:<br />
        <strong>Nome:</strong> A definir<br />
        <strong>E-mail:</strong> A definir<br />
        O Encarregado é o canal de comunicação entre a FMA, os titulares dos dados e a
        Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2 style={S.h2}>3. Dados Pessoais Coletados</h2>
      <p style={S.p}>Coletamos os seguintes dados pessoais, de acordo com a finalidade:</p>

      <h3 style={S.h3}>3.1 Cadastro de Organizadores de Eventos (Portal)</h3>
      <ul style={S.ul}>
        <li>Nome completo ou razão social</li>
        <li>CNPJ</li>
        <li>E-mail</li>
        <li>Telefone/WhatsApp</li>
        <li>Endereço (cidade, estado)</li>
        <li>Nome fantasia</li>
        <li>Website</li>
      </ul>

      <h3 style={S.h3}>3.2 Solicitações de Permit e Chancela</h3>
      <p style={S.p}>
        <strong>Permit</strong> (Norma 07 da CBAt): reconhecimento e homologação de corridas de rua e ultramaratonas.<br />
        <strong>Chancela</strong> (Norma 15 da CBAt): reconhecimento e homologação de corridas em montanha e trilha.
      </p>
      <ul style={S.ul}>
        <li>Dados do evento (nome, data, local, descrição, distâncias)</li>
        <li>Documentos técnicos (regulamento, mapa de percurso, certificado de medição, apólice de seguro)</li>
        <li>Informações de empresas prestadoras de serviço (cronometragem, atendimento médico)</li>
      </ul>

      <h3 style={S.h3}>3.3 Árbitros e Colaboradores (Intranet)</h3>
      <ul style={S.ul}>
        <li>Nome completo</li>
        <li>E-mail</li>
        <li>Telefone</li>
        <li>Cidade</li>
        <li>Categoria e função</li>
      </ul>

      <h3 style={S.h3}>3.4 Visitantes do Site</h3>
      <ul style={S.ul}>
        <li>Dados de navegação (páginas visitadas, tempo de permanência) — mediante consentimento</li>
        <li>Dados técnicos (navegador, dispositivo, IP anonimizado)</li>
      </ul>

      <h2 style={S.h2}>4. Finalidade do Tratamento</h2>
      <p style={S.p}>Os dados pessoais são tratados para as seguintes finalidades:</p>
      <ul style={S.ul}>
        <li>Gestão de cadastros de organizadores de eventos esportivos</li>
        <li>Análise e aprovação de solicitações de Permit e Chancela</li>
        <li>Comunicação institucional e operacional com organizadores e árbitros</li>
        <li>Geração de documentos oficiais (permits, chancelas)</li>
        <li>Gestão da equipe de arbitragem</li>
        <li>Melhoria do site e dos serviços prestados (analytics, mediante consentimento)</li>
        <li>Cumprimento de obrigações regulatórias esportivas</li>
      </ul>

      <h2 style={S.h2}>5. Base Legal para o Tratamento (Art. 7º)</h2>
      <p style={S.p}>O tratamento de dados pessoais pela FMA fundamenta-se nas seguintes bases legais:</p>
      <ul style={S.ul}>
        <li><strong>Consentimento (Art. 7º, I):</strong> para cookies de analytics e comunicações de marketing</li>
        <li><strong>Execução de contrato (Art. 7º, V):</strong> para cadastro e gestão de organizadores e solicitações de permit/chancela</li>
        <li><strong>Cumprimento de obrigação legal (Art. 7º, II):</strong> para obrigações regulatórias da federação junto à CBAt e World Athletics</li>
        <li><strong>Exercício regular de direitos (Art. 7º, VI):</strong> para defesa em processos administrativos ou judiciais</li>
      </ul>

      <h2 style={S.h2}>6. Compartilhamento de Dados com Terceiros</h2>
      <p style={S.p}>Os dados pessoais podem ser compartilhados com os seguintes terceiros, exclusivamente para as finalidades descritas:</p>
      <ul style={S.ul}>
        <li><strong>Provedor de infraestrutura:</strong> armazenamento seguro de dados e autenticação de usuários</li>
        <li><strong>Serviço de e-mail:</strong> envio de notificações sobre solicitações e designações</li>
        <li><strong>Serviço de analytics:</strong> análise de navegação e uso do site (mediante consentimento)</li>
      </ul>
      <p style={S.p}>
        A FMA não vende, aluga ou compartilha dados pessoais com terceiros para fins de marketing ou publicidade.
      </p>

      <h2 style={S.h2}>7. Direitos do Titular dos Dados (Art. 18)</h2>
      <p style={S.p}>Conforme a LGPD, você tem os seguintes direitos em relação aos seus dados pessoais:</p>
      <ul style={S.ul}>
        <li><strong>Confirmação e acesso:</strong> saber se tratamos seus dados e obter cópia</li>
        <li><strong>Correção:</strong> solicitar a atualização de dados incompletos ou desatualizados</li>
        <li><strong>Anonimização, bloqueio ou eliminação:</strong> de dados desnecessários ou tratados em desconformidade</li>
        <li><strong>Portabilidade:</strong> solicitar a transferência de seus dados a outro fornecedor</li>
        <li><strong>Eliminação:</strong> solicitar a exclusão de dados tratados com base no consentimento</li>
        <li><strong>Informação sobre compartilhamento:</strong> saber com quais terceiros seus dados são compartilhados</li>
        <li><strong>Revogação do consentimento:</strong> retirar o consentimento a qualquer momento</li>
      </ul>
      <p style={S.p}>
        Para exercer seus direitos, entre em contato pelo e-mail <strong>mg@cbat.org.br</strong> com
        o assunto "Direitos LGPD". Responderemos no prazo de até 15 (quinze) dias úteis,
        conforme Art. 19, II da LGPD.
      </p>

      <h2 style={S.h2}>8. Retenção e Eliminação de Dados</h2>
      <p style={S.p}>
        Os dados pessoais serão mantidos pelo tempo necessário para cumprir as finalidades para as
        quais foram coletados, incluindo obrigações legais e regulatórias. Após o término do
        tratamento, os dados serão eliminados ou anonimizados, conforme Arts. 15 e 16 da LGPD,
        salvo nas hipóteses de conservação previstas em lei.
      </p>

      <h2 style={S.h2}>9. Cookies e Tecnologias de Rastreamento</h2>
      <p style={S.p}>Este site utiliza:</p>
      <ul style={S.ul}>
        <li><strong>Cookies essenciais:</strong> necessários para o funcionamento do site (autenticação, preferências de sessão)</li>
        <li><strong>Cookies de analytics:</strong> utilizados para entender como os visitantes navegam pelo site — somente mediante consentimento</li>
      </ul>
      <p style={S.p}>
        Você pode gerenciar suas preferências de cookies a qualquer momento limpando os dados
        do navegador. Ao rejeitar cookies de analytics, nenhum dado de navegação será coletado.
      </p>

      <h2 style={S.h2}>10. Segurança dos Dados (Art. 46)</h2>
      <p style={S.p}>
        A FMA adota medidas técnicas e administrativas para proteger os dados pessoais contra
        acessos não autorizados, destruição, perda ou alteração, incluindo:
      </p>
      <ul style={S.ul}>
        <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
        <li>Autenticação segura de usuários</li>
        <li>Regras de segurança e controle de acesso no banco de dados</li>
        <li>Controle de acesso baseado em perfis (administrador, organizador, árbitro)</li>
        <li>Backups automáticos dos dados armazenados</li>
      </ul>

      <h2 style={S.h2}>11. Transferência Internacional de Dados (Art. 33)</h2>
      <p style={S.p}>
        Os dados pessoais podem ser armazenados e processados em servidores localizados fora
        do Brasil, conforme Art. 33 da LGPD, com base em cláusulas contratuais que garantem
        nível adequado de proteção de dados pessoais.
      </p>

      <h2 style={S.h2}>12. Alterações nesta Política</h2>
      <p style={S.p}>
        Esta Política de Privacidade pode ser atualizada periodicamente. As alterações serão
        publicadas nesta página com a data de atualização revisada. Recomendamos a consulta
        periódica deste documento.
      </p>

      <h2 style={S.h2}>13. Contato</h2>
      <p style={S.p}>
        Para dúvidas, sugestões ou exercício de direitos relacionados a esta Política de
        Privacidade e à proteção de seus dados pessoais, entre em contato:
      </p>
      <div style={S.card}>
        <p style={{ ...S.p, margin: 0 }}>
          <strong>Federação Mineira de Atletismo (FMA)</strong><br />
          E-mail: mg@cbat.org.br<br />
          Assunto: Direitos LGPD
        </p>
      </div>

      <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${COLORS.grayLight}` }}>
        <Link to="/" style={{ fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, color: COLORS.gray, textDecoration: "none" }}>
          ← Voltar ao início
        </Link>
      </div>
    </div>
  );
}
