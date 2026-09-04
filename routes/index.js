const { Router } = require('express');
const { authMiddleware, requireRole } = require('../controllers/authMiddleware');
const { tenantMiddleware } = require('../controllers/tenantMiddleware');
const router = Router();
const rollbackCambio = require('../rollback-cambio');

const {
  allClientes,
  getCliente,
  addCliente,
  updateCliente,
  uploadLogo,
} = require('../controllers/clientes');

const { getConfig, updateConfig } = require('../controllers/config');

const {
  addSucursal,
  allSucursal,
  getSucursal,
  updateSucursal,
  deleteSucursal,
  toggleHabilitado,
} = require('../controllers/sucursal');

const {
  allUsers,
  User,
  addUser,
  addUserAsSuperadmin,
  login,
  resetPassword,
  changeMyPassword,
  getUser,
  logout,
  upUser,
} = require('../controllers/usuarios');
const {
  allVentas,
  addVentas,
  desdeHasta,
  deleteVenta,
  registrarVenta,
  ventaDetalles,
  ventasPorSucursal,
  obtenerVentaConHistorialYVigentes,
} = require('../controllers/ventas');
const {
  addcompras,
  addCompra,
  comprasDesdeHasta,
  eliminarCompra,
  detalleCompra,
} = require('../controllers/compras');

const {
  addProductos,
  updateProductos,
  comprasProducto,
  productosStock,
  ventasProducto,
  actualizarCodigosBarras,
  softDeleteProducto,
} = require('../controllers/productos');
const {
  addProveedor,
  allProveedores,
  updateProveedor,
} = require('../controllers/proveedor');
const {
  addDetalles,
  allDetalles,
  addVentaConDetalles,
} = require('../controllers/detalleVentas');

const {
  allTipoVentas,
  addTipoVenta,
  updateTipoVenta,
} = require('../controllers/tipoVentas');

const {
  resumenVentas,
  ventasDesdeHasta,
  resumenDesdeHasta,
  resumenVentasDesdeHasta,
  ventasPorSucursales,
} = require('../controllers/listados');
const {
  verStock,
  transferirStock,
  crearAjusteStock,
  obtenerAjustesStock,
} = require('../controllers/stock');
const {
  allTipoGastos,
  addTipoGastos,
  updateTipoGasto,
} = require('../controllers/tipoGastos');

const {
  addGastos,
  allGastos,
  updateGastos,
  resumenGastos,
} = require('../controllers/gastos');

const { registrarCambioProducto } = require('../controllers/cambios');

// ============================================================
// RUTAS PÚBLICAS (sin auth)
// ============================================================

router.get('/', (req, res) => {
  res.json({
    ok: true,
    mensaje: '¡Hola Gestion Tienda! 🚀',
    version: '0.0.1',
  });
});


router.post('/user/login', login);

// ============================================================
// RUTAS DE CLIENTES (solo superadmin - sin tenantMiddleware)
// ============================================================
router.get('/clientes', authMiddleware, requireRole('superadmin'), allClientes);
router.get('/clientes/:id', authMiddleware, requireRole('superadmin'), getCliente);
router.post('/clientes', authMiddleware, requireRole('superadmin'), addCliente);
router.put('/clientes/:id', authMiddleware, requireRole('superadmin'), updateCliente);
router.post('/clientes/:id/logo', authMiddleware, requireRole('superadmin'), uploadLogo);

// ============================================================
// RUTAS SUPERADMIN: crear usuarios en cualquier cliente
// ============================================================
router.post('/superadmin/usuarios', authMiddleware, requireRole('superadmin'), addUserAsSuperadmin);

// ============================================================
// RUTAS DE CONFIGURACIÓN
// ============================================================
router.get('/config', authMiddleware, tenantMiddleware, getConfig);
router.put('/config', authMiddleware, tenantMiddleware, updateConfig);

// ============================================================
// RUTAS PROTEGIDAS CON MULTI-TENANT
// ============================================================

// Usuarios
router.get('/user', authMiddleware, tenantMiddleware, allUsers);
router.get('/user/me', authMiddleware, getUser);
router.post('/user', authMiddleware, tenantMiddleware, addUser);
router.put('/user', authMiddleware, tenantMiddleware, upUser);
router.post('/user/logout', authMiddleware, logout);
router.post('/user/reset', authMiddleware, tenantMiddleware, resetPassword);
router.post('/user/change-password', authMiddleware, changeMyPassword);

// Sucursales
router.get('/sucursal', authMiddleware, tenantMiddleware, allSucursal);
router.post('/sucursal', authMiddleware, tenantMiddleware, addSucursal);
router.put('/sucursal/habilitado/:id', authMiddleware, tenantMiddleware, toggleHabilitado);
router.put('/sucursal/:id', authMiddleware, tenantMiddleware, updateSucursal);
router.delete('/sucursal/:id', authMiddleware, tenantMiddleware, deleteSucursal);
router.get('/sucursal/usuario/:id_usuario', authMiddleware, tenantMiddleware, getSucursal);

// Productos
router.get('/productos', authMiddleware, tenantMiddleware, productosStock);
router.post('/productos', authMiddleware, tenantMiddleware, addProductos);
router.put('/productos/', authMiddleware, tenantMiddleware, updateProductos);
router.put('/productos/upcodigobarra', authMiddleware, tenantMiddleware, actualizarCodigosBarras);
router.put('/productos/activo/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'superadmin'), softDeleteProducto);

// Proveedores
router.get('/proveedor', authMiddleware, tenantMiddleware, allProveedores);
router.post('/proveedor', authMiddleware, tenantMiddleware, addProveedor);
router.put('/proveedor', authMiddleware, tenantMiddleware, updateProveedor);

// Compras
router.post('/compra', authMiddleware, tenantMiddleware, addCompra);
router.post('/compra/desdehasta', authMiddleware, tenantMiddleware, comprasDesdeHasta);
router.delete('/compra/:id', authMiddleware, tenantMiddleware, eliminarCompra);
router.get('/compra/:id_producto', authMiddleware, tenantMiddleware, comprasProducto);
router.get('/compra/detalles/:id_compra', authMiddleware, tenantMiddleware, detalleCompra);

// Ventas
router.get('/ventas', authMiddleware, tenantMiddleware, allVentas);
router.post('/ventas', authMiddleware, tenantMiddleware, registrarVenta);
router.post('/ventas/desdehasta', authMiddleware, tenantMiddleware, desdeHasta);
router.post('/ventas/sucursal/:sucursal', authMiddleware, tenantMiddleware, ventasPorSucursal);
router.delete('/ventas/:id', authMiddleware, tenantMiddleware, deleteVenta);
router.get('/ventas/:id_producto', authMiddleware, tenantMiddleware, ventasProducto);
router.get('/ventas/detalles/:id_venta', authMiddleware, tenantMiddleware, obtenerVentaConHistorialYVigentes);

// Detalles
router.post('/detalles', authMiddleware, tenantMiddleware, addDetalles);
router.get('/detalles', authMiddleware, tenantMiddleware, allDetalles);

// Tipos de venta
router.get('/tipoventa', authMiddleware, tenantMiddleware, allTipoVentas);
router.post('/tipoventa', authMiddleware, tenantMiddleware, addTipoVenta);
router.put('/tipoventa', authMiddleware, tenantMiddleware, updateTipoVenta);

// Gastos
router.get('/gastos', authMiddleware, tenantMiddleware, allGastos);
router.post('/gastos', authMiddleware, tenantMiddleware, addGastos);
router.put('/gastos', authMiddleware, tenantMiddleware, updateGastos);
router.post('/gastos/desdehasta', authMiddleware, tenantMiddleware, resumenGastos);

// Tipos de gasto
router.get('/tipogasto', authMiddleware, tenantMiddleware, allTipoGastos);
router.post('/tipogasto', authMiddleware, tenantMiddleware, addTipoGastos);
router.put('/tipogasto', authMiddleware, tenantMiddleware, updateTipoGasto);

// Stock
router.get('/listados/stock/sucursal/:sucursal', authMiddleware, tenantMiddleware, verStock);
router.post('/stock/transferir', authMiddleware, tenantMiddleware, transferirStock);
router.post('/ajustesStock', authMiddleware, tenantMiddleware, crearAjusteStock);
router.post('/listados/ajustesStock/desdehasta', authMiddleware, tenantMiddleware, obtenerAjustesStock);

// Cambios
router.post('/cambio', authMiddleware, tenantMiddleware, registrarCambioProducto);

// Listados
router.post('/listados/:sucursal', authMiddleware, tenantMiddleware, resumenVentas);
router.post('/listados/ventas/resumen', authMiddleware, tenantMiddleware, resumenVentasDesdeHasta);
router.post('/listados/ventas/sucursales', authMiddleware, tenantMiddleware, ventasPorSucursales);

// Admin - Rollback
router.post('/admin/rollback-cambio/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    if (req.params.id !== '120') {
      return res.status(403).json({
        ok: false,
        error: 'Rollback no permitido',
      });
    }

    const idCambio = parseInt(req.params.id, 10);

    await rollbackCambio(idCambio);

    return res.status(200).json({
      ok: true,
      message: `Rollback ejecutado correctamente para cambio ${idCambio}`,
    });
  } catch (error) {
    console.error('Error rollback:', error);

    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

module.exports = router;
