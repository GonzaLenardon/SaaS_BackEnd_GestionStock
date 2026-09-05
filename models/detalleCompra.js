const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

class DetalleCompra extends Model {}

DetalleCompra.init(
  {
    id_detalle: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombreProducto: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    cantidad: {
      type: DataTypes.INTEGER,
      defaultValue: DataTypes.NOW,
    },
    costo: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    vencimiento: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    id_cliente: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    correlativo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Numero correlativo per-tenant para display',
    },
  },
  { sequelize: db, modelName: 'detallecompra' }
);

module.exports = DetalleCompra;
