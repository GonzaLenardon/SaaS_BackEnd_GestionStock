const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

class Detallecambio extends Model {}

Detallecambio.init(
  {
    id_detalle_cambio: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_cambio: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    producto_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    tipo: {
      type: DataTypes.ENUM('devuelve', 'recibe'),
      allowNull: false,
    },

    precio_unitario: {
      type: DataTypes.DECIMAL,
      allowNull: false,
    },

    reemplazado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    id_detalle_compra: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_cliente: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    modelName: 'detallecambio',
  }
);

module.exports = Detallecambio;
