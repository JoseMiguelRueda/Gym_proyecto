# 🏋️ Sistema de Gestión de Gimnasio (GymPro)

Sistema integral de gestión de gimnasios desarrollado con **PostgreSQL (pgAdmin 4)**, **Node.js/Express API (Backend)** y **React + Vite + Tailwind CSS (Frontend)**.

---

## 🗄️ 1. Migración y Configuración en pgAdmin 4 (PostgreSQL 18)

1. Abre **pgAdmin 4** en tu computadora.
2. En el panel izquierdo, conéctate a tu servidor local PostgreSQL (ej: `PostgreSQL 18`).
3. Haz clic derecho sobre **Databases** ➡️ **Create** ➡️ **Database...**
   - Nombre de la base de datos: `gym_db`
   - Haz clic en **Save**.
4. Haz clic derecho sobre la base de datos `gym_db` ➡️ selecciona **Query Tool** (Herramienta de Consulta).
5. Abre o copia el contenido del archivo [`database/schema_pgadmin4.sql`](file:///c:/Users/ariel/OneDrive/Escritorio/gym%20proyecto/database/schema_pgadmin4.sql).
6. Presiona **F5** o haz clic en el botón de **Execute / Play** ▶️.
7. ¡Listo! Se habrán creado las 7 tablas normalizadas, las llaves foráneas, índices, triggers de acceso, vistas analíticas y datos semilla.

---

## ⚙️ 2. Configurar y Ejecutar el Backend

1. Abre el archivo [`backend/.env`](file:///c:/Users/ariel/OneDrive/Escritorio/gym%20proyecto/backend/.env) y asegúrate de que tu contraseña de PostgreSQL sea la correcta:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=tu_password_aqui
   DB_NAME=gym_db
   ```
2. Inicia el servidor backend:
   ```bash
   cd backend
   npm start
   ```
   El backend estará disponible en `http://localhost:5000`.

---

## 💻 3. Ejecutar el Frontend

1. En una nueva terminal, inicia la aplicación cliente:
   ```bash
   cd frontend
   npm run dev
   ```
2. Abre tu navegador en **`http://localhost:3000`** para interactuar con la aplicación.

---

## 📋 Módulos Implementados
* **Dashboard Gerencial:** Métricas financieras en tiempo real, conteo de clientes activos/inactivos, asistencias de hoy y alertas de membresías por vencer.
* **Control de Acceso en Recepción (Live):** Semáforo visual verde/rojo para validación sub-segundo por carnet o ID, con registro de ingreso en un clic.
* **Directorio de Clientes:** CRUD completo, historial de asistencias/pagos y asignación de entrenadores.
* **Membresías & Pagos:** Emisión de planes, cálculo de vigencia y generación de comprobantes de pago.
* **Entrenadores & Horarios:** Gestión del personal técnico y franjas de disponibilidad.
* **Planes Tarifarios:** Configuración de paquetes, precios y beneficios.
