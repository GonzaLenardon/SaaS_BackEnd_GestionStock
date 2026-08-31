-- Migración: Agregar campo 'color' a la tabla tipoventas
-- Cada tipo de venta puede tener un color asociado para gráficos

-- PostgreSQL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tipoventas' AND column_name = 'color'
  ) THEN
    ALTER TABLE tipoventas ADD COLUMN color VARCHAR(7) DEFAULT '#FF6B9D';
  END IF;
END $$;
