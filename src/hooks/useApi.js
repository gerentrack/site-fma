import { useState, useEffect, useCallback } from "react";

/**
 * Hook genérico para chamadas de API.
 * Gerencia loading, error e data automaticamente.
 *
 * Uso:
 *   const { data, loading, error, refetch } = useApi(newsAPI.list, { publishedOnly: true });
 *
 * Para chamadas manuais (create, update, delete):
 *   const { execute, loading, error } = useApi(null, null, { manual: true });
 *   await execute(() => newsAPI.create(form));
 */
export function useApi(apiFn, params = null, options = {}) {
  const { manual = false, initialData = null } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!manual);
  const [error, setError] = useState(null);

  const execute = useCallback(async (overrideFn = null, overrideParams = null) => {
    setLoading(true);
    setError(null);
    try {
      const fn = overrideFn || apiFn;
      const p = overrideParams !== null ? overrideParams : params;
      const result = await (typeof p === "object" && p !== null && !Array.isArray(p)
        ? fn(p)
        : fn(p));

      if (result?.error) {
        setError(result.error);
        return { data: null, error: result.error };
      }
      setData(result?.data ?? result);
      return { data: result?.data ?? result, error: null };
    } catch (err) {
      const msg = err?.message || "Erro inesperado.";
      setError(msg);
      return { data: null, error: msg };
    } finally {
      setLoading(false);
    }
  }, [apiFn, params]);

  useEffect(() => {
    if (!manual && apiFn) execute();
  }, []);

  const refetch = useCallback(() => execute(), [execute]);

  return { data, loading, error, execute, refetch, setData };
}

/**
 * Hook para operações CRUD em uma entidade.
 * Encapsula list, create, update, delete com refetch automático.
 *
 * Uso:
 *   const { items, loading, create, update, remove } = useCrud(newsAPI, { publishedOnly: false });
 */
export function useCrud(api, listParams = {}) {
  const { data: items, loading, error, refetch, setData } = useApi(
    api.list,
    listParams
  );

  const create = useCallback(async (formData) => {
    const result = await api.create(formData);
    if (!result.error) refetch();
    return result;
  }, [api, refetch]);

  const update = useCallback(async (id, formData) => {
    const result = await api.update(id, formData);
    if (!result.error) refetch();
    return result;
  }, [api, refetch]);

  const remove = useCallback(async (id) => {
    const result = await api.delete(id);
    if (!result.error) refetch();
    return result;
  }, [api, refetch]);

  const toggle = useCallback(async (item, field = "published") => {
    return update(item.id, { [field]: !item[field] });
  }, [update]);

  return {
    items: items || [],
    loading,
    error,
    refetch,
    create,
    update,
    remove,
    toggle,
    setData,
  };
}
