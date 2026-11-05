const { Model, DataTypes } = require('sequelize');
const db = require('../db/conection');

/**
 * Talles que pertenecen a una curva.
 * Se guarda la lista EXPANDIDA: una curva "30 a 50 paso 2" tiene 11 filas
 * (30, 32, 34, ... 50). El rango es solo una comodidad de la interfaz.
 */
class CurvaTalles extends Model {}

CurvaTalles.init(
  {
    id_curva_talle: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_curva: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    talle: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize: db,
    modelName: 'curvaTalles',
    tableName: 'curva_talles',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['id_curva', 'talle'],
        name: 'uq_curva_talles_curva_talle',
      },
    ],
  },
);

module.exports = CurvaTalles;
