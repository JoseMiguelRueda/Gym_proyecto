import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  Trash2, 
  Edit3, 
  RefreshCw,
  X,
  PlusCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function EntrenadoresPage() {
  const [entrenadores, setEntrenadores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Entrenador
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntrenador, setEditingEntrenador] = useState(null);
  const [formData, setFormData] = useState({
    Nombre: '',
    Carnet: '',
    Telefono: '',
    Email: '',
  });

  // Modal Horario
  const [horarioModalOpen, setHorarioModalOpen] = useState(false);
  const [selectedEntrenador, setSelectedEntrenador] = useState(null);
  const [formHorario, setFormHorario] = useState({
    Dia: 'Lunes a Viernes',
    Horario: '06:00 - 08:00',
  });

  const cargarEntrenadores = async () => {
    try {
      setLoading(true);
      const res = await api.getEntrenadores();
      setEntrenadores(res);
    } catch (err) {
      console.error('Error al cargar entrenadores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEntrenadores();
  }, []);

  const handleOpenModal = (ent = null) => {
    if (ent) {
      setEditingEntrenador(ent);
      setFormData({
        Nombre: ent.nombre || '',
        Carnet: ent.carnet || '',
        Telefono: ent.telefono || '',
        Email: ent.email || '',
      });
    } else {
      setEditingEntrenador(null);
      setFormData({
        Nombre: '',
        Carnet: '',
        Telefono: '',
        Email: '',
      });
    }
    setModalOpen(true);
  };

  const handleSaveEntrenador = async (e) => {
    e.preventDefault();
    try {
      if (editingEntrenador) {
        await api.updateEntrenador(editingEntrenador.identrenador, formData);
      } else {
        await api.createEntrenador(formData);
      }
      setModalOpen(false);
      cargarEntrenadores();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteEntrenador = async (id) => {
    if (!confirm('¿Deseas eliminar a este entrenador?')) return;
    try {
      await api.deleteEntrenador(id);
      cargarEntrenadores();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleAddHorario = async (e) => {
    e.preventDefault();
    if (!selectedEntrenador) return;
    try {
      await api.addHorario({
        idEntrenador: selectedEntrenador.identrenador,
        Dia: formHorario.Dia,
        Horario: formHorario.Horario,
      });
      setHorarioModalOpen(false);
      cargarEntrenadores();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteHorario = async (idHorario) => {
    if (!confirm('¿Deseas eliminar esta franja horaria?')) return;
    try {
      await api.deleteHorario(idHorario);
      cargarEntrenadores();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-emerald-400" /> Plantel de Entrenadores & Horarios
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestión del personal de entrenamiento y disponibilidad horaria asignada.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nuevo Entrenador
        </button>
      </div>

      {/* Trainers Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
          Cargando entrenadores...
        </div>
      ) : entrenadores.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
          No hay entrenadores registrados en el sistema.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {entrenadores.map((ent) => (
            <div
              key={ent.identrenador}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition shadow-xl"
            >
              <div>
                {/* Header card */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold text-lg">
                      {ent.nombre.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">{ent.nombre}</h3>
                      <p className="text-xs text-slate-400">CI: {ent.carnet}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenModal(ent)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                      title="Editar entrenador"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEntrenador(ent.identrenador)}
                      className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-950/40 transition"
                      title="Eliminar entrenador"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-1 text-xs text-slate-300">
                  <p><span className="text-slate-500 font-medium">Teléfono:</span> {ent.telefono || 'Sin teléfono'}</p>
                  <p><span className="text-slate-500 font-medium">Email:</span> {ent.email || 'Sin correo'}</p>
                  <p><span className="text-slate-500 font-medium">Alumnos Activos:</span> <strong className="text-emerald-400 font-semibold">{ent.total_clientes} clientes</strong></p>
                </div>

                {/* Schedules List */}
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" /> Horarios de Trabajo
                    </span>
                    <button
                      onClick={() => {
                        setSelectedEntrenador(ent);
                        setHorarioModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Agregar
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {ent.horarios && ent.horarios.length > 0 ? (
                      ent.horarios.map((h, idx) => (
                        <div
                          key={h.idHorario || idx}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="text-slate-300 font-medium block">{h.Dia}</span>
                            <span className="text-slate-400 font-mono text-[11px]">{h.Horario}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteHorario(h.idHorario)}
                            className="text-slate-500 hover:text-red-400 p-1 transition"
                            title="Eliminar franja"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">Sin horarios registrados.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL ENTRENADOR */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-5 top-5 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              {editingEntrenador ? 'Editar Entrenador' : 'Registrar Entrenador'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Ingresa los datos personales del profesional de entrenamiento.
            </p>

            <form onSubmit={handleSaveEntrenador} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.Nombre}
                  onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })}
                  placeholder="Ej: Marco Justiniano"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Carnet de Identidad *</label>
                <input
                  type="text"
                  required
                  value={formData.Carnet}
                  onChange={(e) => setFormData({ ...formData, Carnet: e.target.value })}
                  placeholder="Ej: 6123456"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={formData.Telefono}
                  onChange={(e) => setFormData({ ...formData, Telefono: e.target.value })}
                  placeholder="Ej: 77223344"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={formData.Email}
                  onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                  placeholder="Ej: marco@email.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-none"
                />
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
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition"
                >
                  Guardar Entrenador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR HORARIO */}
      {horarioModalOpen && selectedEntrenador && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setHorarioModalOpen(false)}
              className="absolute right-5 top-5 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Asignar Franja Horaria</h3>
            <p className="text-xs text-slate-400 mb-5">
              Entrenador: <strong className="text-emerald-400">{selectedEntrenador.nombre}</strong>
            </p>

            <form onSubmit={handleAddHorario} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Días de Atención *</label>
                <select
                  value={formHorario.Dia}
                  onChange={(e) => setFormHorario({ ...formHorario, Dia: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-none"
                >
                  <option value="Lunes a Viernes">Lunes a Viernes</option>
                  <option value="Lunes a Sábado">Lunes a Sábado</option>
                  <option value="Lunes, Miércoles y Viernes">Lunes, Miércoles y Viernes</option>
                  <option value="Martes y Jueves">Martes y Jueves</option>
                  <option value="Sábados y Domingos">Sábados y Domingos</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Horario (Franja) *</label>
                <input
                  type="text"
                  required
                  value={formHorario.Horario}
                  onChange={(e) => setFormHorario({ ...formHorario, Horario: e.target.value })}
                  placeholder="Ej: 06:00 - 08:00"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setHorarioModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition"
                >
                  Agregar Horario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
