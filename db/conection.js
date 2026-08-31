const { Sequelize } = require('sequelize');
require('dotenv').config(); // Para leer las variables de entorno

const isProduction = process.env.NODE_ENV === 'production'; //Ese bloque es necesario solo para servicios como Render
console.log(isProduction);

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: isProduction
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
  logging: false, // Para evitar logs innecesarios
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL exitosa.');
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  }
})();

module.exports = sequelize;
