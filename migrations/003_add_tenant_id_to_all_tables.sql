-- ============================================================================
-- MIGRACIÓN: Agregar id_cliente a todas las tablas de negocio
-- SAFE / IDEMPOTENTE - Puede ejecutarse múltiples veces sin romper
-- ============================================================================

-- Obtener el id_cliente del cliente de ejemplo
DO $$
DECLARE
  v_id_cliente INTEGER;
BEGIN
  SELECT id_cliente INTO v_id_cliente FROM clientes LIMIT 1;
  IF v_id_cliente IS NULL THEN
    RAISE EXCEPTION 'No existe ningún cliente. Ejecutar primero 002_create_clientes_table.sql';
  END IF;

  -- Sucursales
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sucursales' AND column_name='id_cliente') THEN
    ALTER TABLE sucursales ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE sucursales SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
    ALTER TABLE sucursales ALTER COLUMN id_cliente SET NOT NULL;
  END IF;

  -- Usuarios
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='id_cliente') THEN
    ALTER TABLE usuarios ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE usuarios SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
  END IF;

  -- Productos
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='productos' AND column_name='id_cliente') THEN
    ALTER TABLE productos ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE productos SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
  END IF;

  -- Proveedores
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proveedores' AND column_name='id_cliente') THEN
    ALTER TABLE proveedores ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE proveedores SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
  END IF;

  -- Compras
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='compras' AND column_name='id_cliente') THEN
    ALTER TABLE compras ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE compras SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
  END IF;

  -- Detallecompras
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='detallecompras' AND column_name='id_cliente') THEN
    ALTER TABLE detallecompras ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE detallecompras SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
  END IF;

  -- Ventas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ventas' AND column_name='id_cliente') THEN
    ALTER TABLE ventas ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE ventas SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
  END IF;

  -- Detalleventas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='detalleventas' AND column_name='id_cliente') THEN
    ALTER TABLE detalleventas ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE detalleventas SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
  END IF;

  -- Stock_sucursal
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_sucursal' AND column_name='id_cliente') THEN
    ALTER TABLE stock_sucursal ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE stock_sucursal SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
  END IF;

  -- Cambios
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cambios' AND column_name='id_cliente') THEN
    ALTER TABLE cambios ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE cambios SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
  END IF;

  -- Detallecambios
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='detallecambios' AND column_name='id_cliente') THEN
    ALTER TABLE detallecambios ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE detallecambios SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
  END IF;

  -- Gastos
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='id_cliente') THEN
    ALTER TABLE gastos ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE gastos SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
  END IF;

  -- TipoGastos
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tipoGastos' AND column_name='id_cliente') THEN
    ALTER TABLE "tipoGastos" ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE "tipoGastos" SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
  END IF;

  -- Tipoventa
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tipoventa' AND column_name='id_cliente') THEN
    ALTER TABLE tipoventa ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE tipoventa SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
  END IF;

  -- Transferencias
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transferencias' AND column_name='id_cliente') THEN
    ALTER TABLE transferencias ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE transferencias SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
  END IF;

  -- Transferencia_detalles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transferencia_detalles' AND column_name='id_cliente') THEN
    ALTER TABLE transferencia_detalles ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE transferencia_detalles SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
  END IF;

  -- Ajuste_stock
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ajuste_stock' AND column_name='id_cliente') THEN
    ALTER TABLE ajuste_stock ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE ajuste_stock SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
  END IF;

  -- Ajuste_stock_detalle
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ajuste_stock_detalle' AND column_name='id_cliente') THEN
    ALTER TABLE ajuste_stock_detalle ADD COLUMN id_cliente INTEGER REFERENCES clientes(id_cliente);
    UPDATE ajuste_stock_detalle SET id_cliente = v_id_cliente WHERE id_cliente IS NULL;
  END IF;

END $$;

-- ============================================================================
-- ÍNDICES PARA MULTI-TENANT (mejoran performance de queries filtradas)
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
CREATE INDEX IF NOT EXISTS idx_tipoGastos_id_cliente ON "tipoGastos"(id_cliente);
CREATE INDEX IF NOT EXISTS idx_tipoventa_id_cliente ON tipoventa(id_cliente);
CREATE INDEX IF NOT EXISTS idx_transferencias_id_cliente ON transferencias(id_cliente);
CREATE INDEX IF NOT EXISTS idx_ajuste_stock_id_cliente ON ajuste_stock(id_cliente);
