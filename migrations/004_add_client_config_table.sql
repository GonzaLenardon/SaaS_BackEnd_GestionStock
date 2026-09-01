-- ============================================================================
-- MIGRACIÓN: Crear tabla cliente_config (key-value por cliente)
-- MySQL/MariaDB
-- ============================================================================
CREATE TABLE IF NOT EXISTS cliente_config (
  id_config INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente INT NOT NULL,
  `key` VARCHAR(100) NOT NULL,
  `value` TEXT NOT NULL,
  description VARCHAR(255),
  UNIQUE KEY uk_cliente_key (id_cliente, `key`),
  FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Configuraciones por defecto para el cliente principal
INSERT IGNORE INTO cliente_config (id_cliente, `key`, `value`, description)
SELECT c.id_cliente, t.`key`, t.`value`, t.description
FROM clientes c
CROSS JOIN (
  SELECT 'iva_porcentaje' AS `key`, '21' AS `value`, 'Porcentaje de IVA' AS description
  UNION ALL SELECT 'moneda', 'ARS', 'Código de moneda'
  UNION ALL SELECT 'simbolo_moneda', '$', 'Símbolo de moneda'
  UNION ALL SELECT 'stock_minimo_alerta', '5', 'Alertar cuando stock menor a este valor'
  UNION ALL SELECT 'permitir_stock_negativo', 'false', 'Permitir ventas sin stock'
  UNION ALL SELECT 'formato_fecha', 'DD/MM/YYYY', 'Formato de fecha para el frontend'
  UNION ALL SELECT 'timezone', 'America/Argentina/Buenos_Aires', 'Zona horaria'
) t
WHERE c.id_cliente IS NOT NULL
LIMIT 1;

CREATE INDEX IF NOT EXISTS idx_cliente_config_id_cliente ON cliente_config(id_cliente);
