const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

class TransferenciaDetalle extends Model {}

TransferenciaDetalle.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    transferencia_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    producto_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    nombreProducto: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    lote: {
      type: DataTypes.STRING,
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
  },
  {
    sequelize: db,
    modelName: 'transferencia_detalle',
    tableName: 'transferencia_detalles',
    timestamps: false,
  },
);

module.exports = TransferenciaDetalle;
