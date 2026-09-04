const fs = require('fs');
const path = require('path');

const INPUT_FILE = 'C:\\Users\\gfleo\\Downloads\\amor_up.sql';
const OUTPUT_FILE = path.join(__dirname, '..', 'migrations', '007_migrate_amor_data.sql');
const ID_CLIENTE = 1;

const TABLE_COLUMNS = {
  sucursales: ['id_sucursal', 'nombre', 'domicilio', 'localidad', 'provincia', 'contacto', 'celular', 'id_cliente'],
  usuarios: ['id_usuario', 'nombre', 'password', 'salt', 'rol', 'createdAt', 'updatedAt', 'id_sucursal', 'id_cliente', 'activo'],
  proveedores: ['id_proveedor', 'nombre', 'direccion', 'telefono', 'contacto', 'email', 'createdAt', 'updatedAt', 'id_cliente'],
  productos: ['id_producto', 'codigo', 'nombre', 'marca', 'modelo', 'talle', 'color', 'costo', 'porcentaje', 'precio_venta', 'observaciones', 'createdAt', 'updatedAt', 'id_cliente', 'activo'],
  tipoventa: ['id_tipo', 'tipoVenta', 'porcentajeVenta', 'createdAt', 'updatedAt', 'habilitado', 'id_cliente', 'tipo_porcentaje', 'color'],
  tipoGastos: ['id_tipogasto', 'tipoGasto', 'createdAt', 'updatedAt', 'id_cliente'],
  compras: ['id_compra', 'fecha', 'monto', 'numero', 'createdAt', 'updatedAt', 'proveedor_id', 'id_usuario', 'id_cliente'],
  detallecompras: ['id_detalle', 'nombreProducto', 'cantidad', 'costo', 'vencimiento', 'createdAt', 'updatedAt', 'compra_id', 'producto_id', 'id_cliente'],
  stock_sucursal: ['id_stock', 'stock', 'id_detalle_compra', 'id_sucursal', 'id_cliente'],
  ventas: ['id_venta', 'fecha', 'total', 'porcentaje_aplicado', 'monto_descuento', 'id_usuario', 'id_sucursal', 'id_tipo_venta', 'tiene_cambios', 'id_cliente'],
  detalleventas: ['id_detalleventa', 'nombreProducto', 'fecha', 'cantidad', 'total', 'id_sucursal', 'id_venta', 'id_producto', 'id_detalle_compra', 'es_cambio', 'es_reversado', 'id_cambio_asociado', 'id_cliente'],
  cambios: ['id_cambio', 'fecha', 'id_venta_original', 'observaciones', 'id_venta_diferencia', 'estado', 'id_cliente'],
  detallecambios: ['id_detalle_cambio', 'id_cambio', 'tipo', 'producto_id', 'cantidad', 'precio_unitario', 'createdAt', 'updatedAt', 'reemplazado', 'id_detalle_compra', 'id_cliente'],
  gastos: ['id_gasto', 'fecha', 'monto', 'observaciones', 'createdAt', 'updatedAt', 'id_tipogasto', 'id_sucursal', 'id_cliente'],
  transferencias: ['id', 'sucursal_origen_id', 'sucursal_destino_id', 'fecha', 'id_usuario', 'id_cliente'],
  transferencia_detalles: ['id', 'transferencia_id', 'producto_id', 'nombreProducto', 'cantidad', 'lote', 'vencimiento', 'id_cliente'],
  ajuste_stock: ['id_ajuste', 'fecha', 'motivo', 'observaciones', 'id_usuario', 'id_sucursal', 'id_cliente'],
  ajuste_stock_detalle: ['id_detalle_ajuste', 'id_ajuste', 'producto_id', 'id_detalle_compra', 'cantidad', 'id_cliente'],
};

const PG_COLUMNS = {
  sucursales: ['id_sucursal', 'nombre', 'domicilio', 'localidad', 'provincia', 'contacto', 'celular'],
  usuarios: ['id_usuario', 'nombre', 'password', 'salt', 'rol', 'createdAt', 'updatedAt', 'id_sucursal'],
  proveedores: ['id_proveedor', 'nombre', 'direccion', 'telefono', 'contacto', 'email', 'createdAt', 'updatedAt'],
  productos: ['id_producto', 'codigo', 'nombre', 'marca', 'modelo', 'talle', 'color', 'costo', 'porcentaje', 'precio_venta', 'observaciones', 'createdAt', 'updatedAt'],
  tipoventa: ['id_tipo', 'tipoVenta', 'porcentajeVenta', 'createdAt', 'updatedAt', 'habilitado'],
  tipoGastos: ['id_tipogasto', 'tipoGasto', 'createdAt', 'updatedAt'],
  compras: ['id_compra', 'fecha', 'monto', 'numero', 'createdAt', 'updatedAt', 'proveedor_id', 'id_usuario'],
  detallecompras: ['id_detalle', 'nombreProducto', 'cantidad', 'costo', 'vencimiento', 'createdAt', 'updatedAt', 'compra_id', 'producto_id'],
  stock_sucursal: ['id_stock', 'stock', 'id_detalle_compra', 'id_sucursal'],
  ventas: ['id_venta', 'fecha', 'total', 'porcentaje_aplicado', 'monto_descuento', 'id_usuario', 'id_sucursal', 'id_tipo_venta', 'tiene_cambios'],
  detalleventas: ['id_detalleventa', 'nombreProducto', 'fecha', 'cantidad', 'total', 'id_sucursal', 'id_venta', 'id_producto', 'id_detalle_compra', 'es_cambio', 'es_reversado', 'id_cambio_asociado'],
  cambios: ['id_cambio', 'fecha', 'id_venta_original', 'observaciones', 'id_venta_diferencia', 'estado'],
  detallecambios: ['id_detalle_cambio', 'id_cambio', 'tipo', 'producto_id', 'cantidad', 'precio_unitario', 'createdAt', 'updatedAt', 'reemplazado', 'id_detalle_compra'],
  gastos: ['id_gasto', 'fecha', 'monto', 'observaciones', 'createdAt', 'updatedAt', 'id_tipogasto', 'id_sucursal'],
  transferencias: ['id', 'sucursal_origen_id', 'sucursal_destino_id', 'fecha', 'id_usuario'],
  transferencia_detalles: ['id', 'transferencia_id', 'producto_id', 'nombreProducto', 'cantidad', 'lote', 'vencimiento'],
  ajuste_stock: ['id_ajuste', 'fecha', 'motivo', 'observaciones', 'id_usuario', 'id_sucursal'],
  ajuste_stock_detalle: ['id_detalle_ajuste', 'id_ajuste', 'producto_id', 'id_detalle_compra', 'cantidad'],
};

const INSERT_ORDER = [
  'sucursales', 'usuarios', 'proveedores', 'productos', 'tipoventa', 'tipoGastos',
  'compras', 'detallecompras', 'stock_sucursal', 'ventas', 'detalleventas',
  'cambios', 'detallecambios', 'gastos', 'transferencias', 'transferencia_detalles',
  'ajuste_stock', 'ajuste_stock_detalle',
];

const PRIMARY_KEYS = {
  sucursales: ['id_sucursal'],
  usuarios: ['id_usuario'],
  proveedores: ['id_proveedor'],
  productos: ['id_producto'],
  tipoventa: ['id_tipo'],
  tipoGastos: ['id_tipogasto'],
  compras: ['id_compra'],
  detallecompras: ['id_detalle'],
  stock_sucursal: ['id_stock'],
  ventas: ['id_venta'],
  detalleventas: ['id_detalleventa'],
  cambios: ['id_cambio'],
  detallecambios: ['id_detalle_cambio'],
  gastos: ['id_gasto'],
  transferencias: ['id'],
  transferencia_detalles: ['id'],
  ajuste_stock: ['id_ajuste'],
  ajuste_stock_detalle: ['id_detalle_ajuste'],
};

function escapeValue(val, tableName, colName) {
  if (val === '\\N' || val === 'NULL') return 'NULL';
  if (val === 't') return '1';
  if (val === 'f') return '0';

  if (['createdAt', 'updatedAt', 'fecha', 'vencimiento'].includes(colName)) {
    if (val && val.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)) {
      // Remove timezone offset like -03 or +03:00
      val = val.replace(/[-+]\d{2}(:\d{2})?$/, '');
      // Remove milliseconds like .133
      val = val.replace(/\.\d+$/, '');
    }
  }

  if (colName === 'rol') {
    if (val === 'supervisor') return "'admin'";
    if (val === 'operador') return "'empleado'";
  }

  const numericCols = [
    'id_usuario', 'id_sucursal', 'id_proveedor', 'id_producto', 'id_tipo',
    'id_tipogasto', 'id_compra', 'id_detalle', 'id_stock', 'id_venta',
    'id_detalleventa', 'id_cambio', 'id_detalle_cambio', 'id_gasto',
    'id', 'id_ajuste', 'id_detalle_ajuste',
    'costo', 'porcentaje', 'precio_venta', 'monto', 'total',
    'porcentaje_aplicado', 'monto_descuento', 'cantidad', 'stock',
    'proveedor_id', 'compra_id', 'producto_id',
    'id_venta_original', 'id_venta_diferencia', 'id_tipo_venta',
    'id_detalle_compra', 'transferencia_id',
    'sucursal_origen_id', 'sucursal_destino_id',
  ];

  if (numericCols.includes(colName)) return val;
  val = val.replace(/'/g, "''");
  return `'${val}'`;
}

function convertTable(tableName, lines) {
  const pgCols = PG_COLUMNS[tableName];
  const saasCols = TABLE_COLUMNS[tableName];
  const pkCols = PRIMARY_KEYS[tableName];
  if (!pgCols || !saasCols || !pkCols) return '';

  const nonPkCols = saasCols.filter(col => !pkCols.includes(col));
  const updateClause = nonPkCols.map(col => `\`${col}\` = VALUES(\`${col}\`)`).join(', ');

  const inserts = [];
  for (const line of lines) {
    if (line.trim() === '' || line.startsWith('\\.')) continue;
    const pgValues = line.split('\t');
    if (pgValues.length !== pgCols.length) {
      console.error(`Row mismatch in ${tableName}: expected ${pgCols.length}, got ${pgValues.length}`);
      continue;
    }

    const allValues = {};
    pgCols.forEach((col, i) => { allValues[col] = pgValues[i]; });

    const insertValues = saasCols.map(col => {
      if (col === 'id_cliente') return ID_CLIENTE;
      if (col === 'activo' && (tableName === 'usuarios' || tableName === 'productos')) return 1;
      if (col === 'tipo_porcentaje' && tableName === 'tipoventa') return "'descuento'";
      if (col === 'color' && tableName === 'tipoventa') return "'#FF6B9D'";
      if (col in allValues) return escapeValue(allValues[col], tableName, col);
      return 'NULL';
    });

    inserts.push(`INSERT INTO ${tableName} (${saasCols.join(', ')}) VALUES (${insertValues.join(', ')}) ON DUPLICATE KEY UPDATE ${updateClause};`);
  }
  return inserts.join('\n');
}

function parseDump(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const tableData = {};
  let currentTable = null;
  let inCopy = false;

  for (const line of lines) {
    const copyMatch = line.match(/COPY public\."?([^"\s]+)"?\s*\(/);
    if (copyMatch && line.includes('FROM stdin;')) {
      currentTable = copyMatch[1].trim();
      tableData[currentTable] = [];
      inCopy = true;
      continue;
    }
    if (inCopy && line.trim() === '\\.') {
      inCopy = false;
      currentTable = null;
      continue;
    }
    if (inCopy && currentTable) {
      tableData[currentTable].push(line);
    }
  }
  return tableData;
}

function main() {
  console.log('Reading PostgreSQL dump...');
  const tableData = parseDump(INPUT_FILE);
  console.log('Tables found:', Object.keys(tableData).join(', '));

  let output = `-- Migracion: PostgreSQL (AMOR) -> MariaDB (SaaS)\n`;
  output += `-- Generado: ${new Date().toISOString().split('T')[0]}\n`;
  output += `-- Cliente ID: ${ID_CLIENTE} (Amor Infinito)\n\n`;
  output += `SET FOREIGN_KEY_CHECKS = 0;\nSET UNIQUE_CHECKS = 0;\n\n`;

  for (const tableName of INSERT_ORDER) {
    if (!tableData[tableName]) {
      console.error(`Table ${tableName} not found in dump`);
      continue;
    }
    const rowCount = tableData[tableName].length;
    console.log(`Converting ${tableName}: ${rowCount} rows`);
    output += `\n-- ${tableName} (${rowCount} rows)\n`;
    output += convertTable(tableName, tableData[tableName]);
    output += '\n';
  }

  output += `\n-- cliente_config default\n`;
  output += `INSERT INTO cliente_config (id_cliente, \`key\`, \`value\`, description) VALUES\n`;
  output += `(${ID_CLIENTE}, 'iva_porcentaje', '21', 'Porcentaje de IVA'),\n`;
  output += `(${ID_CLIENTE}, 'moneda', 'ARS', 'Codigo de moneda'),\n`;
  output += `(${ID_CLIENTE}, 'simbolo_moneda', '$', 'Simbolo de moneda'),\n`;
  output += `(${ID_CLIENTE}, 'stock_minimo_alerta', '5', 'Alertar cuando stock menor a este valor'),\n`;
  output += `(${ID_CLIENTE}, 'permitir_stock_negativo', 'false', 'Permitir ventas sin stock'),\n`;
  output += `(${ID_CLIENTE}, 'formato_fecha', 'DD/MM/YYYY', 'Formato de fecha para el frontend'),\n`;
  output += `(${ID_CLIENTE}, 'timezone', 'America/Argentina/Buenos_Aires', 'Zona horaria')\n`;
  output += `ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), \`description\` = VALUES(\`description\`);\n\n`;

  output += `SET UNIQUE_CHECKS = 1;\nSET FOREIGN_KEY_CHECKS = 1;\n`;

  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
  console.log(`\nScript generated: ${OUTPUT_FILE}`);
  console.log(`Total lines: ${output.split('\n').length}`);
}

main();
