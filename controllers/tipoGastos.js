const { TipoGastos } = require('../models');
const { getNextCorrelative } = require('../utils/correlativo');

const allTipoGastos = async (req, res) => {
  try {
    const tipo = await TipoGastos.findAll({
      where: { id_cliente: req.id_cliente },
    });
    res.status(200).json(tipo);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Error al obtener tipos de gasto' });
  }
};

const addTipoGastos = async (req, res) => {
  try {
    let { tipoGasto } = req.body;
    tipoGasto =
      tipoGasto.charAt(0).toUpperCase() + tipoGasto.slice(1).toLowerCase();

    const tipoV = await TipoGastos.findOne({
      where: { tipoGasto, id_cliente: req.id_cliente },
    });

    if (tipoV) {
      return res.status(400).json({ message: '¡Tipo de Gasto ya existente!' });
    }

    const newTipoGasto = await TipoGastos.create({
      tipoGasto,
      id_cliente: req.id_cliente,
      correlativo: await getNextCorrelative(req.id_cliente, 'tipoGastos'),
    });

    res.status(201).json({
      message: 'Tipo Gasto creado exitosamente',
      newTipoGasto,
    });
  } catch (error) {
    console.error('Error al agregar Tipo Gasto:', error);
    res.status(500).json({
      error: 'Error en el servidor',
    });
  }
};

const updateTipoGasto = async (req, res) => {
  const { id_tipogasto, tipoGasto } = req.body;

  try {
    const where = req.user.rol === 'superadmin'
      ? { id_tipogasto }
      : { id_tipogasto, id_cliente: req.id_cliente };

    const tipoExistente = await TipoGastos.findOne({ where });

    if (!tipoExistente) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }

    await TipoGastos.update({ tipoGasto }, { where });

    res.status(200).json({ message: 'Tipo Gasto actualizado correctamente' });
  } catch (error) {
    res.status(500).json({
      error: 'Error en el servidor',
    });
  }
};

module.exports = { allTipoGastos, addTipoGastos, updateTipoGasto };
