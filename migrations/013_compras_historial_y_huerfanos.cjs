'use strict';

// Migracion: auditoria de compras y limpieza de stock huerfano.
// Se ejecuta con `npm run db:migrate` (sequelize-cli).
//
// 1. Crea compras_historial (auditoria de ediciones y eliminaciones).
// 2. Borra filas de stock_sucursal sin lote (id_detalle_compra IS NULL).
//    Quedaron de compras eliminadas antes de que eliminarCompra borrara el
//    stock (FK ON DELETE SET NULL). No aparecen en listados ni se pueden
//    vender. Antes de borrar se verifica que ninguna referencia otra tabla.
//    Respaldo previo: backups/filas_sin_lote_*.sql.

module.exports = {
  up: async (queryInterface) => {
    const sequelize = queryInterface.sequelize;
    const q = (sql) => sequelize.query(sql);

    await q(`
      CREATE TABLE IF NOT EXISTS \`compras_historial\` (
        \`id_historial\` INT NOT NULL AUTO_INCREMENT,
        \`id_compra\` INT NOT NULL,
        \`accion\` VARCHAR(20) NOT NULL,
        \`id_usuario\` INT NULL,
        \`id_cliente\` INT NULL,
        \`antes\` LONGTEXT NULL,
        \`despues\` LONGTEXT NULL,
        \`fecha\` DATETIME NULL,
        PRIMARY KEY (\`id_historial\`),
        KEY \`idx_compras_historial_compra\` (\`id_compra\`)
      )
    `);

    // Ninguna tabla tiene FK a stock_sucursal.id_stock, y las filas sin lote
    // tienen id_detalle_compra NULL: no pueden estar referenciadas.
    await q(`DELETE FROM stock_sucursal WHERE id_detalle_compra IS NULL`);
  },

  down: async () => {
    // No reversible: las filas borradas estan en backups/filas_sin_lote_*.sql.
  },
};
