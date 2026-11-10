const {
  Compra,
  DetalleCompra,
  Productos,
  Proveedores,
  DetalleVentas,
  StockSucursal,
  Sucursal,
  AjusteStockDetalle,
  DetalleCambio,
  TransferenciaDetalle,
  CompraHistorial,
} = require('../models');
const db = require('../db/conection');
const { Op } = require('sequelize');
const { getNextCorrelative } = require('../utils/correlativo');
const {
  validarTenantCompra,
  validarSucursalesDelTenant,
} = require('../utils/validarTenant');
const {
  usaNumeracionCorrelativa,
  numeroVisible,
} = require('../utils/numeracion');

/* const addCompra = async (req, res) => {
  const { monto, proveedor_id, numero, detalles } = req.body;

  const t = await db.transaction(); // Iniciar transacción
  try {
    const hoy = new Date();
    const tresHorasEnMs = 3 * 60 * 60 * 1000;
    const fecha = new Date(hoy.getTime() - tresHorasEnMs);
    // Crear la compra
    const nuevaCompra = await Compra.create(
      { fecha, monto, numero, proveedor_id },
      { transaction: t }
    );

    // Agregar el id_compra a cada detalle
    const detallesConCompra = detalles.map((detalle) => ({
      ...detalle,
      compra_id: nuevaCompra.id_compra,
    }));

    // Crear los detalles
    await DetalleCompra.bulkCreate(detallesConCompra, { transaction: t });

    await t.commit(); // Confirmar todo
    res.status(201).json({ message: 'Compra registrada con éxito' });
  } catch (error) {
    await t.rollback(); // Revertir si hay error
    console.error('Error al registrar compra:', error);
    res.status(500).json({ error: 'Error al registrar la compra' });
  }
}; */

/* const addCompra = async (req, res) => {
  const { monto, proveedor_id, id_usuario, numero, detalles } =
    req.body;

  const t = await db.transaction(); // Iniciar transacción
  try {
    const hoy = new Date();
    const tresHorasEnMs = 3 * 60 * 60 * 1000;
    const fecha = new Date(hoy.getTime() - tresHorasEnMs);

    // Crear la compra
    const nuevaCompra = await Compra.create(
      { fecha, monto, numero, id_usuario, proveedor_id },
      { transaction: t }
    );

    // Agregar el id_compra a cada detalle
    const detallesConCompra = detalles.map((detalle) => ({
      ...detalle,
      compra_id: nuevaCompra.id_compra,
    }));

    // Crear los detalles y obtener los insertados con sus ids
    const detallesInsertados = await DetalleCompra.bulkCreate(
      detallesConCompra,
      {
        transaction: t,
      }
    );

    // Insertar stock por sucursal
    const stockData = [];
    console.log('stokc Suc ... ', stockSuc);

    for (const [productoId, stocks] of Object.entries(stockSuc)) {
      stocks.forEach(({ sucursal, stock }) => {
        const detalle = detallesInsertados.find(
          (d) => d.producto_id == productoId
        );
        if (detalle) {
          stockData.push({
            stock,
            productoId: productoId,
            id_sucursal: sucursal,
            id_detalle_compra: detalle.id_detalle,
          });
        }
      });
    }

    console.log('stockData', stockData);

    await StockSucursal.bulkCreate(stockData, { transaction: t });

    await t.commit(); // Confirmar transacción
    res.status(201).json({ message: 'Compra registrada con éxito' });
  } catch (error) {
    await t.rollback(); // Revertir si hay error
    console.error('Error al registrar compra:', error);
    res.status(500).json({ error: 'Error al registrar la compra' });
  }
}; */

const { fechaActual } = require('../utils/fechaHelper');

const addCompra = async (req, res) => {
  const { monto, proveedor_id, id_usuario, numero, detalles } = req.body;

  const t = await db.transaction();
  try {
    // Se valida que los productos y las sucursales pertenezcan al tenant
    // antes de tocar nada, para no cargar stock de otro cliente.
    const validacion = await validarTenantCompra(detalles, req.id_cliente, t);

    if (!validacion.ok) {
      await t.rollback();
      return res.status(400).json({ error: validacion.mensaje });
    }

    const fecha = fechaActual();

    const correlativoCompra = await getNextCorrelative(req.id_cliente, 'compra', t);

    const nuevaCompra = await Compra.create(
      { fecha, monto, numero, id_usuario, proveedor_id, id_cliente: req.id_cliente, correlativo: correlativoCompra },
      { transaction: t }
    );

    const detallesConCompra = detalles.map((detalle) => ({
      producto_id: detalle.producto_id,
      cantidad: detalle.cantidad,
      costo: detalle.costo,
      nombreProducto: detalle.nombreProducto,
      vencimiento: fecha,
      compra_id: nuevaCompra.id_compra,
      id_cliente: req.id_cliente,
    }));

    // Insertar los detalles de la compra
    const detallesInsertados = await DetalleCompra.bulkCreate(
      detallesConCompra,
      {
        transaction: t,
      }
    );

    // Armar los registros de stock por sucursal
    const stockData = [];

    for (const [indice, detalle] of detalles.entries()) {
      // Se usa el indice y no un find por producto_id: si el mismo producto
      // aparece dos veces, cada fila usa su propio lote.
      const detalleInsertado = detallesInsertados[indice];

      if (!detalleInsertado) continue;

      for (const { sucursal, stock } of detalle.stock_por_sucursal) {
        stockData.push({
          stock,
          id_sucursal: sucursal,
          id_detalle_compra: detalleInsertado.id_detalle,
          id_cliente: req.id_cliente,
        });
      }
    }

    // Insertar stock en StockSucursal
    await StockSucursal.bulkCreate(stockData, { transaction: t });

    await t.commit();
    res.status(201).json({ message: 'Compra registrada con éxito' });
  } catch (error) {
    await t.rollback();
    console.error('Error al registrar compra:', error);
    res.status(500).json({ error: 'Error al registrar la compra' });
  }
};

const comprasDesdeHasta = async (req, res) => {
  try {
    const { desde, hasta } = req.body;

    const desdeFecha = `${desde}T00:00:00.00Z`;
    const hastaFecha = `${hasta}T23:59:59.00Z`;

    if (!desde || !hasta) {
      return res.status(400).json({ error: 'Faltan fechas desde o hasta' });
    }

    const whereClause = {
      fecha: {
        [Op.between]: [desdeFecha, hastaFecha],
      },
    };

    if (req.user.rol !== 'superadmin') {
      whereClause.id_cliente = req.id_cliente;
    }

    const ventas = await Compra.findAll({
      include: [
        {
          model: DetalleCompra,
          as: 'detalles',
          include: [
            {
              model: Productos,
              as: 'producto',
            },
            {
              // Stock actual de cada lote, por sucursal. Lo usa la pantalla
              // de edicion para mostrar el punto de partida.
              model: StockSucursal,
              as: 'detalleCompraToSucursal',
              attributes: ['id_sucursal', 'stock'],
              include: [
                {
                  model: Sucursal,
                  as: 'stockSucursalToSucursal',
                  attributes: ['nombre'],
                },
              ],
            },
          ],
        },
        {
          model: Proveedores,
          as: 'proveedor',
          attributes: ['nombre'],
        },
      ],
      where: whereClause,
      order: [['id_compra', 'ASC']],
    });

    // El numero que ve el usuario: correlativo propio de la tienda o id.
    // Se arma un objeto nuevo: asignar `nro` sobre la instancia de Sequelize
    // no lo incluye en el JSON de respuesta.
    const porCorrelativo = await usaNumeracionCorrelativa(req.id_cliente);
    const respuesta = ventas.map((compra) => ({
      ...compra.toJSON(),
      nro: numeroVisible(compra, 'id_compra', porCorrelativo),
    }));

    res.status(200).json(respuesta);
  } catch (error) {
    console.error('Error al obtener compras:', error);
    res
      .status(500)
      .json({ error: 'Error al obtener compras' });
  }
};

/**
 * Snapshot de una compra (cabecera, lotes y stock por sucursal) para la
 * tabla de auditoria. Se toma dentro de la transaccion.
 */
const snapshotCompra = async (id_compra, t) => {
  const compra = await Compra.findByPk(id_compra, { transaction: t, raw: true });
  const lotes = await DetalleCompra.findAll({
    where: { compra_id: id_compra },
    transaction: t,
    raw: true,
  });
  const ids = lotes.map((l) => l.id_detalle);
  const stock = ids.length
    ? await StockSucursal.findAll({
        where: { id_detalle_compra: ids },
        transaction: t,
        raw: true,
      })
    : [];
  return JSON.stringify({ compra, lotes, stock });
};

/**
 * Busca movimientos que usan los lotes de una compra. Si hay alguno, la
 * compra no puede eliminarse ni editarse el stock de forma libre.
 * Devuelve el nombre del primer tipo de movimiento encontrado o null.
 */
const movimientosDeLotes = async (loteIds, t) => {
  if (loteIds.length === 0) return null;

  const ventas = await DetalleVentas.findOne({
    where: { id_detalle_compra: loteIds }, transaction: t,
  });
  if (ventas) return 'ventas';

  const ajustes = await AjusteStockDetalle.findOne({
    where: { id_detalle_compra: loteIds }, transaction: t,
  });
  if (ajustes) return 'ajustes de stock';

  const cambios = await DetalleCambio.findOne({
    where: { id_detalle_compra: loteIds }, transaction: t,
  });
  if (cambios) return 'cambios';

  // transferencia_detalles.lote es texto con el id del lote
  const transf = await TransferenciaDetalle.findOne({
    where: { lote: loteIds.map(String) }, transaction: t,
  });
  if (transf) return 'transferencias';

  return null;
};

const eliminarCompra = async (req, res) => {
  const id_compra = req.params.id;

  const t = await db.transaction();
  try {
    const compraWhere = req.user.rol === 'superadmin'
      ? { id_compra }
      : { id_compra, id_cliente: req.id_cliente };

    const compra = await Compra.findOne({ where: compraWhere, transaction: t, lock: t.LOCK.UPDATE });
    if (!compra) {
      await t.rollback();
      return res.status(404).json({ error: 'Compra no encontrada.' });
    }

    const lotes = await DetalleCompra.findAll({
      where: { compra_id: id_compra },
      transaction: t,
    });
    const loteIds = lotes.map((l) => l.id_detalle);

    // Bloqueo por movimientos historicos (ventas, ajustes, cambios, transferencias).
    const movimiento = await movimientosDeLotes(loteIds, t);
    if (movimiento) {
      await t.rollback();
      return res.status(400).json({
        error: `No se puede eliminar la compra: algunos lotes tienen ${movimiento} registrados. Para corregir la cantidad usá la edición de la compra.`,
      });
    }

    const antes = await snapshotCompra(id_compra, t);

    // Borrado completo: stock de los lotes, lotes y compra. Sin huerfanos.
    if (loteIds.length) {
      await StockSucursal.destroy({ where: { id_detalle_compra: loteIds }, transaction: t });
    }
    await DetalleCompra.destroy({ where: { compra_id: id_compra }, transaction: t });
    await Compra.destroy({ where: { id_compra }, transaction: t });

    await CompraHistorial.create(
      {
        id_compra,
        accion: 'eliminar',
        id_usuario: req.user.id,
        id_cliente: compra.id_cliente,
        antes,
        despues: null,
        fecha: fechaActual(),
      },
      { transaction: t },
    );

    await t.commit();
    return res.status(200).json({ mensaje: 'Compra eliminada correctamente.' });
  } catch (error) {
    await t.rollback();
    console.error('Error al eliminar compra:', error);
    res.status(500).json({ error: 'Error al intentar eliminar la compra.' });
  }
};

/**
 * Edicion de compra. Body:
 *   {
 *     monto?, numero?,
 *     detalles: [{
 *       id_detalle,            // lote a editar (debe pertenecer a la compra)
 *       cantidad,              // cantidad nueva del lote
 *       costo?,                // costo nuevo (no afecta stock)
 *       stock_por_sucursal: [{ sucursal, delta }]  // cambio de stock por sucursal
 *     }]
 *   }
 * Regla: la suma de deltas de cada lote debe ser igual a (cantidad nueva -
 * cantidad actual). El stock resultante de cada sucursal no puede ser negativo,
 * lo que impide corregir por debajo de lo ya vendido o transferido.
 * Permitido aunque el lote tenga ventas o transferencias.
 */
const editCompra = async (req, res) => {
  const id_compra = req.params.id;
  const { monto, numero, detalles } = req.body || {};

  if (!Array.isArray(detalles) || detalles.length === 0) {
    return res.status(400).json({ error: 'Indicá al menos un detalle a editar.' });
  }

  const t = await db.transaction();
  try {
    const compraWhere = req.user.rol === 'superadmin'
      ? { id_compra }
      : { id_compra, id_cliente: req.id_cliente };

    const compra = await Compra.findOne({ where: compraWhere, transaction: t, lock: t.LOCK.UPDATE });
    if (!compra) {
      await t.rollback();
      return res.status(404).json({ error: 'Compra no encontrada.' });
    }

    const lotesCompra = await DetalleCompra.findAll({
      where: { compra_id: id_compra },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    const lotesPorId = new Map(lotesCompra.map((l) => [l.id_detalle, l]));

    const antes = await snapshotCompra(id_compra, t);

    // Sucursales de todos los deltas deben pertenecer al tenant
    const sucursales = [...new Set(
      detalles.flatMap((d) => (d.stock_por_sucursal || []).map((s) => Number(s.sucursal)))
    )];
    const sucOk = await validarSucursalesDelTenant(sucursales, compra.id_cliente, t);
    if (!sucOk.ok) {
      await t.rollback();
      return res.status(400).json({ error: sucOk.mensaje });
    }

    for (const d of detalles) {
      const lote = lotesPorId.get(Number(d.id_detalle));
      if (!lote) {
        await t.rollback();
        return res.status(400).json({
          error: `El lote ${d.id_detalle} no pertenece a la compra ${id_compra}.`,
        });
      }

      const cantidadNueva = Number(d.cantidad);
      if (!Number.isInteger(cantidadNueva) || cantidadNueva < 0) {
        await t.rollback();
        return res.status(400).json({ error: `Cantidad inválida para el lote ${lote.id_detalle}.` });
      }

      // Agrupar deltas por sucursal
      const deltaPorSucursal = new Map();
      for (const s of d.stock_por_sucursal || []) {
        const suc = Number(s.sucursal);
        const delta = Number(s.delta || 0);
        if (!Number.isInteger(delta)) {
          await t.rollback();
          return res.status(400).json({ error: `Delta inválido en sucursal ${suc}.` });
        }
        deltaPorSucursal.set(suc, (deltaPorSucursal.get(suc) || 0) + delta);
      }

      const deltaTotal = cantidadNueva - Number(lote.cantidad);
      const sumaDeltas = [...deltaPorSucursal.values()].reduce((a, b) => a + b, 0);

      if (sumaDeltas !== deltaTotal) {
        await t.rollback();
        return res.status(400).json({
          error: `Lote ${lote.id_detalle}: la suma de cambios por sucursal (${sumaDeltas}) debe ser igual al cambio de cantidad (${deltaTotal}).`,
        });
      }

      // Aplicar delta por sucursal con control de stock negativo
      for (const [suc, delta] of deltaPorSucursal) {
        if (delta === 0) continue;

        const fila = await StockSucursal.findOne({
          where: { id_sucursal: suc, id_detalle_compra: lote.id_detalle },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        const stockActual = fila ? fila.stock : 0;
        const stockNuevo = stockActual + delta;

        if (stockNuevo < 0) {
          await t.rollback();
          return res.status(400).json({
            error: `Sucursal ${suc}, lote ${lote.id_detalle}: el stock quedaría en ${stockNuevo}. Ya se vendió o transfirió más de la cantidad que querés dejar. Bajá el cambio en esa sucursal.`,
          });
        }

        if (fila) {
          fila.stock = stockNuevo;
          await fila.save({ transaction: t });
        } else {
          await StockSucursal.create(
            {
              stock: stockNuevo,
              id_sucursal: suc,
              id_detalle_compra: lote.id_detalle,
              id_cliente: compra.id_cliente,
            },
            { transaction: t },
          );
        }
      }

      // Actualizar el lote
      const cambiosLote = { cantidad: cantidadNueva };
      if (d.costo !== undefined) cambiosLote.costo = d.costo;
      await lote.update(cambiosLote, { transaction: t });
    }

    // Cabecera
    const cambiosCompra = {};
    if (monto !== undefined) cambiosCompra.monto = monto;
    if (numero !== undefined) cambiosCompra.numero = numero;
    if (Object.keys(cambiosCompra).length) {
      await compra.update(cambiosCompra, { transaction: t });
    }

    const despues = await snapshotCompra(id_compra, t);

    await CompraHistorial.create(
      {
        id_compra,
        accion: 'editar',
        id_usuario: req.user.id,
        id_cliente: compra.id_cliente,
        antes,
        despues,
        fecha: fechaActual(),
      },
      { transaction: t },
    );

    await t.commit();
    return res.status(200).json({ mensaje: 'Compra actualizada correctamente.' });
  } catch (error) {
    await t.rollback();
    console.error('Error al editar compra:', error);
    res.status(500).json({ error: 'Error al editar la compra.' });
  }
};

const detalleCompra = async (req, res) => {
  const id_compra = req.params.id_compra;

  try {
    const where = { id_compra };
    if (req.user.rol !== 'superadmin') {
      where.id_cliente = req.id_cliente;
    }

    const compra = await Compra.findOne({
      where,
      include: [
        {
          model: Proveedores,
          as: 'proveedor',
          attributes: ['nombre'],
        },
        {
          model: DetalleCompra,
          as: 'detalles',
          include: [
            {
              model: Productos,
              as: 'producto',
              attributes: ['nombre'],
            },
          ],
        },
      ],
    });

    if (!compra) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }

    const porCorrelativo = await usaNumeracionCorrelativa(compra.id_cliente);

    res.status(200).json({
      ...compra.toJSON(),
      nro: numeroVisible(compra, 'id_compra', porCorrelativo),
    });
  } catch (error) {
    console.error('Error al obtener los detalles de la compra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  addCompra,
  comprasDesdeHasta,
  eliminarCompra,
  editCompra,
  detalleCompra,
};
