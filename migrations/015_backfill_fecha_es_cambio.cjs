'use strict';

// Migracion: corregir la fecha de las lineas "recibidas" de las ventas de
// diferencia (detalleventas.es_cambio = 1).
//
// Esas lineas se creaban sin `fecha`, asi que usaban el defaultValue NOW del
// servidor (UTC) mientras el resto de la base guarda hora Argentina (UTC-3):
// quedaron con 3 horas de desfase respecto de su venta.
//
// Idempotente: solo toca filas con fecha distinta a la de su venta.
// Respaldo previo: backups/detalleventas_es_cambio_fecha_*.sql

module.exports = {
  up: async (queryInterface) => {
    const sequelize = queryInterface.sequelize;

    await sequelize.query(`
      UPDATE detalleventas dv
      JOIN ventas v ON v.id_venta = dv.id_venta
      SET dv.fecha = v.fecha
      WHERE dv.es_cambio = 1
        AND dv.fecha <> v.fecha
    `);
  },

  down: async () => {
    // No reversible sin respaldo (el valor original era UTC).
  },
};
