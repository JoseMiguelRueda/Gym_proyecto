-- ==============================================================================
-- SISTEMA DE GESTIÓN DE GIMNASIO - BASE DE DATOS TRANSACCIONAL (POSTGRESQL / PGADMIN 4)
-- ==============================================================================

-- 1. LIMPIEZA DE TABLAS Y OBJETOS (Orden inverso por integridad referencial)
DROP VIEW IF EXISTS vw_asistencia_diaria CASCADE;
DROP VIEW IF EXISTS vw_ingresos_mensuales CASCADE;
DROP VIEW IF EXISTS vw_clientes_estado CASCADE;

DROP TABLE IF EXISTS Asistencia CASCADE;
DROP TABLE IF EXISTS Pago CASCADE;
DROP TABLE IF EXISTS Membresia CASCADE;
DROP TABLE IF EXISTS Planes CASCADE;
DROP TABLE IF EXISTS Horario CASCADE;
DROP TABLE IF EXISTS Cliente CASCADE;
DROP TABLE IF EXISTS Entrenador CASCADE;

-- 2. CREACIÓN DE TABLAS

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
    Estado VARCHAR(20) DEFAULT 'Activo' CHECK (Estado IN ('Activo', 'Inactivo')),
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
    Duracion INT NOT NULL CHECK (Duracion > 0), -- Duración en días
    Precio DECIMAL(10,2) NOT NULL CHECK (Precio >= 0),
    Descripcion VARCHAR(255) NOT NULL
);

-- TABLA: Membresia
CREATE TABLE Membresia (
    idMembresia SERIAL PRIMARY KEY,
    Fecha_Inicio DATE NOT NULL,
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

-- 3. ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS FRECUENTES
CREATE INDEX idx_cliente_carnet ON Cliente(Carnet);
CREATE INDEX idx_membresia_cliente ON Membresia(idCliente);
CREATE INDEX idx_membresia_fechas ON Membresia(Fecha_Inicio, Fecha_Fin);
CREATE INDEX idx_asistencia_fecha ON Asistencia(Fecha);
CREATE INDEX idx_pago_fecha ON Pago(Fecha_Pago);

-- 4. PROCEDIMIENTOS Y TRIGGERS (Lógica de Negocio en Base de Datos)

-- Función y Trigger para validar si un cliente tiene membresía activa antes de permitir registrar asistencia
CREATE OR REPLACE FUNCTION fn_validar_asistencia_membresia()
RETURNS TRIGGER AS $$
DECLARE
    v_membresia_activa INT;
BEGIN
    SELECT COUNT(*) INTO v_membresia_activa
    FROM Membresia
    WHERE idCliente = NEW.idCliente
      AND Estado = 'Activa'
      AND NEW.Fecha BETWEEN Fecha_Inicio AND Fecha_Fin;

    IF v_membresia_activa = 0 THEN
        RAISE EXCEPTION 'Acceso denegado: El cliente con ID % no cuenta con una membresía activa y vigente para la fecha %.', NEW.idCliente, NEW.Fecha;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_asistencia ON Asistencia;
CREATE TRIGGER trg_validar_asistencia
BEFORE INSERT ON Asistencia
FOR EACH ROW
EXECUTE FUNCTION fn_validar_asistencia_membresia();

-- 5. VISTAS ANALÍTICAS Y OPERATIVAS

-- Vista: Estado consolidado de clientes y membresías actuales
CREATE OR REPLACE VIEW vw_clientes_estado AS
SELECT 
    c.idCliente,
    c.Nombre AS Cliente_Nombre,
    c.Carnet,
    c.Telefono,
    c.Email,
    c.Estado AS Estado_Cliente,
    e.Nombre AS Entrenador_Nombre,
    m.idMembresia,
    p.Nombre_Plan,
    m.Fecha_Inicio,
    m.Fecha_Fin,
    COALESCE(m.Estado, 'Sin Membresía') AS Estado_Membresia,
    CASE 
        WHEN m.Fecha_Fin IS NULL THEN 0
        ELSE (m.Fecha_Fin - CURRENT_DATE)
    END AS Dias_Restantes
FROM Cliente c
LEFT JOIN Entrenador e ON c.idEntrenador = e.idEntrenador
LEFT JOIN LATERAL (
    SELECT idMembresia, idPlan, Fecha_Inicio, Fecha_Fin, Estado
    FROM Membresia
    WHERE idCliente = c.idCliente
    ORDER BY Fecha_Fin DESC
    LIMIT 1
) m ON true
LEFT JOIN Planes p ON m.idPlan = p.idPlan;

-- Vista: Resumen mensual de ingresos financieros
CREATE OR REPLACE VIEW vw_ingresos_mensuales AS
SELECT 
    TO_CHAR(pg.Fecha_Pago, 'YYYY-MM') AS Mes,
    pl.Nombre_Plan,
    COUNT(pg.idPago) AS Total_Pagos,
    SUM(pg.Monto) AS Total_Recaudado
FROM Pago pg
JOIN Membresia m ON pg.idMembresia = m.idMembresia
JOIN Planes pl ON m.idPlan = pl.idPlan
GROUP BY TO_CHAR(pg.Fecha_Pago, 'YYYY-MM'), pl.Nombre_Plan
ORDER BY Mes DESC, Total_Recaudado DESC;

-- Vista: Asistencias detalladas del día
CREATE OR REPLACE VIEW vw_asistencia_diaria AS
SELECT 
    a.idAsistencia,
    a.Fecha,
    a.Hora,
    c.idCliente,
    c.Nombre AS Cliente_Nombre,
    c.Carnet,
    e.Nombre AS Entrenador_Asignado
FROM Asistencia a
JOIN Cliente c ON a.idCliente = c.idCliente
LEFT JOIN Entrenador e ON c.idEntrenador = e.idEntrenador
ORDER BY a.Fecha DESC, a.Hora DESC;


-- 6. INSERCIÓN DE DATOS DE PRUEBA (SEMILLA)

-- 6.1 Entrenadores
INSERT INTO Entrenador (Nombre, Carnet, Telefono, Email) VALUES
('Carlos Ramos', '4589123', '77001122', 'carlos.ramos@email.com'),
('Andrea Soliz', '5891234', '77112233', 'andrea.soliz@email.com'),
('Marco Justiniano', '6123456', '77223344', 'marco.j@email.com');

-- 6.2 Horarios
INSERT INTO Horario (Dia, Horario, idEntrenador) VALUES
('Lunes a Viernes', '06:00 - 08:00', 1),
('Lunes a Viernes', '18:00 - 20:00', 1),
('Lunes a Viernes', '08:00 - 10:00', 2),
('Lunes a Viernes', '16:00 - 18:00', 2),
('Lunes a Sábado', '10:00 - 12:00', 3),
('Lunes a Sábado', '14:00 - 16:00', 3);

-- 6.3 Clientes
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

-- 6.4 Planes
INSERT INTO Planes (Nombre_Plan, Duracion, Precio, Descripcion) VALUES
('Mensual Pass', 30, 250.00, 'Acceso ilimitado al gimnasio durante 30 días'),
('Trimestral Pro', 90, 650.00, 'Acceso ilimitado por 90 días con descuento especial'),
('Anual VIP', 365, 2200.00, 'Acceso total por 365 días + casillero y toalla gratis');

-- 6.5 Membresías
-- Con fechas vigentes que cubren las asistencias históricas de prueba
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

-- 6.6 Pagos
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

-- 6.7 Asistencias (Clientes con membresía activa)
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
