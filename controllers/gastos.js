const { Gastos, TipoGastos, Sucursal } = require('../models');
const { fn, col, where: sqWhere, Op } = require('sequelize');

const allGastos = async (req, res) => {
  try {
    const tipo = await Gastos.findAll({
      where: { id_cliente: req.id_cliente },
      include: [
        {
          model: TipoGastos,
          as: 'tipogasto',
          attributes: ['tipoGasto'],
        },
        { model: Sucursal, as: 'sucursal', attributes: ['nombre'] },
      ],

      order: [
        [{ model: Sucursal, as: 'sucursal' }, 'nombre', 'ASC'],
        ['fecha', 'ASC'],
      ],
    });

    res.status(200).json(tipo);
  } catch (error) {
    console.error('Error al obtener gastos:', error);
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
};

const addGastos = async (req, res) => {
  try {
    const { fecha, monto, observaciones, id_tipogasto, id_sucursal } = req.body;

    const newGasto = await Gastos.create({
      fecha,
      monto,
      observaciones,
      id_tipogasto: parseInt(id_tipogasto),
      id_sucursal: parseInt(id_sucursal),
      id_cliente: req.id_cliente,
    });
    res.status(201).json({
      message: 'Gasto creado exitosamente',
      newGasto,
    });
  } catch (error) {
    console.error('Error al agregar Gasto:', error);
    res.status(500).json({
      error: 'Error en el servidor',
    });
  }
};

const updateGastos = async (req, res) => {
  const { id_gasto, fecha, monto, observaciones, id_tipogasto, id_sucursal } =
    req.body;

  try {
    const where = req.user.rol === 'superadmin'
      ? { id_gasto }
      : { id_gasto, id_cliente: req.id_cliente };

    const gastoExistente = await Gastos.findOne({ where });

    if (!gastoExistente) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }

    await Gastos.update(
      {
        fecha,
        monto,
        observaciones,
        id_tipogasto,
        id_sucursal: parseInt(id_sucursal),
      },
      { where }
    );

    res.status(200).json({ message: 'Gasto actualizado correctamente' });
  } catch (error) {
    res.status(500).json({
      error: 'Error en el servidor',
    });
  }
};

/*  Este tbiem funciona pero agrupa

const resumenGastos = async (req, res) => {
  try {
    const { desde, hasta } = req.body;

    if (!desde || !hasta) {
      return res.status(400).json({ error: 'Faltan fechas desde o hasta' });
    }

    const desdeFecha = `${desde}T00:00:00.000Z`;
    const hastaFecha = `${hasta}T23:59:59.999Z`;

    const resultados = await Gastos.findAll({
      attributes: [
        'id_sucursal',
        'id_tipogasto',
        [fn('SUM', col('monto')), 'suma_total'],
      ],
      include: [
        {
          model: Sucursal,
          as: 'sucursal',
          attributes: ['nombre'],
        },
        {
          model: TipoGastos,
          as: 'tipogasto',
          attributes: ['tipoGasto'],
        },
      ],
      where: {
        fecha: {
          [Op.between]: [desdeFecha, hastaFecha],
        },
      },
      group: [
        'gastos.id_sucursal',
        'gastos.id_tipogasto',
        'sucursal.id_sucursal',
        'tipogasto.id_tipogasto',
      ],
    });

    return res.status(200).json(resultados);
  } catch (error) {
    console.error('Error en resumenGastos:', error);
    return res.status(500).json({ error: error.message });
  }
}; */

const resumenGastos = async (req, res) => {
  try {
    const { desde, hasta } = req.body;

    if (!desde || !hasta) {
      return res.status(400).json({ error: 'Faltan fechas desde o hasta' });
    }

    const desdeFecha = `${desde}T00:00:00.000Z`;
    const hastaFecha = `${hasta}T23:59:59.999Z`;

    const whereClause = {
      fecha: {
        [Op.between]: [desdeFecha, hastaFecha],
      },
    };

    if (req.user.rol === 'empleado') {
      whereClause.id_sucursal = req.user.id_sucursal;
    } else if (req.user.rol !== 'superadmin') {
      whereClause.id_cliente = req.id_cliente;
    }

    const tipo = await Gastos.findAll({
      include: [
        {
          model: TipoGastos,
          as: 'tipogasto',
          attributes: ['tipoGasto'],
        },
        { model: Sucursal, as: 'sucursal', attributes: ['nombre'] },
      ],
      where: whereClause,

      order: [
        [{ model: Sucursal, as: 'sucursal' }, 'nombre', 'ASC'],
        ['fecha', 'ASC'],
      ],
    });

    res.status(200).json(tipo);
  } catch (error) {
    console.error('Error al obtener gastos:', error);
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
};

module.exports = { allGastos, addGastos, updateGastos, resumenGastos };
