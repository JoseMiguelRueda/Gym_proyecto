-- ==============================================================================
-- SISTEMA DE GESTIÓN DE GIMNASIO - BASE DE DATOS TRANSACCIONAL Y ANALÍTICA
-- COMPATIBLE CON POSTGRESQL 14+ / 17 / 18 Y PGADMIN 4
-- ARQUITECTURA BASADA EN TRIGGERS, FUNCIONES, PROCEDIMIENTOS, VISTAS E ÍNDICES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. LIMPIEZA PREVIA DE OBJETOS (Orden de dependencias)
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_dashboard_asistencias_semanal CASCADE;
DROP VIEW IF EXISTS vw_dashboard_planes_distribucion CASCADE;
DROP VIEW IF EXISTS vw_dashboard_ingresos_mensuales CASCADE;
DROP VIEW IF EXISTS vw_dashboard_membresias_por_vencer CASCADE;
DROP VIEW IF EXISTS vw_dashboard_kpis CASCADE;
DROP VIEW IF EXISTS vw_planes_resumen CASCADE;
DROP VIEW IF EXISTS vw_entrenadores_resumen CASCADE;
DROP VIEW IF EXISTS vw_pagos_detalle CASCADE;
DROP VIEW IF EXISTS vw_asistencias_detalle CASCADE;
DROP VIEW IF EXISTS vw_membresias_detalle CASCADE;
DROP VIEW IF EXISTS vw_clientes_detalle CASCADE;
DROP VIEW IF EXISTS vw_asistencia_diaria CASCADE;
DROP VIEW IF EXISTS vw_ingresos_mensuales CASCADE;
DROP VIEW IF EXISTS vw_clientes_estado CASCADE;
DROP VIEW IF EXISTS vw_clientes_activos CASCADE;
DROP VIEW IF EXISTS vw_ingresos_por_plan CASCADE;
DROP VIEW IF EXISTS vw_resumen_asistencias CASCADE;

DROP TABLE IF EXISTS Asistencia CASCADE;
DROP TABLE IF EXISTS Pago CASCADE;
DROP TABLE IF EXISTS Membresia CASCADE;
DROP TABLE IF EXISTS Horario CASCADE;
DROP TABLE IF EXISTS Planes CASCADE;
DROP TABLE IF EXISTS Cliente CASCADE;
DROP TABLE IF EXISTS Entrenador CASCADE;

-- ------------------------------------------------------------------------------
-- 2. CREACIÓN DE TABLAS TRANSACCIONALES
-- ------------------------------------------------------------------------------

-- TABLA: Entrenador
CREATE TABLE Entrenador (
    idEntrenador SERIAL PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Carnet VARCHAR(20) NOT NULL UNIQUE,
    Telefono VARCHAR(20),
    Email VARCHAR(100)
);

-- TABLA: Cliente
CREATE TABLE Cliente (
    idCliente SERIAL PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Carnet VARCHAR(20) NOT NULL UNIQUE,
    Telefono VARCHAR(20),
    Email VARCHAR(100),
    Estado VARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (Estado IN ('Activo', 'Inactivo')),
    idEntrenador INT,
    CONSTRAINT fk_cliente_entrenador FOREIGN KEY (idEntrenador) 
        REFERENCES Entrenador(idEntrenador) ON DELETE SET NULL ON UPDATE CASCADE
);

-- TABLA: Horario
CREATE TABLE Horario (
    idHorario SERIAL PRIMARY KEY,
    Dia VARCHAR(30) NOT NULL,
    Horario VARCHAR(50) NOT NULL,
    idEntrenador INT NOT NULL,
    CONSTRAINT fk_horario_entrenador FOREIGN KEY (idEntrenador) 
        REFERENCES Entrenador(idEntrenador) ON DELETE CASCADE ON UPDATE CASCADE
);

-- TABLA: Planes
CREATE TABLE Planes (
    idPlan SERIAL PRIMARY KEY,
    Nombre_Plan VARCHAR(50) NOT NULL,
    Duracion INT NOT NULL CHECK (Duracion > 0), -- Duración en días calendario
    Precio DECIMAL(10,2) NOT NULL CHECK (Precio >= 0),
    Descripcion VARCHAR(255) DEFAULT ''
);

-- TABLA: Membresia
CREATE TABLE Membresia (
    idMembresia SERIAL PRIMARY KEY,
    Fecha_Inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    Fecha_Fin DATE NOT NULL,
    Estado VARCHAR(20) NOT NULL DEFAULT 'Activa' CHECK (Estado IN ('Activa', 'Inactiva', 'Vencida', 'Pendiente')),
    idCliente INT NOT NULL,
    idPlan INT NOT NULL,
    CONSTRAINT fk_membresia_cliente FOREIGN KEY (idCliente) 
        REFERENCES Cliente(idCliente) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_membresia_plan FOREIGN KEY (idPlan) 
        REFERENCES Planes(idPlan) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_fechas_membresia CHECK (Fecha_Fin >= Fecha_Inicio)
);

-- TABLA: Pago
CREATE TABLE Pago (
    idPago SERIAL PRIMARY KEY,
    Monto DECIMAL(10,2) NOT NULL CHECK (Monto > 0),
    Fecha_Pago DATE NOT NULL DEFAULT CURRENT_DATE,
    Nro_Comprobante VARCHAR(50) UNIQUE,
    idMembresia INT NOT NULL,
    CONSTRAINT fk_pago_membresia FOREIGN KEY (idMembresia) 
        REFERENCES Membresia(idMembresia) ON DELETE CASCADE ON UPDATE CASCADE
);

-- TABLA: Asistencia
CREATE TABLE Asistencia (
    idAsistencia SERIAL PRIMARY KEY,
    Fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    Hora TIME NOT NULL DEFAULT CURRENT_TIME,
    idCliente INT NOT NULL,
    CONSTRAINT fk_asistencia_cliente FOREIGN KEY (idCliente) 
        REFERENCES Cliente(idCliente) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ------------------------------------------------------------------------------
-- 3. ÍNDICES DE OPTIMIZACIÓN (B-Tree, Compuestos y Funcionales)
-- ------------------------------------------------------------------------------
CREATE INDEX idx_cliente_carnet ON Cliente(Carnet);
CREATE INDEX idx_cliente_nombre_lower ON Cliente(LOWER(Nombre));
CREATE INDEX idx_cliente_estado ON Cliente(Estado);
CREATE INDEX idx_cliente_entrenador ON Cliente(idEntrenador);

CREATE INDEX idx_horario_entrenador ON Horario(idEntrenador);

CREATE INDEX idx_membresia_cliente ON Membresia(idCliente);
CREATE INDEX idx_membresia_plan ON Membresia(idPlan);
CREATE INDEX idx_membresia_estado_fechas ON Membresia(Estado, Fecha_Inicio, Fecha_Fin);
CREATE INDEX idx_membresia_cliente_estado ON Membresia(idCliente, Estado);

CREATE INDEX idx_pago_membresia ON Pago(idMembresia);
CREATE INDEX idx_pago_fecha ON Pago(Fecha_Pago);

CREATE INDEX idx_asistencia_cliente_fecha ON Asistencia(idCliente, Fecha);
CREATE INDEX idx_asistencia_fecha ON Asistencia(Fecha);

-- ------------------------------------------------------------------------------
-- 4. TRIGGERS (DISPARADORES PARA INTEGRIDAD Y REGLAS DE NEGOCIO)
-- ------------------------------------------------------------------------------

-- TRIGGER 1: Calcular automáticamente Fecha_Fin al insertar membresía (si no se especifica)
-- y pasar a 'Inactiva' cualquier membresía activa previa del cliente.
CREATE OR REPLACE FUNCTION fn_trg_before_insert_membresia()
RETURNS TRIGGER AS $$
DECLARE
    v_duracion INT;
BEGIN
    -- Obtener duración del plan
    SELECT Duracion INTO v_duracion FROM Planes WHERE idPlan = NEW.idPlan;
    IF v_duracion IS NULL THEN
        RAISE EXCEPTION 'El plan con ID % no existe.', NEW.idPlan;
    END IF;

    -- Si Fecha_Fin no fue provista o es menor que Fecha_Inicio, calcularla
    IF NEW.Fecha_Fin IS NULL OR NEW.Fecha_Fin < NEW.Fecha_Inicio THEN
        NEW.Fecha_Fin := NEW.Fecha_Inicio + (v_duracion || ' days')::INTERVAL;
    END IF;

    -- Si la nueva membresía se crea como Activa, desactivar membresías activas previas
    IF NEW.Estado = 'Activa' THEN
        UPDATE Membresia 
        SET Estado = 'Inactiva' 
        WHERE idCliente = NEW.idCliente 
          AND Estado = 'Activa'
          AND idMembresia <> COALESCE(NEW.idMembresia, 0);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_before_insert_membresia ON Membresia;
CREATE TRIGGER trg_before_insert_membresia
BEFORE INSERT ON Membresia
FOR EACH ROW
EXECUTE FUNCTION fn_trg_before_insert_membresia();


-- TRIGGER 2: Sincronizar estado del Cliente según el estado de sus Membresías
CREATE OR REPLACE FUNCTION fn_trg_sincronizar_cliente_membresia()
RETURNS TRIGGER AS $$
DECLARE
    v_activas_vigentes INT;
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.Estado = 'Activa' AND NEW.Fecha_Fin >= CURRENT_DATE THEN
            -- Activar al cliente de inmediato
            UPDATE Cliente SET Estado = 'Activo' WHERE idCliente = NEW.idCliente AND Estado <> 'Activo';
        ELSIF NEW.Estado IN ('Inactiva', 'Vencida') THEN
            -- Verificar si le quedan otras membresías activas y vigentes
            SELECT COUNT(*) INTO v_activas_vigentes
            FROM Membresia
            WHERE idCliente = NEW.idCliente
              AND Estado = 'Activa'
              AND Fecha_Fin >= CURRENT_DATE
              AND idMembresia <> NEW.idMembresia;

            IF v_activas_vigentes = 0 THEN
                UPDATE Cliente SET Estado = 'Inactivo' WHERE idCliente = NEW.idCliente AND Estado <> 'Inactivo';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sincronizar_cliente_membresia ON Membresia;
CREATE TRIGGER trg_sincronizar_cliente_membresia
AFTER INSERT OR UPDATE ON Membresia
FOR EACH ROW
EXECUTE FUNCTION fn_trg_sincronizar_cliente_membresia();


-- TRIGGER 3: Si se desactiva manualmente al Cliente, inactivar sus membresías activas
CREATE OR REPLACE FUNCTION fn_trg_cliente_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.Estado = 'Inactivo' AND OLD.Estado = 'Activo' THEN
        UPDATE Membresia 
        SET Estado = 'Inactiva' 
        WHERE idCliente = NEW.idCliente AND Estado = 'Activa';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cliente_cambio_estado ON Cliente;
CREATE TRIGGER trg_cliente_cambio_estado
AFTER UPDATE OF Estado ON Cliente
FOR EACH ROW
EXECUTE FUNCTION fn_trg_cliente_cambio_estado();


-- TRIGGER 4: Validación estricta de pagos (evitar sobrepagos o pagos en exceso)
CREATE OR REPLACE FUNCTION fn_trg_validar_pago()
RETURNS TRIGGER AS $$
DECLARE
    v_precio_plan DECIMAL(10,2);
    v_total_pagado DECIMAL(10,2);
    v_saldo_pendiente DECIMAL(10,2);
BEGIN
    -- Obtener precio del plan de la membresía
    SELECT p.Precio INTO v_precio_plan
    FROM Membresia m
    JOIN Planes p ON m.idPlan = p.idPlan
    WHERE m.idMembresia = NEW.idMembresia;

    IF v_precio_plan IS NULL THEN
        RAISE EXCEPTION 'La membresía con ID % no tiene un plan válido asignado.', NEW.idMembresia;
    END IF;

    -- Obtener lo que ya se ha pagado hasta el momento (excluyendo el pago actual en caso de update)
    SELECT COALESCE(SUM(Monto), 0) INTO v_total_pagado
    FROM Pago
    WHERE idMembresia = NEW.idMembresia
      AND idPago <> COALESCE(NEW.idPago, 0);

    v_saldo_pendiente := GREATEST(0, v_precio_plan - v_total_pagado);

    IF v_saldo_pendiente <= 0 THEN
        RAISE EXCEPTION 'Esta membresía ya está totalmente cancelada (Precio: Bs. %, Abonado: Bs. %). No se admiten pagos repetidos.', v_precio_plan, v_total_pagado;
    END IF;

    IF NEW.Monto > v_saldo_pendiente THEN
        RAISE EXCEPTION 'El monto a abonar (Bs. %) supera el saldo pendiente (Bs. %).', NEW.Monto, v_saldo_pendiente;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_pago ON Pago;
CREATE TRIGGER trg_validar_pago
BEFORE INSERT OR UPDATE ON Pago
FOR EACH ROW
EXECUTE FUNCTION fn_trg_validar_pago();


-- TRIGGER 5: Validación de acceso en Asistencia (control de entrada)
CREATE OR REPLACE FUNCTION fn_trg_validar_asistencia()
RETURNS TRIGGER AS $$
DECLARE
    v_estado_cliente VARCHAR(20);
    v_membresia_valida INT;
    v_precio_plan DECIMAL(10,2);
    v_total_pagado DECIMAL(10,2);
    v_id_membresia INT;
BEGIN
    -- 1. Verificar estado del cliente
    SELECT Estado INTO v_estado_cliente FROM Cliente WHERE idCliente = NEW.idCliente;
    IF v_estado_cliente IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: El cliente con ID % no existe.', NEW.idCliente;
    END IF;
    IF v_estado_cliente = 'Inactivo' THEN
        RAISE EXCEPTION 'Acceso denegado: El cliente con ID % está inactivo o dado de baja en el sistema.', NEW.idCliente;
    END IF;

    -- 2. Verificar si cuenta con membresía activa y vigente
    SELECT m.idMembresia, p.Precio INTO v_id_membresia, v_precio_plan
    FROM Membresia m
    JOIN Planes p ON m.idPlan = p.idPlan
    WHERE m.idCliente = NEW.idCliente
      AND m.Estado = 'Activa'
      AND NEW.Fecha BETWEEN m.Fecha_Inicio AND m.Fecha_Fin
    ORDER BY m.Fecha_Fin DESC
    LIMIT 1;

    IF v_id_membresia IS NULL THEN
        RAISE EXCEPTION 'Acceso denegado: El cliente no cuenta con una membresía activa y vigente para la fecha %.', NEW.Fecha;
    END IF;

    -- 3. Verificar que la membresía esté totalmente pagada
    SELECT COALESCE(SUM(Monto), 0) INTO v_total_pagado
    FROM Pago
    WHERE idMembresia = v_id_membresia;

    IF v_total_pagado < v_precio_plan THEN
        RAISE EXCEPTION 'Acceso denegado: La membresía tiene un saldo pendiente de Bs. %. Debe cancelar en caja antes de ingresar.', (v_precio_plan - v_total_pagado);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_asistencia ON Asistencia;
CREATE TRIGGER trg_validar_asistencia
BEFORE INSERT ON Asistencia
FOR EACH ROW
EXECUTE FUNCTION fn_trg_validar_asistencia();


-- ------------------------------------------------------------------------------
-- 5. VISTAS (CENTRALIZACIÓN DE CONSULTAS COMPLEJAS Y ANÁLISIS)
-- ------------------------------------------------------------------------------

-- VISTA 1: Clientes detallados con estado de su última membresía y entrenador
CREATE OR REPLACE VIEW vw_clientes_detalle AS
SELECT 
    c.idCliente,
    c.Nombre,
    c.Carnet,
    c.Telefono,
    c.Email,
    c.Estado,
    c.idEntrenador,
    e.Nombre AS Entrenador_Nombre,
    m.idMembresia,
    p.Nombre_Plan,
    p.Precio AS Plan_Precio,
    m.Fecha_Inicio,
    m.Fecha_Fin,
    COALESCE(m.Estado, 'Sin Membresía') AS Estado_Membresia,
    CASE 
        WHEN m.Fecha_Fin IS NULL THEN 0
        ELSE (m.Fecha_Fin - CURRENT_DATE)
    END AS Dias_Restantes,
    COALESCE(pg.total_pagado, 0) AS Total_Pagado,
    GREATEST(0, COALESCE(p.Precio, 0) - COALESCE(pg.total_pagado, 0)) AS Saldo_Pendiente
FROM Cliente c
LEFT JOIN Entrenador e ON c.idEntrenador = e.idEntrenador
LEFT JOIN LATERAL (
    SELECT idMembresia, idPlan, Fecha_Inicio, Fecha_Fin, Estado
    FROM Membresia
    WHERE idCliente = c.idCliente
    ORDER BY Fecha_Fin DESC, idMembresia DESC
    LIMIT 1
) m ON true
LEFT JOIN Planes p ON m.idPlan = p.idPlan
LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(Monto), 0) AS total_pagado
    FROM Pago
    WHERE idMembresia = m.idMembresia
) pg ON true;


-- VISTA 2: Membresías detalladas con estado de pago y pagos agregados
CREATE OR REPLACE VIEW vw_membresias_detalle AS
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
    COALESCE(
        json_agg(
            json_build_object(
                'idPago', pg.idPago,
                'Monto', pg.Monto,
                'Fecha_Pago', pg.Fecha_Pago,
                'Nro_Comprobante', pg.Nro_Comprobante
            ) ORDER BY pg.Fecha_Pago DESC, pg.idPago DESC
        ) FILTER (WHERE pg.idPago IS NOT NULL),
        '[]'::json
    ) AS Pagos
FROM Membresia m
JOIN Cliente c ON m.idCliente = c.idCliente
JOIN Planes p ON m.idPlan = p.idPlan
LEFT JOIN Pago pg ON m.idMembresia = pg.idMembresia
GROUP BY m.idMembresia, c.Nombre, c.Carnet, c.Estado, p.Nombre_Plan, p.Precio, p.Duracion;


-- VISTA 3: Asistencias detalladas
CREATE OR REPLACE VIEW vw_asistencias_detalle AS
SELECT 
    a.idAsistencia,
    a.Fecha,
    a.Hora,
    c.idCliente,
    c.Nombre AS Cliente_Nombre,
    c.Carnet AS Cliente_Carnet,
    e.Nombre AS Entrenador_Nombre
FROM Asistencia a
JOIN Cliente c ON a.idCliente = c.idCliente
LEFT JOIN Entrenador e ON c.idEntrenador = e.idEntrenador;


-- VISTA 4: Historial de pagos detallados
CREATE OR REPLACE VIEW vw_pagos_detalle AS
SELECT 
    pg.idPago,
    pg.Monto,
    pg.Fecha_Pago,
    pg.Nro_Comprobante,
    m.idMembresia,
    m.Fecha_Inicio,
    m.Fecha_Fin,
    m.Estado AS Estado_Membresia,
    c.idCliente,
    c.Nombre AS Cliente_Nombre,
    c.Carnet AS Cliente_Carnet,
    p.Nombre_Plan,
    p.Precio AS Plan_Precio
FROM Pago pg
JOIN Membresia m ON pg.idMembresia = m.idMembresia
JOIN Cliente c ON m.idCliente = c.idCliente
JOIN Planes p ON m.idPlan = p.idPlan;


-- VISTA 5: Entrenadores con total de alumnos y horarios estructurados en JSON
CREATE OR REPLACE VIEW vw_entrenadores_resumen AS
SELECT 
    e.idEntrenador,
    e.Nombre,
    e.Carnet,
    e.Telefono,
    e.Email,
    COUNT(DISTINCT c.idCliente) AS total_clientes,
    COALESCE(
        json_agg(
            json_build_object('idHorario', h.idHorario, 'Dia', h.Dia, 'Horario', h.Horario)
            ORDER BY h.idHorario ASC
        ) FILTER (WHERE h.idHorario IS NOT NULL), 
        '[]'::json
    ) AS horarios
FROM Entrenador e
LEFT JOIN Cliente c ON e.idEntrenador = c.idEntrenador AND c.Estado = 'Activo'
LEFT JOIN Horario h ON e.idEntrenador = h.idEntrenador
GROUP BY e.idEntrenador;


-- VISTA 6: Planes con membresías activas vinculadas
CREATE OR REPLACE VIEW vw_planes_resumen AS
SELECT 
    p.idPlan,
    p.Nombre_Plan,
    p.Duracion,
    p.Precio,
    p.Descripcion,
    COUNT(m.idMembresia) FILTER (WHERE m.Estado = 'Activa') AS membresias_activas
FROM Planes p
LEFT JOIN Membresia m ON p.idPlan = m.idPlan
GROUP BY p.idPlan;


-- VISTA 7: KPIs del Dashboard Gerencial
CREATE OR REPLACE VIEW vw_dashboard_kpis AS
SELECT 
    (SELECT COUNT(*) FROM Cliente) AS total_clientes,
    (SELECT COUNT(*) FROM Cliente WHERE Estado = 'Activo') AS clientes_activos,
    (SELECT COUNT(*) FROM Cliente WHERE Estado = 'Inactivo') AS clientes_inactivos,
    (SELECT COALESCE(SUM(Monto), 0) FROM Pago WHERE TO_CHAR(Fecha_Pago, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')) AS ingresos_mes,
    (SELECT COUNT(*) FROM Asistencia WHERE Fecha = CURRENT_DATE) AS asistencias_hoy,
    (SELECT COUNT(*) FROM Entrenador) AS total_entrenadores;


-- VISTA 8: Membresías por vencer en los próximos 7 días
CREATE OR REPLACE VIEW vw_dashboard_membresias_por_vencer AS
SELECT 
    m.idMembresia,
    c.Nombre AS Cliente_Nombre,
    c.Carnet,
    c.Telefono,
    p.Nombre_Plan,
    m.Fecha_Fin,
    (m.Fecha_Fin - CURRENT_DATE) AS Dias_Restantes
FROM Membresia m
JOIN Cliente c ON m.idCliente = c.idCliente
JOIN Planes p ON m.idPlan = p.idPlan
WHERE m.Estado = 'Activa' 
  AND m.Fecha_Fin BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
ORDER BY m.Fecha_Fin ASC;


-- VISTA 9: Ingresos por mes (últimos meses)
CREATE OR REPLACE VIEW vw_dashboard_ingresos_mensuales AS
SELECT 
    TO_CHAR(Fecha_Pago, 'YYYY-MM') AS mes,
    SUM(Monto) AS total
FROM Pago
GROUP BY TO_CHAR(Fecha_Pago, 'YYYY-MM')
ORDER BY mes ASC;


-- VISTA 10: Distribución de clientes por plan
CREATE OR REPLACE VIEW vw_dashboard_planes_distribucion AS
SELECT 
    p.Nombre_Plan,
    COUNT(m.idMembresia) AS total_clientes,
    COALESCE(SUM(p.Precio), 0) AS ingresos_estimados
FROM Planes p
LEFT JOIN Membresia m ON p.idPlan = m.idPlan AND m.Estado = 'Activa'
GROUP BY p.idPlan, p.Nombre_Plan
ORDER BY total_clientes DESC;


-- VISTA 11: Asistencias de los últimos 7 días
CREATE OR REPLACE VIEW vw_dashboard_asistencias_semanal AS
SELECT 
    TO_CHAR(Fecha, 'YYYY-MM-DD') AS fecha,
    COUNT(*) AS total
FROM Asistencia
WHERE Fecha >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY Fecha
ORDER BY Fecha ASC;


-- ------------------------------------------------------------------------------
-- 6. PROCEDIMIENTOS ALMACENADOS (TRANSACCIONALES)
-- ------------------------------------------------------------------------------

-- PROCEDIMIENTO: Registrar nuevo Cliente
CREATE OR REPLACE PROCEDURE sp_crear_cliente(
    IN p_nombre VARCHAR(100),
    IN p_carnet VARCHAR(20),
    IN p_telefono VARCHAR(20),
    IN p_email VARCHAR(100),
    IN p_id_entrenador INT,
    INOUT p_id_cliente INT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
    IF TRIM(COALESCE(p_nombre, '')) = '' OR TRIM(COALESCE(p_carnet, '')) = '' THEN
        RAISE EXCEPTION 'El nombre y carnet del cliente son obligatorios.';
    END IF;

    IF EXISTS (SELECT 1 FROM Cliente WHERE Carnet = p_carnet) THEN
        RAISE EXCEPTION 'Ya existe un cliente registrado con el carnet %', p_carnet;
    END IF;

    INSERT INTO Cliente (Nombre, Carnet, Telefono, Email, Estado, idEntrenador)
    VALUES (p_nombre, p_carnet, p_telefono, p_email, 'Activo', p_id_entrenador)
    RETURNING idCliente INTO p_id_cliente;
END;
$$;


-- PROCEDIMIENTO: Actualizar Cliente
CREATE OR REPLACE PROCEDURE sp_actualizar_cliente(
    IN p_id_cliente INT,
    IN p_nombre VARCHAR(100),
    IN p_carnet VARCHAR(20),
    IN p_telefono VARCHAR(20),
    IN p_email VARCHAR(100),
    IN p_id_entrenador INT,
    IN p_estado VARCHAR(20) DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Cliente WHERE idCliente = p_id_cliente) THEN
        RAISE EXCEPTION 'Cliente con ID % no encontrado.', p_id_cliente;
    END IF;

    IF p_carnet IS NOT NULL AND EXISTS (
        SELECT 1 FROM Cliente WHERE Carnet = p_carnet AND idCliente <> p_id_cliente
    ) THEN
        RAISE EXCEPTION 'El carnet % ya se encuentra registrado por otro cliente.', p_carnet;
    END IF;

    UPDATE Cliente
    SET 
        Nombre = COALESCE(p_nombre, Nombre),
        Carnet = COALESCE(p_carnet, Carnet),
        Telefono = COALESCE(p_telefono, Telefono),
        Email = COALESCE(p_email, Email),
        idEntrenador = p_id_entrenador,
        Estado = COALESCE(p_estado, Estado)
    WHERE idCliente = p_id_cliente;
END;
$$;


-- PROCEDIMIENTO: Cambiar Estado de Cliente
CREATE OR REPLACE PROCEDURE sp_cambiar_estado_cliente(
    IN p_id_cliente INT,
    IN p_nuevo_estado VARCHAR(20)
)
LANGUAGE plpgsql AS $$
BEGIN
    IF p_nuevo_estado NOT IN ('Activo', 'Inactivo') THEN
        RAISE EXCEPTION 'Estado no válido: %. Debe ser Activo o Inactivo.', p_nuevo_estado;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Cliente WHERE idCliente = p_id_cliente) THEN
        RAISE EXCEPTION 'Cliente con ID % no encontrado.', p_id_cliente;
    END IF;

    UPDATE Cliente SET Estado = p_nuevo_estado WHERE idCliente = p_id_cliente;
END;
$$;


-- PROCEDIMIENTO: Baja Lógica de Cliente
CREATE OR REPLACE PROCEDURE sp_dar_baja_cliente(
    IN p_id_cliente INT
)
LANGUAGE plpgsql AS $$
BEGIN
    CALL sp_cambiar_estado_cliente(p_id_cliente, 'Inactivo');
END;
$$;


-- PROCEDIMIENTO: Crear Membresía y opcionalmente Pago
CREATE OR REPLACE PROCEDURE sp_crear_membresia(
    IN p_id_cliente INT,
    IN p_id_plan INT,
    IN p_fecha_inicio DATE,
    IN p_monto_pago DECIMAL(10,2),
    IN p_comprobante VARCHAR(50),
    INOUT p_id_membresia INT DEFAULT NULL,
    INOUT p_id_pago INT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_duracion INT;
    v_precio DECIMAL(10,2);
    v_fecha_fin DATE;
    v_comprobante VARCHAR(50);
BEGIN
    -- Validar existencia de cliente
    IF NOT EXISTS (SELECT 1 FROM Cliente WHERE idCliente = p_id_cliente) THEN
        RAISE EXCEPTION 'El cliente con ID % no existe.', p_id_cliente;
    END IF;

    -- Validar plan
    SELECT Duracion, Precio INTO v_duracion, v_precio FROM Planes WHERE idPlan = p_id_plan;
    IF v_duracion IS NULL THEN
        RAISE EXCEPTION 'El plan con ID % no existe.', p_id_plan;
    END IF;

    v_fecha_fin := COALESCE(p_fecha_inicio, CURRENT_DATE) + (v_duracion || ' days')::INTERVAL;

    -- Insertar membresía (el trigger before_insert calculará y desactivará las previas)
    INSERT INTO Membresia (Fecha_Inicio, Fecha_Fin, Estado, idCliente, idPlan)
    VALUES (COALESCE(p_fecha_inicio, CURRENT_DATE), v_fecha_fin, 'Activa', p_id_cliente, p_id_plan)
    RETURNING idMembresia INTO p_id_membresia;

    -- Registrar pago si fue solicitado
    IF p_monto_pago IS NOT NULL AND p_monto_pago > 0 THEN
        v_comprobante := COALESCE(p_comprobante, 'REC-' || TO_CHAR(CURRENT_TIMESTAMP, 'HH24MISSMS'));
        INSERT INTO Pago (Monto, Fecha_Pago, Nro_Comprobante, idMembresia)
        VALUES (p_monto_pago, CURRENT_DATE, v_comprobante, p_id_membresia)
        RETURNING idPago INTO p_id_pago;
    END IF;
END;
$$;


-- PROCEDIMIENTO: Cambiar Estado de Membresía
CREATE OR REPLACE PROCEDURE sp_cambiar_estado_membresia(
    IN p_id_membresia INT,
    IN p_nuevo_estado VARCHAR(20)
)
LANGUAGE plpgsql AS $$
BEGIN
    IF p_nuevo_estado NOT IN ('Activa', 'Inactiva', 'Vencida', 'Pendiente') THEN
        RAISE EXCEPTION 'Estado de membresía no válido: %', p_nuevo_estado;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Membresia WHERE idMembresia = p_id_membresia) THEN
        RAISE EXCEPTION 'Membresía con ID % no encontrada.', p_id_membresia;
    END IF;

    -- Al actualizar, el trigger fn_trg_sincronizar_cliente_membresia actualizará el cliente si corresponde
    UPDATE Membresia SET Estado = p_nuevo_estado WHERE idMembresia = p_id_membresia;
END;
$$;


-- PROCEDIMIENTO: Registrar Pago
CREATE OR REPLACE PROCEDURE sp_registrar_pago(
    IN p_id_membresia INT,
    IN p_monto DECIMAL(10,2),
    IN p_fecha_pago DATE,
    IN p_comprobante VARCHAR(50),
    INOUT p_id_pago INT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_comprobante VARCHAR(50);
BEGIN
    IF p_monto IS NULL OR p_monto <= 0 THEN
        RAISE EXCEPTION 'El monto del pago debe ser un valor positivo mayor a 0.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Membresia WHERE idMembresia = p_id_membresia) THEN
        RAISE EXCEPTION 'Membresía con ID % no encontrada.', p_id_membresia;
    END IF;

    v_comprobante := COALESCE(p_comprobante, 'REC-' || TO_CHAR(CURRENT_TIMESTAMP, 'HH24MISSMS'));

    -- El trigger trg_validar_pago controlará automáticamente que no exceda el saldo pendiente
    INSERT INTO Pago (Monto, Fecha_Pago, Nro_Comprobante, idMembresia)
    VALUES (p_monto, COALESCE(p_fecha_pago, CURRENT_DATE), v_comprobante, p_id_membresia)
    RETURNING idPago INTO p_id_pago;
END;
$$;


-- PROCEDIMIENTO: Registrar Asistencia
CREATE OR REPLACE PROCEDURE sp_registrar_asistencia(
    IN p_id_cliente INT,
    INOUT p_id_asistencia INT DEFAULT NULL,
    INOUT p_fecha DATE DEFAULT NULL,
    INOUT p_hora TIME DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
    -- El trigger trg_validar_asistencia validará membresía vigente y pagada
    INSERT INTO Asistencia (Fecha, Hora, idCliente)
    VALUES (CURRENT_DATE, CURRENT_TIME, p_id_cliente)
    RETURNING idAsistencia, Fecha, Hora INTO p_id_asistencia, p_fecha, p_hora;
END;
$$;


-- PROCEDIMIENTO: Sincronizar Membresías Vencidas
CREATE OR REPLACE PROCEDURE sp_sincronizar_membresias_vencidas()
LANGUAGE plpgsql AS $$
BEGIN
    -- 1. Marcar como 'Vencida' las que ya cumplieron su fecha fin
    WITH vencidas AS (
        UPDATE Membresia
        SET Estado = 'Vencida'
        WHERE Estado = 'Activa'
          AND Fecha_Fin < CURRENT_DATE
        RETURNING idCliente
    )
    -- 2. Desactivar a clientes que no cuenten con ninguna otra membresía activa vigente
    UPDATE Cliente
    SET Estado = 'Inactivo'
    WHERE idCliente IN (SELECT idCliente FROM vencidas)
      AND Estado = 'Activo'
      AND NOT EXISTS (
          SELECT 1 FROM Membresia
          WHERE Membresia.idCliente = Cliente.idCliente
            AND Membresia.Estado = 'Activa'
            AND Membresia.Fecha_Fin >= CURRENT_DATE
      );
END;
$$;


-- PROCEDIMIENTOS: Entrenadores y Horarios
CREATE OR REPLACE PROCEDURE sp_crear_entrenador(
    IN p_nombre VARCHAR(100),
    IN p_carnet VARCHAR(20),
    IN p_telefono VARCHAR(20),
    IN p_email VARCHAR(100),
    INOUT p_id_entrenador INT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
    IF TRIM(COALESCE(p_nombre, '')) = '' OR TRIM(COALESCE(p_carnet, '')) = '' THEN
        RAISE EXCEPTION 'El nombre y carnet del entrenador son obligatorios.';
    END IF;

    IF EXISTS (SELECT 1 FROM Entrenador WHERE Carnet = p_carnet) THEN
        RAISE EXCEPTION 'Ya existe un entrenador con el carnet %', p_carnet;
    END IF;

    INSERT INTO Entrenador (Nombre, Carnet, Telefono, Email)
    VALUES (p_nombre, p_carnet, p_telefono, p_email)
    RETURNING idEntrenador INTO p_id_entrenador;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_actualizar_entrenador(
    IN p_id_entrenador INT,
    IN p_nombre VARCHAR(100),
    IN p_carnet VARCHAR(20),
    IN p_telefono VARCHAR(20),
    IN p_email VARCHAR(100)
)
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Entrenador WHERE idEntrenador = p_id_entrenador) THEN
        RAISE EXCEPTION 'Entrenador con ID % no encontrado.', p_id_entrenador;
    END IF;

    IF p_carnet IS NOT NULL AND EXISTS (
        SELECT 1 FROM Entrenador WHERE Carnet = p_carnet AND idEntrenador <> p_id_entrenador
    ) THEN
        RAISE EXCEPTION 'El carnet % ya pertenece a otro entrenador.', p_carnet;
    END IF;

    UPDATE Entrenador
    SET 
        Nombre = COALESCE(p_nombre, Nombre),
        Carnet = COALESCE(p_carnet, Carnet),
        Telefono = COALESCE(p_telefono, Telefono),
        Email = COALESCE(p_email, Email)
    WHERE idEntrenador = p_id_entrenador;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_eliminar_entrenador(
    IN p_id_entrenador INT
)
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM Entrenador WHERE idEntrenador = p_id_entrenador;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Entrenador con ID % no encontrado.', p_id_entrenador;
    END IF;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_agregar_horario(
    IN p_id_entrenador INT,
    IN p_dia VARCHAR(30),
    IN p_horario VARCHAR(50),
    INOUT p_id_horario INT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Entrenador WHERE idEntrenador = p_id_entrenador) THEN
        RAISE EXCEPTION 'Entrenador con ID % no encontrado.', p_id_entrenador;
    END IF;

    INSERT INTO Horario (idEntrenador, Dia, Horario)
    VALUES (p_id_entrenador, p_dia, p_horario)
    RETURNING idHorario INTO p_id_horario;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_eliminar_horario(
    IN p_id_horario INT
)
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM Horario WHERE idHorario = p_id_horario;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Horario con ID % no encontrado.', p_id_horario;
    END IF;
END;
$$;


-- PROCEDIMIENTOS: Planes
CREATE OR REPLACE PROCEDURE sp_crear_plan(
    IN p_nombre VARCHAR(50),
    IN p_duracion INT,
    IN p_precio DECIMAL(10,2),
    IN p_descripcion VARCHAR(255),
    INOUT p_id_plan INT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
    IF TRIM(COALESCE(p_nombre, '')) = '' OR p_duracion IS NULL OR p_duracion <= 0 OR p_precio IS NULL OR p_precio < 0 THEN
        RAISE EXCEPTION 'Datos de plan no válidos. Nombre, Duración positiva y Precio son obligatorios.';
    END IF;

    INSERT INTO Planes (Nombre_Plan, Duracion, Precio, Descripcion)
    VALUES (p_nombre, p_duracion, p_precio, COALESCE(p_descripcion, ''))
    RETURNING idPlan INTO p_id_plan;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_actualizar_plan(
    IN p_id_plan INT,
    IN p_nombre VARCHAR(50),
    IN p_duracion INT,
    IN p_precio DECIMAL(10,2),
    IN p_descripcion VARCHAR(255)
)
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Planes WHERE idPlan = p_id_plan) THEN
        RAISE EXCEPTION 'Plan con ID % no encontrado.', p_id_plan;
    END IF;

    UPDATE Planes
    SET 
        Nombre_Plan = COALESCE(p_nombre, Nombre_Plan),
        Duracion = COALESCE(p_duracion, Duracion),
        Precio = COALESCE(p_precio, Precio),
        Descripcion = COALESCE(p_descripcion, Descripcion)
    WHERE idPlan = p_id_plan;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_eliminar_plan(
    IN p_id_plan INT
)
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM Planes WHERE idPlan = p_id_plan;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Plan con ID % no encontrado.', p_id_plan;
    END IF;
END;
$$;


-- ------------------------------------------------------------------------------
-- 7. FUNCIONES ALMACENADAS DE CONSULTA Y LÓGICA DE NEGOCIO
-- ------------------------------------------------------------------------------

-- FUNCIÓN: Búsqueda y filtrado de Clientes (con uso de vista e índices)
CREATE OR REPLACE FUNCTION fn_buscar_clientes(
    p_busqueda TEXT DEFAULT NULL,
    p_estado TEXT DEFAULT NULL
)
RETURNS SETOF vw_clientes_detalle AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM vw_clientes_detalle
    WHERE (p_busqueda IS NULL OR p_busqueda = '' OR Carnet ILIKE '%' || p_busqueda || '%' OR Nombre ILIKE '%' || p_busqueda || '%')
      AND (p_estado IS NULL OR p_estado = '' OR Estado = p_estado)
    ORDER BY idCliente DESC;
END;
$$ LANGUAGE plpgsql;


-- FUNCIÓN: Obtener detalle completo de un Cliente con historial en JSON
CREATE OR REPLACE FUNCTION fn_obtener_cliente_detalle(p_id_cliente INT)
RETURNS JSON AS $$
DECLARE
    v_cliente JSON;
    v_membresias JSON;
    v_asistencias JSON;
BEGIN
    -- Datos del cliente
    SELECT row_to_json(c_sub) INTO v_cliente
    FROM (
        SELECT c.*, e.Nombre AS Entrenador_Nombre
        FROM Cliente c
        LEFT JOIN Entrenador e ON c.idEntrenador = e.idEntrenador
        WHERE c.idCliente = p_id_cliente
    ) c_sub;

    IF v_cliente IS NULL THEN
        RETURN NULL;
    END IF;

    -- Membresías del cliente
    SELECT COALESCE(json_agg(m_sub), '[]'::json) INTO v_membresias
    FROM (
        SELECT m.*, p.Nombre_Plan, p.Precio
        FROM Membresia m
        JOIN Planes p ON m.idPlan = p.idPlan
        WHERE m.idCliente = p_id_cliente
        ORDER BY m.Fecha_Inicio DESC, m.idMembresia DESC
    ) m_sub;

    -- Últimas asistencias
    SELECT COALESCE(json_agg(a_sub), '[]'::json) INTO v_asistencias
    FROM (
        SELECT *
        FROM Asistencia
        WHERE idCliente = p_id_cliente
        ORDER BY Fecha DESC, Hora DESC
        LIMIT 20
    ) a_sub;

    RETURN json_build_object(
        'cliente', v_cliente,
        'membresias', v_membresias,
        'asistencias', v_asistencias
    );
END;
$$ LANGUAGE plpgsql;


-- FUNCIÓN: Validar Acceso de Cliente en Recepción
CREATE OR REPLACE FUNCTION fn_validar_acceso_cliente(p_identificador TEXT)
RETURNS JSON AS $$
DECLARE
    v_cliente RECORD;
    v_asistencia_hoy RECORD;
    v_permitido BOOLEAN := TRUE;
    v_motivo TEXT := 'Membresía activa, vigente y totalmente pagada.';
    v_ya_ingreso BOOLEAN := FALSE;
    v_hora_ultimo TIME := NULL;
    v_saldo_pendiente NUMERIC := 0;
BEGIN
    -- Sincronizar automáticamente estados antes de evaluar
    CALL sp_sincronizar_membresias_vencidas();

    -- Buscar cliente en la vista consolidada
    SELECT * INTO v_cliente
    FROM vw_clientes_detalle
    WHERE Carnet = p_identificador OR idCliente::TEXT = p_identificador
    LIMIT 1;

    IF v_cliente.idCliente IS NULL THEN
        RETURN json_build_object(
            'permitido', FALSE,
            'motivo', 'Cliente no encontrado en el sistema.',
            'cliente', NULL,
            'yaIngresoHoy', FALSE,
            'horaUltimoIngreso', NULL
        );
    END IF;

    -- Verificar asistencias de hoy
    SELECT Hora INTO v_hora_ultimo
    FROM Asistencia
    WHERE idCliente = v_cliente.idCliente AND Fecha = CURRENT_DATE
    ORDER BY Hora DESC
    LIMIT 1;

    IF v_hora_ultimo IS NOT NULL THEN
        v_ya_ingreso := TRUE;
    END IF;

    v_saldo_pendiente := COALESCE(v_cliente.Saldo_Pendiente, 0);

    -- Evaluar reglas de negocio
    IF v_cliente.Estado_Membresia = 'Sin Membresía' THEN
        v_permitido := FALSE;
        v_motivo := 'El cliente no cuenta con ninguna membresía registrada.';
    ELSIF v_cliente.Estado_Membresia IN ('Vencida', 'Inactiva') OR v_cliente.Dias_Restantes < 0 THEN
        v_permitido := FALSE;
        v_motivo := 'Membresía ' || LOWER(v_cliente.Estado_Membresia) || '. Requiere renovación para acceder.';
    ELSIF v_saldo_pendiente > 0 THEN
        v_permitido := FALSE;
        v_motivo := 'Membresía con saldo pendiente de Bs. ' || v_saldo_pendiente || '. Requiere cancelar el pago en caja.';
    ELSIF v_cliente.Estado <> 'Activo' THEN
        v_permitido := FALSE;
        v_motivo := 'Cliente inactivo o dado de baja.';
    END IF;

    RETURN json_build_object(
        'permitido', v_permitido,
        'motivo', v_motivo,
        'cliente', row_to_json(v_cliente),
        'yaIngresoHoy', v_ya_ingreso,
        'horaUltimoIngreso', v_hora_ultimo
    );
END;
$$ LANGUAGE plpgsql;


-- FUNCIÓN: Detalle de un Entrenador (con horarios y alumnos)
CREATE OR REPLACE FUNCTION fn_obtener_entrenador_detalle(p_id_entrenador INT)
RETURNS JSON AS $$
DECLARE
    v_entrenador JSON;
    v_horarios JSON;
    v_clientes JSON;
BEGIN
    SELECT row_to_json(e) INTO v_entrenador
    FROM Entrenador e
    WHERE e.idEntrenador = p_id_entrenador;

    IF v_entrenador IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(json_agg(h), '[]'::json) INTO v_horarios
    FROM Horario h
    WHERE h.idEntrenador = p_id_entrenador;

    SELECT COALESCE(json_agg(c_sub), '[]'::json) INTO v_clientes
    FROM (
        SELECT idCliente, Nombre, Carnet, Telefono, Estado
        FROM Cliente
        WHERE idEntrenador = p_id_entrenador
        ORDER BY Nombre ASC
    ) c_sub;

    RETURN json_build_object(
        'entrenador', v_entrenador,
        'horarios', v_horarios,
        'clientes', v_clientes
    );
END;
$$ LANGUAGE plpgsql;


-- FUNCIÓN: Dashboard General Consolidado
CREATE OR REPLACE FUNCTION fn_obtener_dashboard()
RETURNS JSON AS $$
DECLARE
    v_kpis JSON;
    v_por_vencer JSON;
    v_ingresos_mes JSON;
    v_distribucion JSON;
    v_asistencias JSON;
BEGIN
    -- Sincronizar membresías vencidas previamente
    CALL sp_sincronizar_membresias_vencidas();

    -- KPIs
    SELECT json_build_object(
        'totalClientes', total_clientes,
        'clientesActivos', clientes_activos,
        'clientesInactivos', clientes_inactivos,
        'ingresosMes', ingresos_mes,
        'asistenciasHoy', asistencias_hoy,
        'totalEntrenadores', total_entrenadores
    ) INTO v_kpis
    FROM vw_dashboard_kpis;

    -- Membresías por vencer
    SELECT COALESCE(json_agg(v), '[]'::json) INTO v_por_vencer
    FROM vw_dashboard_membresias_por_vencer v;

    -- Ingresos por mes
    SELECT COALESCE(json_agg(i), '[]'::json) INTO v_ingresos_mes
    FROM (
        SELECT * FROM vw_dashboard_ingresos_mensuales LIMIT 6
    ) i;

    -- Distribución por plan
    SELECT COALESCE(json_agg(d), '[]'::json) INTO v_distribucion
    FROM vw_dashboard_planes_distribucion d;

    -- Asistencias históricas
    SELECT COALESCE(json_agg(a), '[]'::json) INTO v_asistencias
    FROM vw_dashboard_asistencias_semanal a;

    RETURN json_build_object(
        'kpis', v_kpis,
        'membresiasPorVencer', v_por_vencer,
        'ingresosPorMes', v_ingresos_mes,
        'planesDistribucion', v_distribucion,
        'asistenciasHistorico', v_asistencias
    );
END;
$$ LANGUAGE plpgsql;


-- ------------------------------------------------------------------------------
-- 8. DATOS SEMILLA DE PRUEBA
-- ------------------------------------------------------------------------------

-- Entrenadores
INSERT INTO Entrenador (Nombre, Carnet, Telefono, Email) VALUES
('Carlos Ramos', '4589123', '77001122', 'carlos.ramos@email.com'),
('Andrea Soliz', '5891234', '77112233', 'andrea.soliz@email.com'),
('Marco Justiniano', '6123456', '77223344', 'marco.j@email.com');

-- Horarios
INSERT INTO Horario (Dia, Horario, idEntrenador) VALUES
('Lunes a Viernes', '06:00 - 08:00', 1),
('Lunes a Viernes', '18:00 - 20:00', 1),
('Lunes a Viernes', '08:00 - 10:00', 2),
('Lunes a Viernes', '16:00 - 18:00', 2),
('Lunes a Sábado', '10:00 - 12:00', 3),
('Lunes a Sábado', '14:00 - 16:00', 3);

-- Planes
INSERT INTO Planes (Nombre_Plan, Duracion, Precio, Descripcion) VALUES
('Mensual Pass', 30, 250.00, 'Acceso ilimitado durante 30 días'),
('Trimestral Pro', 90, 650.00, 'Acceso ilimitado durante 90 días con descuento'),
('Anual VIP', 365, 2200.00, 'Acceso total durante 365 días + casillero gratis');

-- Clientes
INSERT INTO Cliente (Nombre, Carnet, Telefono, Email, Estado, idEntrenador) VALUES
('Juan Pérez', '123456', '75012345', 'juan.perez@email.com', 'Activo', 1),
('Maria Delgado', '654321', '75123456', 'maria.delgado@email.com', 'Activo', 1),
('Luis Arteaga', '789123', '75234567', 'luis.arteaga@email.com', 'Activo', 2),
('Sofia Roca', '321987', '75345678', 'sofia.roca@email.com', 'Activo', 2),
('Mateo Suarez', '456789', '75456789', 'mateo.suarez@email.com', 'Inactivo', 3),
('Lucia Mendez', '987654', '75567890', 'lucia.mendez@email.com', 'Activo', 3),
('Gabriel Vaca', '147258', '75678901', 'gabriel.vaca@email.com', 'Activo', 1),
('Camila Paz', '258369', '75789012', 'camila.paz@email.com', 'Activo', 2),
('Diego Flores', '369258', '75890123', 'diego.flores@email.com', 'Inactivo', 3),
('Elena Torrez', '159357', '75901234', 'elena.torrez@email.com', 'Activo', 1);

-- Membresías (Desencadenará triggers de cálculo y sincronización)
INSERT INTO Membresia (Fecha_Inicio, Fecha_Fin, Estado, idCliente, idPlan) VALUES
(CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', 'Activa', 1, 1),
(CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '80 days', 'Activa', 2, 2),
(CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', 'Activa', 3, 1),
(CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '350 days', 'Activa', 4, 3),
(CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '30 days', 'Inactiva', 5, 1),
(CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', 'Activa', 6, 1),
(CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '70 days', 'Activa', 7, 2),
(CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', 'Activa', 8, 1),
(CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE - INTERVAL '60 days', 'Inactiva', 9, 1),
(CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', 'Activa', 10, 1);

-- Pagos (Validados por trg_validar_pago)
INSERT INTO Pago (Monto, Fecha_Pago, Nro_Comprobante, idMembresia) VALUES
(250.00, CURRENT_DATE - INTERVAL '10 days', 'REC-001', 1),
(650.00, CURRENT_DATE - INTERVAL '5 days', 'REC-002', 2),
(250.00, CURRENT_DATE - INTERVAL '2 days', 'REC-003', 3),
(2200.00, CURRENT_DATE - INTERVAL '15 days', 'REC-004', 4),
(250.00, CURRENT_DATE - INTERVAL '60 days', 'REC-005', 5),
(250.00, CURRENT_DATE - INTERVAL '1 day', 'REC-006', 6),
(650.00, CURRENT_DATE - INTERVAL '20 days', 'REC-007', 7),
(250.00, CURRENT_DATE - INTERVAL '3 days', 'REC-008', 8),
(250.00, CURRENT_DATE - INTERVAL '90 days', 'REC-009', 9),
(250.00, CURRENT_DATE - INTERVAL '4 days', 'REC-010', 10);

-- Asistencias de prueba (validadas por trg_validar_asistencia)
INSERT INTO Asistencia (Fecha, Hora, idCliente) VALUES
(CURRENT_DATE, '07:15:00', 1),
(CURRENT_DATE, '08:00:00', 2),
(CURRENT_DATE, '08:30:00', 3),
(CURRENT_DATE, '09:10:00', 6),
(CURRENT_DATE, '10:00:00', 7),
(CURRENT_DATE - INTERVAL '1 day', '07:30:00', 1),
(CURRENT_DATE - INTERVAL '1 day', '08:15:00', 2),
(CURRENT_DATE - INTERVAL '1 day', '16:10:00', 3),
(CURRENT_DATE - INTERVAL '1 day', '18:30:00', 4),
(CURRENT_DATE - INTERVAL '2 days', '07:00:00', 1),
(CURRENT_DATE - INTERVAL '2 days', '10:30:00', 6),
(CURRENT_DATE - INTERVAL '2 days', '16:00:00', 8);