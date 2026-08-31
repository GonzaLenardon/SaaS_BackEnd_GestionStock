const jwt = require('jsonwebtoken');
require('dotenv');

const secret = process.env.SECRET;

const generateToken = (payload) => {
  return (token = jwt.sign({ user: payload }, secret, { expiresIn: '1d' }));
};

const validateToken = (token) => {
  return jwt.verify(token, secret);
};

module.exports = { generateToken, validateToken };
