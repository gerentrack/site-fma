/**
 * CepField.jsx — Campo de CEP com preenchimento automático de endereço
 */
import { useState } from "react";

export default function CepField({
  cep, onChange,
  numero, onNumero,
  complemento, onComplemento,
  setNumero,
  loading, error, endereco,
  required = false,
}) {
  const [numLocal,  setNumLocal]  = useState(numero      || "");
  const [compLocal, setCompLocal] = useState(complemento || "");

  const inp = (extra = {}) => ({
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: `1.5px solid ${error ? "#cc0000" : "#d1d5db"}`,
    fontSize: 14, outline: "none", boxSizing: "border-box",
    background: "#fff", fontFamily: "inherit", ...extra,
  });

  const lbl = (text, req = false) => (
    <label style={{ display: "block", fontWeight: 700, fontSize: 12,
      textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5, color: "#111" }}>
      {text}{req && <span style={{ color: "#cc0000" }}> *</span>}
    </label>
  );

  function handleNumero(v) {
    setNumLocal(v);
    if (onNumero)  onNumero(v);
    if (setNumero) setNumero(v, compLocal);
  }

  function handleComplemento(v) {
    setCompLocal(v);
    if (onComplemento) onComplemento(v);
    if (setNumero)     setNumero(numLocal, v);
  }

  const partes = [
    endereco?.logradouro,
    numLocal,
    compLocal,
    endereco?.bairro,
    endereco ? `${endereco.cidade}/${endereco.estado}` : null,
  ].filter(Boolean);
  const enderecoMontado = partes.join(", ");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* CEP */}
      <div>
        {lbl("CEP", required)}
        <div style={{ position: "relative", maxWidth: 200 }}>
          <input
            value={cep}
            onChange={e => onChange(e.target.value)}
            placeholder="00000-000"
            maxLength={9}
            style={inp({ paddingRight: loading ? 36 : 12 })}
          />
          {loading && (
            <span style={{ position: "absolute", right: 10, top: "50%",
              transform: "translateY(-50%)", fontSize: 15 }}>⏳</span>
          )}
        </div>
        {error && <div style={{ color: "#cc0000", fontSize: 12, marginTop: 4 }}>⚠ {error}</div>}
      </div>

      {/* Campos detalhados — aparecem após CEP encontrado */}
      {endereco && (
        <>
          {/* Logradouro + Número + Complemento */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
            <div>
              {lbl("Logradouro")}
              <input value={endereco.logradouro} readOnly
                style={inp({ background: "#f9fafb", color: "#555", cursor: "default" })} />
            </div>
            <div>
              {lbl("Número", required)}
              <input value={numLocal} onChange={e => handleNumero(e.target.value)}
                placeholder="Ex: 1200" style={inp()} autoFocus />
            </div>
            <div>
              {lbl("Complemento")}
              <input value={compLocal} onChange={e => handleComplemento(e.target.value)}
                placeholder="Apto, Sala…" style={inp()} />
            </div>
          </div>

          {/* Bairro + Cidade/Estado */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              {lbl("Bairro")}
              <input value={endereco.bairro} readOnly
                style={inp({ background: "#f9fafb", color: "#555", cursor: "default" })} />
            </div>
            <div>
              {lbl("Cidade / Estado")}
              <input value={`${endereco.cidade} / ${endereco.estado}`} readOnly
                style={inp({ background: "#f9fafb", color: "#555", cursor: "default" })} />
            </div>
          </div>

          {/* Endereço completo montado + coordenadas */}
          <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac",
            borderRadius: 8, padding: "12px 16px", fontSize: 13 }}>
            <div style={{ fontWeight: 700, color: "#166534", marginBottom: 4 }}>
              ✅ Endereço completo
            </div>
            <div style={{ color: "#166534", marginBottom: 6 }}>{enderecoMontado}</div>
            {endereco.lat && endereco.lng ? (
              <div style={{ fontSize: 11, color: "#15803d" }}>
                📍 Coordenadas: {endereco.lat.toFixed(5)}, {endereco.lng.toFixed(5)}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: "#b45309" }}>
                ⚠ Coordenadas não encontradas — o pin usará a cidade como referência.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
