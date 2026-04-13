/**
 * pixGenerator.js — Gera codigo PIX copia-e-cola (BR Code) padrao Banco Central.
 * Nao depende de API externa, gera localmente.
 *
 * Referencia: Manual de Padroes para Iniciacao do PIX (BACEN)
 * Formato EMV QRCPS-MPM (Merchant Presented Mode)
 */

/**
 * Gera o payload PIX copia-e-cola.
 * @param {Object} opts
 * @param {string} opts.chavePix       - Chave PIX do recebedor
 * @param {string} opts.chavePixTipo   - "cpf"|"email"|"telefone"|"aleatoria"
 * @param {string} opts.nome           - Nome do recebedor (max 25 chars)
 * @param {string} opts.cidade         - Cidade do recebedor (max 15 chars)
 * @param {number} opts.valor          - Valor em reais (ex: 180.00)
 * @param {string} [opts.descricao]    - Descricao/identificador (max 25 chars)
 * @returns {string} Payload PIX copia-e-cola
 */
export function gerarPixPayload({ chavePix, chavePixTipo, nome, cidade, valor, descricao }) {
  if (!chavePix || !nome || !cidade) return "";

  // Normalizar chave PIX
  let chave = chavePix.trim();
  if (chavePixTipo === "telefone" && !chave.startsWith("+")) {
    chave = "+55" + chave.replace(/\D/g, "");
  }
  if (chavePixTipo === "cpf") {
    chave = chave.replace(/\D/g, "");
  }

  // Limpar acentos e truncar
  const limpar = (str, max) => str
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .substring(0, max)
    .toUpperCase();

  const nomeClean = limpar(nome, 25);
  const cidadeClean = limpar(cidade, 15);

  // Helpers EMV
  const tlv = (id, value) => id + String(value.length).padStart(2, "0") + value;

  // Merchant Account Information (ID 26)
  const gui = tlv("00", "br.gov.bcb.pix");
  const key = tlv("01", chave);
  let mai = gui + key;
  if (descricao) {
    const descClean = limpar(descricao, 25);
    if (descClean) mai += tlv("02", descClean);
  }

  // Montar payload (sem CRC)
  let payload = "";
  payload += tlv("00", "01");                         // Payload Format Indicator
  payload += tlv("26", mai);                          // Merchant Account Information
  payload += tlv("52", "0000");                       // Merchant Category Code
  payload += tlv("53", "986");                        // Transaction Currency (BRL)

  if (valor && valor > 0) {
    payload += tlv("54", valor.toFixed(2));            // Transaction Amount
  }

  payload += tlv("58", "BR");                          // Country Code
  payload += tlv("59", nomeClean);                     // Merchant Name
  payload += tlv("60", cidadeClean);                   // Merchant City
  payload += tlv("62", tlv("05", "***"));              // Additional Data (txid)
  payload += "6304";                                   // CRC placeholder

  // Calcular CRC16 (CCITT-FALSE)
  const crc = crc16(payload);
  payload += crc;

  return payload;
}

/**
 * CRC16 CCITT-FALSE
 */
function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
