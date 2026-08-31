const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

class Gastos extends Model {}

Gastos.init(
  {
    id_gasto: {
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
    observaciones: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    id_tipogasto: {
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
  { sequelize: db, modelName: 'gastos' }
);

module.exports = Gastos;
