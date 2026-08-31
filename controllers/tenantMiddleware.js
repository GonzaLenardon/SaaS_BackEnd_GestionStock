/**
 * Middleware multi-tenant.
 * Inyecta req.id_cliente desde el JWT decodificado.
 * Los superadmins pueden operar sin id_cliente (cross-tenant).
 * DEBE usarse DESPUÉS de authMiddleware.
 */
const tenantMiddleware = (req, res, next) => {
  if (req.user?.rol === 'superadmin') {
    req.id_cliente = req.user.id_cliente || null;
    return next();
  }
  if (!req.user?.id_cliente) {
    return res.status(403).json({ error: 'Cliente no identificado' });
  }
  req.id_cliente = req.user.id_cliente;
  next();
};

module.exports = { tenantMiddleware };
