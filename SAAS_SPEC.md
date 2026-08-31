# SAAS_SPEC.md

Especificación técnica para el frontend del SaaS de gestión de stock/inventario.

Este archivo es la fuente de verdad para el frontend. Cualquier cambio en la API debe reflejarse aquí.

---

## 1. Arquitectura Multi-Tenant

### Modelo de aislamiento

- **Shared Database**: todos los clientes comparten una sola DB PostgreSQL
- **Columna `id_cliente`** en cada tabla de negocio para aislamiento
- **Middleware `tenantMiddleware`**: inyecta `id_cliente` desde el JWT automáticamente
- El frontend NO necesita enviar `id_cliente` - el backend lo resuelve del token

### Flujo de autenticación

```
POST /user/login
Body: { nombre, password }
Response: { user, id, mensaje, Sucursal, NombreSucursal }
Cookie: Token (HTTP-only, SameSite=None en producción)
```

El JWT payload contiene:
```json
{
  "id": 1,
  "nombre": "Juan",
  "rol": "admin",
  "id_cliente": 5,
  "id_sucursal": 1,
  "nombre_sucursal": "Sucursal Centro",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Headers requeridos

```
Cookie: Token=<jwt>
Content-Type: application/json
```

---

## 2. Endpoints por módulo

### 2.1 Clientes (ABM - solo admin global)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/clientes` | Listar todos los clientes | Admin global |
| POST | `/clientes` | Crear cliente | Admin global |
| PUT | `/clientes/:id` | Actualizar cliente | Admin global |
| GET | `/clientes/:id/config` | Obtener configuración del cliente | Admin global |
| PUT | `/clientes/:id/config` | Actualizar configuración del cliente | Admin global |

### 2.2 Usuarios

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/user` | Listar usuarios del cliente | Admin |
| GET | `/user/me` | Obtener usuario actual (del JWT) | Cualquier rol |
| POST | `/user` | Crear usuario | Admin |
| PUT | `/user` | Actualizar usuario | Admin |
| POST | `/user/login` | Login | Público |
| POST | `/user/logout` | Logout | Cualquier rol |
| POST | `/user/reset` | Resetear contraseña | Admin |

### 2.3 Sucursales

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/sucursal` | Sucursales del cliente | Cualquier rol |
| POST | `/sucursal` | Crear sucursal | Admin |
| GET | `/sucursal/usuario/:id_usuario` | Sucursal de un usuario | Cualquier rol |

### 2.4 Productos

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/productos` | Productos con stock por sucursal | Cualquier rol |
| POST | `/productos` | Crear producto | Admin |
| PUT | `/productos/` | Actualizar producto | Admin |
| PUT | `/productos/upcodigobarra` | Regenerar códigos de barras | Admin |
| GET | `/compra/:id_producto` | Historial de compras de un producto | Cualquier rol |
| GET | `/ventas/:id_producto` | Historial de ventas de un producto | Cualquier rol |

### 2.5 Proveedores

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/proveedor` | Listar proveedores | Cualquier rol |
| POST | `/proveedor` | Crear proveedor | Admin |
| PUT | `/proveedor` | Actualizar proveedor | Admin |

### 2.6 Compras

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/compra` | Registrar compra (con stock por sucursal) | Admin |
| POST | `/compra/desdehasta` | Listar compras por rango de fechas | Cualquier rol |
| DELETE | `/compra/:id` | Eliminar compra (solo si no fue usada en ventas) | Admin |
| GET | `/compra/:id_producto` | Detalle de compras de un producto | Cualquier rol |
| GET | `/compra/detalles/:id_compra` | Detalle completo de una compra | Cualquier rol |

### 2.7 Ventas

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/ventas` | Ventas del día actual | Cualquier rol |
| POST | `/ventas` | Registrar venta (FIFO stock) | Cualquier rol |
| POST | `/ventas/desdehasta` | Ventas por rango de fechas (con cambios) | Cualquier rol |
| DELETE | `/ventas/:id` | Eliminar venta y restaurar stock | Admin |
| POST | `/ventas/sucursal/:sucursal` | Ventas por sucursal y rango | Cualquier rol |
| GET | `/ventas/detalles/:id_venta` | Historial y productos vigentes de una venta | Cualquier rol |

### 2.8 Cambios (devoluciones/reemplazos)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/cambio` | Registrar cambio de producto | Cualquier rol |

### 2.9 Stock

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/listados/stock/sucursal/:sucursal` | Ver stock por sucursal | Cualquier rol |
| POST | `/stock/transferir` | Transferir stock entre sucursales | Admin |
| POST | `/ajustesStock` | Crear ajuste de stock | Admin |
| POST | `/listados/ajustesStock/desdehasta` | Historial de ajustes | Cualquier rol |

### 2.10 Gastos

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/gastos` | Listar gastos | Cualquier rol |
| POST | `/gastos` | Crear gasto | Admin |
| PUT | `/gastos` | Actualizar gasto | Admin |
| POST | `/gastos/desdehasta` | Resumen de gastos por rango | Cualquier rol |

### 2.11 Tipos de venta

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/tipoventa` | Listar tipos de venta | Cualquier rol |
| POST | `/tipoventa` | Crear tipo de venta | Admin |
| PUT | `/tipoventa` | Actualizar tipo de venta | Admin |

### 2.12 Tipos de gasto

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/tipogasto` | Listar tipos de gasto | Cualquier rol |
| POST | `/tipogasto` | Crear tipo de gasto | Admin |
| PUT | `/tipogasto` | Actualizar tipo de gasto | Admin |

### 2.13 Listados/Reportes

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/listados/:sucursal` | Resumen de ventas por sucursal | Cualquier rol |
| POST | `/listados/ventas/resumen` | Resumen general de ventas | Cualquier rol |
| POST | `/listados/ventas/sucursales` | Ventas comparativas por sucursales | Cualquier rol |

### 2.14 Configuración del cliente

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/config` | Obtener configuración del cliente actual | Cualquier rol |
| PUT | `/config` | Actualizar configuración | Admin |

---

## 3. Modelo de datos - Clientes

### Tabla `clientes`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_cliente | SERIAL PK | Identificador único |
| razon_social | VARCHAR(255) | Nombre comercial / Razón social |
| cuit | VARCHAR(20) UNIQUE | CUIT/CUIL (opcional) |
| email | VARCHAR(255) | Email de contacto |
| telefono | VARCHAR(50) | Teléfono de contacto |
| logo_url | VARCHAR(500) | Path al logo del cliente |
| dominio | VARCHAR(100) UNIQUE | Subdominio (tienda1.midominio.com) |
| color_primario | VARCHAR(7) | Hex color primario (default: #1a73e8) |
| color_secundario | VARCHAR(7) | Hex color secundario (default: #34a853) |
| color_terciario | VARCHAR(7) | Hex color terciario (default: #ea4335) |
| color_fondo | VARCHAR(7) | Hex color de fondo (default: #ffffff) |
| activo | BOOLEAN | Habilitado (default: true) |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Última actualización |

### Tabla `cliente_config` (key-value)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_config | SERIAL PK | Identificador único |
| id_cliente | INTEGER FK | Referencia a clientes |
| key | VARCHAR(100) | Nombre de la configuración |
| value | TEXT | Valor (string, JSON, número) |
| description | VARCHAR(255) | Descripción de la config |

### Configuraciones predefinidas por cliente

| Key | Tipo | Default | Descripción |
|-----|------|---------|-------------|
| iva_porcentaje | number | 21 | Porcentaje de IVA |
| moneda | string | "ARS" | Código de moneda |
| simbolo_moneda | string | "$" | Símbolo de moneda |
| stock_minimo_alerta | number | 5 | Alertar cuando stock < este valor |
| permitir_stock_negativo | boolean | false | Permitir ventas sin stock |
| formato_fecha | string | "DD/MM/YYYY" | Formato de fecha para el frontend |
| timezone | string | "America/Argentina/Buenos_Aires" | Zona horaria |

---

## 4. Modelo de datos - Usuarios

### Campos del modelo `usuarios`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_usuario | SERIAL PK | Identificador único |
| nombre | VARCHAR | Nombre de usuario (login) |
| password | VARCHAR | Hash bcrypt |
| salt | VARCHAR | Salt para bcrypt |
| rol | VARCHAR | "admin" o "empleado" |
| id_cliente | INTEGER FK | Cliente al que pertenece |
| id_sucursal | INTEGER FK | Sucursal asignada |
| activo | BOOLEAN | Habilitado (default: true) |
| email | VARCHAR | Email (opcional) |

### Payload JWT

```json
{
  "id": 1,
  "nombre": "Juan",
  "rol": "admin",
  "id_cliente": 5,
  "id_sucursal": 1,
  "nombre_sucursal": "Sucursal Centro"
}
```

---

## 5. Colores y personalización

El frontend debe leer los colores del cliente actual desde el JWT o desde un endpoint `GET /config`.

### Paleta de colores por cliente

```css
:root {
  --color-primario: #1a73e8;    /* Botones principales, headers */
  --color-secundario: #34a853;  /* Acentos, badges de éxito */
  --color-terciario: #ea4335;   /* Errores, alertas */
  --color-fondo: #ffffff;       /* Fondo general */
  --color-texto: #333333;       /* Texto principal (calculado) */
}
```

### Cómo obtener los colores

```
GET /config
Response: {
  "color_primario": "#1a73e8",
  "color_secundario": "#34a853",
  "color_terciario": "#ea4335",
  "color_fondo": "#ffffff",
  "razon_social": "Tienda ABC",
  "logo_url": "/uploads/logos/cliente_5_logo.png"
}
```

---

## 6. Logo del cliente

- Almacenamiento: `/uploads/logos/` en el servidor
- Nombre del archivo: `cliente_{id_cliente}_logo.{ext}`
- Endpoint para subir: `POST /clientes/:id/logo` (multipart/form-data)
- Endpoint para obtener: `GET /clientes/:id/logo` (sirve el archivo)
- Formatos permitidos: PNG, JPG, SVG
- Tamaño máximo: 2MB

---

## 7. Módulos futuros (placeholders)

### 7.1 Cuentas Corrientes

**Endpoint base**: `/cuentas-corrientes`

Entidades:
- `cuentas_corrientes`: id, id_cliente, id_usuario, saldo, estado
- `movimientos_cc`: id, id_cuenta, tipo (debito/credito), monto, descripcion, referencia, fecha

Funcionalidades:
- Abrir cuenta corriente por cliente
- Registrar pagos (créditos)
- Registrar deudas (débitos) por ventas
- Extracto de cuenta
- Resumen de saldos

### 7.2 Facturación

**Endpoint base**: `/facturacion`

Entidades:
- `facturas`: id, id_cliente, id_venta, tipo (A/B/C), numero, fecha, total, iva, estado
- `factura_detalle`: id, id_factura, descripcion, cantidad, precio_unitario, subtotal
- `factura_tipo`: id, letra, descripcion, habilitado

Funcionalidades:
- Generar factura desde venta
- Facturación por rango de fechas
- Notas de crédito/débito
- Libro IVA

---

## 8. Notas para el frontend

### Manejo de errores

Todos los endpoints retornan:
```json
{
  "ok": true/false,
  "message": "Descripción del error",
  "error": "Detalle técnico (solo en desarrollo)"
}
```

### Paginación (futura)

Los endpoints de listado eventualmente soportarán:
```
GET /productos?page=1&limit=20&search=jean
Response: {
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

### Loading states

Recomendado mostrar spinner/loading en:
- Login
- Registrar venta (operación con transacción)
- Transferir stock
- Registrar cambio
- Cualquier operación DELETE

### Formato de fechas

- Envío al backend: `"YYYY-MM-DD"` (ej: `"2026-08-12"`)
- Recepción del backend: ISO 8601 (ej: `"2026-08-12T03:00:00.000Z"`)
- El offset GMT-3 está hardcodeado en el backend

---

## 9. Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-08-12 | Versión inicial del documento |
