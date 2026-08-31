/**
 * Helper centralizado para manejo de fechas con offset de zona horaria.
 * Offset por defecto: GMT-3 (Argentina)
 */

const OFFSET_HORAS = 3;
const OFFSET_MS = OFFSET_HORAS * 60 * 60 * 1000;

/**
 * Retorna la fecha actual con offset de zona horaria aplicado.
 * @returns {Date}
 */
function fechaActual() {
  const hoy = new Date();
  return new Date(hoy.getTime() - OFFSET_MS);
}

/**
 * Convierte una fecha ISO/string a formato YYYY-MM-DD para queries SQL.
 * @param {Date|string} fecha
 * @returns {string}
 */
function fechaParaQuery(fecha) {
  const f = fecha instanceof Date ? fecha : new Date(fecha);
  return f.toISOString().split('T')[0];
}

/**
 * Retorna rango de fechas para queries BETWEEN.
 * @param {string} desde - YYYY-MM-DD
 * @param {string} hasta - YYYY-MM-DD
 * @returns {{ desdeFecha: string, hastaFecha: string }}
 */
function rangoFechas(desde, hasta) {
  return {
    desdeFecha: `${desde}T00:00:00.000Z`,
    hastaFecha: `${hasta}T23:59:59.999Z`,
  };
}

module.exports = { fechaActual, fechaParaQuery, rangoFechas };
