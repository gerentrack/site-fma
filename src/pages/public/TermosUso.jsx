/**
 * TermosUso.jsx — Termos de Uso do site e do Portal de Organizadores.
 * Rota: /termos
 */
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { COLORS, FONTS } from "../../styles/colors";

const S = {
  page: { maxWidth: 860, margin: "0 auto", padding: "48px 32px 80px" },
  h1: { fontFamily: FONTS.heading, fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 900, color: COLORS.dark, textTransform: "uppercase", margin: "0 0 8px" },
  h2: { fontFamily: FONTS.heading, fontSize: 18, fontWeight: 800, color: COLORS.dark, textTransform: "uppercase", margin: "40px 0 12px", letterSpacing: 0.5 },
  p: { fontFamily: FONTS.body, fontSize: 14.5, color: "#374151", lineHeight: 1.8, margin: "0 0 14px" },
  ul: { fontFamily: FONTS.body, fontSize: 14.5, color: "#374151", lineHeight: 1.8, margin: "0 0 14px", paddingLeft: 24 },
  card: { background: "#f9fafb", borderRadius: 12, padding: "20px 24px", border: `1px solid ${COLORS.grayLight}`, marginBottom: 20 },
};

export default function TermosUso() {
  useEffect(() => { document.title = "Termos de Uso | FMA"; }, []);

  return (
    <div style={S.page}>
      <nav style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, marginBottom: 24 }}>
        <Link to="/" style={{ color: COLORS.gray, textDecoration: "none" }}>Início</Link> {" / "}
        <span style={{ color: COLORS.dark }}>Termos de Uso</span>
      </nav>

      <h1 style={S.h1}>Termos de Uso</h1>
      <p style={{ ...S.p, color: COLORS.gray, fontSize: 13 }}>Última atualização: abril de 2026</p>

      <div style={S.card}>
        <p style={{ ...S.p, margin: 0 }}>
          Ao acessar e utilizar o site da Federação Mineira de Atletismo (FMA), você declara que
          leu, compreendeu e concorda com estes Termos de Uso. Caso não concorde com qualquer
          disposição, recomendamos que não utilize o site.
        </p>
      </div>

      <h2 style={S.h2}>1. Definições</h2>
      <ul style={S.ul}>
        <li><strong>Site:</strong> o portal da FMA e seus subdomínios</li>
        <li><strong>Usuário:</strong> qualquer pessoa que acesse o site, seja visitante, organizador de eventos, árbitro ou administrador</li>
        <li><strong>Portal:</strong> área restrita do site destinada a organizadores de eventos para solicitação de Permit e Chancela</li>
        <li><strong>FMA:</strong> Federação Mineira de Atletismo, entidade responsável pelo site</li>
      </ul>

      <h2 style={S.h2}>2. Objeto</h2>
      <p style={S.p}>
        O site da FMA tem como finalidade divulgar informações sobre o atletismo em Minas Gerais,
        disponibilizar o calendário de eventos, resultados de competições, conteúdo institucional
        e oferecer o Portal de Organizadores para solicitação de Permit e Chancela de eventos.
      </p>

      <h2 style={S.h2}>3. Cadastro e Acesso ao Portal</h2>
      <p style={S.p}>
        Para utilizar o Portal de Organizadores, é necessário realizar um cadastro com dados
        verídicos e atualizados. O usuário é responsável por:
      </p>
      <ul style={S.ul}>
        <li>Fornecer informações corretas e completas no cadastro</li>
        <li>Manter seus dados atualizados</li>
        <li>Preservar a confidencialidade de sua senha</li>
        <li>Comunicar imediatamente a FMA sobre qualquer uso não autorizado de sua conta</li>
      </ul>
      <p style={S.p}>
        A FMA reserva-se o direito de suspender ou desativar contas que violem estes termos,
        apresentem informações falsas ou sejam utilizadas de forma irregular.
      </p>

      <h2 style={S.h2}>4. Uso Aceitável</h2>
      <p style={S.p}>Ao utilizar o site, o usuário compromete-se a não:</p>
      <ul style={S.ul}>
        <li>Utilizar o site para fins ilegais ou não autorizados</li>
        <li>Transmitir conteúdo ofensivo, difamatório ou que viole direitos de terceiros</li>
        <li>Tentar acessar áreas restritas sem autorização</li>
        <li>Utilizar robôs, scrapers ou ferramentas automatizadas para coletar dados do site</li>
        <li>Interferir no funcionamento ou segurança do site</li>
        <li>Enviar documentos falsos ou fraudulentos nas solicitações de Permit e Chancela</li>
      </ul>

      <h2 style={S.h2}>5. Propriedade Intelectual</h2>
      <p style={S.p}>
        Todo o conteúdo do site — incluindo textos, imagens, logotipos, gráficos, layout,
        documentos e software — é de propriedade da FMA ou de seus licenciadores e está
        protegido pela legislação brasileira de propriedade intelectual.
      </p>
      <p style={S.p}>
        É vedada a reprodução, distribuição, modificação ou uso comercial do conteúdo do site
        sem autorização prévia e expressa da FMA.
      </p>

      <h2 style={S.h2}>6. Solicitações de Permit e Chancela</h2>
      <p style={S.p}>
        O <strong>Permit</strong> é o reconhecimento e homologação de corridas de rua e
        ultramaratonas, conforme Norma 07 da CBAt. A <strong>Chancela</strong> é o reconhecimento
        e homologação de corridas em montanha e trilha, conforme Norma 15 da CBAt.
      </p>
      <p style={S.p}>
        As solicitações realizadas pelo Portal estão sujeitas à análise e aprovação pela FMA,
        conforme as Normas da CBAt e os regulamentos internos da federação. A submissão de
        uma solicitação não garante automaticamente sua aprovação. A FMA pode solicitar
        documentos complementares e definir prazos para adequação.
      </p>

      <h2 style={S.h2}>7. Limitação de Responsabilidade</h2>
      <p style={S.p}>A FMA não se responsabiliza por:</p>
      <ul style={S.ul}>
        <li>Eventuais indisponibilidades temporárias do site por manutenção ou falhas técnicas</li>
        <li>Danos decorrentes do uso de informações obtidas no site por terceiros</li>
        <li>Conteúdo de sites de terceiros acessados por meio de links disponibilizados no site</li>
        <li>Perda de dados resultante de falha do usuário em manter backups de suas informações</li>
      </ul>

      <h2 style={S.h2}>8. Privacidade e Proteção de Dados</h2>
      <p style={S.p}>
        O tratamento de dados pessoais é regido pela nossa{" "}
        <Link to="/privacidade" style={{ color: COLORS.primary, textDecoration: "underline" }}>
          Política de Privacidade
        </Link>, que é parte integrante destes Termos de Uso. Ao se cadastrar no Portal,
        o usuário declara ter lido e concordado com a Política de Privacidade.
      </p>

      <h2 style={S.h2}>9. Alterações nos Termos</h2>
      <p style={S.p}>
        A FMA pode alterar estes Termos de Uso a qualquer momento. As alterações entram em
        vigor na data de sua publicação nesta página. O uso continuado do site após as
        alterações constitui aceitação dos novos termos.
      </p>

      <h2 style={S.h2}>10. Legislação Aplicável e Foro</h2>
      <p style={S.p}>
        Estes Termos de Uso são regidos pela legislação brasileira. Fica eleito o foro da
        comarca de Belo Horizonte — MG para dirimir quaisquer controvérsias decorrentes
        destes termos, com renúncia a qualquer outro, por mais privilegiado que seja.
      </p>

      <h2 style={S.h2}>11. Contato</h2>
      <div style={S.card}>
        <p style={{ ...S.p, margin: 0 }}>
          <strong>Federação Mineira de Atletismo (FMA)</strong><br />
          E-mail: mg@cbat.org.br
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
