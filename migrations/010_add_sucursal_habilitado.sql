-- Migracion: Agregar campo habilitado a sucursales
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS habilitado BOOLEAN DEFAULT true;
UPDATE sucursales SET habilitado = true WHERE habilitado IS NULL;
