const { Usuarios } = require('../models/usuarios');
const { Proveedores } = require('../models/proveedores');
const { Productos } = require('../models/productos');
const { Ventas } = require('../models/ventas');

async function seedData() {
  try {
    // Crear usuarios
    /*  const user1 = await Usuarios.create({
      nombres: 'Juan Pérez',
      email: 'juan@example.com',
      password: 'contraseña123', // Asegúrate de incluir un valor para 'contraseña'
    });

    const user2 = await Usuarios.create({
      nombres: 'Ana García',
      email: 'ana@example.com',
      password: 'contraseña456',
    }); */

    // Crear proveedores
    /*  const provider1 = await Proveedores.create({
      nombre: 'Proveedor A',
      email: 'proveedorA@example.com',
      telefono: '111222333',
    });

    const provider2 = await Proveedores.create({
      nombre: 'Proveedor B',
      email: 'proveedorB@example.com',
      telefono: '444555666',
    });

    const provider3 = await Proveedores.create({
      nombre: 'Proveedor C',
      email: 'proveedorC@example.com',
      telefono: '777888999',
    }); */

    const producto1 = await Productos.create({
      nombre: 'Producto 1',
      precio: 100.0,
      stock: 10,
    });

    const producto2 = await Productos.create({
      nombre: 'Producto 2',
      precio: 200.0,
      stock: 15,
    });

    const producto3 = await Productos.create({
      nombre: 'Producto 3',
      precio: 300.0,
      stock: 28,
    });

    /*    const ventas = await Ventas.create({
      total: 400.0,
      fecha_venta: new Date(),
      producto_id: 2,
      usuario_id: 1,
    });
 */

    console.log('Usuarios creados correctamente');
  } catch (error) {
    console.error('Error al insertar los datos:', error);
  }
}

seedData();
