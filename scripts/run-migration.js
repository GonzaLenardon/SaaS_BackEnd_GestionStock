/**
 * Script de migración para ejecutar SQL desde Node.js.
 * Soporta MySQL/MariaDB con multi-statement queries.
 *
 * Uso:
 *   npm run migrate
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
  let connection;

  try {
    console.log('🚀 Iniciando migraciones...\n');

    // Conectar directamente con mysql2 (multiStatements habilitado)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      multipleStatements: true,
    });

    console.log('✅ Conexión exitosa a MySQL\n');

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('⚠️  No se encontraron archivos de migración.');
      process.exit(0);
    }

    console.log(`📋 ${files.length} archivos de migración encontrados:\n`);
    for (const file of files) {
      console.log(`   - ${file}`);
    }
    console.log('');

    for (const file of files) {
      const migrationPath = path.join(migrationsDir, file);
      console.log(`\n📄 Ejecutando: ${file}`);

      const sql = fs.readFileSync(migrationPath, 'utf8');

      try {
        // Ejecutar todo el archivo SQL como una multi-statement query
        await connection.query(sql);
        console.log(`   ✅ Migración ejecutada correctamente`);
      } catch (err) {
        const msg = err.message || err.toString();
        // Ignorar errores de "ya existe"
        if (
          msg.includes('already exists') ||
          msg.includes('Duplicate') ||
          msg.includes('duplicate key') ||
          msg.includes('duplicate entry') ||
          (msg.includes('column') && msg.includes('already exists'))
        ) {
          console.log(`   ⏭️  Ya existía, ignorado`);
        } else {
          console.error(`   ❌ Error: ${msg}`);
          throw err;
        }
      }
    }

    console.log('\n🎉 Todas las migraciones completadas correctamente.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error en migración:', error.message || error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();
