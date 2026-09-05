const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

class Compra extends Model {}

Compra.init(
  {
    id_compra: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    fecha: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    monto: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    numero: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
  { sequelize: db, modelName: 'compra' }
);

module.exports = Compra;
