-- Migración: Agregar campo 'color' a la tabla tipoventa
-- MySQL/MariaDB

ALTER TABLE tipoventa ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#FF6B9D';
