const db = require('../config/db');

/**
 * Sincroniza automáticamente el estado de membresías vencidas
 * y desactiva a los clientes cuyas membresías activas hayan vencido.
 * 
 * Utiliza una CTE para inactivar únicamente a los clientes cuya membresía
 * activa acaba de expirar (y no tienen otra membresía activa vigente).
 * Esto permite que un administrador pueda reactivar manualmente a un cliente
 * sin que una membresía previamente vencida lo fuerce de nuevo a 'Inactivo'.
 */
async function sincronizarMembresiasVencidas() {
  try {
    await db.query(`
      WITH membresias_que_vencen AS (
        UPDATE Membresia 
        SET Estado = 'Vencida' 
        WHERE Estado = 'Activa' 
          AND Fecha_Fin < CURRENT_DATE
        RETURNING idCliente
      )
      UPDATE Cliente 
      SET Estado = 'Inactivo' 
      WHERE idCliente IN (SELECT idCliente FROM membresias_que_vencen)
        AND Estado = 'Activo'
        AND NOT EXISTS (
          SELECT 1 FROM Membresia 
          WHERE Membresia.idCliente = Cliente.idCliente 
            AND Membresia.Estado = 'Activa' 
            AND Membresia.Fecha_Fin >= CURRENT_DATE
        )
    `);
  } catch (error) {
    console.error('Error en sincronización de membresías:', error.message);
  }
}

module.exports = { sincronizarMembresiasVencidas };
