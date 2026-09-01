const {
  Compra,
  DetalleCompra,
  Productos,
  Proveedores,
  DetalleVentas,
  StockSucursal,
} = require('../models');
const db = require('../db/conection');
const { Op } = require('sequelize');

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
    const fecha = fechaActual();

    const nuevaCompra = await Compra.create(
      { fecha, monto, numero, id_usuario, proveedor_id, id_cliente: req.id_cliente },
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

    for (const detalle of detalles) {
      const detalleInsertado = detallesInsertados.find(
        (d) => d.producto_id === detalle.producto_id
      );

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

    res.status(200).json(ventas);
  } catch (error) {
    console.error('Error al obtener compras:', error);
    res
      .status(500)
      .json({ error: 'Error al obtener compras' });
  }
};

const eliminarCompra = async (req, res) => {
  const id_compra = req.params.id;

  try {
    const compraWhere = req.user.rol === 'superadmin'
      ? { id_compra }
      : { id_compra, id_cliente: req.id_cliente };

    const compra = await Compra.findOne({ where: compraWhere });
    if (!compra) {
      return res.status(404).json({ error: 'Compra no encontrada.' });
    }

    const lotes = await DetalleCompra.findAll({
      where: { compra_id: id_compra },
    });

    const loteIds = lotes.map((l) => l.id_detalle);

    if (loteIds.length === 0) {
      return res
        .status(404)
        .json({ error: 'No se encontraron lotes para esta compra.' });
    }

    const usosEnVentas = await DetalleVentas.findOne({
      where: {
        id_detalle_compra: loteIds,
      },
    });

    if (usosEnVentas) {
      return res.status(400).json({
        error:
          'No se puede eliminar la compra: algunos lotes fueron utilizados en ventas.',
      });
    }

    await DetalleCompra.destroy({ where: { compra_id: id_compra } });
    await Compra.destroy({ where: { id_compra } });

    return res.status(200).json({ mensaje: 'Compra eliminada correctamente.' });
  } catch (error) {
    console.error('Error al eliminar compra:', error);
    res.status(500).json({ error: 'Error al intentar eliminar la compra.' });
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

    res.status(200).json(compra);
  } catch (error) {
    console.error('Error al obtener los detalles de la compra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  addCompra,
  comprasDesdeHasta,
  eliminarCompra,
  detalleCompra,
};
