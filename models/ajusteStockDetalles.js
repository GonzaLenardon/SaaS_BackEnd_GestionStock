const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

class AjusteStockDetalle extends Model {}

AjusteStockDetalle.init(
  {
    id_detalle_ajuste: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    id_ajuste: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    producto_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    id_detalle_compra: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    cantidad: {
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
    modelName: 'ajuste_stock_detalle',
    tableName: 'ajuste_stock_detalle',
    timestamps: false,
  }
);

module.exports = AjusteStockDetalle;
