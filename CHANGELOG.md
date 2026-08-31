# CHANGELOG

2026-08-26 - [UX] Cascada de permisos: deshabilitar menu padre deshabilita sub-items (Config/Listados) en UI y en guardado
2026-08-26 - [FIX] Permisos de empleados: todas las rutas ahora usan permission prop en vez de adminOnly, Nav.jsx con sub-items individuales granulares para Config y Listados
2026-08-26 - [FASE A+B] Soft Delete de Productos (activo/inactivo) + Sistema de Permisos de Empleados (17 perm keys en TenantContext, Nav.jsx filtrado, ProtectedRoute permission prop, Configuracion.jsx toggles, Productos.jsx granular)
2026-08-20 - [Fix] productosStock: LEFT JOIN con CASE para devolver [] en vez de [{null}] cuando no hay stock
2026-08-20 - [Fix] upUser usa user.save() en vez de Usuarios.update() para que lance error en unique constraint
2026-08-20 - [Fix] upUser acepta id_cliente para superadmin, frontend envia id_cliente en edicion
2026-08-20 - [FASE 1-5] Security fixes + role-based filtering + Frontend usuarios/sucursales/productos
2026-08-19 - [Fix] Sucursales dinamicas en Compras, TablaProductos, Ventas, ModalSeleccionProductoAjuste - ya no hardcodeadas
2026-08-18 - 10:00 - Fix sucursales: superadmin CRUD cross-tenant, columnas dinamicas en Productos.jsx
2026-08-18 - 09:30 - FIX CRITICO: Aislamiento multi-tenant en 15+ functions (productos, ventas, compras, listados, stock, gastos, etc.)
2026-08-18 - 08:18 - Superadmin sin cliente: id_cliente nullable, tenantMiddleware bypass, crear-admin.js fix
2026-08-14 - 09:35 - Configuracion.jsx: campos IVA, moneda, timezone, stock minimo, permitir stock negativo
2026-08-14 - 09:35 - User.jsx: limpieza de console.logs, estilo card-tenant, roles admin/empleado
2026-08-14 - 09:35 - Nav.jsx: fallback logo generico (primer letra de razon_social)
2026-08-14 - 09:35 - allUsers/sucursal controllers: superadmin ve todos los datos cross-tenant
2026-08-14 - 09:35 - addSucursal: superadmin puede crear sucursales para otros clientes
2026-08-12 - 12:30 - Implementacion completa de arquitectura multi-tenant SaaS

## Resumen de cambios

### Nuevos archivos
- `models/clientes.js` - Modelo de clientes con colores y configuración
- `models/clienteConfig.js` - Tabla key-value de configuración por cliente
- `controllers/tenantMiddleware.js` - Middleware que inyecta id_cliente desde JWT
- `controllers/clientes.js` - ABM de clientes con subida de logo
- `controllers/config.js` - Configuración por cliente (key-value)
- `utils/fechaHelper.js` - Helper centralizado para fechas (GMT-3)
- `SAAS_SPEC.md` - Especificación completa para frontend
- `migrations/002_create_clientes_table.sql` - Tabla clientes
- `migrations/003_add_tenant_id_to_all_tables.sql` - Columna id_cliente en todas las tablas
- `migrations/004_add_client_config_table.sql` - Tabla cliente_config

### Archivos modificados
- `models/index.js` - Agregadas asociaciones de Clientes con todas las entidades
- `models/sucursal.js` - Agregado campo id_cliente
- `models/usuarios.js` - Agregados campos id_cliente, id_sucursal, activo
- `models/productos.js` - Agregado campo id_cliente
- `models/compra.js` - Agregados campos id_usuario, id_cliente
- `models/detalleCompra.js` - Agregado campo id_cliente
- `models/ventas.js` - Agregado campo id_cliente
- `models/detalleVentas.js` - Agregado campo id_cliente
- `models/proveedores.js` - Agregado campo id_cliente
- `models/gastos.js` - Agregado campo id_cliente
- `models/tipoGastos.js` - Agregado campo id_cliente
- `models/tipo_venta.js` - Agregado campo id_cliente
- `models/stocksucursal.js` - Agregado campo id_cliente
- `models/cambio.js` - Agregado campo id_cliente
- `models/detallecambio.js` - Agregado campo id_cliente
- `models/transferencia.js` - Agregados campos id_usuario, id_cliente
- `models/detalleTransferencia.js` - Agregado campo id_cliente
- `models/ajusteStock.js` - Agregado campo id_cliente
- `models/ajusteStockDetalles.js` - Agregado campo id_cliente
- `controllers/usuarios.js` - JWT incluye id_cliente, queries filtran por cliente
- `controllers/sucursal.js` - Queries filtran por id_cliente
- `controllers/proveedor.js` - Queries filtran por id_cliente, fix mensaje error
- `controllers/tipoVentas.js` - Queries filtran por id_cliente
- `controllers/tipoGastos.js` - Fix reasignación const, queries filtran por id_cliente
- `controllers/gastos.js` - Queries filtran por id_cliente
- `controllers/productos.js` - usa fechaHelper, crea productos con id_cliente
- `controllers/compras.js` - usa fechaHelper, crea compras con id_cliente
- `controllers/ventas.js` - usa fechaHelper, crea ventas y detalles con id_cliente
- `controllers/stock.js` - crea transferencias y ajustes con id_cliente
- `routes/index.js` - Agregadas rutas de clientes, config; todas las rutas usan tenantMiddleware
- `server.js` - Agregado express-fileupload y static serving de uploads
- `package.json` - Agregada dependencia express-fileupload
- `scripts/run-migration.js` - Soporte para múltiples archivos SQL
- `AGENTS.md` - Actualizado con arquitectura SaaS
2026-08-12 - 17:54 - Migraciones verificadas en DB GestionStock (20 tablas, id_cliente OK); migracion 002 hecha idempotente (fix INSERT duplicado); eliminado cliente duplicado id 3; servidor operativo en puerto 5000
2026-08-12 - 19:02 - Fix /user/login: agrega validacion 400 cuando faltan nombre o password (antes retornaba 500)
2026-08-13 - 10:45 - Script crear-admin.js: crea primer usuario superadmin; comando npm run crear-admin; login verificado OK
2026-08-13 - 16:17 - Frontend: fix rol superadmin (AuthContext, ProtectedRoute, Nav); nueva pagina Clientes.jsx (CRUD ABM); ruta /clientes superOnly; rol dropdown en User.jsx actualizado a admin/empleado
2026-08-14 - 09:07 - Backend SaaS completo: config unificado, requireRole middleware, constraint compuesto nombre+id_cliente, login retorna branding, sucursal CRUD (update+delete), superadmin crea usuarios en cualquier cliente, cleanup imports
2026-08-14 - 09:18 - Frontend SaaS: login con branding dinamico, pagina Sucursales CRUD, superadmin crea usuarios desde Clientes, config unificado, build OK
