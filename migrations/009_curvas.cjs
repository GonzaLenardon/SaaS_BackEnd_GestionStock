'use strict';

// Migracion: Curvas de talles + vinculo producto-curva + alias de codigos
// Se ejecuta con `npm run db:migrate` (sequelize-cli). El control de
// archivos aplicados queda en la tabla SequelizeMeta.
// Convertido desde 009_curvas.sql.

const SQL = `-- Migracion: Curvas de talles + vinculo producto-curva + alias de codigos
-- Generado: 2026-10-29
--
-- Objetivo:
--   1. Curvas: catalogo de curvas de talles por tenant (ej: S-M-L, 30-50)
--   2. Curva talles: talles que pertenecen a una curva (se guarda la lista expandida)
--   3. productos.id_curva: vincula un producto con la curva a la que pertenece
--   4. producto_codigos: historial de codigos de barras anteriores (alias)
--      para que las etiquetas ya impresas sigan funcionando aunque el codigo
--      se regenere al editar el nombre/marca/talle del producto.

SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CURVAS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS \`curvas\` (
  \`id_curva\`    INT(11)      NOT NULL AUTO_INCREMENT,
  \`nombre\`      VARCHAR(100) NOT NULL,
  \`descripcion\` VARCHAR(255) NULL,
  \`id_cliente\`  INT(11)      NULL,
  \`activo\`      TINYINT(1)   NOT NULL DEFAULT 1,
  \`created_at\`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id_curva\`),
  UNIQUE KEY \`uq_curvas_nombre_cliente\` (\`nombre\`, \`id_cliente\`),
  KEY \`idx_curvas_cliente\` (\`id_cliente\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CURVA TALLES
--    Se guarda la lista EXPANDIDA: una curva "30 a 50 paso 2" tiene 11 filas.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS \`curva_talles\` (
  \`id_curva_talle\` INT(11)     NOT NULL AUTO_INCREMENT,
  \`id_curva\`       INT(11)     NOT NULL,
  \`talle\`          VARCHAR(20) NOT NULL,
  \`orden\`          INT(11)     NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id_curva_talle\`),
  UNIQUE KEY \`uq_curva_talles_curva_talle\` (\`id_curva\`, \`talle\`),
  KEY \`idx_curva_talles_curva\` (\`id_curva\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PRODUCTO CODIGOS (alias)
--    Codigos de barras anteriores de un producto. Si el codigo se regenera
--    (p.ej. se corrigio el nombre), el anterior queda aca y sigue resolviendo
--    al producto en las busquedas.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS \`producto_codigos\` (
  \`id_codigo\`   INT(11)     NOT NULL AUTO_INCREMENT,
  \`id_producto\` INT(11)     NOT NULL,
  \`id_cliente\`  INT(11)     NULL,
  \`codigo\`      VARCHAR(50) NOT NULL,
  \`created_at\`  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id_codigo\`),
  UNIQUE KEY \`uq_producto_codigos_cliente_codigo\` (\`id_cliente\`, \`codigo\`),
  KEY \`idx_producto_codigos_producto\` (\`id_producto\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. VINCULO PRODUCTO -> CURVA
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE \`productos\` ADD COLUMN IF NOT EXISTS \`id_curva\` INT(11) NULL;

SET UNIQUE_CHECKS = 1;
SET FOREIGN_KEY_CHECKS = 1;
`;

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(SQL);

    // CREATE INDEX sin IF NOT EXISTS: si ya existe se ignora,
    // igual que hacia scripts/run-migration.js (filtro "Duplicate").
    try {
      await queryInterface.sequelize.query(`CREATE INDEX \`idx_productos_curva\` ON \`productos\` (\`id_curva\`);`);
    } catch (err) {
      if (!/duplicate key/i.test(err.message || '')) throw err;
    }
  },

  down: async () => {
    // No reversible: las tablas y los datos creados pueden tener
    // contenido. Para deshacer, revertir manualmente con respaldo previo.
  },
};
