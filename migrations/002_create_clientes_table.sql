-- ============================================================================
-- MIGRACIÓN: Crear tabla clientes
-- MySQL/MariaDB
-- ============================================================================
CREATE TABLE IF NOT EXISTS clientes (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
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
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar cliente de ejemplo solo si la tabla está vacía
INSERT IGNORE INTO clientes (razon_social, activo, created_at, updated_at)
SELECT 'Cliente Principal', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM clientes);
