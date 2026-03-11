import { COLORS, FONTS } from "../../styles/colors";

const baseInput = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  fontFamily: FONTS.body,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
  background: COLORS.white,
  color: COLORS.dark,
};

/**
 * Componente de campo de formulário reutilizável.
 *
 * Uso:
 *   <FormField label="Título" required error={errors.title}>
 *     <input ... />
 *   </FormField>
 *
 * Ou com type automático:
 *   <FormField label="Categoria" type="select" options={CATEGORIES} value={v} onChange={set} />
 */
export function FormField({ label, required, error, hint, children, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label style={{
          fontFamily: FONTS.heading,
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: error ? COLORS.primary : COLORS.grayDark,
        }}>
          {label}{required && <span style={{ color: COLORS.primary, marginLeft: 3 }}>*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <span style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>{hint}</span>
      )}
      {error && (
        <span style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.primaryDark }}>{error}</span>
      )}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, error, disabled, ...rest }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        ...baseInput,
        border: `1px solid ${error ? COLORS.primaryLight : COLORS.grayLight}`,
        opacity: disabled ? 0.6 : 1,
      }}
      onFocus={e => e.currentTarget.style.borderColor = error ? COLORS.primary : COLORS.primaryLight}
      onBlur={e => e.currentTarget.style.borderColor = error ? COLORS.primaryLight : COLORS.grayLight}
      {...rest}
    />
  );
}

export function TextArea({ value, onChange, placeholder, error, rows = 4, ...rest }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        ...baseInput,
        border: `1px solid ${error ? COLORS.primaryLight : COLORS.grayLight}`,
        resize: "vertical",
        minHeight: rows * 24,
      }}
      onFocus={e => e.currentTarget.style.borderColor = error ? COLORS.primary : COLORS.primaryLight}
      onBlur={e => e.currentTarget.style.borderColor = error ? COLORS.primaryLight : COLORS.grayLight}
      {...rest}
    />
  );
}

export function SelectInput({ value, onChange, options = [], error, placeholder, ...rest }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        ...baseInput,
        border: `1px solid ${error ? COLORS.primaryLight : COLORS.grayLight}`,
        cursor: "pointer",
      }}
      onFocus={e => e.currentTarget.style.borderColor = COLORS.primaryLight}
      onBlur={e => e.currentTarget.style.borderColor = COLORS.grayLight}
      {...rest}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export function CheckboxInput({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: FONTS.body, fontSize: 14, color: COLORS.dark, userSelect: "none" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: 16, height: 16, cursor: "pointer", accentColor: COLORS.primary }}
      />
      {label}
    </label>
  );
}

export function DateInput({ value, onChange, error, ...rest }) {
  return (
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        ...baseInput,
        border: `1px solid ${error ? COLORS.primaryLight : COLORS.grayLight}`,
      }}
      onFocus={e => e.currentTarget.style.borderColor = COLORS.primaryLight}
      onBlur={e => e.currentTarget.style.borderColor = COLORS.grayLight}
      {...rest}
    />
  );
}

export function TimeInput({ value, onChange, error, ...rest }) {
  return (
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        ...baseInput,
        border: `1px solid ${error ? COLORS.primaryLight : COLORS.grayLight}`,
      }}
      {...rest}
    />
  );
}
