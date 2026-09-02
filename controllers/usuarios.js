const { Usuarios, Sucursal, Clientes } = require('../models');
const { validateToken, generateToken } = require('../config/token');
const jwt = require('jsonwebtoken');
const bc = require('bcrypt');

const allUsers = async (req, res) => {
  try {
    const where = req.user.rol === 'superadmin'
      ? {}
      : { id_cliente: req.id_cliente };
    const usuarios = await Usuarios.findAll({
      where,
      attributes: { exclude: ['password', 'salt'] },
      include: [
        {
          model: Sucursal,
          as: 'sucursal',
          attributes: ['nombre'],
        },
        {
          model: Clientes,
          as: 'cliente',
          attributes: ['razon_social'],
        },
      ],
    });
    res.status(200).json(usuarios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

const User = async (req, res) => {
  const id = req.params;
  res.send(id);
};

const upUser = async (req, res) => {
  try {
    const { id_usuario, nombre, rol, id_sucursal, id_cliente } = req.body;

    console.log('upUser body:', JSON.stringify(req.body));
    console.log('upUser id_cliente:', id_cliente, 'tipo:', typeof id_cliente);

    if (!id_usuario) {
      return res.status(400).json({ message: 'id_usuario es requerido' });
    }

    const user = await Usuarios.findOne({ where: { id_usuario } });

    if (!user) {
      return res.status(400).json({ message: '¡Usuario NO está registrado!' });
    }

    console.log('user actual id_cliente:', user.id_cliente);

    // Validar que el target user pertenece al mismo tenant (excepto superadmin)
    if (req.user.rol !== 'superadmin' && user.id_cliente !== req.id_cliente) {
      return res.status(403).json({ message: 'No tenés acceso a este usuario' });
    }

    // Solo admin y superadmin pueden cambiar roles
    const updates = { nombre, id_sucursal };
    if (rol && (req.user.rol === 'admin' || req.user.rol === 'superadmin')) {
      if (req.user.rol === 'admin' && rol === 'superadmin') {
        return res.status(403).json({ message: 'No podés asignar rol de superadmin' });
      }
      if (String(user.id_usuario) === String(req.user.id) && rol !== user.rol) {
        return res.status(403).json({ message: 'No podés cambiar tu propio rol' });
      }
      updates.rol = rol;
    }

    // Solo superadmin puede cambiar el cliente del usuario
    if (req.user.rol === 'superadmin' && id_cliente !== undefined) {
      updates.id_cliente = id_cliente || null;
    }

    console.log('upUser updates:', JSON.stringify(updates));

    Object.assign(user, updates);
    await user.save();

    console.log('upUser guardado ok, id_cliente ahora:', user.id_cliente);

    res.status(201).json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res
      .status(500)
      .json({ error: 'Error en el servidor' });
  }
};

const addUser = async (req, res) => {
  try {
    const { nombre, rol, id_sucursal } = req.body;
    const password = req.body.password;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'La contraseña es requerida (mínimo 6 caracteres)' });
    }

    const user = await Usuarios.findOne({
      where: { nombre, id_cliente: req.id_cliente },
    });

    if (user) {
      return res.status(400).json({ message: '¡Usuario ya existente!' });
    }

    const newUser = await Usuarios.create({
      nombre,
      password,
      rol,
      id_sucursal,
      id_cliente: req.id_cliente,
    });
    const { password: _, salt: __, ...safeUser } = newUser.toJSON();
    res.status(201).json({ message: 'Usuario creado exitosamente', newUser: safeUser });
  } catch (error) {
    console.error('Error al agregar usuario:', error);
    res
      .status(500)
      .json({ error: 'Error en el servidor' });
  }
};

/**
 * addUserAsSuperadmin — permite al superadmin crear usuarios en cualquier cliente.
 * Acepta id_cliente en el body en vez de usar req.id_cliente.
 */
const addUserAsSuperadmin = async (req, res) => {
  try {
    const { nombre, rol, id_sucursal, id_cliente, password: passBody } = req.body;
    const password = passBody;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'La contraseña es requerida (mínimo 6 caracteres)' });
    }

    if (!id_cliente) {
      return res.status(400).json({ message: 'id_cliente es requerido' });
    }

    if (!nombre || !rol) {
      return res.status(400).json({ message: 'nombre y rol son requeridos' });
    }

    // Verificar que el cliente exista
    const cliente = await Clientes.findByPk(id_cliente);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Verificar que el nombre no esté en uso dentro de ese cliente
    const existente = await Usuarios.findOne({
      where: { nombre, id_cliente },
    });
    if (existente) {
      return res.status(400).json({ message: 'Ya existe un usuario con ese nombre en este cliente' });
    }

    const newUser = await Usuarios.create({
      nombre,
      password,
      rol,
      id_sucursal: id_sucursal || null,
      id_cliente,
    });

    const { password: _, salt: __, ...safeUser } = newUser.toJSON();
    res.status(201).json({ message: 'Usuario creado exitosamente', newUser: safeUser });
  } catch (error) {
    console.error('Error al crear usuario (superadmin):', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const login = async (req, res) => {
  const { nombre, password } = req.body || {};

  if (!nombre || !password) {
    return res.status(400).json({ mensaje: 'nombre y password son requeridos' });
  }

  try {
    // Parsear formato: "tienda1.admin" o "tienda1@admin" o "admin"
    let clienteSlug = null;
    let userName = nombre;

    if (nombre.includes('.')) {
      const parts = nombre.split('.');
      clienteSlug = parts[0];
      userName = parts.slice(1).join('.');
    } else if (nombre.includes('@')) {
      const parts = nombre.split('@');
      clienteSlug = parts[0];
      userName = parts[1];
    }

    let id_cliente = null;
    let clienteBranding = null;

    if (clienteSlug) {
      // Buscar cliente por dominio o razon_social
      const { Op } = require('sequelize');
      let cliente = await Clientes.findOne({
        where: { dominio: clienteSlug, activo: true },
        attributes: ['id_cliente', 'razon_social', 'logo_url', 'color_primario', 'color_secundario', 'color_terciario', 'color_fondo'],
      });

      if (!cliente) {
        cliente = await Clientes.findOne({
          where: {
            razon_social: { [Op.iLike]: `%${clienteSlug}%` },
            activo: true,
          },
          attributes: ['id_cliente', 'razon_social', 'logo_url', 'color_primario', 'color_secundario', 'color_terciario', 'color_fondo'],
        });
      }

      if (!cliente) {
        return res.status(401).json({ mensaje: 'Empresa no encontrada' });
      }

      id_cliente = cliente.id_cliente;
      clienteBranding = {
        razon_social: cliente.razon_social,
        logo_url: cliente.logo_url,
        color_primario: cliente.color_primario,
        color_secundario: cliente.color_secundario,
        color_terciario: cliente.color_terciario,
        color_fondo: cliente.color_fondo,
      };
    }

    // Buscar usuario
    const whereClause = { nombre: userName, activo: true };
    if (id_cliente) {
      whereClause.id_cliente = id_cliente;
    }

    const user = await Usuarios.findOne({ where: whereClause });
    if (!user)
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });

    const isValid = await user.validatePass(password);

    if (!isValid)
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });

    const sucursal = await Sucursal.findOne({
      where: { id_sucursal: user.id_sucursal },
    });

    // Obtener branding del cliente si no se obtuvo antes
    if (!clienteBranding && user.id_cliente) {
      const cliente = await Clientes.findByPk(user.id_cliente, {
        attributes: ['razon_social', 'logo_url', 'color_primario', 'color_secundario', 'color_terciario', 'color_fondo'],
      });
      if (cliente) {
        clienteBranding = {
          razon_social: cliente.razon_social,
          logo_url: cliente.logo_url,
          color_primario: cliente.color_primario,
          color_secundario: cliente.color_secundario,
          color_terciario: cliente.color_terciario,
          color_fondo: cliente.color_fondo,
        };
      }
    }

    const payload = {
      id: user.id_usuario,
      nombre: user.nombre,
      rol: user.rol,
      id_cliente: user.id_cliente,
      id_sucursal: user.id_sucursal,
      nombre_sucursal: sucursal ? sucursal.nombre : null,
    };

    const token = jwt.sign(payload, process.env.SECRET, { expiresIn: '5h' });

    const isProduction = process.env.NODE_ENV === 'production';

    res
      .cookie('Token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 5 * 60 * 60 * 1000,
      })

      .status(200)
      .json({
        user: user.nombre,
        id: user.id_usuario,
        mensaje: 'Autorizado',
        Sucursal: user.id_sucursal,
        NombreSucursal: sucursal ? sucursal.nombre : null,
        cliente: clienteBranding,
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const resetPassword = async (req, res) => {
  const { nombre, new_password } = req.body;

  try {
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const user = await Usuarios.findOne({ where: { nombre, id_cliente: req.id_cliente } });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Solo admin puede resetear passwords de otros usuarios
    const esPropio = String(user.id_usuario) === String(req.user.id);
    if (req.user.rol !== 'superadmin' && req.user.rol !== 'admin' && !esPropio) {
      return res.status(403).json({ message: 'No tenés permiso para resetear esta contraseña' });
    }

    // Validar que el target user pertenece al mismo tenant (excepto superadmin)
    if (req.user.rol !== 'superadmin' && user.id_cliente !== req.id_cliente) {
      return res.status(403).json({ message: 'No tenés acceso a este usuario' });
    }

    // Generar nuevo salt y hashear la nueva contraseña
    const newSalt = await bc.genSalt();
    const newHashedPassword = await bc.hash(new_password, newSalt);

    // Actualizar el usuario
    user.password = newHashedPassword;
    user.salt = newSalt;
    await user.save();

    res.status(200).json({ message: 'Contraseña reseteada exitosamente' });
  } catch (error) {
    console.error('Error al resetear contraseña:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

const getUser = (req, res) => {
  const token = req.cookies.Token;

  if (!token) return res.status(401).json({ mensaje: 'Sesión expirada' });

  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    res.status(200).json(decoded);
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
};

const logout = (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('Token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });

  res.status(200).json({ message: 'Sesión cerrada correctamente' });
};

/**
 * changeMyPassword — permite al usuario autenticado cambiar su propia contraseña.
 * Requiere la contraseña actual para verificar identidad.
 */
const changeMyPassword = async (req, res) => {
  const { current_password, new_password } = req.body;

  try {
    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    if (current_password === new_password) {
      return res.status(400).json({ message: 'La nueva contraseña debe ser distinta a la actual' });
    }

    const user = await Usuarios.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const validPass = await user.validatePass(current_password);
    if (!validPass) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
    }

    const newSalt = await bc.genSalt();
    const newHashedPassword = await bc.hash(new_password, newSalt);

    user.password = newHashedPassword;
    user.salt = newSalt;
    await user.save();

    res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = {
  allUsers,
  User,
  addUser,
  addUserAsSuperadmin,
  login,
  resetPassword,
  changeMyPassword,
  getUser,
  logout,
  upUser,
};
