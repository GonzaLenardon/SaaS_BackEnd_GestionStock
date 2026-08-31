const { TipoVenta } = require('../models');

const allTipoVentas = async (req, res) => {
  try {
    const tipo = await TipoVenta.findAll({
      where: { id_cliente: req.id_cliente },
    });
    res.status(200).json(tipo);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tipos ventas' });
  }
};

const addTipoVenta = async (req, res) => {
  try {
    const { tipoVenta, porcentajeVenta, habilitado, color } = req.body;

    const tipoV = await TipoVenta.findOne({
      where: { tipoVenta, id_cliente: req.id_cliente },
    });

    if (tipoV) {
      return res.status(400).json({ message: '¡Tipo de Venta ya existente!' });
    }

    const newTipoVenta = await TipoVenta.create({
      tipoVenta,
      porcentajeVenta,
      habilitado,
      color: color || '#FF6B9D',
      id_cliente: req.id_cliente,
    });

    res.status(201).json({
      message: 'Tipo venta creada exitosamente',
      newTipoVenta,
    });
  } catch (error) {
    console.error('Error al agregar tipo de venta:', error);
    res.status(500).json({
      error: 'Error en el servidor',
    });
  }
};

const updateTipoVenta = async (req, res) => {
  const { id_tipo, tipoVenta, porcentajeVenta, habilitado, color } = req.body;

  try {
    const where = req.user.rol === 'superadmin'
      ? { id_tipo }
      : { id_tipo, id_cliente: req.id_cliente };

    const tipoExistente = await TipoVenta.findOne({ where });

    if (!tipoExistente) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }

    await TipoVenta.update(
      { tipoVenta, porcentajeVenta, habilitado, color },
      { where }
    );

    res.status(200).json({ message: 'Tipo Venta actualizado correctamente' });
  } catch (error) {
    res.status(500).json({
      error: 'Error en el servidor',
    });
  }
};

module.exports = { allTipoVentas, addTipoVenta, updateTipoVenta };
