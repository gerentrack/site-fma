/**
 * CepField.jsx — Campo de CEP com preenchimento automático de endereço.
 * Inclui busca reversa por logradouro + cidade quando o usuário não sabe o CEP.
 */
import { useState } from "react";

export default function CepField({
  cep, onChange,
  numero, onNumero,
  complemento, onComplemento,
  setNumero,
  loading, error, endereco,
  required = false,
  nomeLocal, onNomeLocal,
  notFound = false,
  onManualEndereco,
}) {
  const [manualLogradouro, setManualLogradouro] = useState("");
  const [manualBairro, setManualBairro] = useState("");
  const [manualCidade, setManualCidade] = useState("");
  const [manualEstado, setManualEstado] = useState("MG");
  const [manualNumero, setManualNumero] = useState("");
  const [manualComplemento, setManualComplemento] = useState("");

  const [buscaAberta, setBuscaAberta] = useState(false);
  const [buscaUF, setBuscaUF] = useState("MG");
  const [buscaCidade, setBuscaCidade] = useState("");
  const [buscaLogradouro, setBuscaLogradouro] = useState("");
  const [buscaLoading, setBuscaLoading] = useState(false);
  const [buscaResultados, setBuscaResultados] = useState([]);
  const [buscaErro, setBuscaErro] = useState("");

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
    if (onNumero)  onNumero(v);
    if (setNumero) setNumero(v, complemento || "");
  }

  function handleComplemento(v) {
    if (onComplemento) onComplemento(v);
    if (setNumero)     setNumero(numero || "", v);
  }

  const buscarCep = async () => {
    if (buscaCidade.trim().length < 3 || buscaLogradouro.trim().length < 3) {
      setBuscaErro("Informe pelo menos 3 caracteres na cidade e no logradouro.");
      return;
    }
    setBuscaLoading(true);
    setBuscaErro("");
    setBuscaResultados([]);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${buscaUF}/${encodeURIComponent(buscaCidade.trim())}/${encodeURIComponent(buscaLogradouro.trim())}/json/`);
      if (!res.ok) { setBuscaErro("Erro na consulta. Tente novamente."); setBuscaLoading(false); return; }
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setBuscaErro("Nenhum endereço encontrado. Tente termos mais específicos.");
      } else {
        setBuscaResultados(data.slice(0, 10));
      }
    } catch {
      setBuscaErro("Não foi possível consultar. Verifique sua conexão.");
    }
    setBuscaLoading(false);
  };

  const selecionarResultado = (item) => {
    onChange(item.cep.replace("-", ""));
    setBuscaAberta(false);
    setBuscaResultados([]);
  };

  const partes = [
    endereco?.logradouro,
    numero,
    complemento,
    endereco?.bairro,
    endereco ? `${endereco.cidade}/${endereco.estado}` : null,
  ].filter(Boolean);
  const enderecoMontado = partes.join(", ");

  const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Linha 1: CEP + Número + Complemento */}
      <div style={{ display: "grid", gridTemplateColumns: endereco ? "180px 120px 1fr" : "180px", gap: 12 }}>
        <div>
          {lbl("CEP", required)}
          <div style={{ position: "relative" }}>
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
          {error && <div style={{ color: "#cc0000", fontSize: 12, marginTop: 4 }}>{error}</div>}
          {!endereco && !loading && !notFound && (
            <button type="button" onClick={() => setBuscaAberta(!buscaAberta)}
              style={{ marginTop: 6, background: "none", border: "none", padding: 0,
                color: "#0066cc", fontSize: 12, fontWeight: 700, cursor: "pointer",
                textDecoration: "underline", fontFamily: "inherit" }}>
              {buscaAberta ? "Digitar CEP" : "Não sei o CEP"}
            </button>
          )}
        </div>

        {endereco && (
          <div>
            {lbl("Número", required)}
            <input value={numero || ""} onChange={e => handleNumero(e.target.value)}
              placeholder="Ex: 1200" style={inp()} autoFocus />
          </div>
        )}

        {endereco && onComplemento && (
          <div>
            {lbl("Complemento")}
            <input value={complemento || ""} onChange={e => handleComplemento(e.target.value)}
              placeholder="Apto, sala, bloco..." style={inp()} />
          </div>
        )}
      </div>

      {/* Formulário manual — quando CEP não foi localizado */}
      {notFound && !endereco && onManualEndereco && (
        <div style={{ background: "#fffbeb", border: "1.5px solid #fbbf24", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e", marginBottom: 12 }}>
            Preencha o endereço manualmente
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              {lbl("Logradouro", true)}
              <input value={manualLogradouro} onChange={e => setManualLogradouro(e.target.value)}
                placeholder="Ex: Rua Afonso Pena" style={inp({ border: "1.5px solid #d1d5db" })} />
            </div>
            <div>
              {lbl("Bairro")}
              <input value={manualBairro} onChange={e => setManualBairro(e.target.value)}
                placeholder="Ex: Centro" style={inp({ border: "1.5px solid #d1d5db" })} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 120px 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              {lbl("Cidade", true)}
              <input value={manualCidade} onChange={e => setManualCidade(e.target.value)}
                placeholder="Ex: Belo Horizonte" style={inp({ border: "1.5px solid #d1d5db" })} />
            </div>
            <div>
              {lbl("UF", true)}
              <select value={manualEstado} onChange={e => setManualEstado(e.target.value)}
                style={{ ...inp({ border: "1.5px solid #d1d5db" }), padding: "10px 8px", cursor: "pointer" }}>
                {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div>
              {lbl("Número")}
              <input value={manualNumero} onChange={e => setManualNumero(e.target.value)}
                placeholder="Ex: 1200" style={inp({ border: "1.5px solid #d1d5db" })} />
            </div>
            <div>
              {lbl("Complemento")}
              <input value={manualComplemento} onChange={e => setManualComplemento(e.target.value)}
                placeholder="Apto, sala, bloco..." style={inp({ border: "1.5px solid #d1d5db" })} />
            </div>
          </div>
          <button type="button"
            disabled={!manualLogradouro.trim() || !manualCidade.trim()}
            onClick={() => onManualEndereco({
              logradouro: manualLogradouro.trim(),
              bairro: manualBairro.trim(),
              cidade: manualCidade.trim(),
              estado: manualEstado,
              numero: manualNumero.trim(),
              complemento: manualComplemento.trim(),
            })}
            style={{
              padding: "10px 24px", borderRadius: 8, border: "none",
              background: (!manualLogradouro.trim() || !manualCidade.trim()) ? "#d1d5db" : "#0066cc",
              color: "#fff", fontWeight: 700, fontSize: 13, cursor: (!manualLogradouro.trim() || !manualCidade.trim()) ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}>
            Confirmar endereço
          </button>
        </div>
      )}

      {/* Busca reversa de CEP */}
      {buscaAberta && !endereco && !notFound && (
        <div style={{ background: "#f8fafc", border: "1.5px solid #bfdbfe", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#1e40af", marginBottom: 12 }}>
            Buscar CEP por endereço
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr auto", gap: 10, marginBottom: 10 }}>
            <div>
              {lbl("UF")}
              <select value={buscaUF} onChange={e => setBuscaUF(e.target.value)}
                style={{ ...inp(), padding: "10px 8px", cursor: "pointer" }}>
                {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div>
              {lbl("Cidade")}
              <input value={buscaCidade} onChange={e => setBuscaCidade(e.target.value)}
                placeholder="Ex: Belo Horizonte" style={inp()}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), buscarCep())} />
            </div>
            <div>
              {lbl("Logradouro")}
              <input value={buscaLogradouro} onChange={e => setBuscaLogradouro(e.target.value)}
                placeholder="Ex: Afonso Pena" style={inp()}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), buscarCep())} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="button" onClick={buscarCep} disabled={buscaLoading}
                style={{ padding: "10px 18px", borderRadius: 8, border: "none",
                  background: buscaLoading ? "#94a3b8" : "#0066cc", color: "#fff",
                  fontWeight: 700, fontSize: 13, cursor: buscaLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {buscaLoading ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </div>

          {buscaErro && (
            <div style={{ color: "#b45309", fontSize: 12, marginBottom: 8 }}>{buscaErro}</div>
          )}

          {buscaResultados.length > 0 && (
            <div style={{ maxHeight: 200, overflow: "auto", borderRadius: 8, border: "1px solid #d1d5db" }}>
              {buscaResultados.map((item, i) => (
                <button key={i} type="button" onClick={() => selecionarResultado(item)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                    border: "none", borderBottom: i < buscaResultados.length - 1 ? "1px solid #e5e7eb" : "none",
                    background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                >
                  <div style={{ fontWeight: 700, color: "#111", marginBottom: 2 }}>
                    {item.cep}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    {item.logradouro}, {item.bairro} — {item.localidade}/{item.uf}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview do endereço completo */}
      {endereco && (
        <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac",
          borderRadius: 8, padding: "12px 16px", fontSize: 13 }}>
          <div style={{ fontWeight: 700, color: "#166534", marginBottom: 4 }}>
            Endereço completo
          </div>
          <div style={{ color: "#166534", marginBottom: 6 }}>{enderecoMontado}</div>
          {endereco.lat && endereco.lng ? (
            <div style={{ fontSize: 11, color: "#15803d" }}>
              Coordenadas: {endereco.lat.toFixed(5)}, {endereco.lng.toFixed(5)}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "#b45309" }}>
              Coordenadas não encontradas — o pin usará a cidade como referência.
            </div>
          )}
        </div>
      )}

      {/* Nome do local (opcional) */}
      {endereco && onNomeLocal && (
        <div>
          {lbl("Nome do local (opcional)")}
          <input value={nomeLocal || ""} onChange={e => onNomeLocal(e.target.value)}
            placeholder="Ex: Parque Municipal, Praça da Liberdade, Estádio Mineirão"
            style={inp()} />
        </div>
      )}
    </div>
  );
}
