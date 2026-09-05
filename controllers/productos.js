const {
  Productos,
  DetalleCompra,
  Compra,
  Ventas,
  Proveedores,
  DetalleVentas,
} = require('../models');
const sequelize = require('../db/conection.js');

const { generarCodigo } = require('../utils/generarCodigo.js');
const { fechaActual } = require('../utils/fechaHelper');
const { getNextCorrelative } = require('../utils/correlativo');

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
    } = req.body;

    costo = parseFloat(costo).toFixed(2);
    porcentaje = parseFloat(porcentaje).toFixed(2);
    precio_venta = parseFloat(precio_venta).toFixed(2);

    const fecha = fechaActual();

    const correlativo = await getNextCorrelative(req.id_cliente, 'productos');

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
      id_cliente: req.id_cliente,
      correlativo,
    });

    const id = newProd.id_producto;
    const prodPlano = newProd.get({ plain: true });

    const codigoGenerado = await generarCodigo(prodPlano);

    await Productos.update(
      { codigo: codigoGenerado },
      { where: { id_producto: id } }
    );

    res.status(201).send(newProd);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Error al crear producto' });
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

    // Mover este console.log aquí si querés ver los datos

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
  p.costo, suma_stock.total_stock

ORDER BY p.nombre;
`;

    const [result] = await sequelize.query(query, { replacements });
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
  } = req.body;

  const codGenerado = await generarCodigo(req.body);

  try {
    const where = req.user.rol === 'superadmin'
      ? { id_producto }
      : { id_producto, id_cliente: req.id_cliente };

    const productoExistente = await Productos.findOne({ where });

    if (!productoExistente) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }

    const fecha = fechaActual();

    await Productos.update(
      {
        codigo: codGenerado,
        nombre,
        marca,
        modelo,
        talle,
        color,
        costo,
        porcentaje,
        precio_venta,
        observaciones,
        updatedAt: fecha,
      },
      { where }
    );

    res.status(200).json({ message: 'Producto actualizado correctamente' });
  } catch (error) {
    res.status(500).json({
      error: 'Error en el servidor',
    });
  }
};

const actualizarCodigosBarras = async (req, res) => {
  try {
    const where = req.user.rol === 'superadmin'
      ? {}
      : { id_cliente: req.id_cliente };

    const productos = await Productos.findAll({ where });

    for (const prod of productos) {
      const nuevoCodigo = await generarCodigo(prod.get({ plain: true }));
      await prod.update({ codigo: nuevoCodigo });
    }

    return res.status(200).json({
      message: 'Codigos de barra actualizados correctamente',
      total: productos.length,
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
      attributes: ['fecha'],
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

    res.status(200).send(comprasDeProducto);
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
      attributes: ['fecha', 'total', 'id_venta'],
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

    res.status(200).send(ventasDeProducto);
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
  /*  allProductos, */
  updateProductos,
  comprasProducto,
  ventasProducto,
  productosStock,
  actualizarCodigosBarras,
  softDeleteProducto,
};
