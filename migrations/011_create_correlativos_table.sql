-- ============================================================================
-- MIGRACION: Crear tabla correlativos para numeracion per-tenant
-- MySQL/MariaDB - SAFE / IDEMPOTENTE
-- ============================================================================

CREATE TABLE IF NOT EXISTS correlativos (
  id_correlativo INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT NOT NULL,
  entity_type VARCHAR(50) NOT NULL COMMENT 'Nombre de la tabla: ventas, compra, productos, etc.',
  last_number INT NOT NULL DEFAULT 0 COMMENT 'Ultimo correlativo asignado para esta entidad y tenant',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_correlativo_cliente_entity (id_cliente, entity_type),
  INDEX idx_correlativos_cliente (id_cliente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
