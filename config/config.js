'use strict';

// Configuracion de Sequelize CLI (npx sequelize-cli db:migrate).
// Usa el mismo .env que la aplicacion: la base real es MariaDB/MySQL.
// (El viejo config/config.json apuntaba a un Postgres heredado de otro
// proyecto y fue eliminado. sequelize-cli prefiere config.js sobre .json.)
require('dotenv').config();

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'mysql',
  // Las migraciones son SQL multi-statement (SET FOREIGN_KEY_CHECKS;
  // CREATE TABLE ...;). Sin esta opcion mysql2 solo ejecutaria la primera
  // sentencia del archivo.
  dialectOptions: {
    multipleStatements: true,
    ...(process.env.DB_SSL === 'true'
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {}),
  },
  logging: false,
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
};

// Todas las entidades apuntan al mismo .env: asi funciona igual con
// NODE_ENV=dev (desarrollo local), development o production.
module.exports = {
  development: base,
  dev: base,
  production: base,
  test: base,
};
