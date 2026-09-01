/**
 * Script de setup: crea tablas base con Sequelize.sync() y luego ejecuta migraciones SQL.
 *
 * Uso:
 *   node scripts/setup-db.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const sequelize = require('../db/conection');
const mysql = require('mysql2/promise');

// Cargar todos los modelos para que sequelize.sync() los registre
require('../models');

async function setupDb() {
  try {
    console.log('🚀 Iniciando setup de base de datos...\n');

    // Paso 1: Crear tablas base con Sequelize sync
    console.log('📦 Creando tablas base con Sequelize sync...');
    await sequelize.sync({ alter: true });
    console.log('✅ Tablas base creadas/actualizadas\n');

    // Paso 2: Ejecutar migraciones SQL
    console.log('📄 Ejecutando migraciones SQL...\n');

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      multipleStatements: true,
    });

    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const migrationPath = path.join(migrationsDir, file);
      console.log(`📄 Ejecutando: ${file}`);

      const sql = fs.readFileSync(migrationPath, 'utf8');

      try {
        await connection.query(sql);
        console.log(`   ✅ OK`);
      } catch (err) {
        const msg = err.message || err.toString();
        if (
          msg.includes('already exists') ||
          msg.includes('Duplicate') ||
          msg.includes('duplicate key') ||
          msg.includes('duplicate entry') ||
          msg.includes('Multiple Primary Key Defined')
        ) {
          console.log(`   ⏭️  Ya existía, ignorado`);
        } else {
          console.error(`   ⚠️  ${msg.substring(0, 120)}`);
        }
      }
    }

    await connection.end();

    console.log('\n🎉 Base de datos lista.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message || error);
    process.exit(1);
  }
}

setupDb();
