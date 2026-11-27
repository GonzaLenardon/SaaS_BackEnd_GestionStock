const { ClienteConfig, Clientes, TipoVenta } = require('../models');
const { invalidarCache } = require('../utils/numeracion');
const db = require('../db/conection');

const DEFAULT_CONFIG = {
  iva_porcentaje: '21',
  moneda: 'ARS',
  simbolo_moneda: '$',
  stock_minimo_alerta: '5',
  permitir_stock_negativo: 'false',
  formato_fecha: 'DD/MM/YYYY',
  timezone: 'America/Argentina/Buenos_Aires',
  modo_vista_productos: 'seleccion',
  modo_calculo_precio_producto: 'costo_porcentaje',
  imprimir_precio_etiqueta: 'false',
  tipo_venta_precio_etiqueta: '',
  margen_impresora_etiqueta: '4',
};

// Campos que se almacenan en la tabla clientes (no en key-value)
const CLIENTE_FIELDS = [
  'color_primario', 'color_secundario', 'color_terciario', 'color_fondo',
  'razon_social', 'logo_url',
];

// Claves booleanas: solo se aceptan 'true' / 'false'.
const CLAVES_BOOLEANAS = new Set([
  'permitir_stock_negativo',
  'imprimir_precio_etiqueta',
  'numeracion_por_correlativo',
]);

// Claves enumeradas: solo los valores permitidos.
const CLAVES_ENUMERADAS = {
  modo_vista_productos: ['seleccion', 'acciones_visibles'],
  modo_calculo_precio_producto: ['costo_porcentaje', 'costo_precio'],
};

// Claves numericas con su rango permitido.
const CLAVES_NUMERICAS = {
  iva_porcentaje: [0, 100],
  stock_minimo_alerta: [0, 1000000],
  margen_impresora_etiqueta: [0, 15],
};

/**
 * Valores que jamas son una configuracion real: son el resultado de que el
 * cliente mande un null/undefined y de que al guardarlo se convierta en
 * texto. Antes, un null endingo guardado como la cadena "null" y eso
 * deshabilitaba silenciosamente permisos y el tipo de venta de las etiquetas.
 */
const VALORES_NULOS = new Set(['', 'null', 'undefined', 'NaN', '[object Object]']);

/** Normaliza un valor a string para compararlo y guardarlo. */
const aTexto = (valor) => {
  if (valor === true) return 'true';
  if (valor === false) return 'false';
  if (valor === null || valor === undefined) return '';
  return String(valor).trim();
};

/**
 * Valida y normaliza el valor de una clave de configuracion.
 *
 * @param {string} key
 * @param {*} valorCrudo
 * @param {number} id_cliente
 * @returns {{ok: true, valor: string} | {ok: false, mensaje: string, omitir?: boolean}}
 *   `omitir: true` significa "no escribas nada": el valor no es informacion
 *   util y pisaria una configuracion que el tenant ya tiene.
 */
const validarValor = async (key, valorCrudo, id_cliente) => {
  const texto = aTexto(valorCrudo);

  // Null / undefined / cadena vacia: no es un valor, no se escribe nada.
  // La excepcion es tipo_venta_precio_etiqueta, donde '' significa
  // "solo el precio del sistema" (una eleccion valida y explicita).
  const vacio = texto === '' || texto === 'null' || texto === 'undefined';
  if (vacio) {
    if (key === 'tipo_venta_precio_etiqueta' && texto === '') {
      return { ok: true, valor: '' };
    }
    return { ok: false, omitir: true, mensaje: `El valor de "${key}" viene vacio.` };
  }

  // Booleanos (y permisos, que tambien son booleanos).
  if (CLAVES_BOOLEANAS.has(key) || key.startsWith('perm_')) {
    if (texto === 'true' || texto === 'false') return { ok: true, valor: texto };
    return { ok: false, mensaje: `El valor de "${key}" debe ser true o false.` };
  }

  // Enumeradas.
  if (CLAVES_ENUMERADAS[key]) {
    if (CLAVES_ENUMERADAS[key].includes(texto)) return { ok: true, valor: texto };
    return {
      ok: false,
      mensaje: `El valor de "${key}" debe ser uno de: ${CLAVES_ENUMERADAS[key].join(', ')}.`,
    };
  }

  // Numericas.
  if (CLAVES_NUMERICAS[key]) {
    const numero = Number(texto);
    const [min, max] = CLAVES_NUMERICAS[key];
    if (!Number.isFinite(numero) || numero < min || numero > max) {
      return { ok: false, mensaje: `El valor de "${key}" debe ser un numero entre ${min} y ${max}.` };
    }
    return { ok: true, valor: String(numero) };
  }

  // El tipo de venta de las etiquetas tiene que ser del MISMO tenant y
  // estar habilitado: si no, la opcion de precio desaparece en silencio.
  if (key === 'tipo_venta_precio_etiqueta') {
    const idTipo = Number(texto);
    if (!Number.isInteger(idTipo) || idTipo <= 0) {
      return { ok: false, mensaje: 'El tipo de venta de las etiquetas no es valido.' };
    }
    const tipo = await TipoVenta.findOne({
      where: { id_tipo: idTipo, id_cliente: id_cliente },
    });
    if (!tipo) {
      return {
        ok: false,
        mensaje: 'El tipo de venta elegido no pertenece a tu tienda.',
      };
    }
    if (!tipo.habilitado) {
      return {
        ok: false,
        mensaje: `El tipo de venta "${tipo.tipoVenta}" esta deshabilitado: habilitalo o elegi otro.`,
      };
    }
    return { ok: true, valor: String(idTipo) };
  }

  return { ok: true, valor: texto };
};

const getConfig = async (req, res) => {
  try {
    const id_cliente = req.id_cliente || req.params.id;

    // 1. Datos del cliente (colores, logo, razon_social)
    const cliente = await Clientes.findByPk(id_cliente, {
      attributes: ['razon_social', 'logo_url', 'color_primario', 'color_secundario', 'color_terciario', 'color_fondo'],
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const configMap = {
      razon_social: cliente.razon_social,
      logo_url: cliente.logo_url,
      color_primario: cliente.color_primario,
      color_secundario: cliente.color_secundario,
      color_terciario: cliente.color_terciario,
      color_fondo: cliente.color_fondo,
    };

    // 2. Settings funcionales (key-value)
    const configs = await ClienteConfig.findAll({
      where: { id_cliente },
    });

    for (const key of Object.keys(DEFAULT_CONFIG)) {
      const found = configs.find((c) => c.key === key);
      configMap[key] = found ? found.value : DEFAULT_CONFIG[key];
    }

    // Keys adicionales que no están en DEFAULT_CONFIG
    for (const c of configs) {
      if (!(c.key in configMap)) {
        configMap[c.key] = c.value;
      }
    }

    res.status(200).json(configMap);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

const updateConfig = async (req, res) => {
  const id_cliente = req.id_cliente || req.params.id;

  try {
    const updates = req.body || {};

    // Separar campos del cliente de settings funcionales
    const clienteUpdates = {};
    const configUpdates = {};

    for (const [key, value] of Object.entries(updates)) {
      if (CLIENTE_FIELDS.includes(key)) {
        // Un null o un vacio en logo_url borraria el logo del tenant, y en
        // los colores (NOT NULL) reventaria la base: no se escriben.
        if (value === null || value === undefined) continue;
        if (key === 'logo_url' && aTexto(value) === '') continue;
        clienteUpdates[key] = value;
      } else {
        configUpdates[key] = value;
      }
    }

    // La razon social no puede quedar vacia: se usa como marca en la app.
    if ('razon_social' in clienteUpdates) {
      const razon = aTexto(clienteUpdates.razon_social);
      if (!razon) {
        return res.status(400).json({ message: 'La razon social no puede quedar vacia.' });
      }
      clienteUpdates.razon_social = razon;
    }

    // Validar TODAS las claves antes de escribir una sola: si algo esta
    // mal, no se escribe nada (antes se escribian de a una y un fallo
    // dejaba la configuracion del tenant a medias).
    const valoresValidos = {};
    const omitidas = [];
    for (const [key, value] of Object.entries(configUpdates)) {
      const resultado = await validarValor(key, value, id_cliente);
      if (!resultado.ok) {
        if (resultado.omitir) {
          omitidas.push(key);
          continue;
        }
        return res.status(400).json({ message: resultado.mensaje, clave: key });
      }
      valoresValidos[key] = resultado.valor;
    }

    const t = await db.transaction();

    try {
      // Actualizar campos del cliente (colores, logo, razon_social)
      if (Object.keys(clienteUpdates).length > 0) {
        await Clientes.update(clienteUpdates, { where: { id_cliente }, transaction: t });
      }

      // Actualizar settings funcionales (key-value)
      for (const [key, value] of Object.entries(valoresValidos)) {
        await ClienteConfig.upsert(
          {
            id_cliente,
            key,
            value: String(value),
            description: null,
          },
          { transaction: t },
        );
      }

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }

    // La numeracion visible puede haber cambiado: se invalida la cache.
    invalidarCache(id_cliente);

    if (omitidas.length > 0) {
      console.log(
        `[config] Tenant ${id_cliente}: claves sin valor, se conservaron como estaban: ${omitidas.join(', ')}`,
      );
    }
    console.log(
      `[config] Tenant ${id_cliente}: claves actualizadas: ${Object.keys(valoresValidos).join(', ') || '(ninguna)'}`,
    );

    res.status(200).json({ message: 'Configuración actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};

module.exports = { getConfig, updateConfig };
