const { QueryTypes } = require('sequelize');
const db = require('./db/conection');

async function rollbackCambio(idCambio) {
  const transaction = await db.transaction();

  try {
    // =========================================================
    // 1) OBTENER CAMBIO
    // =========================================================
    const [cambio] = await db.query(
      'SELECT * FROM cambios WHERE id_cambio = $1',
      {
        bind: [idCambio],
        type: QueryTypes.SELECT,
        transaction,
      },
    );

    if (!cambio) {
      throw new Error(`No existe cambio con id_cambio=${idCambio}`);
    }

    console.log('🔄 Rollback de cambio detectado:', cambio);

    // =========================================================
    // 2) OBTENER VENTA ORIGINAL
    // =========================================================
    const [ventaOriginal] = await db.query(
      'SELECT * FROM ventas WHERE id_venta = $1',
      {
        bind: [cambio.id_venta_original],
        type: QueryTypes.SELECT,
        transaction,
      },
    );

    if (!ventaOriginal) {
      throw new Error(
        `No existe venta original con id_venta=${cambio.id_venta_original}`,
      );
    }

    const idSucursal = ventaOriginal.id_sucursal;

    console.log('🏪 Sucursal original:', idSucursal);

    // =========================================================
    // 3) OBTENER DETALLES DEL CAMBIO
    // =========================================================
    const detalleCambios = await db.query(
      'SELECT * FROM detallecambios WHERE id_cambio = $1 ORDER BY id_detalle_cambio ASC',
      {
        bind: [idCambio],
        type: QueryTypes.SELECT,
        transaction,
      },
    );

    console.log(`📦 Detalles encontrados: ${detalleCambios.length}`);

    if (!detalleCambios.length) {
      throw new Error(
        `No existen registros en detallecambios para id_cambio=${idCambio}`,
      );
    }

    // =========================================================
    // 4) RECORRER DETALLES Y REVERTIR STOCK
    // =========================================================
    for (const detalle of detalleCambios) {
      console.log(
        `🔁 Procesando detalle ${detalle.id_detalle_cambio} | tipo=${detalle.tipo} | producto=${detalle.producto_id}`,
      );

      // =====================================================
      // DEVUELVE
      // Se había SUMADO stock -> ahora RESTAR
      // =====================================================
      if (detalle.tipo === 'devuelve') {
        const stockUpdated = await db.query(
          `
          UPDATE stock_sucursal
          SET stock = stock - $1
          WHERE id_detalle_compra = $2
          AND id_sucursal = $3
          RETURNING *
          `,
          {
            bind: [detalle.cantidad, detalle.id_detalle_compra, idSucursal],
            type: QueryTypes.UPDATE,
            transaction,
          },
        );

        console.log('➖ Revirtiendo DEVUELVE:', detalle.id_detalle_compra);

        // Restaurar detalleventa original
        await db.query(
          `
          UPDATE detalleventas
          SET es_reversado = false,
              id_cambio_asociado = NULL
          WHERE id_cambio_asociado = $1
          `,
          {
            bind: [detalle.id_detalle_cambio],
            type: QueryTypes.UPDATE,
            transaction,
          },
        );
      }

      // =====================================================
      // RECIBE
      // Se había RESTADO stock -> ahora SUMAR
      // =====================================================
      if (detalle.tipo === 'recibe') {
        await db.query(
          `
          UPDATE stock_sucursal
          SET stock = stock + $1
          WHERE id_detalle_compra = $2
          AND id_sucursal = $3
          `,
          {
            bind: [detalle.cantidad, detalle.id_detalle_compra, idSucursal],
            type: QueryTypes.UPDATE,
            transaction,
          },
        );

        console.log('➕ Revirtiendo RECIBE:', detalle.id_detalle_compra);

        // Eliminar detalleventa generado por el cambio
        await db.query(
          `
          DELETE FROM detalleventas
          WHERE id_cambio_asociado = $1
          `,
          {
            bind: [detalle.id_detalle_cambio],
            transaction,
          },
        );
      }
    }

    // =========================================================
    // 5) ELIMINAR VENTA DIFERENCIA
    // =========================================================
    if (cambio.id_venta_diferencia) {
      console.log(
        `🗑 Eliminando venta diferencia ${cambio.id_venta_diferencia}`,
      );

      await db.query(
        `
        DELETE FROM detalleventas
        WHERE id_venta = $1
        `,
        {
          bind: [cambio.id_venta_diferencia],
          transaction,
        },
      );

      await db.query(
        `
        DELETE FROM ventas
        WHERE id_venta = $1
        `,
        {
          bind: [cambio.id_venta_diferencia],
          transaction,
        },
      );
    }

    // =========================================================
    // 6) ELIMINAR DETALLECAMBIOS
    // =========================================================
    await db.query(
      `
      DELETE FROM detallecambios
      WHERE id_cambio = $1
      `,
      {
        bind: [idCambio],
        transaction,
      },
    );

    console.log('🗑 detallecambios eliminados');

    // =========================================================
    // 7) ELIMINAR CAMBIO
    // =========================================================
    await db.query(
      `
      DELETE FROM cambios
      WHERE id_cambio = $1
      `,
      {
        bind: [idCambio],
        transaction,
      },
    );

    console.log('🗑 cambio eliminado');

    // =========================================================
    // 8) VERIFICAR SI QUEDAN MÁS CAMBIOS
    // =========================================================
    const cambiosRestantes = await db.query(
      `
      SELECT COUNT(*)::int AS total
      FROM cambios
      WHERE id_venta_original = $1
      `,
      {
        bind: [cambio.id_venta_original],
        type: QueryTypes.SELECT,
        transaction,
      },
    );

    const totalRestantes = cambiosRestantes[0]?.total || 0;

    if (totalRestantes === 0) {
      await db.query(
        `
        UPDATE ventas
        SET tiene_cambios = false
        WHERE id_venta = $1
        `,
        {
          bind: [cambio.id_venta_original],
          type: QueryTypes.UPDATE,
          transaction,
        },
      );

      console.log('✅ Venta original marcada sin cambios');
    }

    // =========================================================
    // 9) COMMIT
    // =========================================================
    await transaction.commit();

    console.log(`✅ Rollback completado correctamente para cambio ${idCambio}`);

    return true;
  } catch (error) {
    await transaction.rollback();

    console.error('❌ Error rollback:', error);

    throw error;
  }
}

module.exports = rollbackCambio;
