const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

class Transferencia extends Model {}

Transferencia.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sucursal_origen_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sucursal_destino_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fecha: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
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
  {
    sequelize: db,
    modelName: 'transferencia',
    tableName: 'transferencias',
    timestamps: false,
  },
);

module.exports = Transferencia;
