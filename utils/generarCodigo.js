const generarCodigo = async (producto) => {
  const { id_producto, nombre, marca, talle } = producto;

  const nomCod = (nombre || '')
    .substring(0, 3)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const marCod = (marca || '')
    .substring(0, 3)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const talCod = (talle || '')
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 3);

  // Formato final: ID(4) + NOM(3) + MAR(3) + TAL(3) = máx. 13
  return `${id_producto
    .toString()
    .padStart(4, '0')}${nomCod}${marCod}${talCod}`;
};

module.exports = { generarCodigo };
