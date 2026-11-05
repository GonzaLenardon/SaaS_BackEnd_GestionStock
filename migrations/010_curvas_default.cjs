'use strict';

// Migracion: Curvas de talles estandar por cliente (Letras y Numerica)
// Se ejecuta con `npm run db:migrate` (sequelize-cli). El control de
// archivos aplicados queda en la tabla SequelizeMeta.
// Convertido desde 010_curvas_default.sql.

const SQL = `-- Migracion: Curvas de talles estandar por cliente
-- Generado: 2026-10-31
--
-- Objetivo:
--   Cada cliente tiene su propia copia de las 2 curvas de convencion:
--     - "Letras"   : S, M, L, Xl, 2Xl, 3Xl, 4Xl
--     - "Numerica" : 36, 38, 40, 42, 44, 46, 48, 50, 52
--   Se crean para los clientes que todavia no las tienen. Cada cliente puede
--   extenderlas (un 34, un 54, un 5Xl...) sin afectar a los demas.

SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Crear las curvas que falten
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO \`curvas\` (\`nombre\`, \`descripcion\`, \`id_cliente\`, \`activo\`, \`created_at\`, \`updated_at\`)
SELECT 'Letras', 'Curva de letras estandar. Se puede extender (5Xl, 6Xl...)', c.\`id_cliente\`, 1, NOW(), NOW()
FROM \`clientes\` c
WHERE c.\`activo\` = 1
  AND NOT EXISTS (
    SELECT 1 FROM \`curvas\` cu
    WHERE cu.\`nombre\` = 'Letras' AND cu.\`id_cliente\` = c.\`id_cliente\`
  );

INSERT INTO \`curvas\` (\`nombre\`, \`descripcion\`, \`id_cliente\`, \`activo\`, \`created_at\`, \`updated_at\`)
SELECT 'Numerica', 'Curva numerica estandar, de 2 en 2 desde el 36. Se puede extender (34, 54, 56...)', c.\`id_cliente\`, 1, NOW(), NOW()
FROM \`clientes\` c
WHERE c.\`activo\` = 1
  AND NOT EXISTS (
    SELECT 1 FROM \`curvas\` cu
    WHERE cu.\`nombre\` = 'Numerica' AND cu.\`id_cliente\` = c.\`id_cliente\`
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Cargar los talles de cada curva
-- ─────────────────────────────────────────────────────────────────────────────
-- Letras: S, M, L, Xl, 2Xl, 3Xl, 4Xl
INSERT IGNORE INTO \`curva_talles\` (\`id_curva\`, \`talle\`, \`orden\`)
SELECT cu.\`id_curva\`, t.\`talle\`, t.\`orden\`
FROM \`curvas\` cu
JOIN (
  SELECT 'S'   AS \`talle\`, 0 AS \`orden\` UNION ALL
  SELECT 'M',   1 UNION ALL
  SELECT 'L',   2 UNION ALL
  SELECT 'Xl',  3 UNION ALL
  SELECT '2Xl', 4 UNION ALL
  SELECT '3Xl', 5 UNION ALL
  SELECT '4Xl', 6
) t
WHERE cu.\`nombre\` = 'Letras'
  AND cu.\`id_cliente\` IS NOT NULL;

-- Numerica: 36, 38, 40, 42, 44, 46, 48, 50, 52
INSERT IGNORE INTO \`curva_talles\` (\`id_curva\`, \`talle\`, \`orden\`)
SELECT cu.\`id_curva\`, t.\`talle\`, t.\`orden\`
FROM \`curvas\` cu
JOIN (
  SELECT '36' AS \`talle\`, 0 AS \`orden\` UNION ALL
  SELECT '38',  1 UNION ALL
  SELECT '40',  2 UNION ALL
  SELECT '42',  3 UNION ALL
  SELECT '44',  4 UNION ALL
  SELECT '46',  5 UNION ALL
  SELECT '48',  6 UNION ALL
  SELECT '50',  7 UNION ALL
  SELECT '52',  8
) t
WHERE cu.\`nombre\` = 'Numerica'
  AND cu.\`id_cliente\` IS NOT NULL;

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
