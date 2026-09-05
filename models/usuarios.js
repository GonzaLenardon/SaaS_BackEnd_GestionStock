// models/usuarios.js
'use strict';

const db = require('../db/conection');
const S = require('sequelize');
const bc = require('bcrypt');

class Usuarios extends S.Model {
  createHash(pass, salt) {
    return bc.hash(pass, salt);
  }

  validatePass(pass) {
    return this.createHash(pass, this.salt).then(
      (newHash) => newHash === this.password
    );
  }
}

Usuarios.init(
  {
    id_usuario: {
      type: S.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    nombre: {
      type: S.STRING,
      allowNull: false,
    },

    password: {
      type: S.STRING,
      allowNull: false,
    },

    salt: { type: S.STRING },
    rol: {
      type: S.STRING,
    },
    id_cliente: {
      type: S.INTEGER,
      allowNull: true,
    },
    id_sucursal: {
      type: S.INTEGER,
      allowNull: true,
    },
    activo: {
      type: S.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    correlativo: {
      type: S.INTEGER,
      allowNull: true,
      comment: 'Numero correlativo per-tenant para display',
    },
  },

  {
    sequelize: db,
    modelName: 'usuarios',
    indexes: [
      {
        unique: true,
        fields: ['nombre', 'id_cliente'],
        name: 'uq_nombre_cliente',
      },
    ],
  }
);

Usuarios.addHook('beforeCreate', (usuarios) => {
  const salt = bc.genSaltSync();
  usuarios.salt = salt;

  return usuarios
    .createHash(usuarios.password, usuarios.salt)
    .then((result) => (usuarios.password = result))
    .catch((error) => console.log(error));
});

module.exports = Usuarios;
