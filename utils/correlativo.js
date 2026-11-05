const Correlativo = require('../models/correlativo');
const db = require('../db/conection');

/**
 * Obtiene el siguiente numero correlativo para una entidad y tenant.
 * Usa SELECT ... FOR UPDATE para evitar race conditions.
 *
 * @param {number} id_cliente - ID del tenant
 * @param {string} entityType - Nombre de la tabla (ej: 'ventas', 'productos')
 * @param {object} [transaction] - Transaccion externa opcional
 * @returns {Promise<number>} Siguiente numero correlativo
 */
async function getNextCorrelative(id_cliente, entityType, transaction = null) {
  const useOwnTransaction = !transaction;
  const t = transaction || await db.transaction();

  try {
    // Se asegura que exista la fila del correlativo para el tenant.
    await Correlativo.findOrCreate({
      where: { id_cliente, entity_type: entityType },
      defaults: { id_cliente, entity_type: entityType, last_number: 0 },
      transaction: t,
    });

    // Se relee la fila con FOR UPDATE: el lock se mantiene hasta el commit,
    // asi dos requests concurrentes no leen el mismo last_number.
    const correlativo = await Correlativo.findOne({
      where: { id_cliente, entity_type: entityType },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!correlativo) {
      throw new Error(
        `No se pudo obtener el correlativo de "${entityType}" para el cliente ${id_cliente}`,
      );
    }

    correlativo.last_number += 1;
    await correlativo.save({ transaction: t });

    if (useOwnTransaction) {
      await t.commit();
    }

    return correlativo.last_number;
  } catch (error) {
    if (useOwnTransaction) {
      await t.rollback();
    }
    throw error;
  }
}

module.exports = { getNextCorrelative };
