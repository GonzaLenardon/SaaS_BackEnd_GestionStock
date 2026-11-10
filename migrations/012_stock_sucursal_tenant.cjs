'use strict';

// Migracion: consistencia de stock_sucursal (tenant y lotes duplicados)
// Se ejecuta con `npm run db:migrate` (sequelize-cli). El control de
// archivos aplicados queda en la tabla SequelizeMeta.
//
// Pasos (idempotentes):
//   1. Backfill: stock_sucursal.id_cliente NULL se completa desde
//      detallecompras.id_cliente (siempre no nulo).
//   2. Fusion de duplicados: filas con el mismo (id_sucursal, id_detalle_compra)
//      se consolidan en la de menor id_stock, sumando el stock.
//   3. UNIQUE(id_sucursal, id_detalle_compra) para impedir nuevos duplicados.
//
// Nota: MySQL hace commit implicito en DDL (CREATE/ALTER/DROP), asi que la
// migracion no es atomica completa. Requiere backup previo.

const TABLA_TMP = 'tmp_stock_sucursal_grupos';
const INDICE = 'uq_stock_sucursal_lote';

module.exports = {
  up: async (queryInterface) => {
    const sequelize = queryInterface.sequelize;
    const q = (sql) => sequelize.query(sql);

    // 1. Backfill de id_cliente
    await q(`
      UPDATE stock_sucursal ss
      JOIN detallecompras dc ON dc.id_detalle = ss.id_detalle_compra
      SET ss.id_cliente = dc.id_cliente
      WHERE ss.id_cliente IS NULL
        AND dc.id_cliente IS NOT NULL
    `);

    // 2. Fusion de duplicados
    await q(`DROP TABLE IF EXISTS \`${TABLA_TMP}\``);
    await q(`
      CREATE TABLE \`${TABLA_TMP}\` AS
      SELECT id_sucursal,
             id_detalle_compra,
             MIN(id_stock) AS keep_id,
             SUM(stock)    AS total
      FROM stock_sucursal
      WHERE id_detalle_compra IS NOT NULL
      GROUP BY id_sucursal, id_detalle_compra
      HAVING COUNT(*) > 1
    `);

    // Sumar el total en la fila sobreviviente
    await q(`
      UPDATE stock_sucursal s
      JOIN \`${TABLA_TMP}\` g ON s.id_stock = g.keep_id
      SET s.stock = g.total
    `);

    // Borrar el resto de las filas del grupo
    await q(`
      DELETE s FROM stock_sucursal s
      JOIN \`${TABLA_TMP}\` g
        ON s.id_sucursal = g.id_sucursal
       AND s.id_detalle_compra = g.id_detalle_compra
       AND s.id_stock <> g.keep_id
    `);

    await q(`DROP TABLE IF EXISTS \`${TABLA_TMP}\``);

    // 3. UNIQUE, solo si todavia no existe
    const [indices] = await q(`
      SELECT 1 FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'stock_sucursal'
        AND index_name = '${INDICE}'
      LIMIT 1
    `);

    if (!indices || indices.length === 0) {
      await q(`
        ALTER TABLE stock_sucursal
        ADD UNIQUE KEY \`${INDICE}\` (id_sucursal, id_detalle_compra)
      `);
    }
  },

  down: async () => {
    // No reversible: la fusion de filas no se puede deshacer sin backup.
  },
};
