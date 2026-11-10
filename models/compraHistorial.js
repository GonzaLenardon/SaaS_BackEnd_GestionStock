const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

// Auditoria de compras: cada edicion o eliminacion deja un registro con el
// estado anterior y posterior (JSON). No tiene FK a compras porque la compra
// puede ser eliminada.
class CompraHistorial extends Model {}

CompraHistorial.init(
  {
    id_historial: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_compra: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    accion: {
      type: DataTypes.STRING(20),
      allowNull: false, // 'editar' | 'eliminar'
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    id_cliente: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    antes: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    despues: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    fecha: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: db,
    modelName: 'compraHistorial',
    tableName: 'compras_historial',
    timestamps: false,
  }
);

module.exports = CompraHistorial;
