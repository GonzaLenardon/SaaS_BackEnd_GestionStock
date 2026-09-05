const { Proveedores } = require('../models');
const { getNextCorrelative } = require('../utils/correlativo');

const addProveedor = async (req, res) => {
  try {
    const { nombre, direccion, telefono, email, contacto } = req.body;

    const proveedor = await Proveedores.findOne({
      where: { nombre, id_cliente: req.id_cliente },
    });

    if (proveedor) {
      return res.status(400).json({ message: '¡Proveedor ya existente!' });
    }

    const correlativo = await getNextCorrelative(req.id_cliente, 'proveedores');

    const newProveedor = await Proveedores.create({
      nombre,
      direccion,
      telefono,
      email,
      contacto,
      id_cliente: req.id_cliente,
      correlativo,
    });
    res
      .status(201)
      .json({ message: 'Proveedor creado exitosamente', newProveedor });
  } catch (error) {
    console.error('Error al agregar proveedor:', error);
    res
      .status(500)
      .json({ error: 'Error en el servidor' });
  }
};

const allProveedores = async (req, res) => {
  try {
    const allProv = await Proveedores.findAll({
      where: { id_cliente: req.id_cliente },
    });
    res.status(200).json(allProv);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Error en el servidor' });
  }
};

const updateProveedor = async (req, res) => {
  const { id_proveedor, nombre, direccion, telefono, email, contacto } =
    req.body;

  try {
    const where = req.user.rol === 'superadmin'
      ? { id_proveedor }
      : { id_proveedor, id_cliente: req.id_cliente };

    const productoExistente = await Proveedores.findOne({ where });

    if (!productoExistente) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }

    await Proveedores.update(
      { nombre, direccion, telefono, email, contacto },
      { where }
    );

    res.status(200).json({ message: 'Proveedor actualizado correctamente' });
  } catch (error) {
    res.status(500).json({
      error: 'Error en el servidor',
    });
  }
};

module.exports = { addProveedor, allProveedores, updateProveedor };
