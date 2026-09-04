const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

class Sucursal extends Model {}

Sucursal.init(
  {
    id_sucursal: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING, // Estaba mal como INTEGER
      allowNull: false,
    },
    domicilio: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    localidad: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    provincia: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contacto: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    celular: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    id_cliente: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    habilitado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize: db,
    modelName: 'sucursal',
    tableName: 'sucursales',
    timestamps: false,
  },
);

module.exports = Sucursal;
