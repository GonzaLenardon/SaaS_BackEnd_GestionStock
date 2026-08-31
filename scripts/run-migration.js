/**
 * Script de migración para ejecutar SQL desde Node.js.
 * Uso:
 *   npm run migrate
 *
 * Este script lee TODOS los archivos .sql de la carpeta migrations/
 * en orden alfabético y ejecuta cada statement usando la conexión
 * Sequelize configurada con las variables de entorno.
 */

const fs = require('fs');
const path = require('path');
const sequelize = require('../db/conection');

async function runMigration() {
  try {
    console.log('🚀 Iniciando migraciones...\n');

    console.log('🔍 Validando conexión a PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa\n');

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

      // Dividir por statements, manejando bloques $$...$$ (PL/pgSQL)
      const statements = [];
      let current = '';
      let inBlock = false;

      for (const line of sql.split('\n')) {
        const trimmed = line.trim();

        // Ignorar comentarios de línea completa
        if (trimmed.startsWith('--') && !inBlock) {
          continue;
        }

        // Detectar bloques $$ (PL/pgSQL)
        if (trimmed.includes('$$')) {
          inBlock = !inBlock;
        }

        current += line + '\n';

        // Si termina con ; y no estamos en un bloque, es un statement completo
        if (trimmed.endsWith(';') && !inBlock) {
          const stmt = current.trim();
          if (stmt.length > 0) {
            statements.push(stmt);
          }
          current = '';
        }
      }

      // Último statement si quedó algo
      if (current.trim().length > 0) {
        statements.push(current.trim());
      }

      console.log(`   📝 ${statements.length} statements a ejecutar`);

      let ejecutados = 0;
      let ignorados = 0;

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        try {
          if (statement.length === 0) continue;
          await sequelize.query(statement, { raw: true });
          ejecutados++;
        } catch (err) {
          const msg = err.message || err.toString();
          if (
            msg.includes('already exists') ||
            msg.includes('duplicate key value') ||
            msg.includes('column') && msg.includes('already exists')
          ) {
            ignorados++;
          } else {
            console.error(`   ❌ Error en statement ${i + 1}: ${msg}`);
            throw err;
          }
        }
      }

      console.log(`   ✅ ${ejecutados} ejecutados, ${ignorados} ignorados (ya existían)`);
    }

    console.log('\n🎉 Todas las migraciones completadas correctamente.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error en migración:', error.message || error);
    process.exit(1);
  }
}

runMigration();
