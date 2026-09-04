const express = require('express');
const sequelize = require('./db/conection');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');

const cors = require('cors');
const app = express();
app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: 2 * 1024 * 1024 },
  abortOnLimit: true,
  createParentPath: true,
}));
const PORT = process.env.PORT || 3000;
const ventas = require('./models/ventas');
const DetalleVentas = require('./models/detalleVentas');

/* Al leer ./routes se cargan todos los modelos definidos aca. De lo contrario hay que instanciarlos aca */
const router = require('./routes');

const ALLOWED_DOMAIN = process.env.DOMAIN || 'gestionstock.com';

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      const hostname = new URL(origin).hostname;

      // Permitir el dominio principal y cualquier subdominio
      if (hostname === ALLOWED_DOMAIN || hostname.endsWith('.' + ALLOWED_DOMAIN)) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Authorization, Content-Type, X-Requested-With',
    credentials: true,
  }),
);

app.use(cookieParser());

app.use('/uploads', express.static('uploads'));

//cors para desarrollo
/* app.use(cors({
  origin: '*'
})); */

app.use('/', router);

const startServer = async () => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync();
      console.log('📦 Base de datos sincronizada (dev).');
    } else {
      console.log('📦 Modo producción — sync deshabilitado.');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al sincronizar la base de datos:', error);
  }
};

startServer();
