const { Clientes, Sucursal, Usuarios } = require('../models');
const path = require('path');
const fs = require('fs');

const allClientes = async (req, res) => {
  try {
    const clientes = await Clientes.findAll({
      include: [
        { model: Sucursal, as: 'sucursales', attributes: ['id_sucursal', 'nombre'] },
      ],
      order: [['razon_social', 'ASC']],
    });
    res.status(200).json(clientes);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

const getCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await Clientes.findByPk(id, {
      include: [
        { model: Sucursal, as: 'sucursales' },
        { model: Usuarios, as: 'usuarios', attributes: { exclude: ['password', 'salt'] } },
      ],
    });
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.status(200).json(cliente);
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
};

const addCliente = async (req, res) => {
  try {
    const {
      razon_social, cuit, email, telefono, dominio,
      color_primario, color_secundario, color_terciario, color_fondo,
    } = req.body;

    const clienteExistente = await Clientes.findOne({
      where: { razon_social },
    });
    if (clienteExistente) {
      return res.status(400).json({ message: 'Ya existe un cliente con esa razón social' });
    }

    if (dominio) {
      const dominioExistente = await Clientes.findOne({ where: { dominio } });
      if (dominioExistente) {
        return res.status(400).json({ message: 'El dominio ya está en uso' });
      }
    }

    const nuevoCliente = await Clientes.create({
      razon_social,
      cuit,
      email,
      telefono,
      dominio,
      color_primario: color_primario || '#1a73e8',
      color_secundario: color_secundario || '#34a853',
      color_terciario: color_terciario || '#ea4335',
      color_fondo: color_fondo || '#ffffff',
    });

    res.status(201).json({ message: 'Cliente creado exitosamente', cliente: nuevoCliente });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      razon_social, cuit, email, telefono, dominio, activo,
      color_primario, color_secundario, color_terciario, color_fondo,
    } = req.body;

    const cliente = await Clientes.findByPk(id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    if (dominio && dominio !== cliente.dominio) {
      const dominioExistente = await Clientes.findOne({ where: { dominio } });
      if (dominioExistente) {
        return res.status(400).json({ message: 'El dominio ya está en uso' });
      }
    }

    await cliente.update({
      razon_social, cuit, email, telefono, dominio, activo,
      color_primario, color_secundario, color_terciario, color_fondo,
      updated_at: new Date(),
    });

    res.status(200).json({ message: 'Cliente actualizado correctamente', cliente });
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const uploadLogo = async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await Clientes.findByPk(id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    if (!req.files || !req.files.logo) {
      return res.status(400).json({ message: 'No se envió ningún archivo' });
    }

    const logo = req.files.logo;
    const ext = path.extname(logo.name).toLowerCase();
    const permitidos = ['.png', '.jpg', '.jpeg', '.svg'];
    if (!permitidos.includes(ext)) {
      return res.status(400).json({ message: 'Formato no permitido. Use PNG, JPG o SVG' });
    }

    if (logo.size > 2 * 1024 * 1024) {
      return res.status(400).json({ message: 'El archivo supera 2MB' });
    }

    const uploadDir = path.join(__dirname, '..', 'uploads', 'logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `cliente_${id}_logo${ext}`;
    const filePath = path.join(uploadDir, fileName);

    if (cliente.logo_url) {
      const oldPath = path.join(__dirname, '..', cliente.logo_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await logo.mv(filePath);

    const logoUrl = `/uploads/logos/${fileName}`;
    await cliente.update({ logo_url: logoUrl, updated_at: new Date() });

    res.status(200).json({ message: 'Logo subido correctamente', logo_url: logoUrl });
  } catch (error) {
    console.error('Error al subir logo:', error);
    res.status(500).json({ error: 'Error al subir logo' });
  }
};

module.exports = {
  allClientes,
  getCliente,
  addCliente,
  updateCliente,
  uploadLogo,
};
