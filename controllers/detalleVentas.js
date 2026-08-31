const { Ventas, DetalleVentas, Productos, Usuarios } = require('../models');

const addDetalles = async (req, res) => {
  const { cantidad, total, producto_id, venta_id } = req.body;

  try {
    const newDetalles = await DetalleVentas.create({
      cantidad,
      total,
      producto_id,
      venta_id,
      id_cliente: req.id_cliente,
    });
    res.status(201).json(newDetalles);
  } catch (error) {
    res.status(501).json({
      error: 'Error al registrar detalles',
      details: error.message,
    });
  }
};

const allDetalles = async (req, res) => {
  try {
    const where = req.user.rol === 'superadmin'
      ? {}
      : { id_cliente: req.id_cliente };

    const allDetalles = await DetalleVentas.findAll({ where });
    res.status(200).json(allDetalles);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener detalles' });
  }
};

module.exports = { addDetalles, allDetalles };
