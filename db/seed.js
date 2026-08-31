const {
  Proveedores,
  Productos,
  Compra,
  DetalleCompra,
  Ventas,
  DetalleVentas,
  StockSucursal,
  Sucursal,
  Usuarios,
} = require('../models'); // Ajustá el path
const db = require('./conection');

(async () => {
  try {
    await db.sync();

    // Crear 3 sucursales
    const sucursales = await Sucursal.bulkCreate([
      { nombre_sucursal: 'Sucursal Centro', direccion: 'Av. Principal 123' },
      { nombre_sucursal: 'Sucursal Norte', direccion: 'Ruta 9 KM 45' },
      { nombre_sucursal: 'Sucursal Sur', direccion: 'Av. Libertad 456' },
    ]);

    // Crear 3 proveedores
    const proveedores = await Proveedores.bulkCreate([
      {
        nombre: 'Proveedor A',
        direccion: 'Calle 123',
        telefono: '123456789',
        contacto: 'Juan',
        email: 'a@mail.com',
      },
      {
        nombre: 'Proveedor B',
        direccion: 'Calle 456',
        telefono: '987654321',
        contacto: 'Ana',
        email: 'b@mail.com',
      },
      {
        nombre: 'Proveedor C',
        direccion: 'Calle 789',
        telefono: '555555555',
        contacto: 'Luis',
        email: 'c@mail.com',
      },
    ]);

    // Crear 10 productos
    const productos = await Productos.bulkCreate(
      Array.from({ length: 10 }).map((_, i) => ({
        codigo: `P-${i + 1}`,
        nombre: `Producto ${i + 1}`,
        marca: 'MarcaX',
        modelo: `M${i + 1}`,
        talle: 'M',
        color: 'Rojo',
        costo: 100 + i * 10,
        porcentaje: 30,
        precio_venta: (100 + i * 10) * 1.3,
        observaciones: 'Sin obs.',
      }))
    );

    // Crear 10 compras en sucursal 1 con detalle y stock
    const compras = [];
    for (let i = 0; i < 10; i++) {
      const compra = await Compra.create({
        proveedor_id: proveedores[i % 3].id_proveedor,
        monto: productos[i].costo * 10,
        numero: `C-00${i + 1}`,
        id_usuario: 1,
      });

      const detalle = await DetalleCompra.create({
        compra_id: compra.id_compra,
        producto_id: productos[i].id_producto,
        nombreProducto: productos[i].nombre,
        cantidad: 10,
        costo: productos[i].costo,
        vencimiento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // +1 año
      });

      await StockSucursal.create({
        id_detalle_compra: detalle.id_detalle,
        id_sucursal: sucursales[0].id_sucursal, // Sucursal Centro
        stock: 10,
      });

      compras.push({ detalle, producto: productos[i] });
    }

    // Crear 10 ventas rotando entre sucursales
    for (let i = 0; i < 10; i++) {
      const sucursalVenta = sucursales[i % 3]; // rotar entre las 3 sucursales
      const { detalle, producto } = compras[i];

      const venta = await Ventas.create({
        fecha: new Date(),
        total: producto.precio_venta * 2,
        id_usuario: 1,
        id_tipo_venta: 1,
        id_sucursal: sucursalVenta.id_sucursal,
      });

      await DetalleVentas.create({
        id_venta: venta.id_venta,
        id_producto: producto.id_producto,
        nombreProducto: producto.nombre,
        cantidad: 2,
        total: producto.precio_venta * 2,
        fecha: new Date(),
        id_sucursal: sucursalVenta.id_sucursal,
        id_detalle_compra: detalle.id_detalle, // Para trazabilidad
      });
    }

    console.log(
      '✔️ Sucursales, proveedores, productos, compras y ventas cargados correctamente.'
    );
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al cargar datos:', error);
    process.exit(1);
  }
})();
