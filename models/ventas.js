const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

class Ventas extends Model {}

Ventas.init(
  {
    id_venta: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    fecha: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    total: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    porcentaje_aplicado: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    monto_descuento: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_sucursal: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_tipo_venta: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tiene_cambios: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'true si esta venta fue modificada por cambios',
    },
    id_cliente: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },

  {
    timestamps: false,
    sequelize: db,
    modelName: 'ventas',
  },
);

module.exports = Ventas;
