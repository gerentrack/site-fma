import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Hook de gerenciamento de formulários.
 *
 * Uso:
 *   const { values, errors, set, handleSubmit, reset } = useForm(
 *     initialValues,
 *     validators,    // { field: (value) => "erro" | null }
 *     onSubmit       // async (values) => { ... }
 *   );
 *
 * Quando initialValues muda (ex: dados carregados de forma assíncrona),
 * o formulário é reinicializado automaticamente com os novos valores.
 */
export function useForm(initialValues = {}, validators = {}, onSubmit = null) {
  const [values, setValues] = useState({ ...initialValues });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({});

  // Reinicializa o formulário quando initialValues muda de um objeto vazio/null
  // para os dados reais carregados da API. Usa JSON como chave de comparação
  // para evitar re-renders desnecessários por referência.
  const prevInitialRef = useRef(JSON.stringify(initialValues));
  useEffect(() => {
    const next = JSON.stringify(initialValues);
    if (next !== prevInitialRef.current) {
      prevInitialRef.current = next;
      setValues({ ...initialValues });
      setErrors({});
    }
  });

  const set = useCallback((key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
    // Clear error on change
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  }, [errors]);

  const setMany = useCallback((updates) => {
    setValues(prev => ({ ...prev, ...updates }));
  }, []);

  const touch = useCallback((key) => {
    setTouched(prev => ({ ...prev, [key]: true }));
  }, []);

  const validate = useCallback(() => {
    const newErrors = {};
    for (const [key, validator] of Object.entries(validators)) {
      const error = validator(values[key], values);
      if (error) newErrors[key] = error;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [validators, values]);

  const handleSubmit = useCallback(async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const valid = validate();
    if (!valid) return { error: "Formulário inválido." };
    if (!onSubmit) return { data: values };
    setSubmitting(true);
    try {
      const result = await onSubmit(values);
      return result;
    } finally {
      setSubmitting(false);
    }
  }, [validate, onSubmit, values]);

  const reset = useCallback((newValues = null) => {
    setValues(newValues || { ...initialValues });
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    submitting,
    set,
    setMany,
    touch,
    validate,
    handleSubmit,
    reset,
  };
}

// ─── Validators prontos ───────────────────────────────────────────────────────

export const required = (msg = "Campo obrigatório.") =>
  (value) => (!value || String(value).trim() === "") ? msg : null;

export const minLength = (min, msg) =>
  (value) => value && value.length < min ? (msg || `Mínimo ${min} caracteres.`) : null;

export const isEmail = (msg = "E-mail inválido.") =>
  (value) => value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? msg : null;

export const isUrl = (msg = "URL inválida.") =>
  (value) => value && !/^https?:\/\/.+/.test(value) ? msg : null;

export const combine = (...fns) =>
  (value, values) => {
    for (const fn of fns) {
      const err = fn(value, values);
      if (err) return err;
    }
    return null;
  };
