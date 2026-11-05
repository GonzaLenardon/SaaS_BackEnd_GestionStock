const { Curvas, CurvaTalles } = require('../models');

/**
 * Curvas de talles estandar de la plataforma.
 *
 * Son las dos que se usan por convencion y se crean automaticamente para
 * cada cliente nuevo. Cada cliente tiene SU PROPIA copia, asi puede agregar
 * talles (un 34, un 54, un 5Xl...) sin afectar a los demas.
 *
 * El formato de los talles de letras sigue la convencion del sistema
 * (TitleCase): S, M, L, Xl, 2Xl, 3Xl, 4Xl.
 */
const CURVAS_POR_DEFECTO = [
  {
    nombre: 'Letras',
    descripcion: 'Curva de letras estandar. Se puede extender (5Xl, 6Xl...)',
    talles: ['S', 'M', 'L', 'Xl', '2Xl', '3Xl', '4Xl'],
  },
  {
    nombre: 'Numerica',
    descripcion: 'Curva numerica estandar, de 2 en 2 desde el 36. Se puede extender (34, 54, 56...)',
    talles: ['36', '38', '40', '42', '44', '46', '48', '50', '52'],
  },
];

/**
 * Crea las curvas por defecto para un cliente, si aun no existen.
 *
 * @param {number} id_cliente
 * @param {object} [transaction] - transaccion externa opcional
 * @returns {Promise<Array>} las curvas creadas
 */
const crearCurvasPorDefecto = async (id_cliente, transaction = null) => {
  if (!id_cliente) return [];

  const creadas = [];

  for (const definicion of CURVAS_POR_DEFECTO) {
    const existente = await Curvas.findOne({
      where: { nombre: definicion.nombre, id_cliente },
    });

    if (existente) continue;

    const curva = await Curvas.create(
      {
        nombre: definicion.nombre,
        descripcion: definicion.descripcion,
        id_cliente,
        activo: true,
      },
      { transaction },
    );

    await CurvaTalles.bulkCreate(
      definicion.talles.map((talle, index) => ({
        id_curva: curva.id_curva,
        talle,
        orden: index,
      })),
      { transaction },
    );

    creadas.push(curva);
  }

  return creadas;
};

module.exports = { CURVAS_POR_DEFECTO, crearCurvasPorDefecto };
