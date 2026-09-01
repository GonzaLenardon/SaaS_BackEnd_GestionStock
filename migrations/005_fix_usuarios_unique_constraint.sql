-- ============================================================================
-- MIGRACIÓN: Cambiar constraint UNIQUE de usuarios
-- De UNIQUE(nombre) global a UNIQUE(nombre, id_cliente) por cliente
-- MySQL/MariaDB
-- ============================================================================

-- 1. Eliminar constraints UNIQUE que solo tengan 'nombre'
SET @drop_sql = (
  SELECT CONCAT('ALTER TABLE usuarios DROP INDEX `', kcu.constraint_name, '`')
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = DATABASE()
    AND tc.table_name = 'usuarios'
    AND tc.constraint_type = 'UNIQUE'
  GROUP BY kcu.constraint_name
  HAVING COUNT(*) = 1
  LIMIT 1
);

SET @drop_sql2 = IF(@drop_sql IS NOT NULL, @drop_sql, 'SELECT 1');
PREPARE stmt FROM @drop_sql2;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Crear constraint compuesto UNIQUE(nombre, id_cliente)
ALTER TABLE usuarios ADD CONSTRAINT uq_nombre_cliente UNIQUE (nombre, id_cliente);
