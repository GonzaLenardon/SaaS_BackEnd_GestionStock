const { ClienteConfig, Clientes } = require('../models');

const DEFAULT_CONFIG = {
  iva_porcentaje: '21',
  moneda: 'ARS',
  simbolo_moneda: '$',
  stock_minimo_alerta: '5',
  permitir_stock_negativo: 'false',
  formato_fecha: 'DD/MM/YYYY',
  timezone: 'America/Argentina/Buenos_Aires',
};

// Campos que se almacenan en la tabla clientes (no en key-value)
const CLIENTE_FIELDS = [
  'color_primario', 'color_secundario', 'color_terciario', 'color_fondo',
  'razon_social', 'logo_url',
];

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
  try {
    const id_cliente = req.id_cliente || req.params.id;
    const updates = req.body;

    // Separar campos del cliente de settings funcionales
    const clienteUpdates = {};
    const configUpdates = {};

    for (const [key, value] of Object.entries(updates)) {
      if (CLIENTE_FIELDS.includes(key)) {
        clienteUpdates[key] = value;
      } else {
        configUpdates[key] = value;
      }
    }

    // Actualizar campos del cliente (colores, logo, razon_social)
    if (Object.keys(clienteUpdates).length > 0) {
      await Clientes.update(clienteUpdates, { where: { id_cliente } });
    }

    // Actualizar settings funcionales (key-value)
    for (const [key, value] of Object.entries(configUpdates)) {
      await ClienteConfig.upsert({
        id_cliente,
        key,
        value: String(value),
        description: null,
      });
    }

    res.status(200).json({ message: 'Configuración actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};

module.exports = { getConfig, updateConfig };
