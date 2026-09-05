'use strict';

const db = require('../db/conection');
const S = require('sequelize');

class TipoGastos extends S.Model {}

TipoGastos.init(
  {
    id_tipogasto: {
      type: S.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tipoGasto: {
      type: S.STRING,
      allowNull: false,
    },
    id_cliente: {
      type: S.INTEGER,
      allowNull: true,
    },
    correlativo: {
      type: S.INTEGER,
      allowNull: true,
      comment: 'Numero correlativo per-tenant para display',
    },
  },
  { sequelize: db, modelName: 'tipoGastos' }
);

module.exports = TipoGastos;
