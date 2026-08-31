const Productos = require('../models/productos');
const Ventas = require('../models/ventas');
const DetalleVentas = require('../models/detalleVentas');
const Proveedores = require('../models/proveedores');
const Usuarios = require('../models/usuarios');
const Compra = require('../models/compra');
const DetalleCompra = require('../models/detalleCompra');
const TipoVenta = require('../models/tipo_venta');
const Sucursal = require('../models/sucursal');
const Transferencia = require('../models/transferencia');
const TransferenciaDetalle = require('../models/detalleTransferencia');
const Gastos = require('../models/gastos');
const TipoGastos = require('../models/tipoGastos');
const StockSucursal = require('./stocksucursal');
const Cambio = require('./cambio');
const DetalleCambio = require('./detallecambio');
const AjusteStock = require('./ajusteStock');
const AjusteStockDetalle = require('./ajusteStockDetalles');
const Clientes = require('./clientes');
const ClienteConfig = require('./clienteConfig');

// Relación: Una venta tiene muchos detalles de venta

Usuarios.hasMany(Ventas, { foreignKey: 'id_usuario', as: 'ventas' });
Ventas.belongsTo(Usuarios, { foreignKey: 'id_usuario', as: 'usuario' });

Ventas.belongsTo(Sucursal, { foreignKey: 'id_sucursal', as: 'sucursal' });
Sucursal.hasMany(Ventas, { foreignKey: 'id_sucursal', as: 'ventas' });

TipoVenta.hasMany(Ventas, { foreignKey: 'id_tipo_venta', as: 'ventas' });
Ventas.belongsTo(TipoVenta, { foreignKey: 'id_tipo_venta', as: 'tipoVenta' });

Ventas.hasMany(DetalleVentas, { foreignKey: 'id_venta', as: 'detalles' });

DetalleVentas.belongsTo(Ventas, { foreignKey: 'id_venta', as: 'venta' });

Productos.hasMany(DetalleVentas, { foreignKey: 'id_producto', as: 'ventas' });
DetalleVentas.belongsTo(Productos, {
  foreignKey: 'id_producto',
  as: 'producto',
});

DetalleCompra.hasMany(DetalleVentas, {
  foreignKey: 'id_detalle_compra',
  as: 'detalle_ventas',
});
DetalleVentas.belongsTo(DetalleCompra, {
  foreignKey: 'id_detalle_compra',
  as: 'detalle_compra',
});

Proveedores.hasMany(Compra, { foreignKey: 'proveedor_id', as: 'compras' });
Compra.belongsTo(Proveedores, { foreignKey: 'proveedor_id', as: 'proveedor' });

Compra.hasMany(DetalleCompra, { foreignKey: 'compra_id', as: 'detalles' });
DetalleCompra.belongsTo(Compra, { foreignKey: 'compra_id', as: 'compra' });

Productos.hasMany(DetalleCompra, { foreignKey: 'producto_id', as: 'compras' });
DetalleCompra.belongsTo(Productos, {
  foreignKey: 'producto_id',
  as: 'producto',
});

// Transferencia tiene muchos detalles
Transferencia.hasMany(TransferenciaDetalle, {
  foreignKey: 'transferencia_id',
  as: 'detalles',
});
TransferenciaDetalle.belongsTo(Transferencia, {
  foreignKey: 'transferencia_id',
  as: 'transferencia',
});

// Cada detalle transferencia pertenece a un producto
Productos.hasMany(TransferenciaDetalle, {
  foreignKey: 'producto_id',
  as: 'transferencias',
});
TransferenciaDetalle.belongsTo(Productos, {
  foreignKey: 'producto_id',
  as: 'producto',
});

TipoGastos.hasMany(Gastos, { foreignKey: 'id_tipogasto', as: 'gastos' });
Gastos.belongsTo(TipoGastos, { foreignKey: 'id_tipogasto', as: 'tipogasto' });

DetalleCompra.hasMany(StockSucursal, {
  foreignKey: 'id_detalle_compra',
  as: 'detalleCompraToSucursal',
});

StockSucursal.belongsTo(DetalleCompra, {
  foreignKey: 'id_detalle_compra',
  as: 'sucursalDetalleToCompra',
});

Sucursal.hasMany(StockSucursal, {
  foreignKey: 'id_sucursal',
  as: 'sucursalToStockSucursal',
});
StockSucursal.belongsTo(Sucursal, {
  foreignKey: 'id_sucursal',
  as: 'stockSucursalToSucursal',
});

Usuarios.hasMany(Compra, { foreignKey: 'id_usuario', as: 'usuarioToCompras' });
Compra.belongsTo(Usuarios, { foreignKey: 'id_usuario', as: 'compraToUsuario' });

Usuarios.hasMany(Transferencia, {
  foreignKey: 'id_usuario',
  as: 'usuarioToTransferencia',
});
Transferencia.belongsTo(Usuarios, {
  foreignKey: 'id_usuario',
  as: 'transferenciaToUsuario',
});

Usuarios.belongsTo(Sucursal, { foreignKey: 'id_sucursal', as: 'sucursal' });
Sucursal.hasMany(Usuarios, { foreignKey: 'id_sucursal', as: 'usuarios' });

Sucursal.hasMany(DetalleVentas, {
  foreignKey: 'id_sucursal',
  as: 'sucursalToDetalleVentas',
});

DetalleVentas.belongsTo(Sucursal, {
  foreignKey: 'id_sucursal',
  as: 'detalleVentasToSucursal',
});

Gastos.belongsTo(Sucursal, {
  foreignKey: 'id_sucursal',
  as: 'sucursal',
});

Sucursal.hasMany(Gastos, {
  foreignKey: 'id_sucursal',
  as: 'gastos',
});

DetalleCambio.belongsTo(Cambio, {
  foreignKey: 'id_cambio',
  as: 'cambio',
});

/* ********************************************************************   */

Ventas.hasMany(Cambio, {
  foreignKey: 'id_venta_original',
  as: 'ventacambio', // 👈 Este alias debe coincidir con tu include
});

// Cambio pertenece a una venta original
Cambio.belongsTo(Ventas, {
  foreignKey: 'id_venta_original',
  as: 'ventaOriginal',
});

// Cambio tiene muchos DetalleCambio
Cambio.hasMany(DetalleCambio, {
  foreignKey: 'id_cambio',
  as: 'cambiodetalles',
});

DetalleCambio.belongsTo(Productos, {
  foreignKey: 'producto_id',
  as: 'detallecambioproducto',
});

Productos.hasMany(DetalleCambio, {
  foreignKey: 'producto_id',
  as: 'productoendetallecambio',
});

DetalleCompra.hasMany(DetalleCambio, {
  foreignKey: 'id_detalle_compra',
  as: 'cambios',
});

DetalleCambio.belongsTo(DetalleCompra, {
  foreignKey: 'id_detalle_compra',
  as: 'detalleCompra',
});

Sucursal.hasMany(AjusteStock, {
  foreignKey: 'id_sucursal',
  as: 'ajustesStock',
});

AjusteStock.belongsTo(Sucursal, {
  foreignKey: 'id_sucursal',
  as: 'sucursal',
});

Usuarios.hasMany(AjusteStock, {
  foreignKey: 'id_usuario',
  as: 'ajustesStock',
});

AjusteStock.belongsTo(Usuarios, {
  foreignKey: 'id_usuario',
  as: 'usuario',
});

Productos.hasMany(AjusteStockDetalle, {
  foreignKey: 'producto_id',
  as: 'ajustesDetalle',
});

AjusteStockDetalle.belongsTo(Productos, {
  foreignKey: 'producto_id',
  as: 'producto',
});

DetalleCompra.hasMany(AjusteStockDetalle, {
  foreignKey: 'id_detalle_compra',
  as: 'ajustesDetalle',
});

AjusteStockDetalle.belongsTo(DetalleCompra, {
  foreignKey: 'id_detalle_compra',
  as: 'detalleCompra',
});

AjusteStock.hasMany(AjusteStockDetalle, {
  foreignKey: 'id_ajuste',
  as: 'ajustesDetalle',
});

AjusteStockDetalle.belongsTo(AjusteStock, {
  foreignKey: 'id_ajuste',
  as: 'ajuste',
});

// ============================================================
// ASOCIACIONES MULTI-TENANT: Clientes
// ============================================================

Clientes.hasMany(Usuarios, { foreignKey: 'id_cliente', as: 'usuarios' });
Usuarios.belongsTo(Clientes, { foreignKey: 'id_cliente', as: 'cliente' });

Clientes.hasMany(Sucursal, { foreignKey: 'id_cliente', as: 'sucursales' });
Sucursal.belongsTo(Clientes, { foreignKey: 'id_cliente', as: 'cliente' });

Clientes.hasMany(Productos, { foreignKey: 'id_cliente', as: 'productos' });
Productos.belongsTo(Clientes, { foreignKey: 'id_cliente', as: 'cliente' });

Clientes.hasMany(Proveedores, { foreignKey: 'id_cliente', as: 'proveedores' });
Proveedores.belongsTo(Clientes, { foreignKey: 'id_cliente', as: 'cliente' });

Clientes.hasMany(Compra, { foreignKey: 'id_cliente', as: 'compras' });
Compra.belongsTo(Clientes, { foreignKey: 'id_cliente', as: 'cliente' });

Clientes.hasMany(Ventas, { foreignKey: 'id_cliente', as: 'ventas' });
Ventas.belongsTo(Clientes, { foreignKey: 'id_cliente', as: 'cliente' });

Clientes.hasMany(Gastos, { foreignKey: 'id_cliente', as: 'gastos' });
Gastos.belongsTo(Clientes, { foreignKey: 'id_cliente', as: 'cliente' });

Clientes.hasMany(TipoVenta, { foreignKey: 'id_cliente', as: 'tiposVenta' });
TipoVenta.belongsTo(Clientes, { foreignKey: 'id_cliente', as: 'cliente' });

Clientes.hasMany(TipoGastos, { foreignKey: 'id_cliente', as: 'tiposGastos' });
TipoGastos.belongsTo(Clientes, { foreignKey: 'id_cliente', as: 'cliente' });

Clientes.hasMany(ClienteConfig, { foreignKey: 'id_cliente', as: 'configuraciones' });
ClienteConfig.belongsTo(Clientes, { foreignKey: 'id_cliente', as: 'cliente' });

Clientes.hasMany(Cambio, { foreignKey: 'id_cliente', as: 'cambios' });
Cambio.belongsTo(Clientes, { foreignKey: 'id_cliente', as: 'cliente' });

Clientes.hasMany(AjusteStock, { foreignKey: 'id_cliente', as: 'ajustesStock' });
AjusteStock.belongsTo(Clientes, { foreignKey: 'id_cliente', as: 'cliente' });

Clientes.hasMany(Transferencia, { foreignKey: 'id_cliente', as: 'transferencias' });
Transferencia.belongsTo(Clientes, { foreignKey: 'id_cliente', as: 'cliente' });

module.exports = {
  Usuarios,
  Ventas,
  DetalleVentas,
  Compra,
  DetalleCompra,
  Productos,
  Proveedores,
  TipoVenta,
  Sucursal,
  Transferencia,
  TransferenciaDetalle,
  Gastos,
  TipoGastos,
  StockSucursal,
  Cambio,
  DetalleCambio,
  AjusteStock,
  AjusteStockDetalle,
  Clientes,
  ClienteConfig,
};
