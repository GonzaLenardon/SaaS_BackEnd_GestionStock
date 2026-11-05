const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

/**
 * Alias de codigos de barras.
 *
 * El codigo de barras de un producto se regenera cuando cambian su nombre,
 * marca o talle (ver utils/generarCodigo.js). Si eso pasa, el codigo anterior
 * queda registrado aca para que las etiquetas ya impresas sigan resolviendo
 * al producto correcto en las busquedas.
 *
 * productos.codigo      -> codigo ACTUAL (se imprime en las etiquetas)
 * producto_codigos      -> codigos ANTERIORES (solo se consultan al buscar)
 */
class ProductoCodigos extends Model {}

ProductoCodigos.init(
  {
    id_codigo: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_producto: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_cliente: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    codigo: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: db,
    modelName: 'productoCodigos',
    tableName: 'producto_codigos',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['id_cliente', 'codigo'],
        name: 'uq_producto_codigos_cliente_codigo',
      },
    ],
  },
);

module.exports = ProductoCodigos;
