const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

class Clientes extends Model {}

Clientes.init(
  {
    id_cliente: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    razon_social: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    cuit: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    telefono: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    dominio: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
    color_primario: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: '#1a73e8',
    },
    color_secundario: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: '#34a853',
    },
    color_terciario: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: '#ea4335',
    },
    color_fondo: {
      type: DataTypes.STRING(7),
      allowNull: false,
      defaultValue: '#ffffff',
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: db,
    modelName: 'clientes',
    tableName: 'clientes',
    timestamps: false,
  },
);

module.exports = Clientes;
