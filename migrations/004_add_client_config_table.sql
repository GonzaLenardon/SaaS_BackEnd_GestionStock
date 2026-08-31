-- ============================================================================
-- MIGRACIÓN: Crear tabla cliente_config (key-value por cliente)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cliente_config (
  id_config SERIAL PRIMARY KEY,
  id_cliente INTEGER NOT NULL REFERENCES clientes(id_cliente),
  key VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  description VARCHAR(255),
  UNIQUE(id_cliente, key)
);

-- Configuraciones por defecto para el cliente principal
DO $$
DECLARE
  v_id_cliente INTEGER;
BEGIN
  SELECT id_cliente INTO v_id_cliente FROM clientes LIMIT 1;
  IF v_id_cliente IS NOT NULL THEN
    INSERT INTO cliente_config (id_cliente, key, value, description) VALUES
      (v_id_cliente, 'iva_porcentaje', '21', 'Porcentaje de IVA'),
      (v_id_cliente, 'moneda', 'ARS', 'Código de moneda'),
      (v_id_cliente, 'simbolo_moneda', '$', 'Símbolo de moneda'),
      (v_id_cliente, 'stock_minimo_alerta', '5', 'Alertar cuando stock menor a este valor'),
      (v_id_cliente, 'permitir_stock_negativo', 'false', 'Permitir ventas sin stock'),
      (v_id_cliente, 'formato_fecha', 'DD/MM/YYYY', 'Formato de fecha para el frontend'),
      (v_id_cliente, 'timezone', 'America/Argentina/Buenos_Aires', 'Zona horaria')
    ON CONFLICT (id_cliente, key) DO NOTHING;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cliente_config_id_cliente ON cliente_config(id_cliente);
