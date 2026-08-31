const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

class ClienteConfig extends Model {}

ClienteConfig.init(
  {
    id_config: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_cliente: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize: db,
    modelName: 'clienteConfig',
    tableName: 'cliente_config',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['id_cliente', 'key'],
      },
    ],
  },
);

module.exports = ClienteConfig;
