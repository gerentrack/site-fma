/**
 * relatorioExport.js — Exportação de relatórios financeiros em CSV.
 */

/**
 * Gera e faz download de um CSV a partir de dados tabulares.
 * @param {string} filename
 * @param {string[]} headers
 * @param {Array<Array<string|number>>} rows
 */
export function exportCSV(filename, headers, rows) {
  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const lines = [
    headers.map(escape).join(","),
    ...rows.map(r => r.map(escape).join(",")),
  ];

  const bom = "\uFEFF"; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exporta relatório financeiro completo em CSV.
 * @param {object[]} solicitacoes — lista de solicitações com taxas/pagamento
 * @param {object} organizerMap — { id: organizer }
 * @param {object} filtros — filtros aplicados
 */
/**
 * @param {object[]} solicitacoes
 * @param {object} organizerMap — { id: organizer }
 * @param {object} filtros
 * @param {object} [pagamentosPorSol] — { solId: [pagamento, ...] }
 */
export function exportRelatorioCSV(solicitacoes, organizerMap, filtros = {}, pagamentosPorSol = {}) {
  const headers = [
    "Protocolo", "Tipo", "Evento", "Data Evento",
    "Organizador (Permit)", "Pagador (Recibo)", "Terceiro",
    "Parceiro", "Qtd Modalidades", "Total Inscritos",
    "Subtotal", "Urgencia", "Desconto", "Total Taxa",
    "Total Pago", "Saldo", "Qtd Pagamentos", "Recibos",
    "Pagamento Status", "Status Solicitacao", "Criado Em",
  ];

  const rows = solicitacoes.map(sol => {
    const org = organizerMap[sol.organizerId] || {};
    const taxas = sol.taxas || {};
    const pag = sol.pagamento || {};
    const mods = taxas.modalidades || [];
    const totalInscritos = mods.reduce((acc, m) => acc + (m.inscritos || 0), 0);
    const pagadorNome = pag.pagadorTerceiro ? pag.pagadorNome : org.name || "—";
    const pags = pagamentosPorSol[sol.id] || [];
    const totalPago = pags.filter(p => p.status === "confirmado").reduce((a, p) => a + (p.valor || 0), 0);
    const saldo = Math.max(0, (taxas.total || 0) - totalPago);
    const recibos = pags.filter(p => p.reciboNumero).map(p => p.reciboNumero).join("; ");

    return [
      sol.protocoloFMA || "—",
      sol.tipo,
      sol.nomeEvento,
      sol.dataEvento,
      org.name || "—",
      pagadorNome,
      pag.pagadorTerceiro ? "Sim" : "Nao",
      org.parceiro ? "Sim" : "Nao",
      mods.length,
      totalInscritos,
      taxas.subtotal || 0,
      taxas.urgencia || 0,
      taxas.descontoValor || 0,
      taxas.total || 0,
      totalPago,
      saldo,
      pags.length,
      recibos || "—",
      pag.status || "pendente",
      sol.status,
      sol.criadoEm || "",
    ];
  });

  const periodo = filtros.dataInicio && filtros.dataFim
    ? `_${filtros.dataInicio}_a_${filtros.dataFim}` : "";
  exportCSV(`relatorio_financeiro${periodo}.csv`, headers, rows);
}
