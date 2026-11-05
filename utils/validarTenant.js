const { Productos, Sucursal, Curvas } = require('../models');

/**
 * Valida que un conjunto de productos pertenezca al tenant.
 *
 * @param {Array<number>} idsProducto - ids a validar
 * @param {number} id_cliente - tenant contra el que se valida
 * @param {object} [transaction] - transaccion opcional
 * @returns {Promise<{ok: boolean, mensaje?: string, ajenos?: number[]}>}
 */
const validarProductosDelTenant = async (idsProducto, id_cliente, transaction = null) => {
  const ids = [...new Set((idsProducto || []).filter(Boolean).map(Number))];

  if (ids.length === 0) {
    return { ok: true };
  }

  const encontrados = await Productos.findAll({
    attributes: ['id_producto'],
    where: { id_producto: ids, id_cliente },
    transaction,
    raw: true,
  });

  const idsValidos = encontrados.map((p) => Number(p.id_producto));
  const ajenos = ids.filter((id) => !idsValidos.includes(id));

  if (ajenos.length > 0) {
    return {
      ok: false,
      ajenos,
      mensaje: `Uno o mas productos no pertenecen a este cliente (id: ${ajenos.join(', ')}).`,
    };
  }

  return { ok: true };
};

/**
 * Valida que un conjunto de sucursales pertenezca al tenant.
 *
 * @param {Array<number>} idsSucursal - ids a validar
 * @param {number} id_cliente - tenant contra el que se valida
 * @param {object} [transaction] - transaccion opcional
 * @returns {Promise<{ok: boolean, mensaje?: string, ajenos?: number[]}>}
 */
const validarSucursalesDelTenant = async (
  idsSucursal,
  id_cliente,
  transaction = null
) => {
  const ids = [...new Set((idsSucursal || []).filter(Boolean).map(Number))];

  if (ids.length === 0) {
    return { ok: true };
  }

  const encontrados = await Sucursal.findAll({
    attributes: ['id_sucursal'],
    where: { id_sucursal: ids, id_cliente },
    transaction,
    raw: true,
  });

  const idsValidos = encontrados.map((s) => Number(s.id_sucursal));
  const ajenos = ids.filter((id) => !idsValidos.includes(id));

  if (ajenos.length > 0) {
    return {
      ok: false,
      ajenos,
      mensaje: `Una o mas sucursales no pertenecen a este cliente (id: ${ajenos.join(', ')}).`,
    };
  }

  return { ok: true };
};

/**
 * Valida que una curva pertenezca al tenant.
 *
 * @param {number} id_curva
 * @param {number} id_cliente
 * @param {object} [transaction]
 * @returns {Promise<{ok: boolean, mensaje?: string}>}
 */
const validarCurvaDelTenant = async (id_curva, id_cliente, transaction = null) => {
  if (!id_curva) {
    return { ok: true };
  }

  const curva = await Curvas.findOne({
    attributes: ['id_curva'],
    where: { id_curva, id_cliente },
    transaction,
    raw: true,
  });

  if (!curva) {
    return {
      ok: false,
      mensaje: `La curva indicada (id: ${id_curva}) no pertenece a este cliente.`,
    };
  }

  return { ok: true };
};

/**
 * Valida en bloque los productos y las sucursales de una compra.
 *
 * @param {Array} detalles - detalles de la compra
 * @param {number} id_cliente
 * @param {object} [transaction]
 */
const validarTenantCompra = async (detalles, id_cliente, transaction = null) => {
  const lista = detalles || [];

  const idsProducto = lista.map((d) => d.producto_id);
  const idsSucursal = lista.flatMap((d) =>
    (d.stock_por_sucursal || []).map((s) => s.sucursal)
  );

  const productos = await validarProductosDelTenant(idsProducto, id_cliente, transaction);

  if (!productos.ok) return productos;

  const sucursales = await validarSucursalesDelTenant(
    idsSucursal,
    id_cliente,
    transaction
  );

  if (!sucursales.ok) return sucursales;

  return { ok: true };
};

module.exports = {
  validarProductosDelTenant,
  validarSucursalesDelTenant,
  validarCurvaDelTenant,
  validarTenantCompra,
};
