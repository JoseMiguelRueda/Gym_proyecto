

CREATE TABLE Entrenador (
  idEntrenador SERIAL PRIMARY KEY,
  Nombre VARCHAR(100) NOT NULL,
  Carnet VARCHAR(20) NOT NULL ,
  Telefono VARCHAR(20),
  Email VARCHAR(100)
);

CREATE TABLE Cliente (
  idCliente SERIAL PRIMARY KEY,
  Nombre VARCHAR(100) NOT NULL,
  Carnet VARCHAR(20) NOT NULL ,
  Telefono VARCHAR(20),
  Email VARCHAR(100),
  Estado VARCHAR(20) DEFAULT 'Activo',
  idEntrenador INT,
  FOREIGN KEY (idEntrenador) REFERENCES Entrenador(idEntrenador)
);

CREATE TABLE Horario(
idHorario SERIAL primary key,
Dia varchar(20) not null,
Horario varchar(50) not null,
idEntrenador INT not null,
foreign key (idEntrenador) references Entrenador(idEntrenador)
);

CREATE TABLE Asistencia(
idAsistencia SERIAL primary key,
Fecha date not null,
Hora TIME not null,
idCliente int not null,
foreign key (idCliente) references Cliente(idCliente)
);

CREATE TABLE Planes(
idPlan SERIAL primary key,
Nombre_Plan varchar(50) not null,
Duracion int not null,
Precio DECIMAL(10,2) not null,
Descripcion varchar(255) not null
);

 create table Membresia(
 idMembresia SERIAL PRIMARY KEY,
 Fecha_Inicio date not null,
 Fecha_Fin date not null,
 Estado varchar(20) not null,
 idCliente int not null,
 foreign key (idCliente) references Cliente(idCliente),
 idPlan int not null,
 foreign key (idPlan) references Planes(idPlan)
 );

CREATE TABLE Pago(
idPago SERIAL primary key,
Monto decimal(10,2) not null,
Fecha_Pago date not null,
Nro_Comprobante varchar(50),
idMembresia int,
foreign key (idMembresia) references Membresia(idMembresia)
);


-- 1. ENTRENADORES (3 registros)
INSERT INTO Entrenador (Nombre, Carnet, Telefono, Email) VALUES
('Carlos Ramos', '4589123', '77001122', 'carlos.ramos@email.com'),
('Andrea Soliz', '5891234', '77112233', 'andrea.soliz@email.com'),
('Marco Justiniano', '6123456', '77223344', 'marco.j@email.com');

-- 2. HORARIOS (6 registros)
INSERT INTO Horario (Dia, Horario, idEntrenador) VALUES
('Lunes a Viernes', '06:00 - 08:00', 1),
('Lunes a Viernes', '18:00 - 20:00', 1),
('Lunes a Viernes', '08:00 - 10:00', 2),
('Lunes a Viernes', '16:00 - 18:00', 2),
('Lunes a Sábado', '10:00 - 12:00', 3),
('Lunes a Sábado', '14:00 - 16:00', 3);

-- 3. CLIENTES (10 registros)
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

-- 4. PLANES (3 registros, Duración en días)
INSERT INTO Planes (Nombre_Plan, Duracion, Precio, Descripcion) VALUES
('Mensual Pass', 30, 250.00, 'Acceso ilimitado al gimnasio durante 1 mes'),
('Trimestral Pro', 90, 650.00, 'Acceso ilimitado por 3 meses con descuento'),
('Anual VIP', 365, 2200.00, 'Acceso ilimitado por 1 año + casillero gratuito');

-- 5. MEMBRESIA (10 registros correspondientes a los clientes)
INSERT INTO Membresia (Fecha_Inicio, Fecha_Fin, Estado, idCliente, idPlan) VALUES
('2026-01-01', '2026-01-31', 'Inactiva', 1, 1),
('2026-02-01', '2026-03-03', 'Activa', 1, 1),
('2026-01-15', '2026-04-15', 'Activa', 2, 2),
('2026-02-01', '2026-03-03', 'Activa', 3, 1),
('2026-01-01', '2026-12-31', 'Activa', 4, 3),
('2025-11-01', '2025-12-01', 'Inactiva', 5, 1),
('2026-02-10', '2026-03-12', 'Activa', 6, 1),
('2026-01-01', '2026-04-01', 'Activa', 7, 2),
('2026-02-15', '2026-03-17', 'Activa', 8, 1),
('2025-10-01', '2025-11-01', 'Inactiva', 9, 1);

-- 6. PAGO (10 registros ligados a las membresías generadas)
INSERT INTO Pago (Monto, Fecha_Pago, Nro_Comprobante, idMembresia) VALUES
(250.00, '2026-01-01', 'C-001', 1),
(250.00, '2026-02-01', 'C-002', 2),
(650.00, '2026-01-15', 'C-003', 3),
(250.00, '2026-02-01', 'C-004', 4),
(2200.00, '2026-01-01', 'C-005', 5),
(250.00, '2025-11-01', 'C-006', 6),
(250.00, '2026-02-10', 'C-007', 7),
(650.00, '2026-01-01', 'C-008', 8),
(250.00, '2026-02-15', 'C-009', 9),
(250.00, '2025-10-01', 'C-010', 10);

-- 7. ASISTENCIA (12 registros de clientes activos)
INSERT INTO Asistencia (Fecha, Hora, idCliente) VALUES
('2026-02-01', '07:15:00', 1),
('2026-02-02', '07:30:00', 1),
('2026-02-03', '08:00:00', 2),
('2026-02-03', '16:10:00', 3),
('2026-02-04', '08:15:00', 2),
('2026-02-04', '18:30:00', 4),
('2026-02-05', '10:05:00', 6),
('2026-02-05', '06:45:00', 7),
('2026-02-06', '16:00:00', 8),
('2026-02-06', '07:00:00', 1),
('2026-02-07', '10:30:00', 6),
('2026-02-07', '07:20:00', 10);

select * from Entrenador;
select * from Cliente;
select * from Horario;
select * from Pago;
select * from Planes;
select * from Asistencia;
select * from Membresia;