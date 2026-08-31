-- ============================================================================
-- MIGRACIÓN: Crear tabla clientes
-- ============================================================================
CREATE TABLE IF NOT EXISTS clientes (
  id_cliente SERIAL PRIMARY KEY,
  razon_social VARCHAR(255) NOT NULL,
  cuit VARCHAR(20) UNIQUE,
  email VARCHAR(255),
  telefono VARCHAR(50),
  logo_url VARCHAR(500),
  dominio VARCHAR(100) UNIQUE,
  color_primario VARCHAR(7) NOT NULL DEFAULT '#1a73e8',
  color_secundario VARCHAR(7) NOT NULL DEFAULT '#34a853',
  color_terciario VARCHAR(7) NOT NULL DEFAULT '#ea4335',
  color_fondo VARCHAR(7) NOT NULL DEFAULT '#ffffff',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar cliente de ejemplo solo si la tabla está vacía (idempotente)
INSERT INTO clientes (razon_social, activo, created_at, updated_at)
SELECT 'Cliente Principal', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM clientes);
