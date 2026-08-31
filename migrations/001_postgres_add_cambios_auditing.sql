-- ============================================================================
-- MIGRACIÓN: Auditoría para flujo de cambios
-- SAFE / IDEMPOTENTE
-- Puede ejecutarse múltiples veces sin romper
-- ============================================================================


-- ============================================================================
-- 1) TABLA: detalleventas
-- ============================================================================

ALTER TABLE detalleventas
ADD COLUMN IF NOT EXISTS es_cambio BOOLEAN DEFAULT FALSE;

ALTER TABLE detalleventas
ADD COLUMN IF NOT EXISTS es_reversado BOOLEAN DEFAULT FALSE;

ALTER TABLE detalleventas
ADD COLUMN IF NOT EXISTS id_cambio_asociado INTEGER DEFAULT NULL;

ALTER TABLE detalleventas
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE detalleventas
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;


-- Backfill datos históricos
UPDATE detalleventas
SET es_cambio = FALSE
WHERE es_cambio IS NULL;

UPDATE detalleventas
SET es_reversado = FALSE
WHERE es_reversado IS NULL;

UPDATE detalleventas
SET "createdAt" = CURRENT_TIMESTAMP
WHERE "createdAt" IS NULL;

UPDATE detalleventas
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE "updatedAt" IS NULL;



-- ============================================================================
-- 2) TABLA: cambios
-- ============================================================================

ALTER TABLE cambios
ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'activo';

ALTER TABLE cambios
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE cambios
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;


-- Backfill datos históricos
UPDATE cambios
SET estado = 'activo'
WHERE estado IS NULL;

UPDATE cambios
SET "createdAt" = CURRENT_TIMESTAMP
WHERE "createdAt" IS NULL;

UPDATE cambios
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE "updatedAt" IS NULL;



-- ============================================================================
-- 3) TABLA: ventas
-- ============================================================================

ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS tiene_cambios BOOLEAN DEFAULT FALSE;

ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;


-- Backfill datos históricos
UPDATE ventas
SET tiene_cambios = FALSE
WHERE tiene_cambios IS NULL;

UPDATE ventas
SET "createdAt" = CURRENT_TIMESTAMP
WHERE "createdAt" IS NULL;

UPDATE ventas
SET "updatedAt" = CURRENT_TIMESTAMP
WHERE "updatedAt" IS NULL;



-- ============================================================================
-- 4) ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_detalleventas_es_cambio
ON detalleventas(es_cambio);

CREATE INDEX IF NOT EXISTS idx_detalleventas_es_reversado
ON detalleventas(es_reversado);

CREATE INDEX IF NOT EXISTS idx_cambios_estado
ON cambios(estado);

CREATE INDEX IF NOT EXISTS idx_ventas_tiene_cambios
ON ventas(tiene_cambios);



-- ============================================================================
-- FIN MIGRACIÓN
-- ============================================================================