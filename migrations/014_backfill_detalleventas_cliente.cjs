'use strict';

// Migracion: backfill de detalleventas.id_cliente.
// Las lineas "Diferencia por cambio" y los productos recibidos de la venta
// de diferencia se creaban sin id_cliente (multi-tenant). Se rellenan desde
// la venta padre. Idempotente: solo toca las filas NULL.
// Respaldo previo: backups/detalleventas_sin_cliente_*.sql.

module.exports = {
  up: async (queryInterface) => {
    const sequelize = queryInterface.sequelize;

    await sequelize.query(`
      UPDATE detalleventas dv
      JOIN ventas v ON v.id_venta = dv.id_venta
      SET dv.id_cliente = v.id_cliente
      WHERE dv.id_cliente IS NULL
        AND v.id_cliente IS NOT NULL
    `);
  },

  down: async () => {
    // No reversible sin respaldo (el valor original era NULL).
  },
};
