/**
 * Script de setup: crea el primer usuario superadmin (sin cliente asociado).
 * Uso:
 *   node scripts/crear-admin.js <nombre> <password>
 *
 * Ejemplo:
 *   node scripts/crear-admin.js admin Abundancia123
 */

const bc = require('bcrypt');
const sequelize = require('../db/conection');

async function crearAdmin() {
  const nombre   = process.argv[2];
  const password = process.argv[3];

  if (!nombre || !password) {
    console.error('Uso: node scripts/crear-admin.js <nombre> <password>');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();

    const [existe] = await sequelize.query(
      `SELECT id_usuario FROM usuarios WHERE nombre = :nombre LIMIT 1`,
      { replacements: { nombre }, type: sequelize.QueryTypes.SELECT }
    );

    if (existe) {
      console.error(`Ya existe un usuario llamado "${nombre}".`);
      process.exit(1);
    }

    const salt           = await bc.genSalt();
    const passwordHash   = await bc.hash(password, salt);
    const ahora = new Date();

    await sequelize.query(
      `INSERT INTO usuarios (nombre, password, salt, rol, id_cliente, id_sucursal, activo, "createdAt", "updatedAt")
       VALUES (:nombre, :password, :salt, 'superadmin', NULL, NULL, true, :ahora, :ahora)`,
      {
        replacements: {
          nombre,
          password: passwordHash,
          salt,
          ahora,
        },
      }
    );

    console.log('');
    console.log('Usuario superadmin creado correctamente.');
    console.log(`   nombre:  ${nombre}`);
    console.log(`   rol:     superadmin`);
    console.log(`   cliente: (ninguno - puede gestionar todos los clientes)`);
    console.log('');
    console.log('Login: POST /user/login');
    console.log(`  { "nombre": "${nombre}", "password": "<tu password>" }`);
    console.log('');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

crearAdmin();
