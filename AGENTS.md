# AGENTS.md

## Descripción del proyecto

Api backend en Node.js/Express para un SaaS de Gestion de stock/inventario para tiendas de ropa. Sequeliza ORM con PostgreSQL.

Multi-tenant: todos los clientes comparten una sola base de datos, aislados por columna `id_cliente` en cada tabla.

## Comandos rápidos

```bash
npm run dev        # Iniciar servidor de desarrollo con nodemon (puerto 5000)
npm start          # Iniciar servidor de producción
npm run migrate    # Ejecutar migraciones SQL desde la carpeta migrations/
npm run crear-admin # Crear superadmin (node scripts/crear-admin.js <nombre> <password>)
```

**No hay tests, linter ni typecheck configurados.** El script `"test"` es un placeholder.

## Arquitectura

- **Entrada**: `server.js` - sincroniza la DB con `sequelize.sync({ alter: true })` y luego inicia Express
- **Rutas**: `routes/index.js` - un solo router plano, todos los endpoints definidos aquí
- **Controllers**: `controllers/*.js` - lógica de negocio (ventas, compras, productos, usuarios, etc.)
- **Models**: `models/*.js` - modelos Sequelize; `models/index.js` define TODAS las relaciones
- **Conexión DB**: `db/conection.js` - usa la variable de entorno `DATABASE_URL`
- **Auth**: JWT en cookies HTTP-only; `controllers/authMiddleware.js` protege las rutas
- **Roles**: `requireRole('superadmin', 'admin')` verifica el rol del usuario autenticado
- **Multi-tenant**: `controllers/tenantMiddleware.js` inyecta `id_cliente` en cada request

## Puntos críticos a tener en cuenta

- **`sequelize.sync({ alter: true })` se ejecuta en cada arranque del servidor** (`server.js:35`). Esto altera automáticamente los esquemas de las tablas. No agregar cambios destructivos de columnas en los modelos sin entender que esto se propagará.
- **Las migraciones SQL son independientes** del sync de Sequelize. Ejecutar `npm run migrate` manualmente. El script de migración (`scripts/run-migration.js`) lee todos los `.sql` de la carpeta en orden alfabético.
- **Los modelos deben importarse en `routes/index.js`** para que `sequelize.sync` los registre. El comentario en `server.js:12` explica esto.
- **Todas las relaciones están definidas en `models/index.js`**. Si se agrega un nuevo modelo, registrarlo y sus asociaciones ahí.
- **El middleware de auth usa `req.cookies.Token`** (T mayúscula). El payload del JWT incluye `id`, `nombre`, `rol`, `id_cliente`, `id_sucursal`, `nombre_sucursal`.
- **Roles del sistema**: `superadmin` (gestiona todo el SaaS), `admin` (gestiona su tenant), `empleado` (operador). Usar `requireRole()` en routes/index.js para proteger por rol.
- **Constraint compuesto en usuarios**: `UNIQUE(nombre, id_cliente)` — los nombres de usuario son únicos por cliente, no globalmente.
- **Multi-tenant**: TODOS los controllers DEBEN filtrar por `req.id_cliente` en cada query. Usar `tenantMiddleware` en cada ruta protegida. El superadmin puede operar sin `id_cliente` (cross-tenant).
- **Config unificado**: `GET /config` retorna colores + logo + razon_social (de tabla `clientes`) + settings funcionales (de `cliente_config`). `updateConfig` separa automáticamente ambos orígenes.
- **Login retorna branding**: El endpoint `POST /user/login` incluye campo `cliente` con logo, colores y razon_social del cliente.
- **El origen de CORS** viene de `process.env.URL` - debe coincidir exactamente con la URL del frontend.
- **Manejo de fechas**: Usar `utils/fechaHelper.js` para offset de zona horaria. No hardcodear `3 * 60 * 60 * 1000` en controllers.
- **Consumo de stock FIFO**: `registrarVenta` consume stock de los lotes más viejos primero (`StockSucursal` ordenado por `DetalleCompra.createdAt ASC`).
- **Productos.jsx**: Las columnas de sucursal son dinámicas (no hardcodeadas). Se extraen de `stock_por_sucursal` y se renderizan por `id_sucursal`.
- **El rollback está restringido** al cambio ID 120 únicamente (`routes/index.js:176`).
- **Superadmin rutas**: `/clientes` y `/superadmin/usuarios` usan solo `authMiddleware + requireRole('superadmin')` (sin `tenantMiddleware`).
- **Superadmin sin cliente**: `id_cliente` es NULL para superadmins. `tenantMiddleware` hace bypass automático para superadmins.

## Problemas conocidos (no corregir sin confirmar)

- `controllers/tipoGastos.js:19`: Variable `tipoGasto` reasignada con `const`.
- `controllers/proveedor.js:11`: Mensaje de error dice "Usuario ya existente" para proveedores.
- `routes/index.js:66`: Import de `sequelize` no utilizado.
- ~1200 líneas de código comentado en controllers (versiones anteriores).

## Entorno

`.env` debe definir: `DATABASE_URL`, `PORT`, `SECRET`, `NODE_ENV`, `URL`. Para desarrollo local se usa `postgres://postgres:Abundancia@localhost:5432/amorInfinito`.

## Convenciones de código

- Nombres en español para modelos, rutas, variables y comentarios
- CommonJS (`require`/`module.exports`), no ESM
- Los controllers exportan funciones nombradas; no se usan patrones basados en clases
- Se usan transacciones para operaciones de DB de varios pasos (ventas, cambios, rollback)
- Uso intensivo de `include` de Sequelize para eager loading con aliases
- Hay grandes bloques de código comentado en los controllers (iteraciones anteriores) - no eliminar sin confirmar que son verdaderamente obsoletos

## Workflow de tareas

Al completar cada tarea, agregar una línea al final de `CHANGELOG.md` con formato:
`YYYY-MM-DD - HH:MM - [Descripción breve de lo hecho]`
No pedir confirmación para esto, ejecutarlo automáticamente.
