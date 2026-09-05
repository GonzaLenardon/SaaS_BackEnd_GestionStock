const { Op, Sequelize, QueryTypes } = require('sequelize');

const {
  DetalleCompra,
  Productos,
  StockSucursal,
  Transferencia,
  TransferenciaDetalle,
  AjusteStock,
  AjusteStockDetalle,
  Usuarios,
  Sucursal,
} = require('../models');
const db = require('../db/conection');
const { fechaActual } = require('../utils/fechaHelper');
const { getNextCorrelative } = require('../utils/correlativo');

/* const verStock = async (req, res) => {
  const idSucursal = req.params.sucursal;
  try {
    const [result] = await db.query(`
      SELECT 
        p.id_producto,
        p.nombre,
        p.codigo, p.marca,p.modelo,p.talle,p.color,p.precio_venta,
       
        ss.id_sucursal,
        su.nombre AS nombre_sucursal,
        SUM(ss.stock) AS stock_total
      FROM productos p
      JOIN detallecompras dc ON p.id_producto = dc.producto_id
      JOIN stock_sucursal ss ON dc.id_detalle = ss.id_detalle_compra
      JOIN sucursales su ON su.id_sucursal = ss.id_sucursal
      GROUP BY p.id_producto, p.nombre, ss.id_sucursal, su.nombre
      ORDER BY p.nombre, su.nombre;
    `);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error al obtener el stock por sucursal:', error);
    res.status(500).json({ error: 'Error al obtener el stock por sucursal' });
  }
}; */

const verStock = async (req, res) => {
  const idSucursal = req.params.sucursal;

  // Empleado solo puede ver su propia sucursal
  if (req.user.rol === 'empleado' && String(idSucursal) !== String(req.user.id_sucursal)) {
    return res.status(403).json({ error: 'No tenés acceso a esa sucursal' });
  }

  try {
    let query = `
    SELECT 
    p.id_producto,
    p.nombre,
    p.codigo,
    p.marca,
    p.modelo,
    p.talle,
    p.color,
    p.precio_venta,
    su.id_sucursal,
    su.nombre AS nombre_sucursal,
    SUM(ss.stock) AS stock_total
FROM productos p
INNER JOIN detallecompras dc 
    ON p.id_producto = dc.producto_id
INNER JOIN stock_sucursal ss 
    ON dc.id_detalle = ss.id_detalle_compra
INNER JOIN sucursales su 
    ON su.id_sucursal = ss.id_sucursal
WHERE su.id_sucursal = :idSucursal
`;

    const replacements = { idSucursal };

    if (req.user.rol !== 'superadmin') {
      query += ` AND su.id_cliente = :idCliente`;
      replacements.idCliente = req.id_cliente;
    }

    query += ` AND p.activo = 1`;

    query += `
GROUP BY 
    p.id_producto,
    p.nombre,
    p.codigo,
    p.marca,
    p.modelo,
    p.talle,
    p.color,
    p.precio_venta,
    su.id_sucursal,
    su.nombre
ORDER BY p.nombre, su.nombre;
`;

    const result = await db.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error al obtener stock:', error);
    res.status(500).json({ error: error.message });
  }
};

const transferirStock = async (req, res) => {
  const {
    origenId,
    destinoId,
    productoId,
    cantidad,
    nombreProducto,
    id_usuario,
  } = req.body;

  const t = await db.transaction();

  const fecha = fechaActual();

  try {
    if (!origenId || !destinoId || !productoId || !cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'Datos incompletos o invalidos' });
    }

    if (req.user.rol !== 'superadmin') {
      const sucOrigen = await Sucursal.findOne({ where: { id_sucursal: origenId, id_cliente: req.id_cliente } });
      if (!sucOrigen) {
        await t.rollback();
        return res.status(403).json({ error: 'Sucursal origen no pertenece a tu cliente' });
      }
      const sucDestino = await Sucursal.findOne({ where: { id_sucursal: destinoId, id_cliente: req.id_cliente } });
      if (!sucDestino) {
        await t.rollback();
        return res.status(403).json({ error: 'Sucursal destino no pertenece a tu cliente' });
      }
    }

    // Buscar en StockSucursal por sucursal origen, trayendo lotes del producto usando DetalleCompra
    const stockOrigen = await StockSucursal.findAll({
      where: { id_sucursal: origenId },
      include: [
        {
          model: DetalleCompra,
          as: 'sucursalDetalleToCompra',
          where: { producto_id: productoId },
        },
      ],
      order: [
        [
          { model: DetalleCompra, as: 'sucursalDetalleToCompra' },
          'createdAt',
          'ASC',
        ],
      ], // FIFO por fecha de compra
      transaction: t,
    });

    if (!stockOrigen.length) {
      await t.rollback();
      return res.status(404).json({
        error: 'No hay stock disponible del producto en la sucursal origen',
      });
    }

    let cantidadRestante = cantidad;
    const detallesTransferencia = [];

    for (const registro of stockOrigen) {
      const disponible = registro.stock;
      if (disponible <= 0) continue;

      const aTransferir = Math.min(disponible, cantidadRestante);
      cantidadRestante -= aTransferir;

      // Descontar del origen
      registro.stock -= aTransferir;
      await registro.save({ transaction: t });

      // Agregar al destino
      await StockSucursal.create(
        {
          stock: aTransferir,
          id_sucursal: destinoId,
          id_detalle_compra: registro.id_detalle_compra,
        },
        { transaction: t },
      );

      detallesTransferencia.push({
        producto_id: productoId,
        nombreProducto: registro.sucursalDetalleToCompra.nombreProducto,
        cantidad: aTransferir,
        lote: registro.sucursalDetalleToCompra?.id_detalle?.toString() || '0',
        vencimiento:
          registro.sucursalDetalleToCompra?.vencimiento || new Date(),
      });

      if (cantidadRestante <= 0) break;
    }

    if (cantidadRestante > 0) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: 'Stock insuficiente en la sucursal origen' });
    }

    const transferencia = await Transferencia.create(
      {
        sucursal_origen_id: origenId,
        sucursal_destino_id: destinoId,
        fecha: fecha,
        id_usuario: id_usuario,
        id_cliente: req.id_cliente,
        correlativo: await getNextCorrelative(req.id_cliente, 'transferencia', t),
      },
      { transaction: t },
    );

    const detallesConFk = detallesTransferencia.map((d) => ({
      ...d,
      transferencia_id: transferencia.id,
      id_cliente: req.id_cliente,
    }));

    await TransferenciaDetalle.bulkCreate(detallesConFk, { transaction: t });

    await t.commit();
    return res
      .status(201)
      .json({ message: 'Transferencia realizada con éxito' });
  } catch (error) {
    await t.rollback();
    console.error('Error en transferencia:', error);
    return res
      .status(500)
      .json({ error: 'Error al realizar la transferencia' });
  }
};

const crearAjusteStock = async (req, res) => {
  const { id_sucursal, motivo, observaciones, items, id_usuario } = req.body;

  const t = await db.transaction();

  try {
    const ajuste = await AjusteStock.create(
      {
        id_usuario,
        id_sucursal: Number(id_sucursal),
        motivo,
        observaciones,
        id_cliente: req.id_cliente,
        correlativo: await getNextCorrelative(req.id_cliente, 'ajuste_stock', t),
      },
      { transaction: t },
    );

    // 2️⃣ Items
    for (const item of items) {
      let cantidadPendiente = item.cantidad;

      const lotes = await DetalleCompra.findAll({
        include: [
          {
            model: StockSucursal,
            as: 'detalleCompraToSucursal',
            where: {
              id_sucursal: Number(id_sucursal),
              stock: { [Op.gt]: 0 },
            },
          },
        ],
        where: {
          producto_id: item.producto_id,
        },
        order: [['createdAt', 'ASC']], // FIFO por fecha de compra
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!lotes.length) {
        throw new Error(`Stock insuficiente para producto ${item.producto_id}`);
      }

      for (const lote of lotes) {
        if (cantidadPendiente <= 0) break;

        const stockSucursal = lote.detalleCompraToSucursal[0];

        const descontar = Math.min(stockSucursal.stock, cantidadPendiente);

        // 🔻 Actualizar stock
        await stockSucursal.update(
          { stock: stockSucursal.stock - descontar },
          { transaction: t },
        );

        await AjusteStockDetalle.create(
          {
            id_ajuste: ajuste.id_ajuste,
            producto_id: item.producto_id,
            id_detalle_compra: lote.id_detalle,
            cantidad: descontar,
            id_cliente: req.id_cliente,
          },
          { transaction: t },
        );

        cantidadPendiente -= descontar;
      }

      if (cantidadPendiente > 0) {
        throw new Error(
          `Stock insuficiente (FIFO incompleto) producto ${item.producto_id}`,
        );
      }
    }

    await t.commit();

    res.status(201).json({
      ok: true,
      message: 'Ajuste de stock registrado correctamente',
      id_ajuste: ajuste.id_ajuste,
    });
  } catch (error) {
    await t.rollback();
    console.error(error);

    res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
};

const obtenerAjustesStock = async (req, res) => {
  const { desde, hasta } = req.body;

  const desdeFecha = `${desde}T00:00:00.000Z`;
  const hastaFecha = `${hasta}T23:59:59.999Z`;

  try {
    const whereClause = {
      [Op.and]: [{ fecha: { [Op.between]: [desdeFecha, hastaFecha] } }],
    };

    if (req.user.rol !== 'superadmin') {
      whereClause.id_cliente = req.id_cliente;
    }

    const ajustes = await AjusteStock.findAll({
      where: whereClause,

      order: [['fecha', 'DESC']],
      include: [
        {
          model: AjusteStockDetalle,
          as: 'ajustesDetalle',
          include: [
            {
              model: Productos,
              as: 'producto',
              attributes: ['id_producto', 'nombre'],
            },
          ],
        },
        {
          model: Usuarios,
          as: 'usuario',
          attributes: ['id_usuario', 'nombre'],
        },
        {
          model: Sucursal,
          as: 'sucursal',
          attributes: ['id_sucursal', 'nombre'],
        },
      ],
    });

    res.json({
      ok: true,
      data: ajustes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      message: 'Error al obtener ajustes de stock',
    });
  }
};

module.exports = {
  verStock,
  transferirStock,
  crearAjusteStock,
  obtenerAjustesStock,
};
