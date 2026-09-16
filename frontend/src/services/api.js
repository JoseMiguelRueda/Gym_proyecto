const API_BASE = '/api';

async function fetchJSON(url, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.error || data?.motivo || `Error ${res.status}: ${res.statusText}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    console.error(`API Error [${url}]:`, err.message);
    throw err;
  }
}

export const api = {
  // Health
  checkHealth: () => fetchJSON('/health'),

  // Dashboard
  getDashboardStats: () => fetchJSON('/dashboard/stats'),

  // Clientes
  getClientes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJSON(`/clientes${query ? `?${query}` : ''}`);
  },
  getClienteById: (id) => fetchJSON(`/clientes/${id}`),
  createCliente: (data) => fetchJSON('/clientes', { method: 'POST', body: JSON.stringify(data) }),
  updateCliente: (id, data) => fetchJSON(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateEstadoCliente: (id, estado) => fetchJSON(`/clientes/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ Estado: estado }) }),
  deleteCliente: (id) => fetchJSON(`/clientes/${id}`, { method: 'DELETE' }),

  // Entrenadores & Horarios
  getEntrenadores: () => fetchJSON('/entrenadores'),
  getEntrenadorById: (id) => fetchJSON(`/entrenadores/${id}`),
  createEntrenador: (data) => fetchJSON('/entrenadores', { method: 'POST', body: JSON.stringify(data) }),
  updateEntrenador: (id, data) => fetchJSON(`/entrenadores/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEntrenador: (id) => fetchJSON(`/entrenadores/${id}`, { method: 'DELETE' }),
  addHorario: (data) => fetchJSON('/entrenadores/horarios', { method: 'POST', body: JSON.stringify(data) }),
  deleteHorario: (id) => fetchJSON(`/entrenadores/horarios/${id}`, { method: 'DELETE' }),

  // Planes
  getPlanes: () => fetchJSON('/planes'),
  createPlan: (data) => fetchJSON('/planes', { method: 'POST', body: JSON.stringify(data) }),
  updatePlan: (id, data) => fetchJSON(`/planes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlan: (id) => fetchJSON(`/planes/${id}`, { method: 'DELETE' }),

  // Membresías
  getMembresias: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJSON(`/membresias${query ? `?${query}` : ''}`);
  },
  createMembresia: (data) => fetchJSON('/membresias', { method: 'POST', body: JSON.stringify(data) }),
  updateEstadoMembresia: (id, estado) => fetchJSON(`/membresias/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ Estado: estado }) }),

  // Pagos
  getPagos: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJSON(`/pagos${query ? `?${query}` : ''}`);
  },
  createPago: (data) => fetchJSON('/pagos', { method: 'POST', body: JSON.stringify(data) }),

  // Asistencias & Control de Acceso
  validarCliente: (carnet) => fetchJSON(`/asistencias/validar/${encodeURIComponent(carnet)}`),
  registrarAsistencia: (idCliente) => fetchJSON('/asistencias', { method: 'POST', body: JSON.stringify({ idCliente }) }),
  getAsistencias: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJSON(`/asistencias${query ? `?${query}` : ''}`);
  },
};
