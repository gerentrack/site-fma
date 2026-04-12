/**
 * eventoConverter.js — Utilitário de transformação Solicitacao → EventoCalendario.
 *
 * Responsabilidade única: mapear campos compatíveis de uma solicitação aprovada
 * para a estrutura de um evento do calendário público.
 *
 * NÃO persiste nada — apenas retorna o objeto pronto para ser passado a
 * calendarAPI.create() ou calendarAPI.update().
 */

/**
 * Mapeia o tipo de solicitação (permit|chancela) para a categoria do calendário.
 *
 * Permit → "corrida" por padrão (event de rua com arbitragem);
 * Chancela → "outros" por padrão (evento sem categoria técnica obrigatória).
 *
 * O admin pode ajustar a categoria depois na edição do evento.
 *
 * Mapa completo das categorias disponíveis:
 *   corrida | pista | trail | marcha | cross | outros
 */
const TIPO_PARA_CATEGORIA = {
  permit:   "corrida",
  chancela: "outros",
};

/**
 * Converte uma Solicitacao em um objeto EventoCalendario pronto para criação.
 *
 * Campos mapeados automaticamente:
 *   solicitacao.nomeEvento       → evento.title
 *   solicitacao.dataEvento       → evento.date
 *   solicitacao.cidadeEvento     → evento.city
 *   solicitacao.localEvento      → evento.location
 *   solicitacao.descricaoEvento  → evento.shortDescription + fullDescription
 *   solicitacao.organizerId      → evento.organizerId
 *   solicitacao.organizerName    → evento.organizer  (passado como parâmetro)
 *   solicitacao.tipo             → evento.category   (via TIPO_PARA_CATEGORIA)
 *   solicitacao.id               → evento.solicitacaoId
 *   solicitacao.campos.externalLink  → evento.externalLink  (se existir)
 *   solicitacao.campos.modalidades   → evento.modalities    (se existir)
 *
 * Campos NÃO mapeados (ficam com default — admin preenche depois):
 *   time, coverImage, permitFileUrl, chancelaFileUrl, resultsFileUrl,
 *   featured, published (= false, admin publica quando quiser)
 *
 * @param {object} solicitacao — objeto Solicitacao completo
 * @param {object} [opts] — opções adicionais
 * @param {string} [opts.organizerName] — nome do organizador (texto para display)
 * @param {string} [opts.state] — UF do evento (padrão "MG")
 * @returns {object} — objeto EventoCalendario sem id (será gerado pela API)
 */
export function solicitacaoParaEvento(solicitacao, opts = {}) {
  const { organizerName = "", state = "MG" } = opts;

  const categoria = TIPO_PARA_CATEGORIA[solicitacao.tipo] ?? "outros";

  // Descrição: usa descricaoEvento + nota sobre a origem da solicitação
  const shortDescription = solicitacao.descricaoEvento
    ? solicitacao.descricaoEvento.slice(0, 200)
    : "";

  const fullDescription = solicitacao.descricaoEvento
    ? `<p>${solicitacao.descricaoEvento}</p>`
    : "";

  // Campos livres do formulário — se já preenchidos na solicitação
  const campos = solicitacao.campos ?? {};
  const ct     = solicitacao.camposTecnicos ?? {};

  const externalLink  = campos.externalLink ?? campos.siteEvento ?? ct.siteEvento ?? ct.externalLink ?? "";

  // Horário: camposTecnicos.horarioLargada → evento.time (HH:MM ou HH:MM:SS aceito)
  const time = ct.horarioLargada ?? ct.horario ?? ct.horarioInicio ?? "";

  const modalities    = Array.isArray(ct.modalidades)
    ? ct.modalidades.map(m => m.distancia ?? m).filter(Boolean)
    : Array.isArray(campos.modalidades)
      ? campos.modalidades
      : (campos.modalidades ? [campos.modalidades] : []);

  return {
    // Dados principais — mapeados diretamente
    title:            solicitacao.nomeEvento   || "",
    date:             solicitacao.dataEvento   || "",
    time,
    location:         solicitacao.localEvento  || "",
    city:             solicitacao.cidadeEvento || "",
    state,
    category:         categoria,
    status:           "confirmado",

    // Descrição
    shortDescription,
    fullDescription,

    // Vínculo com organizador
    organizer:        organizerName,
    organizerId:      solicitacao.organizerId  || "",

    // Vínculo reverso com a solicitação
    solicitacaoId:    solicitacao.id           || "",

    // Campos opcionais do formulário
    externalLink,
    modalities,

    // Arquivos — vazios por padrão, admin preenche depois
    coverImage:       "",
    permitFileUrl:    "",
    chancelaFileUrl:  "",
    resultsFileUrl:   "",

    // Não publicado por padrão — admin publica quando estiver pronto
    featured:         false,
    published:        false,
  };
}

/**
 * Gera um resumo legível das diferenças entre uma solicitação e um evento
 * já existente. Útil para exibir preview antes de criar/vincular.
 *
 * @param {object} solicitacao
 * @param {object} [eventoExistente] — se null, retorna campos do novo evento
 * @param {string} [organizerName]
 * @returns {object[]} — array de { campo, valorSol, valorEvento, diverge }
 */
export function previewConversao(solicitacao, eventoExistente = null, organizerName = "") {
  const proposto = solicitacaoParaEvento(solicitacao, { organizerName });

  const campos = [
    { campo: "Título",    chave: "title" },
    { campo: "Data",      chave: "date" },
    { campo: "Cidade",    chave: "city" },
    { campo: "Local",     chave: "location" },
    { campo: "Categoria", chave: "category" },
    { campo: "Link externo", chave: "externalLink" },
  ];

  return campos.map(({ campo, chave }) => {
    const valorSol    = proposto[chave] ?? "";
    const valorEvento = eventoExistente ? (eventoExistente[chave] ?? "") : null;
    return {
      campo,
      valorSol,
      valorEvento,
      diverge: valorEvento !== null && valorSol !== valorEvento,
    };
  });
}
