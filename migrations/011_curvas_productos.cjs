'use strict';

// Migracion: Vincular productos existentes con su curva de talles
// Se ejecuta con `npm run db:migrate` (sequelize-cli). El control de
// archivos aplicados queda en la tabla SequelizeMeta.
// Convertido desde 011_curvas_productos.sql.

const SQL = `-- Migracion: Vincular los productos existentes con su curva de talles
-- Generado: 2026-10-31
--
-- Objetivo:
--   La curva de un producto se deduce de su talle. Esta migracion vincula
--   los productos que ya tenian cargados con la curva a la que pertenecen,
--   para que la funcion "agregar uno, algunos o toda la curva" funcione
--   desde el primer dia.
--
--   Solo se vinculan los productos cuyo talle pertenece a UNA sola curva
--   (HAVING COUNT(DISTINCT id_curva) = 1): si el talle esta en varias, se
--   deja sin curva para que el usuario la elija al editar el producto.

SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;

UPDATE \`productos\` p
JOIN (
  SELECT p2.\`id_producto\`, MIN(ct.\`id_curva\`) AS \`id_curva\`
  FROM \`productos\` p2
  JOIN \`curva_talles\` ct ON ct.\`talle\` = p2.\`talle\`
  JOIN \`curvas\` c
    ON c.\`id_curva\` = ct.\`id_curva\`
   AND c.\`id_cliente\` = p2.\`id_cliente\`
  GROUP BY p2.\`id_producto\`
  HAVING COUNT(DISTINCT ct.\`id_curva\`) = 1
) m ON m.\`id_producto\` = p.\`id_producto\`
SET p.\`id_curva\` = m.\`id_curva\`
WHERE p.\`id_curva\` IS NULL;

SET UNIQUE_CHECKS = 1;
SET FOREIGN_KEY_CHECKS = 1;
`;

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(SQL);
  },

  down: async () => {
    // No reversible: las tablas y los datos creados pueden tener
    // contenido. Para deshacer, revertir manualmente con respaldo previo.
  },
};
