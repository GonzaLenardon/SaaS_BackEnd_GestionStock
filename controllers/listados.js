const {
  Ventas,
  DetalleVentas,
  Compra,
  TipoVenta,
  Cambio,
  DetalleCambio,
} = require('../models');
const { fn, col, where: sqWhere, Op } = require('sequelize');
const sequelize = require('../db/conection');
const { calcularDiferencia } = require('../utils/diferenciasCambio');

const resumenVentas = async (req, res) => {
  try {
    const id_sucursal = req.params.sucursal;

    if (req.user.rol === 'empleado' && String(id_sucursal) !== String(req.user.id_sucursal)) {
      return res.status(403).json({ error: 'No tenés acceso a esa sucursal' });
    }

    const { desde, hasta } = req.body;

    const desdeFecha = new Date(desde + 'T00:00:00');
    const hastaFecha = new Date(hasta + 'T23:59:59');

    const whereClause = {
      [Op.and]: [
        { fecha: { [Op.between]: [desdeFecha, hastaFecha] } },
        { id_sucursal: id_sucursal },
      ],
    };

    if (req.user.rol !== 'superadmin') {
      whereClause.id_cliente = req.id_cliente;
    }

    const resultados = await Ventas.findAll({
      attributes: [
        'id_tipo_venta',
        'id_sucursal',
        [fn('SUM', col('total')), 'suma_total'],
        [fn('COUNT', col('id_venta')), 'transacciones'],
      ],
      include: [
        {
          model: TipoVenta,
          as: 'tipoVenta',
          attributes: ['tipoVenta', 'color'],
        },
      ],
      where: whereClause,
      group: ['id_tipo_venta', 'tipoVenta.id_tipo', 'id_sucursal'],
      order: ['id_tipo_venta'],
    });

    const data = resultados.map((r) => ({
      id_tipo_venta: r.get('id_tipo_venta'),
      tipo_venta: r.tipoVenta?.tipoVenta || '',
      color: r.tipoVenta?.color || '#FF6B9D',
      transacciones: parseInt(r.get('transacciones')),
      suma_total: parseFloat(r.get('suma_total')),
    }));

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error en resumenVentas:', error);
    return res.status(500).json({ error: error.message });
  }
};

const ventasPorSucursales = async (req, res) => {
  try {
    const { desde, hasta } = req.body;

    if (!desde || !hasta) {
      return res.status(400).json({ error: 'Faltan fechas desde o hasta' });
    }

    const desdeFecha = new Date(desde + 'T00:00:00');
    const hastaFecha = new Date(hasta + 'T23:59:59');

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

    const ventas = await Ventas.findAll({
      where: whereClause,
      include: [
        {
          model: TipoVenta,
          as: 'tipoVenta',
          attributes: ['tipoVenta', 'id_tipo', 'color'],
        },
      ],
      order: ['id_tipo_venta'],
    });

    const resumenPorSucursal = {};

    for (const venta of ventas) {
      const idSucursal = venta.id_sucursal;
      const tipoVentaNombre = venta.tipoVenta?.tipoVenta?.replace(/\s/g, '_') || 'otro';
      const totalFinal = Number(venta.total);

      if (!resumenPorSucursal[idSucursal]) {
        resumenPorSucursal[idSucursal] = {};
      }

      if (!resumenPorSucursal[idSucursal][tipoVentaNombre]) {
        resumenPorSucursal[idSucursal][tipoVentaNombre] = {
          id_tipo_venta: venta.tipoVenta.id_tipo,
          tipo_venta: tipoVentaNombre,
          color: venta.tipoVenta?.color || '#FF6B9D',
          total: 0,
          transacciones: 0,
        };
      }

      resumenPorSucursal[idSucursal][tipoVentaNombre].total += totalFinal;
      resumenPorSucursal[idSucursal][tipoVentaNombre].transacciones += 1;
    }

    const resultadoFinal = Object.entries(resumenPorSucursal).map(
      ([id_sucursal, ventasPorTipo]) => ({
        id_sucursal: Number(id_sucursal),
        ventas: ventasPorTipo,
      }),
    );

    return res.status(200).json(resultadoFinal);
  } catch (error) {
    console.error('Error en ventasPorSucursales:', error);
    return res.status(500).json({ error: error.message });
  }
};

const resumenVentasDesdeHasta = async (req, res) => {
  try {
    const { desde, hasta } = req.body;

    if (!desde || !hasta) {
      return res.status(400).json({ error: 'Faltan fechas desde o hasta' });
    }

    const desdeFecha = new Date(desde + 'T00:00:00');
    const hastaFecha = new Date(hasta + 'T23:59:59');

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

    const ventas = await Ventas.findAll({
      where: whereClause,
      include: [
        {
          model: TipoVenta,
          as: 'tipoVenta',
          attributes: ['tipoVenta', 'id_tipo', 'color'],
        },
      ],
    });

    const resumenMap = new Map();

    for (const venta of ventas) {
      const idTipoVenta = venta.id_tipo_venta;
      const tipoVentaNombre = venta.tipoVenta?.tipoVenta || 'Sin nombre';
      // El total de la venta ya es histórico. La diferencia de un cambio se
      // registra como venta propia el día del cambio, así que no se suma aquí.
      const totalFinal = Number(venta.total);

      if (!resumenMap.has(idTipoVenta)) {
        resumenMap.set(idTipoVenta, {
          id_tipo_venta: idTipoVenta,
          tipo_venta: tipoVentaNombre,
          color: venta.tipoVenta?.color || '#FF6B9D',
          transacciones: 0,
          suma_total: 0,
        });
      }

      const resumen = resumenMap.get(idTipoVenta);
      resumen.transacciones += 1;
      resumen.suma_total += totalFinal;
    }

    const data = Array.from(resumenMap.values()).map((resumen) => ({
      id_tipo_venta: resumen.id_tipo_venta,
      tipo_venta: resumen.tipo_venta,
      color: resumen.color,
      transacciones: resumen.transacciones,
      suma_total: parseFloat(resumen.suma_total.toFixed(2)),
    }));

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error en resumenVentasDesdeHasta:', error);
    return res.status(500).json({ error: error.message });
  }
};

const capitalStock = async (req, res) => {
  try {
    const idCliente = req.user.rol === 'superadmin' ? (req.body.id_cliente || null) : req.id_cliente;

    if (!idCliente && req.user.rol !== 'superadmin') {
      return res.status(400).json({ error: 'Falta id_cliente' });
    }

    const whereCliente = idCliente ? 'AND su.id_cliente = :idCliente' : '';

    const detalles = await sequelize.query(`
      SELECT
        ss.id_sucursal,
        su.nombre AS sucursal,
        p.id_producto,
        p.nombre,
        p.marca,
        p.codigo,
        SUM(ss.stock) AS stock,
        ROUND(SUM(ss.stock * p.costo), 2) AS capital
      FROM stock_sucursal ss
        INNER JOIN detallecompras dc ON ss.id_detalle_compra = dc.id_detalle
        INNER JOIN productos p ON dc.producto_id = p.id_producto
        INNER JOIN sucursales su ON ss.id_sucursal = su.id_sucursal
      WHERE ss.stock > 0
        AND p.activo = 1
        ${whereCliente}
      GROUP BY ss.id_sucursal, p.id_producto
      ORDER BY su.nombre, capital DESC
    `, {
      replacements: { idCliente },
      type: sequelize.QueryTypes.SELECT,
    });

    const resumenPorSucursal = {};
    let totalProductosConStock = 0;
    let totalCapital = 0;

    for (const row of detalles) {
      if (!resumenPorSucursal[row.id_sucursal]) {
        resumenPorSucursal[row.id_sucursal] = {
          id_sucursal: row.id_sucursal,
          sucursal: row.sucursal,
          productos: [],
          totalProductos: 0,
          totalCapital: 0,
        };
      }
      resumenPorSucursal[row.id_sucursal].productos.push({
        id_producto: row.id_producto,
        nombre: row.nombre,
        marca: row.marca,
        codigo: row.codigo,
        stock: parseInt(row.stock),
        capital: parseFloat(row.capital),
      });
      resumenPorSucursal[row.id_sucursal].totalProductos += 1;
      resumenPorSucursal[row.id_sucursal].totalCapital += parseFloat(row.capital);
      totalProductosConStock += 1;
      totalCapital += parseFloat(row.capital);
    }

    return res.status(200).json({
      sucursales: Object.values(resumenPorSucursal),
      totalProductosConStock,
      totalCapital: parseFloat(totalCapital.toFixed(2)),
    });
  } catch (error) {
    console.error('Error en capitalStock:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Ajustes por cambios — el concepto separado de las ventas.
 *
 * Cuando el cliente devuelve mas de lo que se lleva, la diferencia queda a
 * favor del comercio: NO es una venta ni un cobro, asi que no va en los
 * totales de ventas por tipo de venta. Se informa aparte, con su monto y la
 * cantidad de cambios, y tambien por sucursal.
 */
const resumenAjustesCambios = async (req, res) => {
  try {
    const { desde, hasta, id_sucursal } = req.body;

    if (!desde || !hasta) {
      return res.status(400).json({ error: 'Faltan fechas desde o hasta' });
    }

    const desdeFecha = new Date(`${desde}T00:00:00`);
    const hastaFecha = new Date(`${hasta}T23:59:59`);

    const whereCambio = {
      fecha: { [Op.between]: [desdeFecha, hastaFecha] },
    };

    if (req.user.rol !== 'superadmin') {
      whereCambio.id_cliente = req.id_cliente;
    }

    const cambios = await Cambio.findAll({
      where: whereCambio,
      attributes: ['id_cambio', 'fecha', 'id_venta_original'],
      include: [
        {
          model: DetalleCambio,
          as: 'cambiodetalles',
          attributes: ['producto_id', 'cantidad', 'precio_unitario', 'tipo'],
        },
        {
          model: Ventas,
          as: 'ventaOriginal',
          attributes: ['id_venta', 'id_sucursal'],
          required: true,
        },
      ],
      order: [['fecha', 'ASC']],
    });

    let montoTotal = 0;
    let cantidadCambios = 0;
    const porSucursal = new Map();

    for (const cambio of cambios) {
      const { diferenciaFavorComercio } = calcularDiferencia([cambio]);

      if (diferenciaFavorComercio <= 0) continue;

      cantidadCambios += 1;
      montoTotal += diferenciaFavorComercio;

      const idSucursal = cambio.ventaOriginal?.id_sucursal ?? null;

      if (idSucursal != null) {
        const actual = porSucursal.get(idSucursal) || {
          id_sucursal: idSucursal,
          monto: 0,
          cantidad: 0,
        };
        actual.monto += diferenciaFavorComercio;
        actual.cantidad += 1;
        porSucursal.set(idSucursal, actual);
      }
    }

    // Si se pidio una sucursal puntual, se filtra el resultado.
    const sucursales = Array.from(porSucursal.values()).filter(
      (s) =>
        id_sucursal == null || Number(s.id_sucursal) === Number(id_sucursal),
    );

    const montoFiltrado = sucursales.reduce((s, x) => s + x.monto, 0);
    const cantidadFiltrada = sucursales.reduce((s, x) => s + x.cantidad, 0);

    return res.status(200).json({
      monto_total: parseFloat(montoFiltrado.toFixed(2)),
      cantidad_cambios: cantidadFiltrada,
      monto_todas_sucursales: parseFloat(montoTotal.toFixed(2)),
      cantidad_todas_sucursales: cantidadCambios,
      por_sucursal: sucursales.map((s) => ({
        ...s,
        monto: parseFloat(s.monto.toFixed(2)),
      })),
    });
  } catch (error) {
    console.error('Error en resumenAjustesCambios:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  resumenVentas,
  resumenVentasDesdeHasta,
  ventasPorSucursales,
  resumenAjustesCambios,
  capitalStock,
};
