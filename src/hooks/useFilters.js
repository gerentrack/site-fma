import { useState, useMemo, useCallback } from "react";

/**
 * Hook de filtros genérico.
 * Filtra uma lista de itens com base em filtros ativos e busca textual.
 *
 * Uso:
 *   const { filtered, filters, setFilter, search, setSearch, clearFilters } = useFilters(items, {
 *     searchFields: ["title", "excerpt"],
 *     initialFilters: { category: "", published: "" },
 *   });
 */
export function useFilters(items = [], options = {}) {
  const {
    searchFields = ["title"],
    initialFilters = {},
  } = options;

  const [search, setSearch] = useState("");
  const [filters, setFiltersState] = useState({ ...initialFilters });

  const setFilter = useCallback((key, value) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setFiltersState({ ...initialFilters });
  }, [initialFilters]);

  const filtered = useMemo(() => {
    let result = [...items];

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(item =>
        searchFields.some(field => {
          const val = item[field];
          return val && String(val).toLowerCase().includes(q);
        })
      );
    }

    // Active filters
    for (const [key, value] of Object.entries(filters)) {
      if (value === "" || value === null || value === undefined) continue;
      if (value === "true") result = result.filter(item => item[key] === true);
      else if (value === "false") result = result.filter(item => item[key] === false);
      else result = result.filter(item => String(item[key]) === String(value));
    }

    return result;
  }, [items, search, filters, searchFields]);

  const activeCount = useMemo(() => {
    let count = search ? 1 : 0;
    count += Object.values(filters).filter(v => v !== "" && v !== null).length;
    return count;
  }, [search, filters]);

  return {
    filtered,
    filters,
    search,
    setFilter,
    setSearch,
    clearFilters,
    activeCount,
    total: items.length,
    filteredTotal: filtered.length,
  };
}
