'use strict';

const db = require('../db/conection');
const S = require('sequelize');

class TipoVenta extends S.Model {}

TipoVenta.init(
  {
    id_tipo: {
      type: S.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tipoVenta: {
      type: S.STRING,
      allowNull: false,
    },

    porcentajeVenta: {
      type: S.FLOAT,
      allowNull: false,
    },
    tipo_porcentaje: {
      type: S.STRING,
      allowNull: false,
      defaultValue: 'descuento',
    },
    habilitado: {
      type: S.BOOLEAN,
      allowNull: false,
    },
    color: {
      type: S.STRING(7),
      allowNull: true,
      defaultValue: '#FF6B9D',
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
  { sequelize: db, modelName: 'tipoventa' }
);

module.exports = TipoVenta;
