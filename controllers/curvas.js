const { Curvas, CurvaTalles, Productos } = require('../models');
const { fn, col } = require('sequelize');
const { crearCurvasPorDefecto } = require('../utils/curvasDefecto');

/**
 * Normaliza la lista de talles: recorta, quita vacios y elimina duplicados
 * conservando el orden original.
 */
const normalizarTalles = (talles) => {
  if (!Array.isArray(talles)) return [];

  const vistos = new Set();
  const limpios = [];

  talles.forEach((t) => {
    const valor = String(t ?? '').trim();
    if (!valor) return;
    const clave = valor.toLowerCase();
    if (vistos.has(clave)) return;
    vistos.add(clave);
    limpios.push(valor);
  });

  return limpios;
};

/**
 * Ordena los talles de una curva por su campo `orden`.
 * El ORDER BY del include no se respeta cuando la consulta padre tambien
 * tiene ORDER BY, asi que se ordena en JS para garantizarlo.
 */
const ordenarTalles = (talles) =>
  [...(talles || [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

/**
 * Todas las curvas del tenant con sus talles y la cantidad de productos
 * que usan cada una.
 */
const allCurvas = async (req, res) => {
  try {
    const where = req.user.rol === 'superadmin' ? {} : { id_cliente: req.id_cliente };

    const curvas = await Curvas.findAll({
      where,
      include: [
        {
          model: CurvaTalles,
          as: 'talles',
          attributes: ['id_curva_talle', 'talle', 'orden'],
          order: [['orden', 'ASC']],
        },
      ],
      order: [['nombre', 'ASC']],
    });

    // Cantidad de productos por curva
    const conteo = await Productos.findAll({
      where: req.user.rol === 'superadmin' ? {} : { id_cliente: req.id_cliente },
      attributes: [
        'id_curva',
        [fn('COUNT', col('id_producto')), 'cantidad'],
      ],
      group: ['id_curva'],
      raw: true,
    });

    const mapaConteo = {};
    conteo.forEach((p) => {
      if (p.id_curva) {
        mapaConteo[p.id_curva] = Number(p.cantidad) || 0;
      }
    });

    const resultado = curvas.map((c) => ({
      ...c.get({ plain: true }),
      talles: ordenarTalles(c.talles),
      cantidad_productos: mapaConteo[c.id_curva] || 0,
    }));

    res.status(200).json(resultado);
  } catch (error) {
    console.error('Error al obtener curvas:', error);
    res.status(500).json({ error: 'Error al obtener curvas' });
  }
};

/**
 * Detalle de una curva con la lista completa de talles y los productos que
 * tiene cargados en cada talle.
 */
const getCurva = async (req, res) => {
  try {
    const { id } = req.params;

    const where = req.user.rol === 'superadmin'
      ? { id_curva: id }
      : { id_curva: id, id_cliente: req.id_cliente };

    const curva = await Curvas.findOne({
      where,
      include: [
        {
          model: CurvaTalles,
          as: 'talles',
          attributes: ['id_curva_talle', 'talle', 'orden'],
          order: [['orden', 'ASC']],
        },
      ],
    });

    if (!curva) {
      return res.status(404).json({ message: 'Curva no encontrada' });
    }

    const productos = await Productos.findAll({
      where: {
        id_curva: curva.id_curva,
        ...(req.user.rol === 'superadmin' ? {} : { id_cliente: req.id_cliente }),
      },
      attributes: ['id_producto', 'codigo', 'nombre', 'marca', 'modelo', 'talle', 'color'],
      order: [['talle', 'ASC']],
    });

    res.status(200).json({
      ...curva.get({ plain: true }),
      talles: ordenarTalles(curva.talles),
      productos,
    });
  } catch (error) {
    console.error('Error al obtener curva:', error);
    res.status(500).json({ error: 'Error al obtener curva' });
  }
};

/**
 * Resuelve el tenant destino.
 *
 * El superadmin elige con que cliente trabaja al iniciar sesion, asi que su
 * JWT ya trae id_cliente. Si envia uno explicito en el body, ese manda.
 * Los demas roles usan siempre el tenant de su JWT.
 */
const resolverCliente = (req, bodyClientId) => {
  if (req.user.rol === 'superadmin') {
    return bodyClientId ? Number(bodyClientId) : req.id_cliente || null;
  }
  return req.id_cliente;
};

/**
 * Crea una curva con su lista de talles.
 * Body: { nombre, descripcion, talles: ['S','M','L'], activo, id_cliente? }
 */
const addCurva = async (req, res) => {
  try {
    const { nombre, descripcion, talles, activo, id_cliente: bodyClientId } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }

    const targetClientId = resolverCliente(req, bodyClientId);

    if (!targetClientId) {
      return res.status(400).json({ message: 'id_cliente es requerido' });
    }

    const listaTalles = normalizarTalles(talles);

    if (listaTalles.length === 0) {
      return res.status(400).json({ message: 'La curva debe tener al menos un talle' });
    }

    const existente = await Curvas.findOne({
      where: { nombre: nombre.trim(), id_cliente: targetClientId },
    });

    if (existente) {
      return res.status(400).json({ message: 'Ya existe una curva con ese nombre' });
    }

    const nuevaCurva = await Curvas.create({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      id_cliente: targetClientId,
      activo: activo !== undefined ? activo : true,
    });

    await CurvaTalles.bulkCreate(
      listaTalles.map((talle, index) => ({
        id_curva: nuevaCurva.id_curva,
        talle,
        orden: index,
      })),
    );

    const completa = await Curvas.findByPk(nuevaCurva.id_curva, {
      include: [
        {
          model: CurvaTalles,
          as: 'talles',
          attributes: ['id_curva_talle', 'talle', 'orden'],
          order: [['orden', 'ASC']],
        },
      ],
    });

    completa.talles = ordenarTalles(completa.talles);

    res.status(201).json({ message: 'Curva creada exitosamente', curva: completa });
  } catch (error) {
    console.error('Error al crear curva:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

/**
 * Actualiza una curva. Si viene la lista de talles, se reemplaza completa.
 * Body: { nombre, descripcion, talles, activo }
 */
const updateCurva = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, talles, activo } = req.body;

    const where = req.user.rol === 'superadmin'
      ? { id_curva: id }
      : { id_curva: id, id_cliente: req.id_cliente };

    const curva = await Curvas.findOne({ where });

    if (!curva) {
      return res.status(404).json({ message: 'Curva no encontrada' });
    }

    const updates = {};
    if (nombre !== undefined && nombre.trim()) updates.nombre = nombre.trim();
    if (descripcion !== undefined) updates.descripcion = descripcion?.trim() || null;
    if (activo !== undefined) updates.activo = activo;

    await curva.update(updates);

    // Reemplazo completo de talles si viene la lista
    if (Array.isArray(talles)) {
      const listaTalles = normalizarTalles(talles);

      if (listaTalles.length === 0) {
        return res.status(400).json({ message: 'La curva debe tener al menos un talle' });
      }

      await CurvaTalles.destroy({ where: { id_curva: curva.id_curva } });

      await CurvaTalles.bulkCreate(
        listaTalles.map((talle, index) => ({
          id_curva: curva.id_curva,
          talle,
          orden: index,
        })),
      );
    }

    const completa = await Curvas.findByPk(curva.id_curva, {
      include: [
        {
          model: CurvaTalles,
          as: 'talles',
          attributes: ['id_curva_talle', 'talle', 'orden'],
          order: [['orden', 'ASC']],
        },
      ],
    });

    completa.talles = ordenarTalles(completa.talles);

    res.status(200).json({ message: 'Curva actualizada correctamente', curva: completa });
  } catch (error) {
    console.error('Error al actualizar curva:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

/**
 * Elimina una curva. Los productos que la tenian asignada quedan sin curva
 * (no se borran).
 */
const deleteCurva = async (req, res) => {
  try {
    const { id } = req.params;

    const where = req.user.rol === 'superadmin'
      ? { id_curva: id }
      : { id_curva: id, id_cliente: req.id_cliente };

    const curva = await Curvas.findOne({ where });

    if (!curva) {
      return res.status(404).json({ message: 'Curva no encontrada' });
    }

    const productosAfectados = await Productos.count({
      where: { id_curva: curva.id_curva },
    });

    // Desasociar los productos (no se borran, solo pierden la curva)
    await Productos.update(
      { id_curva: null },
      { where: { id_curva: curva.id_curva } },
    );

    await CurvaTalles.destroy({ where: { id_curva: curva.id_curva } });
    await curva.destroy();

    res.status(200).json({
      message: productosAfectados > 0
        ? `Curva eliminada. ${productosAfectados} producto(s) quedaron sin curva.`
        : 'Curva eliminada correctamente',
      productos_desasociados: productosAfectados,
    });
  } catch (error) {
    console.error('Error al eliminar curva:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

/**
 * Catalogo de talles: todos los talles que existen en los productos del
 * tenant mas los que ya estan cargados en alguna curva. Sirve para sugerir
 * talles al crear una curva.
 */
const allTallesCatalogo = async (req, res) => {
  try {
    const whereCliente = req.user.rol === 'superadmin' ? {} : { id_cliente: req.id_cliente };

    const deProductos = await Productos.findAll({
      where: whereCliente,
      attributes: ['talle'],
      group: ['talle'],
      order: [['talle', 'ASC']],
    });

    const deCurvas = await CurvaTalles.findAll({
      include: [
        {
          model: Curvas,
          as: 'curva',
          attributes: ['id_curva', 'nombre', 'id_cliente'],
          where: whereCliente,
        },
      ],
      attributes: ['talle'],
      order: [['talle', 'ASC']],
    });

    const conjunto = new Set();

    deProductos.forEach((p) => {
      if (p.talle) conjunto.add(p.talle);
    });

    deCurvas.forEach((c) => {
      if (c.talle) conjunto.add(c.talle);
    });

    res.status(200).json(Array.from(conjunto).sort((a, b) =>
      a.localeCompare(b, 'es', { numeric: true }),
    ));
  } catch (error) {
    console.error('Error al obtener catalogo de talles:', error);
    res.status(500).json({ error: 'Error al obtener catalogo de talles' });
  }
};

/**
 * Crea las curvas por defecto (Letras y Numerica) para el cliente actual,
 * si todavia no las tiene. Es lo que usa el boton "Cargar sugeridas".
 */
const crearCurvasDefecto = async (req, res) => {
  try {
    const targetClientId = resolverCliente(req, req.body?.id_cliente);

    if (!targetClientId) {
      return res.status(400).json({ message: 'id_cliente es requerido' });
    }

    const creadas = await crearCurvasPorDefecto(targetClientId);

    if (creadas.length === 0) {
      return res.status(200).json({
        message: 'Ya tenes las curvas sugeridas cargadas',
        creadas: [],
      });
    }

    res.status(201).json({
      message: `Se crearon ${creadas.length} curva(s) sugerida(s)`,
      creadas,
    });
  } catch (error) {
    console.error('Error al crear curvas por defecto:', error);
    res.status(500).json({ error: 'Error al crear las curvas sugeridas' });
  }
};

module.exports = {
  allCurvas,
  getCurva,
  addCurva,
  updateCurva,
  deleteCurva,
  allTallesCatalogo,
  crearCurvasDefecto,
};
