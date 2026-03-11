import { COLORS, FONTS } from "../../styles/colors";

/**
 * Tabela reutilizável para o painel admin.
 *
 * Uso:
 *   <Table
 *     columns={[
 *       { key: "title", label: "Título", render: (v, row) => <strong>{v}</strong> },
 *       { key: "date", label: "Data" },
 *       { key: "_actions", label: "", render: (_, row) => <Actions row={row} /> },
 *     ]}
 *     rows={items}
 *     loading={loading}
 *     emptyMessage="Nenhum item encontrado."
 *   />
 */
export default function Table({ columns = [], rows = [], loading = false, emptyMessage = "Nenhum registro encontrado." }) {
  if (loading) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>
        Carregando...
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.white, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      {/* Header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
        padding: "12px 24px",
        background: COLORS.offWhite,
        borderBottom: `1px solid ${COLORS.grayLight}`,
      }}>
        {columns.map(col => (
          <div key={col.key} style={{
            fontFamily: FONTS.heading,
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: COLORS.gray,
          }}>
            {col.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <div style={{ padding: "40px 24px", textAlign: "center", fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray }}>
          {emptyMessage}
        </div>
      ) : (
        rows.map((row, i) => (
          <div
            key={row.id || i}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
              padding: "14px 24px",
              borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.grayLight}` : "none",
              alignItems: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = COLORS.offWhite}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            {columns.map(col => (
              <div key={col.key} style={{
                fontFamily: FONTS.body,
                fontSize: 13.5,
                color: COLORS.dark,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: col.wrap ? "normal" : "nowrap",
                paddingRight: 12,
              }}>
                {col.render
                  ? col.render(row[col.key], row)
                  : row[col.key] ?? "—"}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

/**
 * Grupo de ações padrão para linhas de tabela.
 *
 * Uso:
 *   <TableActions
 *     onEdit={() => navigate(`/admin/noticias/${row.id}`)}
 *     onDelete={() => handleDelete(row.id)}
 *     onToggle={() => handleToggle(row)}
 *     toggleLabel={row.published ? "Despublicar" : "Publicar"}
 *   />
 */
export function TableActions({ onEdit, onDelete, onToggle, toggleLabel = "Toggle", extra = [] }) {
  const btnStyle = {
    padding: "5px 12px",
    borderRadius: 6,
    border: `1px solid ${COLORS.grayLight}`,
    background: "transparent",
    cursor: "pointer",
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.dark,
    transition: "background 0.15s",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {onToggle && (
        <button onClick={onToggle} style={{ ...btnStyle, color: COLORS.gray }}>
          {toggleLabel}
        </button>
      )}
      {extra.map((a, i) => (
        <button key={i} onClick={a.onClick} style={{ ...btnStyle, ...a.style }}>
          {a.label}
        </button>
      ))}
      {onEdit && (
        <button onClick={onEdit} style={btnStyle}>
          Editar
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          style={{ ...btnStyle, background: "#fff0f0", border: "none", color: COLORS.primaryDark }}
        >
          Excluir
        </button>
      )}
    </div>
  );
}
