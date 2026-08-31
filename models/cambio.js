const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

class Cambios extends Model {}

Cambios.init(
  {
    id_cambio: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_venta_original: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_venta_diferencia: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    fecha: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    observaciones: {
      type: DataTypes.STRING,
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'activo',
      comment: 'activo=vigente, reversado=anulado, anulado=cancelado',
    },
    id_cliente: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    modelName: 'cambios',
    timestamps: false,
  },
);

module.exports = Cambios;
