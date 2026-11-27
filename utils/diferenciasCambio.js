/**
 * diferenciasCambio.js — Cálculo único de los importes de un cambio de productos.
 *
 * Un cambio tiene dos lados:
 *   - devuelto: lo que el cliente devuelve (productos de la venta original)
 *   - recibido: lo que el cliente se lleva (productos nuevos)
 *
 * De ahí sale UN saldo con dos destinos posibles:
 *   - a cobrar             (recibido > devuelto): el cliente paga la diferencia
 *   - a favor del comercio (devuelto > recibido): el comercio retiene la
 *     diferencia. No es una venta, ni un cobro, ni un producto: es un ajuste
 *     del cambio, fuera de los totales de ventas.
 *
 * Todos los importes se redondean a 2 decimales (pesos) acá y en ningún otro
 * lugar: el frontend, los listados y el detalle de venta toman estos mismos
 * valores para que todo cuadre.
 */

/** Redondea a 2 decimales (importes en pesos). */
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Total de un lado del cambio ('devuelve' | 'recibe'). */
const totalLado = (detalles, tipo) =>
  round2(
    (detalles || [])
      .filter((d) => d.tipo === tipo)
      .reduce((s, d) => s + Number(d.precio_unitario) * Number(d.cantidad), 0),
  );

/**
 * Totales de un cambio o de la lista de cambios de una venta.
 *
 * @param {Array} cambios - objetos con `cambiodetalles` (o `detalles`)
 * @returns {{
 *   totalDevuelto: number,
 *   totalRecibido: number,
 *   diferenciaACobrar: number,
 *   diferenciaFavorComercio: number,
 *   totalCompensado: number,
 * }}
 */
const calcularDiferencia = (cambios) => {
  let devuelto = 0;
  let recibido = 0;

  (cambios || []).forEach((cambio) => {
    const detalles = cambio.cambiodetalles || cambio.detalles || [];
    devuelto += totalLado(detalles, 'devuelve');
    recibido += totalLado(detalles, 'recibe');
  });

  const totalDevuelto = round2(devuelto);
  const totalRecibido = round2(recibido);
  const saldo = round2(totalRecibido - totalDevuelto);

  return {
    totalDevuelto,
    totalRecibido,
    // El cliente paga la diferencia.
    diferenciaACobrar: saldo > 0 ? saldo : 0,
    // El comercio retiene la diferencia: ajuste del cambio, fuera de ventas.
    diferenciaFavorComercio: saldo < 0 ? round2(Math.abs(saldo)) : 0,
    // Total que queda compensado entre las dos partes.
    totalCompensado: round2(Math.max(totalDevuelto, totalRecibido)),
  };
};

module.exports = { calcularDiferencia, round2 };
