const db = require('../config/db');

// Obtener todos los clientes con estado de membresía y entrenador mediante función almacenada
exports.getClientes = async (req, res) => {
  try {
    const { busqueda, estado } = req.query;
    // La función fn_buscar_clientes consulta sobre la vista optimizada vw_clientes_detalle
    // utilizando índices B-Tree en Carnet, Estado y LOWER(Nombre).
    const result = await db.query(
      'SELECT * FROM fn_buscar_clientes($1, $2)',
      [busqueda || null, estado || null]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener clientes vía función:', error);
    res.status(500).json({ error: 'Error al obtener clientes', details: error.message });
  }
};

// Obtener detalle de un cliente con su historial mediante función analítica
exports.getClienteById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT fn_obtener_cliente_detalle($1) AS data', [id]);
    const data = result.rows[0]?.data;

    if (!data || !data.cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error al obtener detalle del cliente:', error);
    res.status(500).json({ error: 'Error al obtener cliente', details: error.message });
  }
};

// Registrar nuevo cliente mediante procedimiento almacenado
exports.createCliente = async (req, res) => {
  const { Nombre, Carnet, Telefono, Email, idEntrenador } = req.body;
  try {
    if (!Nombre || !Carnet) {
      return res.status(400).json({ error: 'Nombre y Carnet son obligatorios' });
    }

    // Invocar procedimiento almacenado para la inserción segura
    const procRes = await db.query(
      'CALL sp_crear_cliente($1, $2, $3, $4, $5, NULL)',
      [Nombre, Carnet, Telefono || null, Email || null, idEntrenador || null]
    );

    const newId = procRes.rows[0]?.p_id_cliente;

    // Retornar la entidad consolidada desde la vista
    const clienteRes = await db.query('SELECT * FROM vw_clientes_detalle WHERE idCliente = $1', [newId]);
    res.status(201).json(clienteRes.rows[0] || { idCliente: newId });
  } catch (error) {
    if (error.code === '23505' || (error.message && error.message.includes('Ya existe un cliente'))) {
      return res.status(400).json({ error: 'Ya existe un cliente con ese número de carnet' });
    }
    console.error('Error al crear cliente vía procedimiento:', error);
    res.status(500).json({ error: 'Error al registrar cliente', details: error.message });
  }
};

// Actualizar datos del cliente mediante procedimiento almacenado
exports.updateCliente = async (req, res) => {
  const { id } = req.params;
  const { Nombre, nombre, Carnet, carnet, Telefono, telefono, Email, email, idEntrenador, identrenador, Estado, estado } = req.body;
  try {
    const nombreVal = Nombre !== undefined ? Nombre : nombre;
    const carnetVal = Carnet !== undefined ? Carnet : carnet;
    const telefonoVal = Telefono !== undefined ? Telefono : telefono;
    const emailVal = Email !== undefined ? Email : email;
    const entrenadorVal = idEntrenador !== undefined ? idEntrenador : identrenador;
    const estadoVal = Estado !== undefined ? Estado : estado;

    await db.query(
      'CALL sp_actualizar_cliente($1, $2, $3, $4, $5, $6, $7)',
      [
        id,
        nombreVal !== undefined ? nombreVal : null,
        carnetVal !== undefined ? carnetVal : null,
        telefonoVal !== undefined ? telefonoVal : null,
        emailVal !== undefined ? emailVal : null,
        entrenadorVal !== undefined ? entrenadorVal : null,
        estadoVal !== undefined ? estadoVal : null,
      ]
    );

    const clienteRes = await db.query('SELECT * FROM vw_clientes_detalle WHERE idCliente = $1', [id]);
    if (clienteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json(clienteRes.rows[0]);
  } catch (error) {
    if (error.code === '23505' || (error.message && error.message.includes('ya se encuentra registrado'))) {
      return res.status(400).json({ error: 'El carnet ingresado ya está asignado a otro cliente' });
    }
    console.error('Error al actualizar cliente vía procedimiento:', error);
    res.status(500).json({ error: 'Error al actualizar cliente', details: error.message });
  }
};

// Cambiar estado del cliente (Activo / Inactivo) mediante procedimiento almacenado
exports.updateEstado = async (req, res) => {
  const { id } = req.params;
  const { Estado } = req.body;
  try {
    if (!Estado || !['Activo', 'Inactivo'].includes(Estado)) {
      return res.status(400).json({ error: 'Estado no válido. Debe ser Activo o Inactivo' });
    }

    // El procedimiento sp_cambiar_estado_cliente dispara automáticamente los triggers:
    // fn_trg_cliente_cambio_estado para inactivar membresías si se pasa a Inactivo
    await db.query('CALL sp_cambiar_estado_cliente($1, $2)', [id, Estado]);

    const clienteRes = await db.query('SELECT * FROM vw_clientes_detalle WHERE idCliente = $1', [id]);
    if (clienteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const cliente = clienteRes.rows[0];
    let aviso = null;
    if (Estado === 'Activo' && (cliente.estado_membresia === 'Sin Membresía' || cliente.estado_membresia === 'Vencida' || cliente.dias_restantes < 0)) {
      aviso = 'Cliente reactivado, pero no cuenta con membresía vigente. Requiere renovación para habilitar acceso.';
    }

    res.json({
      message: `Cliente ${Estado === 'Activo' ? 'reactivado' : 'dado de baja'} exitosamente`,
      aviso,
      cliente,
    });
  } catch (error) {
    console.error('Error al actualizar estado vía procedimiento:', error);
    res.status(500).json({ error: 'Error al actualizar estado del cliente', details: error.message });
  }
};

// Baja lógica del cliente mediante procedimiento almacenado
exports.deleteCliente = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('CALL sp_dar_baja_cliente($1)', [id]);

    const clienteRes = await db.query('SELECT * FROM vw_clientes_detalle WHERE idCliente = $1', [id]);
    if (clienteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ message: 'Cliente dado de baja exitosamente', cliente: clienteRes.rows[0] });
  } catch (error) {
    console.error('Error al dar de baja al cliente vía procedimiento:', error);
    res.status(500).json({ error: 'Error al dar de baja al cliente', details: error.message });
  }
};
