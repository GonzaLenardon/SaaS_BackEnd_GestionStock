const {
  Cambio,
  DetalleCambio,
  StockSucursal,
  DetalleCompra,
  Ventas,
  DetalleVentas,
  Productos,
  Sucursal,
  TipoVenta,
} = require('../models');
const db = require('../db/conection');
const { Op } = require('sequelize');
const { getNextCorrelative } = require('../utils/correlativo');
const { fechaActual } = require('../utils/fechaHelper');
const { calcularDiferencia } = require('../utils/diferenciasCambio');

// Redondea a 2 decimales (importes en pesos).
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/* const registrarCambioProducto = async (req, res) => {
  const {
    id_venta_original,
    observaciones,
    id_usuario,
    sucursal_id,
    tventaSeleccionada,
    diferencia,
    devuelto = [],
    recibido = [],
  } = req.body;

  const t = await db.transaction();

  try {
    const hoy = new Date();
    const tresHorasEnMs = 3 * 60 * 60 * 1000;
    const fecha = new Date(hoy.getTime() - tresHorasEnMs);

    console.log('📦 Iniciando registro de cambio:', req.body);

    // 1️⃣ Crear SIEMPRE una nueva venta (aunque la diferencia sea 0)
    const nuevaVenta = await Ventas.create(
      {
        id_tipo_venta: parseInt(tventaSeleccionada),
        fecha,
        total: diferencia || 0,
        id_sucursal: sucursal_id,
        id_usuario,
        porcentaje_aplicado: 0,
        monto_descuento: 0,
      },
      { transaction: t }
    );

    console.log('🧾 Nueva venta creada (cambio):', nuevaVenta.id_venta);

    // 2️⃣ Registrar el encabezado del cambio
    const nuevoCambio = await Cambio.create(
      {
        id_venta_original,
        id_venta_diferencia: nuevaVenta.id_venta,
        fecha,
        observaciones,
      },
      { transaction: t }
    );

    console.log('🔄 Cambio registrado con ID:', nuevoCambio.id_cambio);

    // 3️⃣ DEVUELTOS → se devuelven al stock (sumar cantidad)
    for (const item of devuelto) {
      console.log('🟢 Procesando devolución:', item);

      await DetalleCambio.create(
        {
          id_cambio: nuevoCambio.id_cambio,
          tipo: 'devuelve',
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          reemplazado: true,
        },
        { transaction: t }
      );

      const stockExistente = await StockSucursal.findOne({
        where: {
          id_detalle_compra: item.id_detalle_compra,
          id_sucursal: sucursal_id,
        },
        transaction: t,
      });

      if (stockExistente) {
        stockExistente.stock += item.cantidad;
        await stockExistente.save({ transaction: t });
      } else {
        await StockSucursal.create(
          {
            id_detalle_compra: item.id_detalle_compra,
            id_sucursal: sucursal_id,
            stock: item.cantidad,
          },
          { transaction: t }
        );
      }

      console.log(
        `✅ Stock devuelto sumado para lote ${item.id_detalle_compra}`
      );
    }

    // 4️⃣ RECIBIDOS → descontar stock (FIFO) y registrar detalle de venta
    for (const item of recibido) {
      console.log('🔴 Procesando recibido:', item);

      let cantidadRestante = item.cantidad;
      const lotes = await StockSucursal.findAll({
        where: { id_sucursal: sucursal_id },
        include: [
          {
            model: DetalleCompra,
            as: 'sucursalDetalleToCompra',
            where: { producto_id: item.producto_id },
            required: true,
          },
        ],
        order: [
          [
            { model: DetalleCompra, as: 'sucursalDetalleToCompra' },
            'createdAt',
            'ASC',
          ],
        ],
        transaction: t,
      });

      if (!lotes.length) {
        throw new Error(
          `No hay lotes disponibles para el producto ID ${item.producto_id}`
        );
      }

      for (const lote of lotes) {
        if (cantidadRestante <= 0) break;

        const disponible = lote.stock;
        if (disponible <= 0) continue;

        const aDescontar = Math.min(disponible, cantidadRestante);

        // Crear detalle del cambio (recibe)
        await DetalleCambio.create(
          {
            id_cambio: nuevoCambio.id_cambio,
            tipo: 'recibe',
            producto_id: item.producto_id,
            cantidad: aDescontar,
            precio_unitario: item.precio_unitario,
            reemplazado: false,
          },
          { transaction: t }
        );

        // Crear detalle de venta con trazabilidad del lote
        const producto = await Productos.findByPk(item.producto_id, {
          transaction: t,
        });
        await DetalleVentas.create(
          {
            id_venta: nuevaVenta.id_venta,
            id_producto: item.producto_id,
            nombreProducto: producto?.nombre || `Producto ${item.producto_id}`,
            cantidad: aDescontar,
            precio_unitario: item.precio_unitario,
            total: aDescontar * item.precio_unitario,
            fecha,
            id_sucursal: sucursal_id,
            id_detalle_compra: lote.id_detalle_compra,
          },
          { transaction: t }
        );

        // Descontar stock del lote
        lote.stock -= aDescontar;
        await lote.save({ transaction: t });

        cantidadRestante -= aDescontar;
      }

      if (cantidadRestante > 0) {
        throw new Error(
          `❌ Stock insuficiente para producto ID ${item.producto_id}`
        );
      }
    }

    // 5️⃣ Confirmar todo
    await t.commit();
    console.log('✅ Cambio registrado y stock actualizado correctamente');

    return res.status(201).json({
      ok: true,
      message: 'Cambio registrado correctamente',
      id_cambio: nuevoCambio.id_cambio,
      id_venta_diferencia: nuevaVenta.id_venta,
    });
  } catch (error) {
    await t.rollback();
    console.error('❌ Error en registrarCambioProducto:', error);
    return res.status(500).json({
      ok: false,
      message: error.message || 'Error al registrar el cambio',
    });
  }
}; */

/* const registrarCambioProducto = async (req, res) => {
  const {
    id_venta_original,
    observaciones,
    id_usuario,
    sucursal_id,
    tventaSeleccionada,
    diferencia,
    devuelto = [],
    recibido = [],
  } = req.body;

  // validaciones básicas
  if (!id_venta_original) {
    return res
      .status(400)
      .json({ ok: false, message: 'id_venta_original requerido' });
  }

  const t = await db.transaction();

  try {
    const hoy = new Date();
    const tresHorasEnMs = 3 * 60 * 60 * 1000;
    const fecha = new Date(hoy.getTime() - tresHorasEnMs);

    // 1️⃣ Crear nueva venta (siempre)
    const nuevaVenta = await Ventas.create(
      {
        id_tipo_venta: parseInt(tventaSeleccionada, 10) || 1,
        fecha,
        total: diferencia || 0,
        id_sucursal: sucursal_id,
        id_usuario,
        porcentaje_aplicado: 0,
        monto_descuento: 0,
      },
      { transaction: t }
    );

    // 2️⃣ Registrar el encabezado del cambio
    const nuevoCambio = await Cambio.create(
      {
        id_venta_original,
        id_venta_diferencia: nuevaVenta.id_venta,
        fecha,
        observaciones,
      },
      { transaction: t }
    );

    // Cache de productos para evitar queries repetidos
    const productoCache = new Map();
    const getProducto = async (id) => {
      if (productoCache.has(id)) return productoCache.get(id);
      const p = await Productos.findByPk(id, { transaction: t });
      productoCache.set(id, p);
      return p;
    };

    // 3️⃣ DEVUELTOS → sumar stock y marcar reemplazos previos si corresponde
    for (const item of devuelto) {
      // validations
      if (!item.producto_id || !item.cantidad || !item.id_detalle_compra) {
        throw new Error(
          'Item devuelto inválido: debe incluir producto_id, cantidad e id_detalle_compra'
        );
      }

      // registrar detalle cambio (devuelve)
      await DetalleCambio.create(
        {
          id_cambio: nuevoCambio.id_cambio,
          tipo: 'devuelve',
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          reemplazado: true,
        },
        { transaction: t }
      );

      // marcar recibidos previos como reemplazados: si existen DetalleCambio previos con ese producto y reemplazado = false,
      // pasan a true porque el producto fue devuelto.
      await DetalleCambio.update(
        { reemplazado: true },
        {
          where: {
            id_cambio: id_venta_original, // 🔥 cambia esto
            producto_id: item.producto_id,
            tipo: 'recibe',
            reemplazado: false,
          },
          transaction: t,
        }
      );

      // actualizar stock_sucursal (sumar)
      const stockExistente = await StockSucursal.findOne({
        where: {
          id_detalle_compra: item.id_detalle_compra,
          id_sucursal: sucursal_id,
        },
        transaction: t,
      });

      if (stockExistente) {
        stockExistente.stock =
          Number(stockExistente.stock) + Number(item.cantidad);
        await stockExistente.save({ transaction: t });
      } else {
        await StockSucursal.create(
          {
            id_detalle_compra: item.id_detalle_compra,
            id_sucursal: sucursal_id,
            stock: item.cantidad,
          },
          { transaction: t }
        );
      }
    }

    // 4️⃣ RECIBIDOS → descontar stock (FIFO) y registrar detalle de venta
    for (const item of recibido) {
      if (!item.producto_id || !item.cantidad) {
        throw new Error(
          'Item recibido inválido: debe incluir producto_id y cantidad'
        );
      }

      let cantidadRestante = Number(item.cantidad);

      // obtener lotes FIFO del producto en la sucursal
      const lotes = await StockSucursal.findAll({
        where: { id_sucursal: sucursal_id },
        include: [
          {
            model: DetalleCompra,
            as: 'sucursalDetalleToCompra',
            where: { producto_id: item.producto_id },
            required: true,
          },
        ],
        order: [
          [
            { model: DetalleCompra, as: 'sucursalDetalleToCompra' },
            'createdAt',
            'ASC',
          ],
        ],
        transaction: t,
      });

      if (!lotes.length) {
        throw new Error(
          `No hay lotes disponibles para el producto ID ${item.producto_id}`
        );
      }

      for (const lote of lotes) {
        if (cantidadRestante <= 0) break;

        const disponible = Number(lote.stock);
        if (disponible <= 0) continue;

        const aDescontar = Math.min(disponible, cantidadRestante);

        // crear detalle cambio (recibe), reemplazado = false por defecto
        const detalleCambioCreado = await DetalleCambio.create(
          {
            id_cambio: nuevoCambio.id_cambio,
            tipo: 'recibe',
            producto_id: item.producto_id,
            cantidad: aDescontar,
            precio_unitario: item.precio_unitario,
            reemplazado: false,
          },
          { transaction: t }
        );

        // registrar detalle de venta con trazabilidad del lote
        const producto = await getProducto(item.producto_id);
        await DetalleVentas.create(
          {
            id_venta: nuevaVenta.id_venta,
            id_producto: item.producto_id,
            nombreProducto: producto?.nombre || `Producto ${item.producto_id}`,
            cantidad: aDescontar,
            precio_unitario: item.precio_unitario,
            total: aDescontar * item.precio_unitario,
            fecha,
            id_sucursal: sucursal_id,
            id_detalle_compra: lote.id_detalle_compra,
          },
          { transaction: t }
        );

        // descontar stock del lote
        lote.stock = Number(lote.stock) - aDescontar;
        await lote.save({ transaction: t });

        cantidadRestante -= aDescontar;
      }

      if (cantidadRestante > 0) {
        throw new Error(
          `Stock insuficiente para producto ID ${item.producto_id}`
        );
      }
    }

    // 5️⃣ Commit
    await t.commit();

    return res.status(201).json({
      ok: true,
      message: 'Cambio registrado correctamente',
      id_cambio: nuevoCambio.id_cambio,
      id_venta_diferencia: nuevaVenta.id_venta,
    });
  } catch (error) {
    await t.rollback();
    console.error('❌ Error en registrarCambioProducto:', error);
    return res.status(500).json({
      ok: false,
      message: error.message || 'Error al registrar el cambio',
    });
  }
}; */

/* 


/* CLAUDE */
/* const registrarCambioProducto = async (req, res) => {
  const {
    id_venta_original,
    observaciones,
    id_usuario,
    sucursal_id,
    tventaSeleccionada,
    diferencia,
    devuelto,
    recibido,
  } = req.body;



  const t = await db.transaction();

  try {
    // 1) CREAR CAMBIO
    const cambio = await Cambio.create(
      {
        id_venta_original,
        id_venta_diferencia: null,
        observaciones,
      },
      { transaction: t }
    );

    // ==========================================================
    // 2) PROCESAR DEVUELTOS (SUMAR STOCK AL LOTE)
    // ==========================================================
    for (const item of devuelto) {
      const { producto_id, cantidad, precio_unitario, id_detalle_compra } =
        item;

      // 2.1 Guardar en DetalleCambio 👇 AGREGADO id_detalle_compra
      await DetalleCambio.create(
        {
          id_cambio: cambio.id_cambio,
          producto_id,
          cantidad,
          precio_unitario,
          tipo: 'devuelve',
          id_detalle_compra, // 👈 AGREGAR ESTO
        },
        { transaction: t }
      );

      // 2.2 SUMAR STOCK AL LOTE CORRECTO
      const loteStock = await StockSucursal.findOne({
        where: {
          id_detalle_compra,
          id_sucursal: sucursal_id,
        },
        transaction: t,
      });

      if (!loteStock) {
        throw new Error(
          `No existe stock_sucursal para id_detalle_compra ${id_detalle_compra}`
        );
      }

      loteStock.stock += cantidad;
      await loteStock.save({ transaction: t });
    }

    // ==========================================================
    // 3) PROCESAR RECIBIDOS (DESCONTAR STOCK POR FIFO)
    // ==========================================================
    for (const item of recibido) {
      const { producto_id, cantidad, precio_unitario } = item;

      let qtyToDiscount = cantidad;

      const lotes = await StockSucursal.findAll({
        include: [
          {
            model: DetalleCompra,
            as: 'sucursalDetalleToCompra',
            where: {
              producto_id,
            },
          },
        ],
        where: {
          id_sucursal: sucursal_id,
          stock: { [Op.gt]: 0 },
        },
        order: [
          [
            { model: DetalleCompra, as: 'sucursalDetalleToCompra' },
            'id_detalle',
            'ASC',
          ],
        ],
        transaction: t,
      });

      if (!lotes.length) {
        throw new Error(`No hay stock disponible para producto ${producto_id}`);
      }

      // 👇 MODIFICADO: Procesar lote por lote y crear un DetalleCambio por cada lote
      for (const lote of lotes) {
        if (qtyToDiscount <= 0) break;

        const descontar = Math.min(lote.stock, qtyToDiscount);

        // 3.1 Crear registro en DetalleCambio por cada lote usado
        await DetalleCambio.create(
          {
            id_cambio: cambio.id_cambio,
            producto_id,
            cantidad: descontar, // 👈 Cantidad específica de este lote
            precio_unitario,
            tipo: 'recibe',
            id_detalle_compra: lote.id_detalle_compra, // 👈 AGREGAR ESTO
          },
          { transaction: t }
        );

        // 3.2 Descontar del lote
        lote.stock -= descontar;
        qtyToDiscount -= descontar;

        await lote.save({ transaction: t });
      }

      if (qtyToDiscount > 0) {
        throw new Error(
          `Stock insuficiente para completar el cambio del producto ${producto_id}`
        );
      }
    }

    // 4) CONFIRMAR TRANSACCIÓN
    await t.commit();

    res.json({
      ok: true,
      message: 'Cambio registrado correctamente',
      cambio_id: cambio.id_cambio,
    });
  } catch (error) {
    await t.rollback();
    console.error('Error registrarCambioProducto:', error);
    res.status(500).json({
      ok: false,
      message: 'Error al registrar el cambio',
      error: error.message,
    });
  }
};
 */

const registrarCambioProducto = async (req, res) => {
  const {
    id_venta_original,
    observaciones,
    id_usuario,
    sucursal_id,
    tventaSeleccionada,
    diferencia,
    devuelto,
    recibido,
  } = req.body;

  const t = await db.transaction();

  try {
    if (req.user.rol !== 'superadmin') {
      const sucursal = await Sucursal.findOne({
        where: { id_sucursal: sucursal_id, id_cliente: req.id_cliente },
      });
      if (!sucursal) {
        await t.rollback();
        return res.status(403).json({ error: 'Sucursal no pertenece a tu cliente' });
      }
    }

    // ==========================================================
    // 0) SUCURSAL: el cambio se registra SIEMPRE en la sucursal
    //    de la venta original. Si no coinciden, el stock se
    //    movería de un lado y del otro.
    // ==========================================================
    const ventaOriginalVenta = await Ventas.findByPk(id_venta_original, {
      attributes: ['id_venta', 'id_sucursal'],
      transaction: t,
    });

    if (!ventaOriginalVenta) {
      await t.rollback();
      return res.status(404).json({ error: 'La venta original no existe' });
    }

    if (Number(ventaOriginalVenta.id_sucursal) !== Number(sucursal_id)) {
      await t.rollback();
      return res.status(400).json({
        ok: false,
        error: 'El cambio se registra en la sucursal de la venta original.',
      });
    }

    // ==========================================================
    // 0) VALIDAR DEVUELTOS ANTES DE ESCRIBIR NADA
    //    La cantidad devuelta no puede superar lo vigente de la venta
    //    original para ese producto y lote.
    // ==========================================================
    for (const item of devuelto || []) {
      const vigentes = await DetalleVentas.findAll({
        where: {
          id_venta: id_venta_original,
          id_producto: item.producto_id,
          id_detalle_compra: item.id_detalle_compra,
          es_reversado: false,
        },
        transaction: t,
      });
      const totalVigente = vigentes.reduce((s, f) => s + Number(f.cantidad), 0);
      if (Number(item.cantidad) > totalVigente) {
        await t.rollback();
        return res.status(400).json({
          ok: false,
          error: `No se puede devolver ${item.cantidad} del producto ${item.producto_id}: en la venta quedan ${totalVigente} vigentes.`,
        });
      }
    }

    // ==========================================================
    // 0b) CALCULAR EL SALDO DEL CAMBIO (regla única)
    //     Devuelto > Recibido  → diferencia a favor del comercio
    //                          (ajuste del cambio, NO es venta ni cobro)
    //     Recibido > Devuelto  → diferencia a cobrar (el cliente paga)
    //     Iguales             → cambio parejo, sin cobro
    // ==========================================================
    const {
      totalDevuelto,
      totalRecibido,
      diferenciaACobrar,
      diferenciaFavorComercio,
      totalCompensado,
    } = calcularDiferencia([
      {
        detalles: [
          ...(devuelto || []).map((d) => ({ ...d, tipo: 'devuelve' })),
          ...(recibido || []).map((d) => ({ ...d, tipo: 'recibe' })),
        ],
      },
    ]);

    // Si hay diferencia a cobrar, el cliente paga: hace falta el medio de
    // pago. Si la diferencia queda a favor del comercio o es cero, no hay
    // cobro y no se pide ningun tipo de venta.
    let tipoVentaId = null;
    if (diferenciaACobrar > 0) {
      const tipo = await TipoVenta.findOne({
        where: { id_tipo: parseInt(tventaSeleccionada, 10) || 0 },
        transaction: t,
      });

      if (!tipo) {
        await t.rollback();
        return res.status(400).json({
          ok: false,
          error: 'Seleccioná el tipo de venta del cobro de la diferencia.',
        });
      }

      if (tipo.habilitado === false) {
        await t.rollback();
        return res.status(400).json({
          ok: false,
          error: `El tipo de venta "${tipo.tipoVenta}" no está habilitado.`,
        });
      }

      tipoVentaId = tipo.id_tipo;
    }

    let id_venta_diferencia = null;

    // Hora Argentina para la venta de diferencia y sus lineas, para que no
    // usen el defaultValue NOW (UTC) y queden con 3 horas de desfase.
    const fecha = fechaActual();

    // ==========================================================
    // 1) CREAR VENTA DE DIFERENCIA (solo si el cliente paga)
    //    La venta representa SOLO el dinero cobrado. Los productos
    //    entregados quedan como movimientos del cambio (DetalleCambio),
    //    no como lineas de esta venta: asi el detalle de la venta
    //    cuadra con su total.
    // ==========================================================
    if (diferenciaACobrar > 0) {
      const nuevaVenta = await Ventas.create(
        {
          id_tipo_venta: tipoVentaId,
          fecha,
          total: diferenciaACobrar,
          id_sucursal: sucursal_id,
          id_usuario,
          porcentaje_aplicado: 0,
          monto_descuento: 0,
          id_cliente: req.id_cliente,
          correlativo: await getNextCorrelative(req.id_cliente, 'ventas', t),
        },
        { transaction: t },
      );

      // Linea unica del cobro: la diferencia a cobrar por el cambio.
      await DetalleVentas.create(
        {
          id_venta: nuevaVenta.id_venta,
          id_producto: null, // Sin producto especifico
          nombreProducto: 'Diferencia a cobrar por cambio',
          cantidad: 1,
          precio_unitario: diferenciaACobrar,
          total: diferenciaACobrar,
          fecha,
          id_sucursal: sucursal_id,
          id_detalle_compra: null,
          id_cliente: req.id_cliente,
          es_cambio: false, // No es parte del cambio en si
        },
        { transaction: t },
      );

      id_venta_diferencia = nuevaVenta.id_venta;
    }

    // ==========================================================
    // 2) CREAR CAMBIO
    // ==========================================================
    const cambio = await Cambio.create(
      {
        id_venta_original,
        id_venta_diferencia, // puede ser null si no hay diferencia
        observaciones,
        fecha: fechaActual(),
        id_cliente: req.id_cliente,
        correlativo: await getNextCorrelative(req.id_cliente, 'cambio', t),
      },
      { transaction: t },
    );

    // ==========================================================
    // 3) PROCESAR DEVUELTOS (SUMAR STOCK AL LOTE)
    // ==========================================================
    console.log('📦 PROCESANDO DEVUELTOS:', devuelto);
    for (const item of devuelto) {
      const { producto_id, cantidad, precio_unitario, id_detalle_compra } =
        item;

      console.log(`➕ DEVOLVIENDO: Producto ${producto_id}, Cantidad ${cantidad}, Lote ${id_detalle_compra}`);

      // 3.1 Guardar en DetalleCambio
      const detalleCambioCreado = await DetalleCambio.create(
        {
          id_cambio: cambio.id_cambio,
          producto_id,
          cantidad,
          precio_unitario,
          tipo: 'devuelve',
          id_detalle_compra,
          id_cliente: req.id_cliente,
          correlativo: await getNextCorrelative(req.id_cliente, 'detalle_cambio', t),
        },
        { transaction: t },
      );

      console.log(`✅ DetalleCambio creado ID: ${detalleCambioCreado.id_detalle_cambio}`);

      // 3.2 Dividir las filas vigentes de la venta original (FIFO por fila).
      //     Devolucion completa de una fila: se marca revertida.
      //     Devolucion parcial: la fila baja a lo que se quedo el cliente y se
      //     crea una fila revertida por lo devuelto, con su importe exacto.
      let pendiente = Number(cantidad);
      const filasVigentes = await DetalleVentas.findAll({
        where: {
          id_venta: id_venta_original,
          id_producto: producto_id,
          id_detalle_compra,
          es_reversado: false,
        },
        order: [['id_detalleventa', 'ASC']],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      for (const fila of filasVigentes) {
        if (pendiente <= 0) break;

        const cantFila = Number(fila.cantidad);
        const aDevolver = Math.min(cantFila, pendiente);
        const totalFila = Number(fila.total);

        if (aDevolver === cantFila) {
          await fila.update(
            { es_reversado: true, id_cambio_asociado: detalleCambioCreado.id_detalle_cambio },
            { transaction: t },
          );
        } else {
          const totalDevuelto = round2((totalFila * aDevolver) / cantFila);
          const totalQueda = round2(totalFila - totalDevuelto);

          await fila.update(
            { cantidad: cantFila - aDevolver, total: totalQueda },
            { transaction: t },
          );

          const { id_detalleventa, createdAt, updatedAt, ...datos } = fila.get({ plain: true });
          await DetalleVentas.create(
            {
              ...datos,
              cantidad: aDevolver,
              total: totalDevuelto,
              es_reversado: true,
              id_cambio_asociado: detalleCambioCreado.id_detalle_cambio,
            },
            { transaction: t },
          );
        }

        pendiente -= aDevolver;
      }

      if (pendiente > 0) {
        throw new Error(
          `Devolución del producto ${producto_id} excede lo vigente en la venta original`,
        );
      }

      // 3.3 SUMAR STOCK AL LOTE CORRECTO
      const lotesStockAntes = await StockSucursal.findAll({
        where: {
          id_detalle_compra,
          id_sucursal: sucursal_id,
        },
        transaction: t,
      });
      const totalAntes = lotesStockAntes.reduce((sum, row) => sum + Number(row.stock), 0);
      console.log(
        `📊 STOCK ANTES DEVOLVER lote ${id_detalle_compra} sucursal ${sucursal_id} (total ${totalAntes}):`,
        lotesStockAntes.map((l) => ({
          id_stock: l.id_stock,
          stock: l.stock,
          id_detalle_compra: l.id_detalle_compra,
          id_sucursal: l.id_sucursal,
        })),
      );

      const loteStock = await StockSucursal.findOne({
        where: {
          id_detalle_compra,
          id_sucursal: sucursal_id,
        },
        transaction: t,
      });

      if (!loteStock) {
        throw new Error(
          `No existe stock_sucursal para id_detalle_compra ${id_detalle_compra}`,
        );
      }

      const stockAnterior = loteStock.stock;
      loteStock.stock += cantidad;
      await loteStock.save({ transaction: t });

      const lotesStockDespues = await StockSucursal.findAll({
        where: {
          id_detalle_compra,
          id_sucursal: sucursal_id,
        },
        transaction: t,
      });
      const totalDespues = lotesStockDespues.reduce((sum, row) => sum + Number(row.stock), 0);
      console.log(
        `📊 STOCK DESPUÉS DEVOLVER lote ${id_detalle_compra} sucursal ${sucursal_id} (total ${totalDespues}):`,
        lotesStockDespues.map((l) => ({
          id_stock: l.id_stock,
          stock: l.stock,
          id_detalle_compra: l.id_detalle_compra,
          id_sucursal: l.id_sucursal,
        })),
      );

      console.log(`📈 STOCK ACTUALIZADO: Lote ${id_detalle_compra} - ${stockAnterior} → ${loteStock.stock} (+${cantidad}); total lote/branch ${totalAntes} → ${totalDespues}`);
    }

    // ==========================================================
    // 4) PROCESAR RECIBIDOS (DESCONTAR STOCK POR FIFO)
    // ==========================================================
    console.log('📦 PROCESANDO RECIBIDOS:', recibido);
    for (const item of recibido) {
      const { producto_id, cantidad, precio_unitario } = item;

      let qtyToDiscount = cantidad;
      console.log(`➖ RECIBIENDO: Producto ${producto_id}, Cantidad ${cantidad} (total a descontar)`);

      const lotes = await StockSucursal.findAll({
        include: [
          {
            model: DetalleCompra,
            as: 'sucursalDetalleToCompra',
            where: {
              producto_id,
            },
          },
        ],
        where: {
          id_sucursal: sucursal_id,
          stock: { [Op.gt]: 0 },
        },
        order: [
          [
            { model: DetalleCompra, as: 'sucursalDetalleToCompra' },
            'createdAt',
            'ASC',
          ],
        ],
        transaction: t,
      });

      const totalDisponible = lotes.reduce((sum, row) => sum + Number(row.stock), 0);
      console.log(
        `📊 LOTES DISPONIBLES PARA RECIBIR producto ${producto_id} sucursal ${sucursal_id} (total disponible ${totalDisponible}):`,
        lotes.map((l) => ({
          id_stock: l.id_stock,
          id_detalle_compra: l.id_detalle_compra,
          stock: l.stock,
          id_sucursal: l.id_sucursal,
        })),
      );

      if (!lotes.length) {
        throw new Error(`No hay stock disponible para producto ${producto_id}`);
      }

      // Procesar lote por lote y crear un DetalleCambio por cada lote
      for (const lote of lotes) {
        if (qtyToDiscount <= 0) break;

        const descontar = Math.min(lote.stock, qtyToDiscount);
        const stockAnterior = lote.stock;

        console.log(`🔄 PROCESANDO LOTE: ID ${lote.id_detalle_compra}, Stock disponible ${lote.stock}, Descontando ${descontar}`);

        // 4.1 Crear registro en DetalleCambio por cada lote usado
        const detalleCambioCreado = await DetalleCambio.create(
          {
            id_cambio: cambio.id_cambio,
            producto_id,
            cantidad: descontar,
            precio_unitario,
            tipo: 'recibe',
            id_detalle_compra: lote.id_detalle_compra,
            id_cliente: req.id_cliente,
            correlativo: await getNextCorrelative(req.id_cliente, 'detalle_cambio', t),
          },
          { transaction: t },
        );

        console.log(`✅ DetalleCambio RECIBIDO creado ID: ${detalleCambioCreado.id_detalle_cambio} para lote ${lote.id_detalle_compra}`);

        // 4.2 Los productos entregados NO se agregan como líneas de la venta
        //     de diferencia: esa venta representa solo el dinero cobrado y
        //     sus renglones tienen que sumar su total. El producto entregado
        //     queda registrado en DetalleCambio (4.1) y de ahí sale su
        //     trazabilidad en el historial y en los listados.

        // 4.3 Descontar del lote
        lote.stock -= descontar;
        qtyToDiscount -= descontar;

        await lote.save({ transaction: t });

        console.log(`📉 STOCK DESCONTADO: Lote ${lote.id_detalle_compra} - ${stockAnterior} → ${lote.stock} (-${descontar})`);
      }

      if (qtyToDiscount > 0) {
        throw new Error(
          `Stock insuficiente para completar el cambio del producto ${producto_id}`,
        );
      }
    }

    const productosAfectados = [
      ...new Set([
        ...devuelto.map((item) => item.producto_id),
        ...recibido.map((item) => item.producto_id),
      ]),
    ];

    if (productosAfectados.length > 0) {
      const resumenFinal = await StockSucursal.findAll({
        include: [
          {
            model: DetalleCompra,
            as: 'sucursalDetalleToCompra',
            where: {
              producto_id: productosAfectados,
            },
          },
        ],
        where: {
          id_sucursal: sucursal_id,
        },
        transaction: t,
      });

      console.log(
        '📋 STOCK FINAL PARA PRODUCTOS AFECTADOS EN SUCURSAL',
        sucursal_id,
        resumenFinal.map((l) => ({
          id_stock: l.id_stock,
          id_detalle_compra: l.id_detalle_compra,
          producto_id: l.sucursalDetalleToCompra?.producto_id,
          stock: l.stock,
        })),
      );
    }

    // ==========================================================
    // 5) MARCAR VENTA ORIGINAL COMO MODIFICADA
    // ==========================================================
    const ventaOriginal = await Ventas.findByPk(id_venta_original, {
      transaction: t,
    });
    if (ventaOriginal) {
      ventaOriginal.tiene_cambios = true;
      await ventaOriginal.save({ transaction: t });
    }

    // ==========================================================
    // 5) CONFIRMAR TRANSACCIÓN
    // ==========================================================
    await t.commit();

    console.log('✅ CAMBIO COMPLETADO EXITOSAMENTE:', {
      cambio_id: cambio.id_cambio,
      id_venta_diferencia,
      devueltos: devuelto?.length || 0,
      recibidos: recibido?.length || 0,
      totalDevuelto,
      totalRecibido,
      diferenciaACobrar,
      diferenciaFavorComercio,
    });

    res.json({
      ok: true,
      message:
        diferenciaFavorComercio > 0
          ? `Cambio registrado. Diferencia a favor del comercio: ${diferenciaFavorComercio}`
          : diferenciaACobrar > 0
            ? `Cambio registrado. Se cobraron ${diferenciaACobrar} por la diferencia`
            : 'Cambio registrado correctamente',
      cambio_id: cambio.id_cambio,
      id_venta_diferencia, // null si no hubo cobro
      total_devuelto: totalDevuelto,
      total_recibido: totalRecibido,
      diferencia_a_cobrar: diferenciaACobrar,
      diferencia_favor_comercio: diferenciaFavorComercio,
      total_compensado: totalCompensado,
    });
  } catch (error) {
    await t.rollback();
    console.error('Error registrarCambioProducto:', error);
    res.status(500).json({
      ok: false,
      message: 'Error al registrar el cambio',
      error: error.message,
    });
  }
};
module.exports = { registrarCambioProducto };
