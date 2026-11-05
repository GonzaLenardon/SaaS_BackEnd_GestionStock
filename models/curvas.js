const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

/**
 * Curvas de talles por tenant.
 * Ej: "Letras adulto" (S, M, L, Xl, Xxl), "Numerica 30-50" (30, 32, ... 50).
 * Los talles de la curva viven en CurvaTalles (lista expandida).
 */
class Curvas extends Model {}

Curvas.init(
  {
    id_curva: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    id_cliente: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    modelName: 'curvas',
    tableName: 'curvas',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['nombre', 'id_cliente'],
        name: 'uq_curvas_nombre_cliente',
      },
    ],
  },
);

module.exports = Curvas;
