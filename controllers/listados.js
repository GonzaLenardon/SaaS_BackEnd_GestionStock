const {
  Ventas,
  DetalleVentas,
  Compra,
  TipoVenta,
  Cambio,
  DetalleCambio,
} = require('../models');
const { fn, col, where: sqWhere, Op } = require('sequelize');

const resumenVentas = async (req, res) => {
  try {
    const id_sucursal = req.params.sucursal;

    // Empleado solo puede ver su propia sucursal
    if (req.user.rol === 'empleado' && String(id_sucursal) !== String(req.user.id_sucursal)) {
      return res.status(403).json({ error: 'No tenés acceso a esa sucursal' });
    }

    const { desde, hasta } = req.body;

    const desdeFecha = `${desde}T00:00:00.000Z`;
    const hastaFecha = `${hasta}T23:59:59.999Z`;

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
    console.error('❌ Error en resumenVentas:', error);
    return res.status(500).json({ error: error.message });
  }
};

const ventasPorSucursales = async (req, res) => {
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

    console.log('Ventitas ', ventas);
    for (const venta of ventas) {
      const idSucursal = venta.id_sucursal;

      const tipoVentaNombre =
        venta.tipoVenta?.tipoVenta?.replace(/\s/g, '_') || 'otro';

      // Para rendición de caja usamos exclusivamente
      // el importe registrado en la venta.
      const totalFinal = Number(venta.total);

      // Inicializar sucursal si no existe
      if (!resumenPorSucursal[idSucursal]) {
        resumenPorSucursal[idSucursal] = {};
      }

      // Inicializar tipo de venta si no existe
      if (!resumenPorSucursal[idSucursal][tipoVentaNombre]) {
        resumenPorSucursal[idSucursal][tipoVentaNombre] = {
          id_tipo_venta: venta.tipoVenta.id_tipo,
          tipo_venta: tipoVentaNombre,
          color: venta.tipoVenta?.color || '#FF6B9D',
          total: 0,
          transacciones: 0,
        };
      }

      // Acumular total y contador
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
    console.error('Error en resumenVentas:', error);
    return res.status(500).json({ error: error.message });
  }
};

const resumenVentasDesdeHasta = async (req, res) => {
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

    const ventas = await Ventas.findAll({
      where: whereClause,
      include: [
        { model: DetalleVentas, as: 'detalles' },
        {
          model: Cambio,
          as: 'ventacambio',
          include: [{ model: DetalleCambio, as: 'cambiodetalles' }],
        },
        {
          model: TipoVenta,
          as: 'tipoVenta',
          attributes: ['tipoVenta', 'id_tipo'],
        },
      ],
    });

    const resumenMap = new Map();

    for (const venta of ventas) {
      const idTipoVenta = venta.id_tipo_venta;
      const tipoVentaNombre = venta.tipoVenta?.tipoVenta || 'Sin nombre';

      // ✅ usamos el total de la tabla Ventas, no recalculamos desde detalles
      const totalVenta = Number(venta.total);

      let totalDevuelve = 0;
      let totalRecibe = 0;

      console.log('ventasDetalles', venta.ventacambio);

      if (Array.isArray(venta.ventacambio)) {
        for (const cambio of venta.ventacambio) {
          if (Array.isArray(cambio.cambiodetalles)) {
            for (const det of cambio.cambiodetalles) {
              const subtotal = Number(det.precio_unitario) * det.cantidad;

              if (det.tipo === 'devuelve') {
                totalDevuelve += subtotal;
              } else if (det.tipo === 'recibe') {
                totalRecibe += subtotal;
              }
            }
          }
        }
      }

      const diferenciaCambio = totalRecibe - totalDevuelve;
      const totalFinal = totalVenta + diferenciaCambio;

      if (!resumenMap.has(idTipoVenta)) {
        resumenMap.set(idTipoVenta, {
          id_tipo_venta: idTipoVenta,
          tipo_venta: tipoVentaNombre,
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
      transacciones: resumen.transacciones,
      suma_total: parseFloat(resumen.suma_total.toFixed(2)),
    }));

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error en resumenVentas:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  resumenVentas,
  resumenVentasDesdeHasta,
  ventasPorSucursales,
};
