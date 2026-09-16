import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  UserX, 
  UserCheck, 
  Eye, 
  Dumbbell, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  X,
  CreditCard
} from 'lucide-react';
import { api } from '../services/api';

export default function ClientesPage({ onSelectClienteParaMembresia }) {
  const [clientes, setClientes] = useState([]);
  const [entrenadores, setEntrenadores] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Modal State Cliente
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [formData, setFormData] = useState({
    Nombre: '',
    Carnet: '',
    Telefono: '',
    Email: '',
    idEntrenador: '',
  });

  // Modal Asignar / Renovar Membresía
  const [modalMembresia, setModalMembresia] = useState(null);
  const [formMembresia, setFormMembresia] = useState({
    idPlan: '',
    Fecha_Inicio: new Date().toISOString().split('T')[0],
    registrarPago: true,
    Monto: '',
    Nro_Comprobante: '',
  });

  // Modal Detalle
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [clienteDetalle, setClienteDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resClientes, resEntrenadores, resPlanes] = await Promise.all([
        api.getClientes({ busqueda, estado: filtroEstado }),
        api.getEntrenadores(),
        api.getPlanes(),
      ]);
      setClientes(resClientes);
      setEntrenadores(resEntrenadores);
      setPlanes(resPlanes);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [busqueda, filtroEstado]);

  const handleOpenModal = (cliente = null) => {
    if (cliente) {
      setEditingCliente(cliente);
      setFormData({
        Nombre: cliente.nombre || '',
        Carnet: cliente.carnet || '',
        Telefono: cliente.telefono || '',
        Email: cliente.email || '',
        idEntrenador: cliente.identrenador || '',
      });
    } else {
      setEditingCliente(null);
      setFormData({
        Nombre: '',
        Carnet: '',
        Telefono: '',
        Email: '',
        idEntrenador: '',
      });
    }
    setModalOpen(true);
  };

  const handleSaveCliente = async (e) => {
    e.preventDefault();
    try {
      if (editingCliente) {
        await api.updateCliente(editingCliente.idcliente, {
          ...formData,
          idEntrenador: formData.idEntrenador ? parseInt(formData.idEntrenador, 10) : null,
        });
      } else {
        await api.createCliente({
          ...formData,
          idEntrenador: formData.idEntrenador ? parseInt(formData.idEntrenador, 10) : null,
        });
      }
      setModalOpen(false);
      cargarDatos();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleBajaCliente = async (cliente) => {
    const estadoActual = cliente.estado;
    const accion = estadoActual === 'Activo' ? 'dar de baja' : 'reactivar';
    if (!confirm(`¿Estás seguro de que deseas ${accion} a este cliente?`)) return;

    try {
      if (estadoActual === 'Activo') {
        await api.deleteCliente(cliente.idcliente);
      } else {
        const res = await api.updateCliente(cliente.idcliente, {
          Nombre: cliente.nombre,
          Carnet: cliente.carnet,
          Telefono: cliente.telefono,
          Email: cliente.email,
          idEntrenador: cliente.identrenador,
          Estado: 'Activo',
        });
        if (res?.aviso) {
          alert(`ℹ️ ${res.aviso}`);
        } else if (cliente.estado_membresia === 'Vencida' || cliente.estado_membresia === 'Sin Membresía' || cliente.dias_restantes < 0) {
          alert('ℹ️ Cliente reactivado. Aviso: Su membresía no está vigente, requiere renovación para habilitar el acceso.');
        }
      }
      cargarDatos();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleAbrirMembresia = (cliente) => {
    setModalMembresia(cliente);
    setFormMembresia({
      idPlan: '',
      Fecha_Inicio: new Date().toISOString().split('T')[0],
      registrarPago: true,
      Monto: '',
      Nro_Comprobante: `REC-${Date.now().toString().slice(-6)}`,
    });
  };

  const handlePlanChangeMembresia = (idPlan) => {
    const plan = planes.find((p) => p.idplan === parseInt(idPlan, 10));
    setFormMembresia({
      ...formMembresia,
      idPlan,
      Monto: plan ? plan.precio : '',
      Nro_Comprobante: `REC-${Date.now().toString().slice(-6)}`,
    });
  };

  const handleGuardarMembresia = async (e) => {
    e.preventDefault();
    try {
      await api.createMembresia({
        idCliente: modalMembresia.idcliente,
        idPlan: parseInt(formMembresia.idPlan, 10),
        Fecha_Inicio: formMembresia.Fecha_Inicio,
        registrarPago: formMembresia.registrarPago,
        Monto: formMembresia.Monto ? parseFloat(formMembresia.Monto) : undefined,
        Nro_Comprobante: formMembresia.Nro_Comprobante,
      });
      alert(`¡Membresía asignada con éxito! El cliente ${modalMembresia.nombre} ha sido activado.`);
      setModalMembresia(null);
      cargarDatos();
    } catch (err) {
      alert('Error al registrar membresía: ' + err.message);
    }
  };

  const handleVerDetalle = async (id) => {
    try {
      setLoadingDetalle(true);
      setDetalleOpen(true);
      const res = await api.getClienteById(id);
      setClienteDetalle(res);
    } catch (err) {
      alert('Error al obtener detalle: ' + err.message);
      setDetalleOpen(false);
    } finally {
      setLoadingDetalle(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" /> Directorio de Clientes
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestión de usuarios, estado de membresía y asignación de entrenadores.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o número de carnet..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-none"
          >
            <option value="">Todos los Estados</option>
            <option value="Activo">Activos</option>
            <option value="Inactivo">Inactivos (Baja lógica)</option>
          </select>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Carnet / CI</th>
                <th className="px-5 py-3.5">Contacto</th>
                <th className="px-5 py-3.5">Entrenador</th>
                <th className="px-5 py-3.5">Membresía</th>
                <th className="px-5 py-3.5">Estado Cliente</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    Cargando listado de clientes...
                  </td>
                </tr>
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    No se encontraron clientes con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                clientes.map((c) => (
                  <tr key={c.idcliente} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white">{c.nombre}</div>
                      <div className="text-[11px] text-slate-400">ID: #{c.idcliente}</div>
                    </td>
                    <td className="px-5 py-4 font-mono font-medium text-slate-200">
                      {c.carnet}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <div>{c.telefono || 'Sin teléfono'}</div>
                      <div className="text-slate-400 truncate max-w-[150px]">{c.email || 'Sin email'}</div>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {c.entrenador_nombre ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
                          <Dumbbell className="w-3 h-3 text-purple-400" />
                          {c.entrenador_nombre}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">No asignado</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <div>
                        <span className="font-bold text-slate-200">{c.nombre_plan || 'Sin Plan'}</span>
                      </div>
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1 ${
                          c.estado_membresia === 'Activa' && c.dias_restantes >= 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : c.estado_membresia === 'Vencida'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {c.estado_membresia} {c.dias_restantes > 0 ? `(${c.dias_restantes}d)` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        c.estado === 'Activo'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-slate-700/50 text-slate-400'
                      }`}>
                        {c.estado === 'Activo' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleVerDetalle(c.idcliente)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                          title="Ver Ficha y Estadísticas"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(c)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                          title="Editar Datos"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAbrirMembresia(c)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded-lg transition"
                          title="Asignar o Renovar Membresía"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleBajaCliente(c)}
                          className={`p-1.5 rounded-lg transition ${
                            c.estado === 'Activo'
                              ? 'bg-red-950/40 text-red-400 hover:bg-red-900/60'
                              : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60'
                          }`}
                          title={c.estado === 'Activo' ? 'Dar de baja (Lógica)' : 'Reactivar cliente'}
                        >
                          {c.estado === 'Activo' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR / EDITAR CLIENTE */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-5 top-5 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              {editingCliente ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Completa la información personal y asignación técnica.
            </p>

            <form onSubmit={handleSaveCliente} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.Nombre}
                  onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })}
                  placeholder="Ej: Laura Morales"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Carnet de Identidad *</label>
                  <input
                    type="text"
                    required
                    value={formData.Carnet}
                    onChange={(e) => setFormData({ ...formData, Carnet: e.target.value })}
                    placeholder="Ej: 8974561"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={formData.Telefono}
                    onChange={(e) => setFormData({ ...formData, Telefono: e.target.value })}
                    placeholder="Ej: 77123456"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={formData.Email}
                  onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                  placeholder="Ej: laura@email.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Entrenador Asignado</label>
                <select
                  value={formData.idEntrenador}
                  onChange={(e) => setFormData({ ...formData, idEntrenador: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-none"
                >
                  <option value="">Sin entrenador asignado</option>
                  {entrenadores.map((ent) => (
                    <option key={ent.identrenador} value={ent.identrenador}>
                      {ent.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition shadow-lg shadow-emerald-500/20"
                >
                  {editingCliente ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE / HISTORIAL DE CLIENTE */}
      {detalleOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setDetalleOpen(false)}
              className="absolute right-5 top-5 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingDetalle || !clienteDetalle ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                Cargando historial del cliente...
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{clienteDetalle.cliente.nombre}</h3>
                  <p className="text-xs text-slate-400">
                    CI: {clienteDetalle.cliente.carnet} | Tel: {clienteDetalle.cliente.telefono || 'Sin teléfono'} | Email: {clienteDetalle.cliente.email || 'Sin email'}
                  </p>
                </div>

                {/* Historial de Membresías */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Historial de Membresías y Planes
                  </h4>
                  {clienteDetalle.membresias.length > 0 ? (
                    <div className="space-y-2">
                      {clienteDetalle.membresias.map((m) => (
                        <div key={m.idmembresia} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-white block">{m.nombre_plan} (Bs. {m.precio})</span>
                            <span className="text-slate-400">
                              {new Date(m.fecha_inicio).toLocaleDateString('es-BO')} al {new Date(m.fecha_fin).toLocaleDateString('es-BO')}
                            </span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                            m.estado === 'Activa' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {m.estado}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No registra membresías previas.</p>
                  )}
                </div>

                {/* Historial de Asistencias */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" /> Últimos Registros de Asistencia
                  </h4>
                  {clienteDetalle.asistencias.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {clienteDetalle.asistencias.map((a) => (
                        <div key={a.idasistencia} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                          <span className="font-semibold text-slate-200 block">
                            {new Date(a.fecha).toLocaleDateString('es-BO')}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">{a.hora}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No registra asistencias aún.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL ASIGNAR / RENOVAR MEMBRESIA */}
      {modalMembresia && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setModalMembresia(null)}
              className="absolute right-5 top-5 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              {modalMembresia.estado_membresia === 'Activa' ? 'Renovar Membresía' : 'Asignar Nueva Membresía'}
            </h3>
            <div className="text-xs text-slate-400 mb-4 flex flex-wrap items-center gap-2">
              <span>Cliente: <strong className="text-white">{modalMembresia.nombre}</strong> (CI: {modalMembresia.carnet})</span>
              {modalMembresia.estado === 'Inactivo' && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                  ✓ Se reactivará a 'Activo'
                </span>
              )}
            </div>

            <form onSubmit={handleGuardarMembresia} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Tarifario *</label>
                <select
                  required
                  value={formMembresia.idPlan}
                  onChange={(e) => handlePlanChangeMembresia(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-none"
                >
                  <option value="">Selecciona un plan...</option>
                  {planes.map((p) => (
                    <option key={p.idplan} value={p.idplan}>
                      {p.nombre_plan} - Bs. {p.precio} ({p.duracion} días)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha de Inicio *</label>
                <input
                  type="date"
                  required
                  value={formMembresia.Fecha_Inicio}
                  onChange={(e) => setFormMembresia({ ...formMembresia, Fecha_Inicio: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              {/* Registro de Pago Simultáneo */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formMembresia.registrarPago}
                    onChange={(e) => setFormMembresia({ ...formMembresia, registrarPago: e.target.checked })}
                    className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs font-bold text-slate-200">Registrar cobro y emitir recibo ahora</span>
                </label>

                {formMembresia.registrarPago && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Monto Abonado (Bs.)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formMembresia.Monto}
                        onChange={(e) => setFormMembresia({ ...formMembresia, Monto: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg text-sm text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Nº Comprobante</label>
                      <input
                        type="text"
                        value={formMembresia.Nro_Comprobante}
                        onChange={(e) => setFormMembresia({ ...formMembresia, Nro_Comprobante: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg text-sm text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalMembresia(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition shadow-lg shadow-emerald-500/20"
                >
                  Guardar y Activar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
