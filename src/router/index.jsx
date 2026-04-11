import { Routes, Route, Navigate } from "react-router-dom";
import TopBar from "../components/layout/TopBar";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import AdminLayout from "../components/admin/AdminLayout";

// ── Páginas públicas ──────────────────────────────────────────────────────────
import Home                from "../pages/public/Home";
import NewsPage            from "../pages/public/NewsPage";
import NewsDetailPage      from "../pages/public/NewsDetailPage";
import CalendarPage        from "../pages/public/CalendarPage";
import EventDetailPage     from "../pages/public/EventDetailPage";
import InstitutionalPage   from "../pages/public/InstitutionalPage";
import AthletesPage        from "../pages/public/AthletesPage";
import AthleteDetailPage   from "../pages/public/AthleteDetailPage";
import RefereesPage        from "../pages/public/RefereesPage";
import RefereeDetailPage   from "../pages/public/RefereeDetailPage";

// ── Intranet ──────────────────────────────────────────────────────────────────
import IntranetLogin          from "../pages/intranet/IntranetLogin";
import IntranetHome           from "../pages/intranet/IntranetHome";
import MyAvailability         from "../pages/intranet/arbitro/MyAvailability";
import MyAssignments          from "../pages/intranet/arbitro/MyAssignments";
import MyProfile              from "../pages/intranet/arbitro/MyProfile";
import IntranetDocuments      from "../pages/intranet/arbitro/IntranetDocuments";
import { IntranetRefereeList, IntranetRefereeEditor } from "../pages/intranet/admin/RefereesAdmin";
import { IntranetEventList, IntranetEventEditor }     from "../pages/intranet/admin/EventsAdmin";
import { AssignmentList, AssignmentEditor }           from "../pages/intranet/admin/AssignmentPanel";
import ChangePasswordIntranet  from "../pages/intranet/ChangePasswordIntranet";
import CompleteProfileWizard   from "../pages/intranet/CompleteProfileWizard";
import VerificarEmailIntranet  from "../pages/intranet/VerificarEmailIntranet";

// ── Páginas admin FMA ─────────────────────────────────────────────────────────
import AdminLogin                              from "../pages/admin/AdminLogin";
import Dashboard                               from "../pages/admin/Dashboard";
import { NewsList, NewsEditor }                from "../pages/admin/NewsAdmin";
import { CalendarList, CalendarEditor }        from "../pages/admin/CalendarAdmin";
import { DocumentsList, DocumentsEditor }      from "../pages/admin/DocumentsAdmin";
import { BannersList, BannersEditor }          from "../pages/admin/BannersAdmin";
import { PartnersList, PartnersEditor }        from "../pages/admin/PartnersAdmin";
import { SocialLinksList, SocialLinksEditor }  from "../pages/admin/SocialLinksAdmin";
import FooterAdmin                             from "../pages/admin/FooterAdmin";
import { InstitutionalList, PageEditor, SectionEditor } from "../pages/admin/InstitutionalAdmin";
import { AthleteContentList, AthleteContentEditor }     from "../pages/admin/AthletesAdmin";
import { RefereeContentList, RefereeContentEditor }     from "../pages/admin/RefereeContentAdmin";

// ── Portal de Organizadores ──────────────────────────────────────────────────
import PortalLogin        from "../pages/portal/PortalLogin";
import PortalRegister     from "../pages/portal/PortalRegister";
import PortalLayout       from "../pages/portal/PortalLayout";
import PortalHome         from "../pages/portal/PortalHome";
import MinhasSolicitacoes from "../pages/portal/MinhasSolicitacoes";
import NovaSolicitacao    from "../pages/portal/NovaSolicitacao";
import SolicitacaoDetalhe from "../pages/portal/SolicitacaoDetalhe";
import MeusDados              from "../pages/portal/MeusDados";
import VerificarEmailPortal   from "../pages/portal/VerificarEmailPortal";
// ── Admin: Portal ─────────────────────────────────────────────────────────────
import { SolicitacoesList, SolicitacaoEditor } from "../pages/admin/SolicitacoesAdmin";
import { OrganizadoresList, OrganizadorEditor } from "../pages/admin/OrganizadoresAdmin";
import FormConfigAdmin from "../pages/admin/FormConfigAdmin";
import TaxasConfigAdmin from "../pages/admin/TaxasConfigAdmin";
import RelatorioFinanceiro from "../pages/admin/RelatorioFinanceiro";
import {
  ResultadosCorridas, ResultadosPista, ResultadosTrail, ResultadoDetalhe,
} from "../pages/public/ResultadosPage";
import DocumentosPage from "../pages/public/DocumentosPage";
import { GaleriaListagem, GaleriaAlbum } from "../pages/public/GaleriaPage";
import { RankingPage, RecordesPage }     from "../pages/public/RankingPage";
import ContatoPage from "../pages/public/ContatoPage";
import PoliticaPrivacidade from "../pages/public/PoliticaPrivacidade";
import TermosUso from "../pages/public/TermosUso";
import { GaleriaList, GaleriaEditor } from "../pages/admin/GaleriaAdmin";
import { ResultadosList, ResultadosEditor } from "../pages/admin/ResultadosAdmin";
import { EquipesListagem, EquipeDetalhe } from "../pages/public/EquipesPage";
import { EquipesList, EquipesEditor }     from "../pages/admin/EquipesAdmin";
import EleicoesFMA    from "../pages/public/EleicoesFMA";
import OuvidoriaPage  from "../pages/public/OuvidoriaPage";
import AntidopagemPage from "../pages/public/AntidopagemPage";
import MapaPage from "../pages/public/MapaPage";
import { PistasList, PistasEditor } from "../pages/admin/PistasAdmin";
import ImportarAdmin from "../pages/admin/ImportarAdmin";
import StorageCleanup from "../pages/admin/StorageCleanup";
import { UsuariosList, UsuariosEditor } from "../pages/admin/UsuariosAdmin";
import ArbitrosVisaoAdmin from "../pages/admin/ArbitrosVisaoAdmin";
import ArbitroDetalheAdmin from "../pages/admin/ArbitroDetalheAdmin";
import EscalasVisaoAdmin from "../pages/admin/EscalasVisaoAdmin";
import AnuidadesAdmin from "../pages/admin/AnuidadesAdmin";
import MinhaAnuidade from "../pages/intranet/arbitro/MinhaAnuidade";
import EnvioDocumentosAdmin from "../pages/admin/EnvioDocumentosAdmin";
import MeusDocumentosRecebidos from "../pages/intranet/arbitro/MeusDocumentosRecebidos";
import HistoricoEscalacoes from "../pages/intranet/admin/HistoricoEscalacoes";
import AvaliacaoArbitro from "../pages/intranet/admin/AvaliacaoArbitro";
import IndicadoresPanel from "../pages/intranet/admin/IndicadoresPanel";
import RelatorioArbitros from "../pages/intranet/admin/RelatorioArbitros";
import CalendarioEscalas from "../pages/intranet/arbitro/CalendarioEscalas";
import DiariasAdmin from "../pages/intranet/admin/DiariasAdmin";
import PagamentosArbitragem from "../pages/intranet/admin/PagamentosArbitragem";
import MuralAdmin from "../pages/intranet/admin/MuralAdmin";
import ReembolsosAdmin from "../pages/intranet/admin/ReembolsosAdmin";
import AnuidadesIntranet from "../pages/intranet/admin/AnuidadesIntranet";
import RelatoriosArbitragemAdmin from "../pages/intranet/admin/RelatoriosArbitragemAdmin";
import FinanceiroArbitragem from "../pages/intranet/admin/FinanceiroArbitragem";
import MeusReembolsos from "../pages/intranet/arbitro/MeusReembolsos";
import RelatorioCorridaRua from "../pages/intranet/arbitro/RelatorioCorridaRua";
import ChangePasswordPage from "../pages/admin/ChangePasswordPage";

// ── Layout público ────────────────────────────────────────────────────────────
function PublicLayout({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar />
      <Header />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
}

function ComingSoon({ title }) {
  return (
    <div style={{ padding: "80px 24px", textAlign: "center", fontFamily: "'Barlow', sans-serif" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
      <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, color: "#cc0000" }}>{title}</h1>
      <p style={{ color: "#6b7280" }}>Página em construção.</p>
    </div>
  );
}

// ── Rotas ─────────────────────────────────────────────────────────────────────
export default function AppRouter() {
  return (
    <Routes>

      {/* ── Públicas gerais ── */}
      <Route path="/"               element={<PublicLayout><Home /></PublicLayout>} />
      <Route path="/noticias"       element={<PublicLayout><NewsPage /></PublicLayout>} />
      <Route path="/noticias/:slug" element={<PublicLayout><NewsDetailPage /></PublicLayout>} />

      {/* ── Calendário ── */}
      <Route path="/calendario"   element={<PublicLayout><CalendarPage /></PublicLayout>} />
      <Route path="/eventos/:id"  element={<PublicLayout><EventDetailPage /></PublicLayout>} />

      {/* ── Central do Atleta ── */}
      <Route path="/atletas"                 element={<PublicLayout><AthletesPage /></PublicLayout>} />
      <Route path="/atletas/conteudo/:id"    element={<PublicLayout><AthleteDetailPage /></PublicLayout>} />
      <Route path="/atletas/cadastro"        element={<Navigate to="/atletas?categoria=cadastro"     replace />} />
      <Route path="/atletas/cancelamento"    element={<Navigate to="/atletas?categoria=cancelamento" replace />} />

      {/* ── Central do Árbitro (pública) ── */}
      <Route path="/arbitros"                element={<PublicLayout><RefereesPage /></PublicLayout>} />
      <Route path="/arbitros/conteudo/:id"   element={<PublicLayout><RefereeDetailPage /></PublicLayout>} />
      {/* Redirecionamentos de rotas legadas do menu */}
      <Route path="/arbitros/cadastro"              element={<Navigate to="/arbitros?categoria=cadastro" replace />} />
      <Route path="/arbitros/disponibilidade-corridas" element={<Navigate to="/arbitros?categoria=disponibilidade" replace />} />
      <Route path="/arbitros/disponibilidade-pista"    element={<Navigate to="/arbitros?categoria=disponibilidade" replace />} />
      <Route path="/arbitros/ficha-corrida"            element={<Navigate to="/arbitros?categoria=formulario" replace />} />
      <Route path="/arbitros/relatorio-corrida"        element={<Navigate to="/arbitros?categoria=material" replace />} />

      {/* ══ Intranet de Árbitros ════════════════════════════════════════════ */}
      <Route path="/intranet"                    element={<IntranetHome />} />
      <Route path="/intranet/login"              element={<IntranetLogin />} />
      <Route path="/intranet/alterar-senha"      element={<ChangePasswordIntranet />} />
      <Route path="/intranet/completar-perfil"   element={<CompleteProfileWizard />} />
      <Route path="/intranet/verificar-email"    element={<VerificarEmailIntranet />} />
      {/* Área do árbitro */}
      <Route path="/intranet/disponibilidade"    element={<MyAvailability />} />
      <Route path="/intranet/escalas"            element={<MyAssignments />} />
      <Route path="/intranet/perfil"             element={<MyProfile />} />
      <Route path="/intranet/documentos"         element={<IntranetDocuments />} />
      <Route path="/intranet/anuidade"          element={<MinhaAnuidade />} />
      <Route path="/intranet/mensagens"          element={<MeusDocumentosRecebidos />} />
      <Route path="/intranet/calendario"         element={<CalendarioEscalas />} />
      <Route path="/intranet/reembolsos"         element={<MeusReembolsos />} />
      <Route path="/intranet/relatorio/:assignmentId" element={<RelatorioCorridaRua />} />
      {/* Área do admin/coordenador */}
      <Route path="/intranet/admin/arbitros"          element={<IntranetRefereeList />} />
      <Route path="/intranet/admin/arbitros/:id"      element={<IntranetRefereeEditor />} />
      <Route path="/intranet/admin/eventos"           element={<IntranetEventList />} />
      <Route path="/intranet/admin/eventos/:id"       element={<IntranetEventEditor />} />
      <Route path="/intranet/admin/escalacao"         element={<AssignmentList />} />
      <Route path="/intranet/admin/escalacao/:eventId" element={<AssignmentEditor />} />
      <Route path="/intranet/admin/historico"        element={<HistoricoEscalacoes />} />
      <Route path="/intranet/admin/avaliacoes"       element={<AvaliacaoArbitro />} />
      <Route path="/intranet/admin/indicadores"      element={<IndicadoresPanel />} />
      <Route path="/intranet/admin/relatorio"        element={<RelatorioArbitros />} />
      <Route path="/intranet/admin/diarias"          element={<DiariasAdmin />} />
      <Route path="/intranet/admin/pagamentos"       element={<PagamentosArbitragem />} />
      <Route path="/intranet/admin/anuidades"        element={<AnuidadesIntranet />} />
      <Route path="/intranet/admin/mural"            element={<MuralAdmin />} />
      <Route path="/intranet/admin/reembolsos"       element={<ReembolsosAdmin />} />
      <Route path="/intranet/admin/relatorios-arbitragem" element={<RelatoriosArbitragemAdmin />} />
      <Route path="/intranet/admin/financeiro"           element={<FinanceiroArbitragem />} />

      {/* ── Galeria ── */}
      <Route path="/galeria"     element={<PublicLayout><GaleriaListagem /></PublicLayout>} />
      <Route path="/galeria/:id" element={<PublicLayout><GaleriaAlbum /></PublicLayout>} />

      {/* ── Documentos ── */}
      <Route path="/documentos" element={<PublicLayout><DocumentosPage /></PublicLayout>} />

      {/* ── Equipes / Clubes ── */}
      <Route path="/equipes"      element={<PublicLayout><EquipesListagem /></PublicLayout>} />
      <Route path="/equipes/:slug" element={<PublicLayout><EquipeDetalhe /></PublicLayout>} />

      {/* ── Portal da Transparência ── */}
      <Route path="/transparencia/eleicoes"  element={<PublicLayout><EleicoesFMA /></PublicLayout>} />
      <Route path="/transparencia/ouvidoria" element={<PublicLayout><OuvidoriaPage /></PublicLayout>} />

      {/* ── Antidopagem ── */}
      <Route path="/antidopagem" element={<PublicLayout><AntidopagemPage /></PublicLayout>} />

      {/* ── Ranking e resultados ── */}
      <Route path="/ranking"             element={<PublicLayout><RankingPage /></PublicLayout>} />
      <Route path="/ranking/recordes"    element={<PublicLayout><RecordesPage /></PublicLayout>} />
      <Route path="/resultados/corridas" element={<PublicLayout><ResultadosCorridas /></PublicLayout>} />
      <Route path="/resultados/pista"    element={<PublicLayout><ResultadosPista /></PublicLayout>} />
      <Route path="/resultados/trail"    element={<PublicLayout><ResultadosTrail /></PublicLayout>} />
      <Route path="/resultados/:id"      element={<PublicLayout><ResultadoDetalhe /></PublicLayout>} />

      {/* ── Contato ── */}
      <Route path="/contato" element={<PublicLayout><ContatoPage /></PublicLayout>} />
      <Route path="/privacidade" element={<PublicLayout><PoliticaPrivacidade /></PublicLayout>} />
      <Route path="/termos" element={<PublicLayout><TermosUso /></PublicLayout>} />
      <Route path="/mapa"    element={<PublicLayout><MapaPage /></PublicLayout>} />

      {/* ── Redirecionamentos legados ── */}
      <Route path="/sobre"  element={<Navigate to="/institucional/sobre"          replace />} />
      <Route path="/pista"  element={<Navigate to="/institucional/pista-sintetica" replace />} />
      <Route path="/clubes" element={<Navigate to="/institucional/clubes"          replace />} />
      <Route path="/equipes/como-se-filiar" element={<Navigate to="/institucional/como-se-filiar" replace />} />

      {/* ── Páginas institucionais ── */}
      <Route path="/institucional/:slug" element={<PublicLayout><InstitutionalPage /></PublicLayout>} />

      {/* ══ Admin FMA ════════════════════════════════════════════════════════ */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/alterar-senha" element={<ChangePasswordPage />} />
      <Route path="/admin"       element={<Dashboard />} />

      <Route path="/admin/noticias"     element={<NewsList />} />
      <Route path="/admin/noticias/:id" element={<NewsEditor />} />

      <Route path="/admin/calendario"     element={<CalendarList />} />
      <Route path="/admin/calendario/:id" element={<CalendarEditor />} />

      <Route path="/admin/atletas"     element={<AthleteContentList />} />
      <Route path="/admin/atletas/:id" element={<AthleteContentEditor />} />

      <Route path="/admin/arbitros-conteudo"     element={<RefereeContentList />} />
      <Route path="/admin/arbitros-conteudo/:id" element={<RefereeContentEditor />} />

      <Route path="/admin/documentos"     element={<DocumentsList />} />
      <Route path="/admin/documentos/:id" element={<DocumentsEditor />} />

      <Route path="/admin/resultados"       element={<ResultadosList />} />
      <Route path="/admin/resultados/novo"  element={<ResultadosEditor />} />
      <Route path="/admin/resultados/:id"   element={<ResultadosEditor />} />

      <Route path="/admin/banners"     element={<BannersList />} />
      <Route path="/admin/banners/:id" element={<BannersEditor />} />

      <Route path="/admin/galeria"       element={<GaleriaList />} />
      <Route path="/admin/galeria/novo"  element={<GaleriaEditor />} />
      <Route path="/admin/galeria/:id"   element={<GaleriaEditor />} />

      <Route path="/admin/importar"         element={<ImportarAdmin />} />
      <Route path="/admin/storage-cleanup"  element={<StorageCleanup />} />

      {/* Gestão de usuários */}
      <Route path="/admin/usuarios"      element={<UsuariosList />} />
      <Route path="/admin/usuarios/:uid" element={<UsuariosEditor />} />

      {/* Visão da intranet no admin */}
      <Route path="/admin/arbitros"      element={<ArbitrosVisaoAdmin />} />
      <Route path="/admin/arbitros/:id"  element={<ArbitroDetalheAdmin />} />
      <Route path="/admin/escalas"      element={<EscalasVisaoAdmin />} />
      <Route path="/admin/anuidades"          element={<AnuidadesAdmin />} />
      <Route path="/admin/mensagens"          element={<EnvioDocumentosAdmin />} />
      <Route path="/admin/pistas"        element={<PistasList />} />
      <Route path="/admin/pistas/novo"  element={<PistasEditor />} />
      <Route path="/admin/pistas/:id"   element={<PistasEditor />} />
      <Route path="/admin/equipes"       element={<EquipesList />} />
      <Route path="/admin/equipes/novo"  element={<EquipesEditor />} />
      <Route path="/admin/equipes/:id"   element={<EquipesEditor />} />

      <Route path="/admin/parceiros"     element={<PartnersList />} />
      <Route path="/admin/parceiros/:id" element={<PartnersEditor />} />

      <Route path="/admin/redes-sociais"     element={<SocialLinksList />} />
      <Route path="/admin/redes-sociais/:id" element={<SocialLinksEditor />} />

      <Route path="/admin/rodape" element={<FooterAdmin />} />

      <Route path="/admin/institucional"                           element={<InstitutionalList />} />
      <Route path="/admin/institucional/:pageId"                   element={<PageEditor />} />
      <Route path="/admin/institucional/:pageId/secoes/:sectionId" element={<SectionEditor />} />

      {/* ══ Portal de Organizadores ═══════════════════════════════════════════ */}
      {/* Rotas públicas do portal (sem autenticação) */}
      <Route path="/portal/login"    element={<PortalLogin />} />
      <Route path="/portal/cadastro" element={<PortalRegister />} />

      {/* Rotas autenticadas do portal */}
      <Route path="/portal/verificar-email"    element={<VerificarEmailPortal />} />
      <Route path="/portal"                    element={<PortalLayout><PortalHome /></PortalLayout>} />
      <Route path="/portal/nova-solicitacao"   element={<PortalLayout><NovaSolicitacao /></PortalLayout>} />
      <Route path="/portal/solicitacoes"       element={<PortalLayout><MinhasSolicitacoes /></PortalLayout>} />
      <Route path="/portal/solicitacoes/:id"   element={<PortalLayout><SolicitacaoDetalhe /></PortalLayout>} />
      <Route path="/portal/meus-dados"         element={<PortalLayout><MeusDados /></PortalLayout>} />

      {/* Admin: gestão do portal */}
      <Route path="/admin/solicitacoes"        element={<SolicitacoesList />} />
      <Route path="/admin/solicitacoes/:id"    element={<SolicitacaoEditor />} />
      <Route path="/admin/organizadores"       element={<OrganizadoresList />} />
      <Route path="/admin/organizadores/:id"   element={<OrganizadorEditor />} />
      <Route path="/admin/formularios"         element={<FormConfigAdmin />} />
      <Route path="/admin/taxas"               element={<TaxasConfigAdmin />} />
      <Route path="/admin/financeiro"          element={<RelatorioFinanceiro />} />

    </Routes>
  );
}
