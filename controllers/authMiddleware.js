const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.cookies?.Token;

  if (!token) return res.status(401).json({ mensaje: 'Acceso no autorizado' });

  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
};

/**
 * requireRole — verifica que el usuario autenticado tenga uno de los roles permitidos.
 * Debe usarse DESPUÉS de authMiddleware.
 * @param  {...string} roles - Roles permitidos (ej: 'superadmin', 'admin')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ mensaje: 'Acceso no autorizado' });
    }
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ mensaje: 'No tenés permisos para realizar esta acción' });
    }
    next();
  };
};

module.exports = { authMiddleware, requireRole };
