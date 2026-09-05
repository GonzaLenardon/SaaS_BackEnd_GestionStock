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
    const [correlativo] = await Correlativo.findOrCreate({
      where: { id_cliente, entity_type: entityType },
      defaults: { id_cliente, entity_type: entityType, last_number: 0 },
      transaction: t,
    });

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
