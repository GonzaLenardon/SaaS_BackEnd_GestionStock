'use strict';

// Numeracion visible por tenant.
//
// Cada tienda puede elegir que numero muestra el usuario:
//   - 'id'         -> el id interno de la fila (comportamiento historico)
//   - 'correlativo'-> el correlativo propio de la tienda (1, 2, 3...)
//
// La eleccion se guarda en cliente_config con la clave
// 'numeracion_por_correlativo' ('true' / 'false'). Las tiendas que no tengan
// la fila usan 'id', asi que el comportamiento anterior no cambia.
//
// El backend resuelve el numero y lo devuelve en el campo `nro` de cada
// registro, para que el frontend no tenga que conocer la configuracion.

const { ClienteConfig } = require('../models');

const CLAVE = 'numeracion_por_correlativo';

// Cache en memoria: la configuracion cambia muy pocas veces y se lee en cada
// listado. Se invalida cuando se actualiza la configuracion del tenant.
const cache = new Map();
const TTL_MS = 60 * 1000;

/** Invalida la cache de un tenant (tras un PUT /config). */
function invalidarCache(id_cliente) {
  if (id_cliente === undefined || id_cliente === null) {
    cache.clear();
    return;
  }
  cache.delete(Number(id_cliente));
}

/**
 * Devuelve true si el tenant muestra correlativos en lugar de ids.
 * @param {number|null} id_cliente
 * @returns {Promise<boolean>}
 */
async function usaNumeracionCorrelativa(id_cliente) {
  if (!id_cliente) return false;

  const clave = Number(id_cliente);
  const enCache = cache.get(clave);
  if (enCache && Date.now() - enCache.timestamp < TTL_MS) {
    return enCache.valor;
  }

  let valor = false;
  try {
    const fila = await ClienteConfig.findOne({
      where: { id_cliente: clave, key: CLAVE },
    });
    valor = String(fila?.value).toLowerCase() === 'true';
  } catch (error) {
    // Si falla la lectura de configuracion se sigue con el comportamiento
    // historico (id) en lugar de romper la operacion.
    console.error('Error al leer la configuracion de numeracion:', error);
    valor = false;
  }

  cache.set(clave, { valor, timestamp: Date.now() });
  return valor;
}

/**
 * Numero que se muestra al usuario para un registro.
 * @param {object} registro - Fila con `correlativo` y un id.
 * @param {string} campoId - Nombre del campo con el id interno.
 * @param {boolean} porCorrelativo - Resultado de usaNumeracionCorrelativa().
 * @returns {number|null}
 */
function numeroVisible(registro, campoId, porCorrelativo) {
  if (!registro) return null;
  if (porCorrelativo && registro.correlativo != null) {
    return registro.correlativo;
  }
  return registro[campoId] ?? null;
}

/**
 * Prefijo numerico (4 digitos) del codigo de barras.
 * En tiendas con numeracion por correlativo usa el correlativo del producto
 * para que el codigo impreso coincida con el numero que ve el usuario.
 * @param {object} producto - Fila con `id_producto` y `correlativo`.
 * @param {boolean} porCorrelativo
 * @returns {number}
 */
function prefijoCodigo(producto, porCorrelativo) {
  if (porCorrelativo && producto?.correlativo != null) {
    return producto.correlativo;
  }
  return producto?.id_producto;
}

/**
 * Agrega el campo `nro` a una lista de filas: el numero que ve el usuario.
 * @param {Array<object>} filas
 * @param {string} campoId - Nombre del campo con el id interno.
 * @param {boolean} porCorrelativo
 * @returns {Array<object>} Las mismas filas, ahora con `nro`.
 */
function agregarNro(filas, campoId, porCorrelativo) {
  if (!Array.isArray(filas)) return filas;
  for (const fila of filas) {
    fila.nro = numeroVisible(fila, campoId, porCorrelativo);
  }
  return filas;
}

module.exports = {
  CLAVE,
  usaNumeracionCorrelativa,
  numeroVisible,
  prefijoCodigo,
  agregarNro,
  invalidarCache,
};
