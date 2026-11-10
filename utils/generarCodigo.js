// Genera el codigo de barras de un producto.
//
// Formato final: PREFIJO(4) + NOM(3) + MAR(3) + TAL(3) = max. 13
//
// El prefijo son 4 digitos:
//   - tiendas con numeracion por correlativo -> correlativo del producto
//     (0001, 0002...). Coincide con el numero que ve el usuario, asi el
//     codigo impreso sirve para buscar el producto tipeando el prefijo.
//   - demas tiendas -> id_producto (comportamiento historico).
//
// El prefijo nunca cambia solo: ni el id ni el correlativo se modifican al
// editar un producto. Lo que si cambia son las letras (nombre, marca, talle),
// y el codigo anterior queda como alias para que las etiquetas ya impresas
// sigan resolviendo al producto correcto.

const generarCodigo = async (producto, opciones = {}) => {
  const { id_producto, nombre, marca, talle } = producto;

  const nomCod = (nombre || '').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const marCod = (marca || '').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const talCod = (talle || '')
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 3);

  // Prefijo: el que se pasa explicitamente, o el id_producto.
  const prefijo = opciones.prefijo ?? id_producto;

  return `${prefijo.toString().padStart(4, '0')}${nomCod}${marCod}${talCod}`;
};

/**
 * Extrae el prefijo numerico (4 digitos) de un codigo de barras existente.
 * @param {string} codigo
 * @returns {number|null}
 */
const prefijoDeCodigo = (codigo) => {
  if (!codigo) return null;
  const match = /^(\d{4})/.exec(String(codigo).trim());
  return match ? Number(match[1]) : null;
};

module.exports = { generarCodigo, prefijoDeCodigo };
