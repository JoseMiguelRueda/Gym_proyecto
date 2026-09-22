const db = require('../config/db');

/**
 * Invoca el procedimiento almacenado sp_sincronizar_membresias_vencidas()
 * en PostgreSQL para actualizar el estado de membresías vencidas y de clientes.
 */
async function sincronizarMembresiasVencidas() {
  try {
    await db.query('CALL sp_sincronizar_membresias_vencidas()');
  } catch (error) {
    console.error('Error al sincronizar membresías vía procedimiento almacenado:', error.message);
  }
}

module.exports = { sincronizarMembresiasVencidas };
