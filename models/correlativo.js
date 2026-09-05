const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

class Correlativo extends Model {}

Correlativo.init(
  {
    id_correlativo: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_cliente: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    entity_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Nombre de la tabla: ventas, compra, productos, etc.',
    },
    last_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Ultimo correlativo asignado para esta entidad y tenant',
    },
  },
  {
    sequelize: db,
    modelName: 'correlativo',
    tableName: 'correlativos',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['id_cliente', 'entity_type'],
        name: 'uq_correlativo_cliente_entity',
      },
    ],
  },
);

module.exports = Correlativo;
