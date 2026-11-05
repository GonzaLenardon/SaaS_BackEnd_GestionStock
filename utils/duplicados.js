/**
 * duplicados.js — Deteccion de productos que probablemente son el mismo.
 *
 * El objetivo NO es bloquear el alta, sino avisar al usuario y dejarle
 * decidir (confirmar o cancelar).
 *
 * Regla de coincidencia entre el producto que se quiere guardar (A) y uno
 * ya existente (B):
 *
 *   1. Misma marca (comparacion normalizada).
 *   2. Mismo talle.
 *   3. Nombre igual o muy parecido (tolerancia a errores de tipeo).
 *   4. Modelo y color "compatibles": iguales, del mismo grupo de
 *      equivalencia, o alguno de los dos es un valor sin especificar.
 *
 * Normalizacion: minusculas, sin acentos, sin espacios extra.
 */

/** Quita acentos, pasa a minusculas y colapsa espacios. */
const normalizar = (valor) =>
  String(valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

/**
 * Grupos de equivalencia por campo.
 *
 * - Un grupo con `comodin: true` representa un valor que NO aporta
 *   informacion ("Unico", "Varios", "Clasico"). Por eso es compatible con
 *   cualquier valor del mismo campo.
 * - Un grupo sin comodin solo equipara sus propios valores entre si
 *   (por ejemplo "Blanco" ~ "Blanca").
 */
const GRUPOS_EQUIVALENCIA = {
  modelo: [
    {
      nombre: 'sin_especificar',
      comodin: true,
      valores: [
        'unico',
        'u',
        'varios',
        'sin color',
        'sin especificar',
        'clasico',
        'clasica',
      ],
    },
  ],
  color: [
    {
      nombre: 'sin_especificar',
      comodin: true,
      valores: [
        'unico',
        'u',
        'varios',
        'sin color',
        'sin especificar',
        'clasico',
        'clasica',
      ],
    },
    {
      nombre: 'blanco',
      comodin: false,
      valores: ['blanco', 'blanca'],
    },
  ],
};

/**
 * Indica si dos valores del mismo campo se pueden considerar equivalentes.
 *
 * @param {string} campo - 'modelo' | 'color'
 * @param {string} a - valor normalizado
 * @param {string} b - valor normalizado
 */
const valoresCompatibles = (campo, a, b) => {
  // Si falta alguno de los dos valores no se puede afirmar que sean distintos.
  if (!a || !b) return true;
  if (a === b) return true;

  const grupos = GRUPOS_EQUIVALENCIA[campo] || [];

  for (const grupo of grupos) {
    const aEnGrupo = grupo.valores.includes(a);
    const bEnGrupo = grupo.valores.includes(b);

    if (aEnGrupo && bEnGrupo) return true;
    if (grupo.comodin && (aEnGrupo || bEnGrupo)) return true;
  }

  return false;
};

/** Distancia de edicion (Levenshtein) entre dos cadenas. */
const distanciaLevenshtein = (a, b) => {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  let anterior = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    const actual = [i];

    for (let j = 1; j <= n; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      actual[j] = Math.min(
        actual[j - 1] + 1,
        anterior[j] + 1,
        anterior[j - 1] + costo
      );
    }

    anterior = actual;
  }

  return anterior[n];
};

/**
 * Indica si dos nombres son "el mismo" para el usuario, tolerando errores
 * de tipeo ("jenas" ~ "jeans").
 */
const nombresSimilares = (a, b) => {
  if (!a || !b) return false;
  if (a === b) return true;

  const largo = Math.max(a.length, b.length);

  // Con menos de 4 caracteres la tolerancia seria demasiado permisiva.
  if (largo < 4) return false;

  const umbral = largo <= 6 ? 1 : 2;

  return distanciaLevenshtein(a, b) <= umbral;
};

/**
 * Busca productos que probablemente son el mismo que el indicado.
 *
 * @param {object} producto - { nombre, marca, modelo, color, talle }
 *   `talle` puede ser un string o un array de talles.
 * @param {number} id_cliente - tenant
 * @param {number|null} excluirId - producto a excluir (edicion)
 * @param {object} Productos - modelo Sequelize
 * @returns {Promise<Array>} productos coincidentes
 */
const buscarPosiblesDuplicados = async (
  producto,
  id_cliente,
  excluirId = null,
  Productos = null
) => {
  if (!Productos) {
    // eslint-disable-next-line global-require
    Productos = require('../models').Productos;
  }

  const { Op } = require('sequelize');

  const nombre = normalizar(producto.nombre);
  const marca = normalizar(producto.marca);
  const modelo = normalizar(producto.modelo);
  const color = normalizar(producto.color);

  const talles = (
    Array.isArray(producto.talle) ? producto.talle : [producto.talle]
  )
    .filter((t) => t !== undefined && t !== null && String(t).trim() !== '')
    .map((t) => String(t).trim());

  // Sin nombre o sin talle no se puede comparar de forma util.
  if (!nombre || talles.length === 0) return [];

  const where = { id_cliente };

  if (talles.length === 1) {
    where.talle = talles[0];
  } else {
    where.talle = { [Op.in]: talles };
  }

  if (excluirId) {
    where.id_producto = { [Op.ne]: excluirId };
  }

  const candidatos = await Productos.findAll({
    where,
    attributes: [
      'id_producto',
      'codigo',
      'nombre',
      'marca',
      'modelo',
      'color',
      'talle',
      'activo',
    ],
    raw: true,
  });

  return candidatos.filter((candidato) => {
    const cNombre = normalizar(candidato.nombre);
    const cMarca = normalizar(candidato.marca);
    const cModelo = normalizar(candidato.modelo);
    const cColor = normalizar(candidato.color);
    const cTalle = normalizar(candidato.talle);

    if (marca && cMarca && marca !== cMarca) return false;
    if (cTalle && !talles.some((t) => normalizar(t) === cTalle)) return false;

    if (!nombresSimilares(nombre, cNombre)) return false;

    if (!valoresCompatibles('modelo', modelo, cModelo)) return false;
    if (!valoresCompatibles('color', color, cColor)) return false;

    return true;
  });
};

module.exports = {
  normalizar,
  valoresCompatibles,
  nombresSimilares,
  distanciaLevenshtein,
  buscarPosiblesDuplicados,
  GRUPOS_EQUIVALENCIA,
};
