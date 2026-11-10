'use strict';

const { QueryTypes } = require('sequelize');

// Migracion: corregir ajuste_stock.fecha que se guardaba en UTC (+3h vs la
// hora Argentina que usa el resto de la base). El modelo tenia
// defaultValue: DataTypes.NOW que materializa new Date() (UTC).
//
// Evidencia de que las filas estan en UTC: con el desfase de -3h las 57
// filas caen todas dentro de 09:00-23:59 Argentina (ventana continua de
// negocio), mientras que tal cual quedan trabajos a las 00:00-02:59 y nada
// entre las 03:00-11:00.
//
// Idempotente via tabla migraciones_control: el corrimiento se aplica una
// sola vez aunque alguien re-ejecute el SQL a mano (SequelizeMeta solo
// protege a npm run db:migrate).
// Respaldo previo: backups/ajuste_stock_*.sql

module.exports = {
  up: async (queryInterface) => {
    const sequelize = queryInterface.sequelize;
    const q = (sql) => sequelize.query(sql);

    await q(`
      CREATE TABLE IF NOT EXISTS \`migraciones_control\` (
        \`clave\` VARCHAR(60) NOT NULL,
        \`aplicado_en\` DATETIME NOT NULL,
        PRIMARY KEY (\`clave\`)
      )
    `);

    const [aplicada] = await sequelize.query(
      `SELECT clave FROM migraciones_control WHERE clave = '016_ajuste_fecha_utc'`,
      { type: QueryTypes.SELECT },
    );

    if (aplicada) return;

    await q(`UPDATE ajuste_stock SET fecha = DATE_SUB(fecha, INTERVAL 3 HOUR)`);

    await q(
      `INSERT INTO migraciones_control (clave, aplicado_en)
       VALUES ('016_ajuste_fecha_utc', NOW())`,
    );
  },

  down: async () => {
    // No reversible sin respaldo (valores originales en backups/ajuste_stock_*.sql).
  },
};
