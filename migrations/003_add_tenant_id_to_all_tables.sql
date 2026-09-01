-- ============================================================================
-- MIGRACIÓN: Agregar id_cliente a todas las tablas de negocio
-- MySQL/MariaDB - SAFE / IDEMPOTENTE
-- ============================================================================

-- Agregar columna id_cliente donde no exista
ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS id_cliente INT NOT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS id_cliente INT DEFAULT NULL;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS id_cliente INT DEFAULT NULL;
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS id_cliente INT DEFAULT NULL;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS id_cliente INT DEFAULT NULL;
ALTER TABLE detallecompras ADD COLUMN IF NOT EXISTS id_cliente INT DEFAULT NULL;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS id_cliente INT DEFAULT NULL;
ALTER TABLE detalleventas ADD COLUMN IF NOT EXISTS id_cliente INT DEFAULT NULL;
ALTER TABLE stock_sucursal ADD COLUMN IF NOT EXISTS id_cliente INT DEFAULT NULL;
ALTER TABLE cambios ADD COLUMN IF NOT EXISTS id_cliente INT DEFAULT NULL;
ALTER TABLE detallecambios ADD COLUMN IF NOT EXISTS id_cliente INT DEFAULT NULL;
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS id_cliente INT DEFAULT NULL;
ALTER TABLE tipoGastos ADD COLUMN IF NOT EXISTS id_cliente INT DEFAULT NULL;
ALTER TABLE tipoventa ADD COLUMN IF NOT EXISTS id_cliente INT DEFAULT NULL;
ALTER TABLE transferencias ADD COLUMN IF NOT EXISTS id_cliente INT DEFAULT NULL;
ALTER TABLE transferencia_detalles ADD COLUMN IF NOT EXISTS id_cliente INT DEFAULT NULL;
ALTER TABLE ajuste_stock ADD COLUMN IF NOT EXISTS id_cliente INT DEFAULT NULL;
ALTER TABLE ajuste_stock_detalle ADD COLUMN IF NOT EXISTS id_cliente INT DEFAULT NULL;


-- ============================================================================
-- ÍNDICES PARA MULTI-TENANT
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_usuarios_id_cliente ON usuarios(id_cliente);
CREATE INDEX IF NOT EXISTS idx_sucursales_id_cliente ON sucursales(id_cliente);
CREATE INDEX IF NOT EXISTS idx_productos_id_cliente ON productos(id_cliente);
CREATE INDEX IF NOT EXISTS idx_proveedores_id_cliente ON proveedores(id_cliente);
CREATE INDEX IF NOT EXISTS idx_compras_id_cliente ON compras(id_cliente);
CREATE INDEX IF NOT EXISTS idx_detallecompras_id_cliente ON detallecompras(id_cliente);
CREATE INDEX IF NOT EXISTS idx_ventas_id_cliente ON ventas(id_cliente);
CREATE INDEX IF NOT EXISTS idx_detalleventas_id_cliente ON detalleventas(id_cliente);
CREATE INDEX IF NOT EXISTS idx_stock_sucursal_id_cliente ON stock_sucursal(id_cliente);
CREATE INDEX IF NOT EXISTS idx_cambios_id_cliente ON cambios(id_cliente);
CREATE INDEX IF NOT EXISTS idx_detallecambios_id_cliente ON detallecambios(id_cliente);
CREATE INDEX IF NOT EXISTS idx_gastos_id_cliente ON gastos(id_cliente);
CREATE INDEX IF NOT EXISTS idx_tipoGastos_id_cliente ON tipoGastos(id_cliente);
CREATE INDEX IF NOT EXISTS idx_tipoventa_id_cliente ON tipoventa(id_cliente);
CREATE INDEX IF NOT EXISTS idx_transferencias_id_cliente ON transferencias(id_cliente);
CREATE INDEX IF NOT EXISTS idx_ajuste_stock_id_cliente ON ajuste_stock(id_cliente);
