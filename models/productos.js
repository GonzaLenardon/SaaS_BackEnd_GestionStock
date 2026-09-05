'use strict';

const db = require('../db/conection');
const S = require('sequelize');

class Productos extends S.Model {}

Productos.init(
  {
    id_producto: {
      type: S.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    codigo: {
      type: S.STRING,
    },

    nombre: {
      type: S.STRING,
      allowNull: false,
    },
    marca: {
      type: S.STRING,
      allowNull: false,
      /*  defaultValue: 'propio', */
    },
    modelo: {
      type: S.STRING,
      allowNull: false,
    },

    talle: {
      type: S.STRING,
      allowNull: false,
    },

    color: {
      type: S.STRING,
      allowNull: false,
    },

    costo: {
      type: S.FLOAT,
      allowNull: false,
    },
    porcentaje: {
      type: S.FLOAT,
      allowNull: false,
    },
    precio_venta: {
      type: S.FLOAT,
      allowNull: false,
    },
    observaciones: {
      type: S.STRING,
      allowNull: true,
    },
    createdAt: {
      type: S.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: S.DATE,
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
    activo: {
      type: S.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  { sequelize: db, modelName: 'productos', timestamps: false },
);

module.exports = Productos;
