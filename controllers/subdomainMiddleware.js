const { Clientes } = require('../models');

/**
 * subdomainMiddleware — Resuelve el tenant a partir del subdominio.
 *
 * Extrae el subdominio del header Host y busca un cliente con ese dominio.
 * Si lo encuentra, setea req.id_cliente y req.clienteData.
 * Si no, llama next() sin setear (para rutas que no requieren tenant).
 *
 * Ejemplo: mitienda.gestionstock.com → busca dominio="mitienda" en BD
 */
const subdomainMiddleware = async (req, res, next) => {
  try {
    const host = req.headers.host || '';
    const dominio = host.split(':')[0]; // quitar puerto si existe

    // En localhost puro o IP directa, no hay subdominio
    if (dominio === 'localhost' || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(dominio)) {
      return next();
    }

    // Extraer subdominio (primera parte antes del primer punto)
    const parts = dominio.split('.');
    if (parts.length < 2) return next();
    const subdomain = parts[0];

    // Ignorar subdominios reservados
    const reserved = ['www', 'mail', 'ftp', 'api', 'admin', 'webmail', 'cpanel'];
    if (reserved.includes(subdomain)) {
      return next();
    }

    // Buscar cliente por dominio
    const cliente = await Clientes.findOne({
      where: { dominio: subdomain, activo: true },
      attributes: ['id_cliente', 'razon_social', 'color_primario', 'color_secundario', 'color_terciario', 'color_fondo', 'logo_url'],
    });

    if (cliente) {
      req.id_cliente = cliente.id_cliente;
      req.clienteData = {
        razon_social: cliente.razon_social,
        color_primario: cliente.color_primario,
        color_secundario: cliente.color_secundario,
        color_terciario: cliente.color_terciario,
        color_fondo: cliente.color_fondo,
        logo_url: cliente.logo_url,
      };
    }

    next();
  } catch (error) {
    console.error('Error en subdomainMiddleware:', error);
    next();
  }
};

module.exports = { subdomainMiddleware };
