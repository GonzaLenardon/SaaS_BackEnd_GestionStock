-- ============================================================================
-- MIGRACIÓN: Cambiar constraint UNIQUE de usuarios
-- De UNIQUE(nombre) global a UNIQUE(nombre, id_cliente) por cliente
-- ============================================================================

-- 1. Eliminar el constraint UNIQUE viejo sobre 'nombre' si existe
DO $$
BEGIN
  -- Buscar y eliminar constraints UNIQUE que solo tengan 'nombre'
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'usuarios'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 1
  ) THEN
    -- Obtener el nombre del constraint dinámicamente
    EXECUTE (
      SELECT 'ALTER TABLE usuarios DROP CONSTRAINT ' || conname
      FROM pg_constraint
      WHERE conrelid = 'usuarios'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 1
      LIMIT 1
    );
    RAISE NOTICE 'Constraint UNIQUE sobre nombre eliminado';
  ELSE
    RAISE NOTICE 'No se encontro constraint UNIQUE solo sobre nombre';
  END IF;
END $$;

-- 2. Crear constraint compuesto UNIQUE(nombre, id_cliente) si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'usuarios'::regclass
    AND contype = 'u'
    AND conname = 'uq_nombre_cliente'
  ) THEN
    ALTER TABLE usuarios ADD CONSTRAINT uq_nombre_cliente UNIQUE (nombre, id_cliente);
    RAISE NOTICE 'Constraint compuesto uq_nombre_cliente creado';
  ELSE
    RAISE NOTICE 'Constraint uq_nombre_cliente ya existe';
  END IF;
END $$;
