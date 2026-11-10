const {
  Productos,
  DetalleCompra,
  Compra,
  Ventas,
  Proveedores,
  DetalleVentas,
  ProductoCodigos,
  Curvas,
  CurvaTalles,
} = require('../models');
const sequelize = require('../db/conection.js');
const { Op } = require('sequelize');

const { generarCodigo } = require('../utils/generarCodigo.js');
const { fechaActual } = require('../utils/fechaHelper');
const { getNextCorrelative } = require('../utils/correlativo');
const { validarCurvaDelTenant } = require('../utils/validarTenant');
const { buscarPosiblesDuplicados } = require('../utils/duplicados');
const {
  usaNumeracionCorrelativa,
  numeroVisible,
  prefijoCodigo,
} = require('../utils/numeracion');

/**
 * Deduce la curva de un producto a partir de su talle.
 *
 * Es el respaldo para cuando el cliente de la API no envia id_curva: si el
 * talle pertenece a una curva del tenant, se asigna esa.
 *
 * - Si el talle no esta en ninguna curva → null (producto sin curva)
 * - Si esta en varias → gana la mas especifica (la de menos talles)
 *
 * @param {number} id_cliente
 * @param {string} talle
 * @returns {Promise<number|null>} id_curva
 */
const resolverCurvaPorTalle = async (id_cliente, talle) => {
  if (!id_cliente || !talle) return null;

  const curvas = await Curvas.findAll({
    where: { id_cliente, activo: true },
    include: [
      {
        model: CurvaTalles,
        as: 'talles',
        attributes: ['id_curva_talle', 'talle'],
      },
    ],
  });

  const t = String(talle).trim().toLowerCase();

  const coincidencias = curvas.filter((c) =>
    (c.talles || []).some((x) => String(x.talle).trim().toLowerCase() === t),
  );

  if (coincidencias.length === 0) return null;

  coincidencias.sort(
    (a, b) => (a.talles || []).length - (b.talles || []).length,
  );

  return coincidencias[0].id_curva;
};

const addProductos = async (req, res) => {
  try {
    let {
      codigo,
      nombre,
      marca,
      modelo,
      talle,
      color,
      costo,
      porcentaje,
      precio_venta,
      observaciones,
      id_curva,
      id_cliente: bodyClientId,
    } = req.body;

    // El superadmin no tiene tenant propio: debe indicar a que cliente
    // pertenece el producto (mismo patron que addSucursal / addCurva).
    const targetClientId =
      req.user.rol === 'superadmin' && bodyClientId
        ? Number(bodyClientId)
        : req.id_cliente;

    if (!targetClientId) {
      return res.status(400).json({ message: 'id_cliente es requerido' });
    }

    costo = parseFloat(costo).toFixed(2);
    porcentaje = parseFloat(porcentaje).toFixed(2);
    precio_venta = parseFloat(precio_venta).toFixed(2);

    // Si ya existen productos muy parecidos se avisa y el usuario decide.
    // Solo se corta el flujo si el cliente NO confirmo el duplicado.
    if (!req.body.confirmar_duplicado) {
      const duplicados = await buscarPosiblesDuplicados(
        { nombre, marca, modelo, color, talle },
        targetClientId
      );

      if (duplicados.length > 0) {
        return res.status(409).json({
          requiere_confirmacion: true,
          message: 'Ya existen productos con datos muy similares',
          coincidencias: duplicados,
        });
      }
    }

    const fecha = fechaActual();

    const correlativo = await getNextCorrelative(targetClientId, 'productos');

    // La curva se deduce del talle SOLO si el cliente no la envio.
    //   - id_curva ausente (undefined) → se deduce del talle
    //   - id_curva: null             → el producto queda sin curva (talle generico)
    //   - id_curva: 5                → se usa esa
    let curvaFinal =
      id_curva === undefined
        ? await resolverCurvaPorTalle(targetClientId, talle)
        : id_curva;

    // La curva indicada debe pertenecer al tenant.
    if (curvaFinal) {
      const curvaOk = await validarCurvaDelTenant(curvaFinal, targetClientId);

      if (!curvaOk.ok) {
        return res.status(400).json({ message: curvaOk.mensaje });
      }
    }

    const newProd = await Productos.create({
      codigo,
      nombre,
      marca,
      modelo,
      talle,
      color,
      costo,
      porcentaje,
      precio_venta,
      observaciones,
      createdAt: fecha,
      updatedAt: fecha,
      id_cliente: targetClientId,
      id_curva: curvaFinal || null,
      correlativo,
    });

    const id = newProd.id_producto;
    const prodPlano = newProd.get({ plain: true });

    // El prefijo del codigo sigue la numeracion de la tienda: correlativo
    // (0001, 0002...) si la tienda lo usa, id_producto en las demas.
    const porCorrelativo = await usaNumeracionCorrelativa(targetClientId);
    const codigoGenerado = await generarCodigo(prodPlano, {
      prefijo: prefijoCodigo(prodPlano, porCorrelativo),
    });

    await Productos.update(
      { codigo: codigoGenerado },
      { where: { id_producto: id } }
    );

    // Se devuelve el producto con el codigo FINAL (el que se genera en el BE)
    const productoFinal = await Productos.findByPk(id);

    res.status(201).send(productoFinal || newProd);
  } catch (error) {
    console.error('Error al crear producto:', error);
    res
      .status(500)
      .json({ error: 'Error al crear producto' });
  }
};

/**
 * Alta masiva de productos por curva de talles.
 *
 * Body:
 *   producto: { nombre, marca, modelo, color, costo, porcentaje, precio_venta,
 *               observaciones, id_curva }
 *   items:    [{ talle: 'S', cantidad: 3 }, { talle: 'M', cantidad: 2 }]
 *
 * La cantidad es el numero de etiquetas a imprimir de ese talle, no el stock
 * (el stock se carga en la pantalla de Compra).
 *
 * Todo se hace en una sola transaccion: si un producto falla, no se crea
 * ninguno. Los talles que ya existen se omiten y se reportan.
 */
const addProductosCurva = async (req, res) => {
  try {
    const { producto: datos, items, id_cliente: bodyClientId } = req.body;

    const targetClientId =
      req.user.rol === 'superadmin' && bodyClientId
        ? Number(bodyClientId)
        : req.id_cliente;

    if (!targetClientId) {
      return res.status(400).json({ message: 'id_cliente es requerido' });
    }

    if (!datos || !datos.nombre || !datos.nombre.trim()) {
      return res.status(400).json({ message: 'El nombre del producto es requerido' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'La curva debe tener al menos un talle' });
    }

    // Normalizar talles: sin vacios ni repetidos
    const vistos = new Set();
    const tallesNormalizados = [];

    for (const item of items) {
      const talle = String(item?.talle ?? '').trim();
      if (!talle) continue;
      const clave = talle.toLowerCase();
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      tallesNormalizados.push({
        talle,
        cantidad: Math.max(0, parseInt(item.cantidad, 10) || 0),
      });
    }

    if (tallesNormalizados.length === 0) {
      return res.status(400).json({ message: 'La curva debe tener al menos un talle' });
    }

    const nombre = datos.nombre.trim();
    const marca = (datos.marca || '').trim();
    const modelo = (datos.modelo || '').trim();
    const color = (datos.color || '').trim();
    const idCurva = datos.id_curva || null;

    // La curva indicada debe pertenecer al tenant.
    if (idCurva) {
      const curvaOk = await validarCurvaDelTenant(idCurva, targetClientId);

      if (!curvaOk.ok) {
        return res.status(400).json({ message: curvaOk.mensaje });
      }
    }

    // Detectar de una vez los talles que ya existen como producto
    const existentes = await Productos.findAll({
      where: {
        id_cliente: targetClientId,
        nombre,
        marca,
        modelo,
        color,
        talle: tallesNormalizados.map((t) => t.talle),
      },
      attributes: ['id_producto', 'codigo', 'talle'],
    });

    const mapaExistentes = {};
    existentes.forEach((p) => {
      mapaExistentes[p.talle.toLowerCase()] = p;
    });

    const aCrear = [];
    const omitidos = [];

    for (const item of tallesNormalizados) {
      const existente = mapaExistentes[item.talle.toLowerCase()];
      if (existente) {
        omitidos.push({
          talle: item.talle,
          motivo: 'El producto ya existe',
          id_producto: existente.id_producto,
          codigo: existente.codigo,
          cantidad: item.cantidad,
        });
      } else {
        aCrear.push(item);
      }
    }

    if (aCrear.length === 0) {
      return res.status(200).json({
        productos: [],
        omitidos,
        message: 'Todos los productos de la curva ya existian',
      });
    }

    // Productos que probablemente son el mismo (nombre parecido, misma marca
    // y talle). Es una advertencia, no un bloqueo: el usuario confirma.
    if (!req.body.confirmar_duplicado) {
      const duplicados = await buscarPosiblesDuplicados(
        {
          nombre,
          marca,
          modelo,
          color,
          talle: aCrear.map((t) => t.talle),
        },
        targetClientId
      );

      if (duplicados.length > 0) {
        return res.status(409).json({
          requiere_confirmacion: true,
          message: 'Ya existen productos con datos muy similares',
          coincidencias: duplicados,
        });
      }
    }

    const costo = parseFloat(datos.costo || 0).toFixed(2);
    const precio_venta = parseFloat(datos.precio_venta || 0).toFixed(2);
    const porcentaje = parseFloat(datos.porcentaje || 0).toFixed(2);
    const observaciones = (datos.observaciones || '').trim() || 'Sin observaciones';

    const fecha = fechaActual();
    const t = await sequelize.transaction();

    try {
      const creados = [];

      for (const item of aCrear) {
        // Transaccion compartida: no hace commit por cada producto
        const correlativo = await getNextCorrelative(targetClientId, 'productos', t);

        const nuevo = await Productos.create(
          {
            nombre,
            marca,
            modelo,
            talle: item.talle,
            color,
            costo,
            porcentaje,
            precio_venta,
            observaciones,
            createdAt: fecha,
            updatedAt: fecha,
            id_cliente: targetClientId,
            id_curva: idCurva,
            correlativo,
          },
          { transaction: t },
        );

        // El codigo depende del id_producto recien generado
        const porCorrelativo = await usaNumeracionCorrelativa(targetClientId);
        const codigoGenerado = await generarCodigo(nuevo.get({ plain: true }), {
          prefijo: prefijoCodigo(nuevo.get({ plain: true }), porCorrelativo),
        });

        await Productos.update(
          { codigo: codigoGenerado },
          { where: { id_producto: nuevo.id_producto }, transaction: t },
        );

        creados.push({
          ...nuevo.get({ plain: true }),
          codigo: codigoGenerado,
          cantidad: item.cantidad,
        });
      }

      await t.commit();

      res.status(201).json({
        productos: creados,
        omitidos,
        message:
          `Se crearon ${creados.length} producto(s)` +
          (omitidos.length ? `, ${omitidos.length} ya existian` : ''),
      });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error al crear productos por curva:', error);
    res.status(500).json({ error: 'Error al crear los productos de la curva' });
  }
};

/* const allProductos = async (req, res) => {
  try {
    const productosConStock = await Productos.findAll({
      attributes: {
        include: [
          [
            Sequelize.fn('SUM', Sequelize.col('compras.stock_disponible')),
            'stock_total',
          ],
        ],
      },
      include: [
        {
          model: DetalleCompra,
          as: 'compras',
          attributes: [],
        },
      ],
      group: ['productos.id_producto'],
      order: [['nombre', 'ASC']],
    });

    // Mover este console.log aquÃ­ si querÃ©s ver los datos

    res.status(200).send(productosConStock);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
}; */

const productosStock = async (req, res) => {
  try {
    const idCliente = req.user.rol === 'superadmin' ? null : req.id_cliente;

    let query = `
  SELECT 
  p.id_producto,
  p.nombre,
  p.codigo, 
  p.marca,
  p.modelo,
  p.talle,
  p.color,
  p.porcentaje,
  p.observaciones,
  p.costo,
  p.precio_venta,
  p.id_curva,
  p.correlativo,
  COALESCE(suma_stock.total_stock, 0) AS stock_total_producto,

  CASE 
    WHEN COUNT(s.id_sucursal) = 0 THEN JSON_ARRAY()
    ELSE JSON_ARRAYAGG(
      JSON_OBJECT(
        'id_sucursal', s.id_sucursal,
        'nombre_sucursal', s.nombre,
        'stock_total', COALESCE(s.stock_total, 0)
      ) ORDER BY s.id_sucursal
    )
  END AS stock_por_sucursal

FROM productos p

LEFT JOIN (
  SELECT 
    dc.producto_id,
    ss.id_sucursal,
    su.nombre,
    su.id_cliente,
    SUM(ss.stock) AS stock_total
  FROM detallecompras dc
  JOIN stock_sucursal ss ON dc.id_detalle = ss.id_detalle_compra
  JOIN sucursales su ON su.id_sucursal = ss.id_sucursal
  GROUP BY dc.producto_id, ss.id_sucursal, su.nombre, su.id_cliente
) AS s ON s.producto_id = p.id_producto

LEFT JOIN (
  SELECT 
    dc.producto_id,
    SUM(ss.stock) AS total_stock
  FROM detallecompras dc
  JOIN stock_sucursal ss ON dc.id_detalle = ss.id_detalle_compra
  GROUP BY dc.producto_id
) AS suma_stock ON suma_stock.producto_id = p.id_producto

WHERE 1=1
`;

    const replacements = {};
    if (idCliente) {
      query += ` AND p.id_cliente = :idCliente`;
      replacements.idCliente = idCliente;
    }

    // Solo mostrar productos activos (excepto si se pide incluir inactivos)
    if (!req.query.includeInactive) {
      query += ` AND p.activo = 1`;
    }

    query += `
GROUP BY 
  p.id_producto, p.nombre, p.codigo, p.marca, p.modelo, 
  p.talle, p.color, p.porcentaje, p.observaciones, p.precio_venta, 
  p.costo, p.id_curva, p.correlativo, suma_stock.total_stock
ORDER BY p.nombre;
`;

    const [result] = await sequelize.query(query, { replacements });

    // El numero que ve el usuario: correlativo propio de la tienda o id.
    const porCorrelativo = await usaNumeracionCorrelativa(idCliente);
    for (const fila of result) {
      fila.nro = numeroVisible(fila, 'id_producto', porCorrelativo);
    }

    res.json(result);
  } catch (error) {
    console.error('Error al obtener productos con stock:', error);
    res.status(500).json({ error: 'Error al obtener los datos' });
  }
};

const updateProductos = async (req, res) => {
  const {
    id_producto,
    codigo,
    nombre,
    marca,
    modelo,
    talle,
    color,
    costo,
    porcentaje,
    precio_venta,
    observaciones,
    id_curva,
  } = req.body;

  try {
    const where = req.user.rol === 'superadmin'
      ? { id_producto }
      : { id_producto, id_cliente: req.id_cliente };

    const productoExistente = await Productos.findOne({ where });

    if (!productoExistente) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }

    // El codigo se genera con los datos FINALES del producto (los del body si
    // vienen, los guardados si no). Asi un PUT parcial (solo precio) no
    // regenera el codigo con datos vacios.
    // El prefijo numerico no cambia al editar: es el correlativo (tiendas con
    // numeracion propia) o el id_producto (resto). Lo que cambia son las
    // letras del nombre/marca/talle.
    const porCorrelativo = await usaNumeracionCorrelativa(
      productoExistente.id_cliente,
    );
    const codGenerado = await generarCodigo(
      {
        id_producto: productoExistente.id_producto,
        correlativo: productoExistente.correlativo,
        nombre: nombre !== undefined ? nombre : productoExistente.nombre,
        marca: marca !== undefined ? marca : productoExistente.marca,
        talle: talle !== undefined ? talle : productoExistente.talle,
      },
      {
        prefijo: prefijoCodigo(productoExistente, porCorrelativo),
      },
    );

    const fecha = fechaActual();

    // Aviso de duplicados: se excluye el propio producto de la comparacion.
    if (!req.body.confirmar_duplicado) {
      const duplicados = await buscarPosiblesDuplicados(
        {
          nombre: nombre !== undefined ? nombre : productoExistente.nombre,
          marca: marca !== undefined ? marca : productoExistente.marca,
          modelo: modelo !== undefined ? modelo : productoExistente.modelo,
          color: color !== undefined ? color : productoExistente.color,
          talle: talle !== undefined ? talle : productoExistente.talle,
        },
        productoExistente.id_cliente,
        productoExistente.id_producto
      );

      if (duplicados.length > 0) {
        return res.status(409).json({
          requiere_confirmacion: true,
          message: 'Ya existen productos con datos muy similares',
          coincidencias: duplicados,
        });
      }
    }

    const updates = {
      codigo: codGenerado,
      updatedAt: fecha,
    };

    // Solo se actualizan los campos que vinieron en el body: un PUT parcial
    // (por ejemplo solo el precio) no debe borrar el resto de los datos.
    const campos = {
      nombre,
      marca,
      modelo,
      talle,
      color,
      costo,
      porcentaje,
      precio_venta,
      observaciones,
    };

    Object.entries(campos).forEach(([campo, valor]) => {
      if (valor !== undefined) {
        updates[campo] = valor;
      }
    });

    // La curva solo se toca si viene en el body o si cambio el talle.
    //   - id_curva presente → se usa ese valor (null = sin curva)
    //   - talle presente    → se deduce del talle
    //   - ninguno           → se deja la curva que ya tiene
    if (id_curva !== undefined) {
      if (id_curva) {
        const curvaOk = await validarCurvaDelTenant(
          id_curva,
          productoExistente.id_cliente
        );

        if (!curvaOk.ok) {
          return res.status(400).json({ message: curvaOk.mensaje });
        }
      }

      updates.id_curva = id_curva || null;
    } else if (talle !== undefined) {
      const curvaInferida = await resolverCurvaPorTalle(
        productoExistente.id_cliente,
        talle,
      );
      updates.id_curva = curvaInferida || null;
    }

    await Productos.update(updates, { where });

    // Si el codigo cambio (p.ej. se corrigio el nombre), el anterior queda
    // como alias para que las etiquetas ya impresas sigan resolviendo al
    // producto correcto.
    if (productoExistente.codigo && productoExistente.codigo !== codGenerado) {
      await ProductoCodigos.findOrCreate({
        where: {
          id_cliente: productoExistente.id_cliente,
          codigo: productoExistente.codigo,
        },
        defaults: {
          id_producto: productoExistente.id_producto,
          id_cliente: productoExistente.id_cliente,
          codigo: productoExistente.codigo,
          created_at: fecha,
        },
      });
    }

    res.status(200).json({
      message: 'Producto actualizado correctamente',
      codigo: codGenerado,
      codigo_anterior: productoExistente.codigo !== codGenerado ? productoExistente.codigo : null,
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({
      error: 'Error en el servidor',
    });
  }
};

/**
 * Busca un producto por codigo de barras: primero por el codigo actual y si
 * no lo encuentra por los alias (codigos anteriores).
 *
 * Sirve para que las etiquetas impresas antes de una correccion del nombre
 * sigan encontrando el producto correcto.
 */
const getProductoPorCodigo = async (req, res) => {
  try {
    const { codigo } = req.params;

    if (!codigo) {
      return res.status(400).json({ error: 'Falta el codigo' });
    }

    const codigoLimpio = codigo.trim().toUpperCase();

    const whereCliente = req.user.rol === 'superadmin' ? {} : { id_cliente: req.id_cliente };

    const producto = await Productos.findOne({
      where: { ...whereCliente, codigo: codigoLimpio },
    });

    if (producto) {
      return res.status(200).json(producto);
    }

    // Buscar por alias
    const alias = await ProductoCodigos.findOne({
      where: { ...whereCliente, codigo: codigoLimpio },
    });

    if (!alias) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const productoPorAlias = await Productos.findOne({
      where: { ...whereCliente, id_producto: alias.id_producto },
    });

    if (!productoPorAlias) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.status(200).json(productoPorAlias);
  } catch (error) {
    console.error('Error al buscar producto por codigo:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

/**
 * Devuelve los valores distintos ya cargados de un campo (marca, modelo o
 * color) para el tenant. Se usa para sugerir valores al cargar un producto
 * y evitar variantes innecesarias ("Blanca" vs "Blanco").
 *
 * GET /productos/valores?campo=color
 */
const valoresCampos = async (req, res) => {
  try {
    const campo = String(req.query.campo || '').toLowerCase();
    const permitidos = ['marca', 'modelo', 'color'];

    if (!permitidos.includes(campo)) {
      return res.status(400).json({
        message: 'El campo debe ser marca, modelo o color',
      });
    }

    const whereCliente =
      req.user.rol === 'superadmin' && req.query.id_cliente
        ? { id_cliente: Number(req.query.id_cliente) }
        : { id_cliente: req.id_cliente };

    const registros = await Productos.findAll({
      attributes: [campo],
      where: {
        ...whereCliente,
        [campo]: { [Op.ne]: null },
      },
      group: [campo],
      raw: true,
    });

    const valores = registros
      .map((r) => r[campo])
      .filter((v) => v !== null && String(v).trim() !== '')
      .map((v) => String(v).trim())
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    res.status(200).json(valores);
  } catch (error) {
    console.error('Error al obtener valores del campo:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

/**
 * Regenera los codigos de barras del tenant.
 *
 * El prefijo numerico sigue la numeracion de la tienda (correlativo propio o
 * id_producto). El codigo anterior de cada producto queda como alias para
 * que las etiquetas ya impresas sigan resolviendo al producto correcto.
 */
const actualizarCodigosBarras = async (req, res) => {
  try {
    const where = req.user.rol === 'superadmin'
      ? {}
      : { id_cliente: req.id_cliente };

    const productos = await Productos.findAll({ where });

    const porCorrelativo = await usaNumeracionCorrelativa(req.id_cliente);
    const fecha = fechaActual();
    let actualizados = 0;

    for (const prod of productos) {
      const plano = prod.get({ plain: true });
      const nuevoCodigo = await generarCodigo(plano, {
        prefijo: prefijoCodigo(plano, porCorrelativo),
      });

      if (nuevoCodigo === prod.codigo) continue;

      // El codigo viejo queda como alias (si el tenant lo tiene).
      if (prod.codigo && prod.id_cliente) {
        await ProductoCodigos.findOrCreate({
          where: {
            id_cliente: prod.id_cliente,
            codigo: prod.codigo,
          },
          defaults: {
            id_producto: prod.id_producto,
            id_cliente: prod.id_cliente,
            codigo: prod.codigo,
            created_at: fecha,
          },
        });
      }

      await prod.update({ codigo: nuevoCodigo });
      actualizados += 1;
    }

    return res.status(200).json({
      message: 'Codigos de barra actualizados correctamente',
      total: productos.length,
      actualizados,
    });
  } catch (error) {
    console.error('Error al actualizar codigos de barra:', error);
    return res.status(500).json({
      error: 'Error en el servidor',
    });
  }
};
const comprasProducto = async (req, res) => {
  const id_producto = req.params.id_producto;
  try {
    const where = { producto_id: id_producto };
    const compraInclude = {
      model: Compra,
      as: 'compra',
      include: [
        {
          model: Proveedores,
          as: 'proveedor',
          attributes: ['nombre'],
        },
      ],
      attributes: ['fecha', 'correlativo', 'id_compra'],
    };

    if (req.user.rol !== 'superadmin') {
      compraInclude.where = { id_cliente: req.id_cliente };
    }

    const comprasDeProducto = await DetalleCompra.findAll({
      include: [
        {
          model: Productos,
          as: 'producto',
          attributes: ['nombre', 'marca', 'modelo', 'talle'],
        },
        compraInclude,
      ],
      where,
      order: [['id_detalle', 'ASC']],
    });

    const porCorrelativo = await usaNumeracionCorrelativa(req.id_cliente);
    const respuesta = comprasDeProducto.map((detalle) => ({
      ...detalle.toJSON(),
      compra: detalle.compra
        ? {
            ...detalle.compra.toJSON(),
            nro: numeroVisible(detalle.compra, 'id_compra', porCorrelativo),
          }
        : null,
    }));

    res.status(200).send(respuesta);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

const ventasProducto = async (req, res) => {
  const id_producto = req.params.id_producto;

  try {
    const where = { id_producto };
    const ventaInclude = {
      model: Ventas,
      as: 'venta',
      attributes: ['fecha', 'total', 'id_venta', 'correlativo'],
    };

    if (req.user.rol !== 'superadmin') {
      ventaInclude.where = { id_cliente: req.id_cliente };
    }

    const ventasDeProducto = await DetalleVentas.findAll({
      include: [
        {
          model: Productos,
          as: 'producto',
          attributes: ['nombre', 'marca', 'modelo', 'talle'],
        },
        ventaInclude,
      ],
      where,
      order: [['id_detalleventa', 'ASC']],
    });

    const porCorrelativo = await usaNumeracionCorrelativa(req.id_cliente);
    const respuesta = ventasDeProducto.map((detalle) => ({
      ...detalle.toJSON(),
      venta: detalle.venta
        ? {
            ...detalle.venta.toJSON(),
            nro: numeroVisible(detalle.venta, 'id_venta', porCorrelativo),
          }
        : null,
    }));

    res.status(200).send(respuesta);
  } catch (error) {
    console.error('Error al obtener ventas del producto:', error);
    res.status(500).json({ error: 'Error al obtener ventas del producto' });
  }
};

const softDeleteProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (activo === undefined) {
      return res.status(400).json({ message: 'El campo activo es requerido' });
    }

    const producto = await Productos.findOne({
      where: { id_producto: id, id_cliente: req.id_cliente },
    });

    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    await producto.update({ activo });

    res.status(200).json({
      message: activo ? 'Producto reactivado' : 'Producto desactivado',
    });
  } catch (error) {
    console.error('Error al cambiar estado del producto:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = {
  addProductos,
  addProductosCurva,
  /*  allProductos, */
  updateProductos,
  comprasProducto,
  ventasProducto,
  productosStock,
  actualizarCodigosBarras,
  softDeleteProducto,
  getProductoPorCodigo,
  valoresCampos,
};

