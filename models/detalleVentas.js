const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

class DetalleVentas extends Model {}

DetalleVentas.init(
  {
    id_detalleventa: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombreProducto: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    total: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    id_sucursal: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_detalle_compra: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Referencia al lote de compra para trazabilidad',
    },
    es_cambio: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'true si este producto es parte de un cambio',
    },
    es_reversado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'true si este producto fue devuelto en un cambio',
    },
    id_cambio_asociado: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Link a DetalleCambios para auditoría cuando es_cambio=true',
    },
    id_cliente: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    timestamps: false,
    sequelize: db,
    modelName: 'detalleventas',
  },
);

module.exports = DetalleVentas;
