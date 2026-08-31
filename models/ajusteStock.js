const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

class AjusteStock extends Model {}

AjusteStock.init(
  {
    id_ajuste: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    motivo: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    observaciones: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    id_sucursal: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_cliente: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    modelName: 'ajuste_stock',
    tableName: 'ajuste_stock',
    timestamps: false,
  }
);

module.exports = AjusteStock;
