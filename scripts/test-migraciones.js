'use strict';

// Base de datos sintetica para probar las migraciones en Linux (GitHub
// Actions). Reproduce el caso que fallo en produccion: en Linux MariaDB
// distingue mayusculas de minusculas (lower_case_table_names = 0), asi que
// la tabla se llama 'tipoGastos' y no 'tipogastos'.
//
// NO usar datos reales: el repositorio es publico. Los tenants son ficticios.
//
// Uso:
//   node scripts/test-migraciones.js preparar    // crea el esquema y los datos
//   node scripts/test-migraciones.js verificar   // comprueba el resultado

require('dotenv').config();

const sequelize = require('../db/conection');
const { QueryTypes } = require('sequelize');

// Requiere los modelos: es lo que los registra en la instancia de Sequelize
// para que sync() sepa que tablas crear.
require('../models');

// Consulta SQL. Para SELECT devuelve las filas; para el resto solo ejecuta.
const q = async (sql) => {
  if (/^\s*(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE)/i.test(sql)) {
    await sequelize.query(sql);
    return [];
  }
  return sequelize.query(sql, { type: QueryTypes.SELECT });
};

const TIENDA_LEGACY = 1; // datos historicos: ve el id interno
const TIENDA_PROPIA = 2; // numeracion propia: ve el correlativo

const preparar = async () => {
  console.log('Creando el esquema desde los modelos...');
  await sequelize.sync();

  // Verificar como quedo el nombre de la tabla de tipo de gasto: es el
  // punto que falla en Linux si el nombre no coincide exactamente.
  const tablas = await q(`
    SELECT TABLE_NAME AS nombre
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE '%tipo%'
  `);
  console.log('  Tablas de tipo:', tablas.map((t) => t.nombre).join(', '));

  // En produccion el indice unico NO existia: por eso se pudieron crear
  // 498 grupos de filas duplicadas. Se saca para reproducir ese estado y
  // que la migracion 012 sea la que fusione los duplicados y lo cree.
  // Las FK usan ese indice (es el unico que empieza por id_sucursal), asi
  // que primero se sacan las dos FK, despues el indice, y las FK se vuelven
  // a crear con SET NULL, como estaban en produccion.
  await q('ALTER TABLE stock_sucursal DROP FOREIGN KEY stock_sucursal_ibfk_1');
  await q('ALTER TABLE stock_sucursal DROP FOREIGN KEY stock_sucursal_ibfk_2');
  await q('ALTER TABLE stock_sucursal DROP INDEX uq_stock_sucursal_lote');
  await q(`
    ALTER TABLE stock_sucursal
    ADD CONSTRAINT stock_sucursal_ibfk_1
    FOREIGN KEY (id_detalle_compra) REFERENCES detallecompras (id_detalle)
    ON DELETE SET NULL ON UPDATE CASCADE
  `);
  await q(`
    ALTER TABLE stock_sucursal
    ADD CONSTRAINT stock_sucursal_ibfk_2
    FOREIGN KEY (id_sucursal) REFERENCES sucursales (id_sucursal)
    ON DELETE SET NULL ON UPDATE CASCADE
  `);
  console.log('  Indice unico de stock_sucursal: quitado (estado de produccion).');

  console.log('Cargando datos de prueba...');

  await q(`
    INSERT INTO clientes (id_cliente, razon_social, created_at, updated_at)
    VALUES
      (${TIENDA_LEGACY}, 'Tienda Legacy', NOW(), NOW()),
      (${TIENDA_PROPIA}, 'Tienda Propia', NOW(), NOW())
  `);

  await q(`
    INSERT INTO sucursales
      (id_sucursal, nombre, domicilio, localidad, provincia, contacto, celular,
       id_cliente)
    VALUES
      (1, 'Sucursal Legacy', 'Calle 1', 'Localidad', 'Provincia', 'Contacto', '111', ${TIENDA_LEGACY}),
      (2, 'Sucursal Propia', 'Calle 2', 'Localidad', 'Provincia', 'Contacto', '222', ${TIENDA_PROPIA})
  `);

  await q(`
    INSERT INTO tipoventa
      (id_tipo, tipoVenta, porcentajeVenta, tipo_porcentaje, habilitado, color,
       id_cliente, createdAt, updatedAt)
    VALUES
      (1, 'Contado', 0, 'descuento', 1, '#FF6B9D', ${TIENDA_PROPIA}, NOW(), NOW())
  `);

  await q(`
    INSERT INTO usuarios
      (id_usuario, nombre, password, salt, rol, id_cliente, id_sucursal, activo,
       createdAt, updatedAt)
    VALUES
      (1, 'adminlegacy', 'hash', 'salt', 'admin', ${TIENDA_LEGACY}, 1, 1, NOW(), NOW()),
      (2, 'adminpropio', 'hash', 'salt', 'admin', ${TIENDA_PROPIA}, 2, 1, NOW(), NOW())
  `);

  // Tienda legacy: correlativo NULL en las ventas (nunca se numeraron).
  await q(`
    INSERT INTO ventas
      (id_venta, fecha, total, porcentaje_aplicado, monto_descuento, id_usuario,
       id_sucursal, id_cliente, id_tipo_venta)
    VALUES
      (10, NOW(), 100, 0, 0, 1, 1, ${TIENDA_LEGACY}, 1),
      (11, NOW(), 200, 0, 0, 1, 1, ${TIENDA_LEGACY}, 1),
      (12, NOW(), 300, 0, 0, 1, 1, ${TIENDA_LEGACY}, 1)
  `);

  // Tienda propia: todo numerado de punta a punta (1..N), como en produccion.
  await q(`
    INSERT INTO ventas
      (id_venta, fecha, total, porcentaje_aplicado, monto_descuento, id_usuario,
       id_sucursal, id_cliente, correlativo, id_tipo_venta)
    VALUES
      (20, NOW(), 100, 0, 0, 2, 2, ${TIENDA_PROPIA}, 1, 1),
      (21, NOW(), 200, 0, 0, 2, 2, ${TIENDA_PROPIA}, 2, 1),
      (22, NOW(), 300, 0, 0, 2, 2, ${TIENDA_PROPIA}, 3, 1)
  `);

  await q(`
    INSERT INTO productos
      (id_producto, nombre, marca, modelo, talle, color, costo, porcentaje,
       precio_venta, id_cliente, activo, correlativo, createdAt, updatedAt)
    VALUES
      (100, 'Producto Legacy', 'Marca', 'Modelo', 'M', 'Negro', 10, 0, 20, ${TIENDA_LEGACY}, 1, NULL, NOW(), NOW()),
      (101, 'Producto Legacy 2', 'Marca', 'Modelo', 'M', 'Negro', 10, 0, 20, ${TIENDA_LEGACY}, 1, NULL, NOW(), NOW()),
      (200, 'Producto Propio', 'Marca', 'Modelo', 'M', 'Negro', 10, 0, 20, ${TIENDA_PROPIA}, 1, 1, NOW(), NOW()),
      (201, 'Producto Propio 2', 'Marca', 'Modelo', 'M', 'Negro', 10, 0, 20, ${TIENDA_PROPIA}, 1, 2, NOW(), NOW()),
      (202, 'Producto Propio 3', 'Marca', 'Modelo', 'M', 'Negro', 10, 0, 20, ${TIENDA_PROPIA}, 1, 3, NOW(), NOW())
  `);

  await q(`
    INSERT INTO compras
      (id_compra, fecha, monto, numero, id_usuario, id_cliente, correlativo,
       createdAt, updatedAt)
    VALUES
      (30, NOW(), 500, 'F1', 2, ${TIENDA_PROPIA}, 1, NOW(), NOW()),
      (31, NOW(), 600, 'F2', 2, ${TIENDA_PROPIA}, 2, NOW(), NOW())
  `);

  await q(`
    INSERT INTO detallecompras
      (id_detalle, compra_id, producto_id, cantidad, costo, nombreProducto,
       vencimiento, id_cliente, createdAt, updatedAt)
    VALUES
      (300, 30, 200, 5, 100, 'Producto Propio', NOW(), ${TIENDA_PROPIA}, NOW(), NOW()),
      (301, 31, 201, 3, 200, 'Producto Propio 2', NOW(), ${TIENDA_PROPIA}, NOW(), NOW())
  `);

  // Lotes con stock: uno normal, uno duplicado (debe fusionarse) y filas
  // huerfanas sin lote (deben borrarse).
  await q(`
    INSERT INTO stock_sucursal (id_stock, stock, id_sucursal, id_detalle_compra, id_cliente)
    VALUES
      (400, 5, 2, 300, ${TIENDA_PROPIA}),
      (401, 2, 2, 300, ${TIENDA_PROPIA}),
      (402, 3, 2, 301, ${TIENDA_PROPIA}),
      (403, 99, 2, NULL, NULL),
      (404, 98, 2, NULL, NULL)
  `);

  // Contadores initiales: la tienda propia ya venia numerando.
  await q(`
    INSERT INTO correlativos
      (id_cliente, entity_type, last_number, createdAt, updatedAt)
    VALUES
      (${TIENDA_PROPIA}, 'ventas', 3, NOW(), NOW()),
      (${TIENDA_PROPIA}, 'productos', 3, NOW(), NOW()),
      (${TIENDA_PROPIA}, 'compra', 2, NOW(), NOW())
  `);

  console.log('Datos de prueba cargados.');
  console.log(`  Tienda legacy (${TIENDA_LEGACY}): 3 ventas sin correlativo, 2 productos sin correlativo.`);
  console.log(`  Tienda propia (${TIENDA_PROPIA}): 3 ventas (1..3), 3 productos (1..3), 2 compras (1..2).`);
  console.log('  Stock: 1 lote duplicado (5+2), 1 lote normal (3), 2 filas huerfanas (99+98).');
};

const verificar = async () => {
  const errores = [];
  const ok = [];

  const chequear = (condicion, mensaje) => {
    if (condicion) ok.push(mensaje);
    else errores.push(mensaje);
  };

  // 1. El flag quedo puesto segun el tipo de tienda.
  const flags = await q(`
    SELECT id_cliente, value FROM cliente_config
    WHERE \`key\` = 'numeracion_por_correlativo'
  `);
  const flagLegacy = flags.find((f) => f.id_cliente === TIENDA_LEGACY);
  const flagPropio = flags.find((f) => f.id_cliente === TIENDA_PROPIA);

  chequear(
    flagLegacy && flagLegacy.value === 'false',
    `Tienda legacy con flag 'false' (se ve el id interno).`,
  );
  chequear(
    flagPropio && flagPropio.value === 'true',
    `Tienda propia con flag 'true' (se ve el correlativo).`,
  );

  // 2. La tienda legacy NO fue renumerada.
  const legacy = await q(`
    SELECT COUNT(*) AS n, SUM(correlativo IS NOT NULL) AS con_numero
    FROM ventas WHERE id_cliente = ${TIENDA_LEGACY}
  `);
  chequear(
    Number(legacy[0].con_numero) === 0,
    `Tienda legacy sin tocar: sus ${legacy[0].n} ventas siguen sin correlativo.`,
  );

  // 3. La tienda propia quedo numerada 1..N sin huecos.
  for (const [tabla, etiqueta] of [
    ['ventas', 'ventas'],
    ['productos', 'productos'],
    ['compras', 'compras'],
  ]) {
    const r = await q(`
      SELECT COUNT(*) AS n, MIN(correlativo) AS mn, MAX(correlativo) AS mx,
             COUNT(DISTINCT correlativo) AS distintos
      FROM \`${tabla}\` WHERE id_cliente = ${TIENDA_PROPIA}
    `);
    chequear(
      Number(r[0].mn) === 1 &&
        Number(r[0].mx) === Number(r[0].n) &&
        Number(r[0].distintos) === Number(r[0].n),
      `${etiqueta} de la tienda propia numeradas 1..${r[0].n} sin huecos ni repetidos.`,
    );
  }

  // 4. Los contadores quedaron alineados con el maximo real.
  const contadores = await q(`
    SELECT entity_type, last_number FROM correlativos
    WHERE id_cliente = ${TIENDA_PROPIA}
  `);
  const ventas = contadores.find((c) => c.entity_type === 'ventas');
  const productos = contadores.find((c) => c.entity_type === 'productos');
  const compras = contadores.find((c) => c.entity_type === 'compra');
  chequear(Number(ventas?.last_number) === 3, 'Contador de ventas en 3.');
  chequear(Number(productos?.last_number) === 3, 'Contador de productos en 3.');
  chequear(Number(compras?.last_number) === 2, 'Contador de compras en 2.');

  // 5. Se borraron las filas de stock sin lote.
  const huerfanas = await q(
    'SELECT COUNT(*) AS n FROM stock_sucursal WHERE id_detalle_compra IS NULL',
  );
  chequear(Number(huerfanas[0].n) === 0, 'Filas de stock sin lote borradas.');

  // 6. Los lotes duplicados se fusionaron y el indice unico quedo activo.
  const dup = await q(`
    SELECT COUNT(*) AS n FROM (
      SELECT id_sucursal, id_detalle_compra FROM stock_sucursal
      WHERE id_detalle_compra IS NOT NULL
      GROUP BY id_sucursal, id_detalle_compra HAVING COUNT(*) > 1
    ) x
  `);
  chequear(Number(dup[0].n) === 0, 'Sin lotes duplicados.');

  const stockFusionado = await q(
    'SELECT stock FROM stock_sucursal WHERE id_detalle_compra = 300',
  );
  chequear(
    stockFusionado.length === 1 && Number(stockFusionado[0].stock) === 7,
    `Lote duplicado fusionado en una fila con 5+2=7 unidades (obtenido: ${
      stockFusionado[0]?.stock
    }).`,
  );

  const indices = await q(`
    SELECT INDEX_NAME AS nombre, NON_UNIQUE AS nu FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_sucursal'
      AND INDEX_NAME = 'uq_stock_sucursal_lote'
  `);
  chequear(
    indices.length > 0 && Number(indices[0].nu) === 0,
    'Indice unico uq_stock_sucursal_lote activo.',
  );

  // 7. La FK quedo en RESTRICT.
  const fks = await q(`
    SELECT CONSTRAINT_NAME AS nombre, DELETE_RULE AS regla
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_sucursal'
      AND CONSTRAINT_NAME LIKE '%ibfk%'
  `);
  const reglas = fks.map((f) => f.regla);
  chequear(
    reglas.includes('RESTRICT'),
    `FK de stock_sucursal en RESTRICT (reglas: ${reglas.join(', ')}).`,
  );

  console.log('\n=== RESULTADOS ===');
  for (const m of ok) console.log(`  OK    ${m}`);
  for (const m of errores) console.log(`  FALLA ${m}`);

  console.log(`\n${ok.length} correctos, ${errores.length} fallos.`);

  if (errores.length > 0) process.exit(1);
};

(async () => {
  const modo = process.argv[2];
  if (modo === 'preparar') {
    await preparar();
  } else if (modo === 'verificar') {
    await verificar();
  } else {
    console.error('Uso: node scripts/test-migraciones.js preparar|verificar');
    process.exit(1);
  }
  process.exit(0);
})().catch((error) => {
  console.error('ERROR:', error.message);
  if (error.parent) {
    console.error('  detalle:', error.parent.sqlMessage || error.parent.message);
  }
  if (error.errors) {
    for (const e of error.errors) {
      console.error('  campo:', e.path, '->', e.message);
    }
  }
  process.exit(1);
});
