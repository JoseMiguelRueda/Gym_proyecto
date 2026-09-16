import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Plus, 
  Check, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  X, 
  Zap, 
  Crown, 
  Award,
  Users
} from 'lucide-react';
import { api } from '../services/api';

export default function PlanesPage() {
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    Nombre_Plan: '',
    Duracion: '30',
    Precio: '',
    Descripcion: '',
  });

  const cargarPlanes = async () => {
    try {
      setLoading(true);
      const res = await api.getPlanes();
      setPlanes(res);
    } catch (err) {
      console.error('Error al cargar planes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPlanes();
  }, []);

  const handleOpenModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        Nombre_Plan: plan.nombre_plan || '',
        Duracion: plan.duracion?.toString() || '30',
        Precio: plan.precio?.toString() || '',
        Descripcion: plan.descripcion || '',
      });
    } else {
      setEditingPlan(null);
      setFormData({
        Nombre_Plan: '',
        Duracion: '30',
        Precio: '',
        Descripcion: '',
      });
    }
    setModalOpen(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await api.updatePlan(editingPlan.idplan, formData);
      } else {
        await api.createPlan(formData);
      }
      setModalOpen(false);
      cargarPlanes();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeletePlan = async (id) => {
    if (!confirm('¿Deseas eliminar este plan tarifario?')) return;
    try {
      await api.deletePlan(id);
      cargarPlanes();
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
            <Layers className="w-6 h-6 text-emerald-400" /> Planes & Tarifas del Gimnasio
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configuración de duración, precios en bolivianos y beneficios incluidos.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nuevo Plan
        </button>
      </div>

      {/* Grid of Plans */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
          Cargando planes tarifarios...
        </div>
      ) : planes.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
          No hay planes registrados en el sistema.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planes.map((p, idx) => (
            <div
              key={p.idplan}
              className={`rounded-2xl p-6 flex flex-col justify-between relative transition-all border shadow-xl ${
                idx === 1
                  ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/30 border-emerald-500/50 shadow-emerald-500/5'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Plan Header */}
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
                    {p.duracion} días de vigencia
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenModal(p)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                      title="Editar plan"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(p.idplan)}
                      className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-950/40 transition"
                      title="Eliminar plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-black text-white mt-4">{p.nombre_plan}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">Bs. {Number(p.precio).toFixed(2)}</span>
                  <span className="text-xs text-slate-400">/ suscripción</span>
                </div>

                <p className="text-xs text-slate-300 mt-4 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  {p.descripcion}
                </p>

                <div className="mt-5 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Acceso completo a máquinas y pesas</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Asignación de entrenador de turno</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Users className="w-4 h-4 text-emerald-400" />
                  {p.membresias_activas || 0} membresías activas
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL PLAN */}
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
              {editingPlan ? 'Editar Plan Tarifario' : 'Crear Nuevo Plan'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Define el nombre, duración en días y el precio en bolivianos.
            </p>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del Plan *</label>
                <input
                  type="text"
                  required
                  value={formData.Nombre_Plan}
                  onChange={(e) => setFormData({ ...formData, Nombre_Plan: e.target.value })}
                  placeholder="Ej: Semestral Plus"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Duración (Días) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.Duracion}
                    onChange={(e) => setFormData({ ...formData, Duracion: e.target.value })}
                    placeholder="30"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Precio (Bs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.Precio}
                    onChange={(e) => setFormData({ ...formData, Precio: e.target.value })}
                    placeholder="250.00"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción / Beneficios *</label>
                <textarea
                  rows="3"
                  required
                  value={formData.Descripcion}
                  onChange={(e) => setFormData({ ...formData, Descripcion: e.target.value })}
                  placeholder="Detalle de beneficios..."
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
                  Guardar Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
