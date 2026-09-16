const db = require('../config/db');
const { sincronizarMembresiasVencidas } = require('../utils/syncMembresias');

// Listar membresías con filtros
exports.getMembresias = async (req, res) => {
  try {
    // Sincronizar membresías vencidas antes de consultar
    await sincronizarMembresiasVencidas();

    const { estado, idCliente } = req.query;
    let queryText = `
      SELECT 
        m.idMembresia,
        m.Fecha_Inicio,
        m.Fecha_Fin,
        m.Estado,
        m.idCliente,
        c.Nombre AS Cliente_Nombre,
        c.Carnet AS Cliente_Carnet,
        c.Estado AS Cliente_Estado,
        m.idPlan,
        p.Nombre_Plan,
        p.Precio AS Plan_Precio,
        p.Duracion AS Plan_Duracion,
        (m.Fecha_Fin - CURRENT_DATE) AS Dias_Restantes,
        COALESCE(SUM(pg.Monto), 0) AS Total_Pagado,
        GREATEST(0, p.Precio - COALESCE(SUM(pg.Monto), 0)) AS Saldo_Pendiente,
        CASE 
          WHEN COALESCE(SUM(pg.Monto), 0) >= p.Precio THEN 'Pagado'
          WHEN COALESCE(SUM(pg.Monto), 0) > 0 THEN 'Parcial'
          ELSE 'Pendiente'
        END AS Estado_Pago,
        json_agg(
          json_build_object(
            'idPago', pg.idPago,
            'Monto', pg.Monto,
            'Fecha_Pago', pg.Fecha_Pago,
            'Nro_Comprobante', pg.Nro_Comprobante
          )
        ) FILTER (WHERE pg.idPago IS NOT NULL) AS Pagos
      FROM Membresia m
      JOIN Cliente c ON m.idCliente = c.idCliente
      JOIN Planes p ON m.idPlan = p.idPlan
      LEFT JOIN Pago pg ON m.idMembresia = pg.idMembresia
      WHERE 1=1
    `;
    const params = [];

    if (estado) {
      params.push(estado);
      queryText += ` AND m.Estado = $${params.length}`;
    }

    if (idCliente) {
      params.push(idCliente);
      queryText += ` AND m.idCliente = $${params.length}`;
    }

    queryText += `
      GROUP BY m.idMembresia, c.Nombre, c.Carnet, c.Estado, p.Nombre_Plan, p.Precio, p.Duracion
      ORDER BY m.idMembresia DESC
    `;

    const result = await db.query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener membresías:', error);
    res.status(500).json({ error: 'Error al obtener membresías', details: error.message });
  }
};

// Crear nueva membresía y opcionalmente registrar el pago
exports.createMembresia = async (req, res) => {
  const { idCliente, idPlan, Fecha_Inicio, registrarPago, Monto, Nro_Comprobante } = req.body;
  const client = await db.pool.connect();

  try {
    if (!idCliente || !idPlan) {
      return res.status(400).json({ error: 'idCliente e idPlan son obligatorios' });
    }

    await client.query('BEGIN');

    // Obtener duración y precio del plan
    const planRes = await client.query('SELECT Duracion, Precio FROM Planes WHERE idPlan = $1', [idPlan]);
    if (planRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Plan seleccionado no existe' });
    }

    const { duracion, precio } = {
      duracion: planRes.rows[0].duracion,
      precio: planRes.rows[0].precio
    };

    const inicio = Fecha_Inicio ? new Date(Fecha_Inicio) : new Date();
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + parseInt(duracion, 10));

    const inicioStr = inicio.toISOString().split('T')[0];
    const finStr = fin.toISOString().split('T')[0];

    // Desactivar membresías activas anteriores del cliente
    await client.query(
      `UPDATE Membresia SET Estado = 'Inactiva' WHERE idCliente = $1 AND Estado = 'Activa'`,
      [idCliente]
    );

    // Crear la nueva membresía
    const membresiaRes = await client.query(
      `INSERT INTO Membresia (Fecha_Inicio, Fecha_Fin, Estado, idCliente, idPlan)
       VALUES ($1, $2, 'Activa', $3, $4)
       RETURNING *`,
      [inicioStr, finStr, idCliente, idPlan]
    );

    const nuevaMembresia = membresiaRes.rows[0];

    // Activar automáticamente al cliente al registrar membresía
    await client.query(
      `UPDATE Cliente SET Estado = 'Activo' WHERE idCliente = $1`,
      [idCliente]
    );

    // Si se indicó registrar pago
    let pagoCreado = null;
    if (registrarPago || Monto) {
      const montoFinal = Monto !== undefined ? parseFloat(Monto) : parseFloat(precio);
      const comprobante = Nro_Comprobante || `REC-${Date.now().toString().slice(-6)}`;

      const pagoRes = await client.query(
        `INSERT INTO Pago (Monto, Fecha_Pago, Nro_Comprobante, idMembresia)
         VALUES ($1, CURRENT_DATE, $2, $3)
         RETURNING *`,
        [montoFinal, comprobante, nuevaMembresia.idmembresia]
      );
      pagoCreado = pagoRes.rows[0];
    }

    await client.query('COMMIT');
    res.status(201).json({
      membresia: nuevaMembresia,
      pago: pagoCreado,
      message: 'Membresía creada con éxito. Cliente activado automáticamente.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al registrar membresía:', error);
    res.status(500).json({ error: 'Error al registrar membresía', details: error.message });
  } finally {
    client.release();
  }
};

// Cambiar estado de membresía
exports.updateEstado = async (req, res) => {
  const { id } = req.params;
  const { Estado } = req.body;
  try {
    if (!['Activa', 'Inactiva', 'Vencida', 'Pendiente'].includes(Estado)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    const result = await db.query(
      `UPDATE Membresia SET Estado = $1 WHERE idMembresia = $2 RETURNING *`,
      [Estado, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Membresía no encontrada' });
    }

    // Si la membresía se activa manualmente, activar también al cliente
    if (Estado === 'Activa') {
      await db.query(
        `UPDATE Cliente SET Estado = 'Activo' WHERE idCliente = $1`,
        [result.rows[0].idcliente]
      );
    }

    // Si se inactiva/vence, verificar si el cliente tiene otra membresía activa
    if (['Inactiva', 'Vencida'].includes(Estado)) {
      const otraActiva = await db.query(
        `SELECT 1 FROM Membresia 
         WHERE idCliente = $1 AND Estado = 'Activa' AND Fecha_Fin >= CURRENT_DATE 
         LIMIT 1`,
        [result.rows[0].idcliente]
      );
      if (otraActiva.rows.length === 0) {
        await db.query(
          `UPDATE Cliente SET Estado = 'Inactivo' WHERE idCliente = $1`,
          [result.rows[0].idcliente]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar estado de membresía:', error);
    res.status(500).json({ error: 'Error al actualizar membresía', details: error.message });
  }
};
