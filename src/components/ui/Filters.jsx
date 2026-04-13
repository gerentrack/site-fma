import { COLORS, FONTS } from "../../styles/colors";
import Icon from "../../utils/icons";

/**
 * Barra de filtros reutilizável.
 *
 * Uso:
 *   <FilterBar
 *     search={search}
 *     onSearch={setSearch}
 *     searchPlaceholder="Buscar notícias..."
 *     filters={[
 *       { key: "category", label: "Categoria", options: NEWS_CATEGORIES },
 *       { key: "published", label: "Status", options: [{ value: "", label: "Todos" }, { value: "true", label: "Publicados" }] },
 *     ]}
 *     values={filters}
 *     onChange={setFilter}
 *     onClear={clearFilters}
 *     activeCount={activeCount}
 *   />
 */
export default function FilterBar({
  search = "",
  onSearch,
  searchPlaceholder = "Buscar...",
  filters = [],
  values = {},
  onChange,
  onClear,
  activeCount = 0,
}) {
  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      gap: 12,
      alignItems: "center",
      marginBottom: 20,
    }}>
      {/* Search */}
      {onSearch && (
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: COLORS.gray }}><Icon name="Search" size={14} /></span>
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              borderRadius: 8,
              border: `1px solid ${COLORS.grayLight}`,
              fontFamily: FONTS.body,
              fontSize: 13,
              outline: "none",
              background: COLORS.white,
              boxSizing: "border-box",
            }}
            onFocus={e => e.currentTarget.style.borderColor = COLORS.primaryLight}
            onBlur={e => e.currentTarget.style.borderColor = COLORS.grayLight}
          />
        </div>
      )}

      {/* Selects */}
      {filters.map(filter => (
        <select
          key={filter.key}
          value={values[filter.key] || ""}
          onChange={e => onChange(filter.key, e.target.value)}
          style={{
            padding: "9px 12px",
            borderRadius: 8,
            border: `1px solid ${values[filter.key] ? COLORS.primary : COLORS.grayLight}`,
            fontFamily: FONTS.body,
            fontSize: 13,
            outline: "none",
            background: values[filter.key] ? "#fff0f0" : COLORS.white,
            color: values[filter.key] ? COLORS.primaryDark : COLORS.dark,
            cursor: "pointer",
            minWidth: 140,
          }}
        >
          <option value="">{filter.label}</option>
          {filter.options?.filter(o => o.value !== "").map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}

      {/* Clear */}
      {onClear && activeCount > 0 && (
        <button
          onClick={onClear}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: `1px solid ${COLORS.primaryLight}`,
            background: "#fff0f0",
            color: COLORS.primaryDark,
            fontFamily: FONTS.heading,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Limpar ({activeCount})
        </button>
      )}
    </div>
  );
}

/**
 * Filtros por abas/pills — para uso nas páginas públicas.
 *
 * Uso:
 *   <PillFilters
 *     options={NEWS_CATEGORIES}
 *     value={filter}
 *     onChange={setFilter}
 *   />
 */
export function PillFilters({ options = [], value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "6px 18px",
              borderRadius: 20,
              border: `2px solid ${active ? COLORS.primary : COLORS.grayLight}`,
              background: active ? COLORS.primary : "transparent",
              color: active ? COLORS.white : COLORS.gray,
              fontFamily: FONTS.heading,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
