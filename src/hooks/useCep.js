/**
 * useCep.js — Hook para consulta de CEP via ViaCEP + geocodificação via Nominatim
 *
 * Uso:
 *   const { cep, setCep, loading, error, endereco } = useCep(onFound);
 *
 *   onFound({ logradouro, bairro, cidade, estado, cep, lat, lng }) — chamado ao encontrar
 */
import { useState, useRef } from "react";

async function fetchCep(cep) {
  const raw = cep.replace(/\D/g, "");
  if (raw.length !== 8) throw new Error("CEP inválido.");
  const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
  if (!res.ok) throw new Error("Erro ao consultar CEP.");
  const data = await res.json();
  if (data.erro) throw new Error("CEP não encontrado.");
  return data;
}

async function geocode({ logradouro, bairro, localidade, uf }, numero = "") {
  const headers = {
    "Accept-Language": "pt-BR",
    "User-Agent": "FMA-Site/1.0 (federacaomineiraatletismo.org.br)",
  };

  const num = numero ? `, ${numero}` : "";

  // Tenta do mais preciso ao menos preciso
  const queries = [
    `${logradouro}${num}, ${bairro}, ${localidade}, ${uf}, Brasil`,
    `${logradouro}${num}, ${localidade}, ${uf}, Brasil`,
    `${logradouro}, ${bairro}, ${localidade}, ${uf}, Brasil`,
    `${logradouro}, ${localidade}, ${uf}, Brasil`,
    `${localidade}, ${uf}, Brasil`,
  ];

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=br`,
        { headers }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.length) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch (_) { continue; }
  }
  return null;
}

export function useCep(onFound) {
  const [cep, setCepRaw]      = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [endereco, setEndereco] = useState(null);
  const [notFound, setNotFound] = useState(false); // CEP não localizado — modo manual
  const viaDataRef  = useRef(null); // armazena resposta ViaCEP para reuso com número
  const debounceRef = useRef(null);
  const numDebounce = useRef(null);

  function setCep(value) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const masked = digits.length > 5 ? `${digits.slice(0,5)}-${digits.slice(5)}` : digits;
    setCepRaw(masked);
    setError("");
    setNotFound(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (digits.length === 8) {
      debounceRef.current = setTimeout(() => lookup(digits, ""), 400);
    }
  }

  // Chamado quando número ou complemento muda — re-geocodifica com endereço completo
  function setNumero(numero, complemento = "") {
    if (!viaDataRef.current) return;
    if (numDebounce.current) clearTimeout(numDebounce.current);
    numDebounce.current = setTimeout(() => reGeocode(viaDataRef.current, numero, complemento), 600);
  }

  // Permite inserir endereço manualmente quando CEP não foi localizado
  function setManualEndereco({ logradouro = "", bairro = "", cidade = "", estado = "", numero = "", complemento = "" }) {
    const cepDigits = cep.replace(/\D/g, "");
    const result = {
      logradouro, bairro, cidade, estado,
      cep: cepDigits,
      numero, complemento,
      manual: true,
      enderecoCompleto: [logradouro, numero, complemento, bairro, cidade && estado ? `${cidade}/${estado}` : cidade || estado].filter(Boolean).join(", "),
      lat: null, lng: null,
    };
    setEndereco(result);
    if (onFound) onFound(result);
  }

  async function lookup(digits, numero) {
    setLoading(true);
    setError("");
    setEndereco(null);
    setNotFound(false);
    try {
      const via = await fetchCep(digits);
      viaDataRef.current = via;
      await reGeocode(via, numero);
    } catch (e) {
      const isNotFound = e.message === "CEP não encontrado.";
      setNotFound(isNotFound);
      setError(isNotFound ? "CEP não localizado. Preencha o endereço manualmente abaixo." : (e.message || "Erro ao consultar CEP."));
      setLoading(false);
    }
  }

  async function reGeocode(via, numero = "", complemento = "") {
    setLoading(true);
    try {
      const coords = await geocode(via, numero);
      const result = {
        logradouro:  via.logradouro || "",
        bairro:      via.bairro     || "",
        cidade:      via.localidade || "",
        estado:      via.uf         || "",
        cep:         via.cep        || "",
        numero:      numero,
        complemento: complemento,
        enderecoCompleto: [
          via.logradouro,
          numero,
          complemento,
          via.bairro,
          `${via.localidade}/${via.uf}`,
        ].filter(Boolean).join(", "),
        lat:  coords?.lat ?? null,
        lng:  coords?.lng ?? null,
      };
      setEndereco(result);
      if (onFound) onFound(result);
    } finally {
      setLoading(false);
    }
  }

  return { cep, setCep, setNumero, setManualEndereco, loading, error, endereco, notFound };
}
