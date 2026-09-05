const { Sucursal, Usuarios, Clientes } = require('../models');
const { getNextCorrelative } = require('../utils/correlativo');

const allSucursal = async (req, res) => {
  try {
    const where = req.user.rol === 'superadmin'
      ? {}
      : { id_cliente: req.id_cliente };
    const resp = await Sucursal.findAll({
      where,
      include: [{ model: Clientes, as: 'cliente', attributes: ['razon_social'] }],
    });
    res.status(200).json(resp);
  } catch (error) {
    console.error('Error al obtener Sucursales:', error);
    res.status(500).json({ error: 'Error al obtener Sucursales' });
  }
};

const addSucursal = async (req, res) => {
  try {
    const { nombre, domicilio, localidad, provincia, contacto, celular, habilitado, id_cliente: bodyClientId } = req.body;
    const targetClientId = req.user.rol === 'superadmin' && bodyClientId ? bodyClientId : req.id_cliente;

    const sucursalExistente = await Sucursal.findOne({
      where: { nombre, id_cliente: targetClientId },
    });

    if (sucursalExistente) {
      return res.status(400).json({ message: 'Sucursal ya existente!' });
    }

    const newSucursal = await Sucursal.create({
      nombre,
      domicilio,
      localidad,
      provincia,
      contacto,
      celular,
      habilitado: habilitado !== undefined ? habilitado : true,
      id_cliente: targetClientId,
      correlativo: await getNextCorrelative(targetClientId, 'sucursal'),
    });

    res.status(201).json({ message: 'Sucursal creada exitosamente', newSucursal });
  } catch (error) {
    console.error('Error al agregar sucursal:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const updateSucursal = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, domicilio, localidad, provincia, contacto, celular, habilitado } = req.body;

    const where = req.user.rol === 'superadmin'
      ? { id_sucursal: id }
      : { id_sucursal: id, id_cliente: req.id_cliente };

    const sucursal = await Sucursal.findOne({ where });

    if (!sucursal) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }

    if (nombre && nombre !== sucursal.nombre) {
      const existente = await Sucursal.findOne({
        where: { nombre, id_cliente: sucursal.id_cliente },
      });
      if (existente) {
        return res.status(400).json({ message: 'Ya existe otra sucursal con ese nombre' });
      }
    }

    const updates = { nombre, domicilio, localidad, provincia, contacto, celular };
    if (habilitado !== undefined) {
      updates.habilitado = habilitado;
    }

    await sucursal.update(updates);

    res.status(200).json({ message: 'Sucursal actualizada correctamente', sucursal });
  } catch (error) {
    console.error('Error al actualizar sucursal:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const deleteSucursal = async (req, res) => {
  try {
    const { id } = req.params;

    const where = req.user.rol === 'superadmin'
      ? { id_sucursal: id }
      : { id_sucursal: id, id_cliente: req.id_cliente };

    const sucursal = await Sucursal.findOne({ where });

    if (!sucursal) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }

    const usuariosAsignados = await Usuarios.count({
      where: { id_sucursal: id },
    });

    if (usuariosAsignados > 0) {
      return res.status(400).json({
        message: `No se puede eliminar: hay ${usuariosAsignados} usuario(s) asignado(s) a esta sucursal.`,
      });
    }

    await sucursal.destroy();

    res.status(200).json({ message: 'Sucursal eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar sucursal:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getSucursal = async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const usuario = await Usuarios.findOne({ where: { id_usuario } });
    res.status(200).json({ sucursal: usuario.id_sucursal });
  } catch (error) {
    console.error('Error al obtener sucursal del usuario:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const toggleHabilitado = async (req, res) => {
  try {
    const { id } = req.params;
    const { habilitado } = req.body;

    const where = req.user.rol === 'superadmin'
      ? { id_sucursal: id }
      : { id_sucursal: id, id_cliente: req.id_cliente };

    const sucursal = await Sucursal.findOne({ where });

    if (!sucursal) {
      return res.status(404).json({ message: 'Sucursal no encontrada' });
    }

    await sucursal.update({ habilitado });

    res.status(200).json({
      message: habilitado ? 'Sucursal habilitada' : 'Sucursal deshabilitada',
      sucursal,
    });
  } catch (error) {
    console.error('Error al cambiar estado de sucursal:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { addSucursal, allSucursal, getSucursal, updateSucursal, deleteSucursal, toggleHabilitado };
