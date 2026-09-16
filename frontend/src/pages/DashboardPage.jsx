import React, { useEffect, useState } from 'react';
import { 
  Users, 
  DollarSign, 
  CalendarCheck, 
  Dumbbell, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { api } from '../services/api';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

export default function DashboardPage({ setActiveTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboardStats();
      setData(res);
    } catch (err) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-slate-400 text-sm">Cargando métricas del gimnasio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-950/40 border border-red-500/30 rounded-2xl text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
        <h3 className="text-lg font-bold text-red-200">Error de Conexión</h3>
        <p className="text-sm text-red-300">{error}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalClientes: 0,
    clientesActivos: 0,
    clientesInactivos: 0,
    ingresosMes: 0,
    asistenciasHoy: 0,
    totalEntrenadores: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950/40 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Panel de Control Gerencial</h1>
          <p className="text-slate-400 text-sm mt-1">
            Resumen en tiempo real de operaciones, finanzas y flujo de clientes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('recepcion')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20"
          >
            <CalendarCheck className="w-4 h-4" />
            Control Recepción
          </button>
          <button
            onClick={fetchStats}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
            title="Actualizar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ingresos del Mes */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ingresos del Mes</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white">
              Bs. {kpis.ingresosMes.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> Recaudación acumulada
            </p>
          </div>
        </div>

        {/* Card 2: Clientes Activos */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clientes Activos</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white">
              {kpis.clientesActivos} <span className="text-sm font-normal text-slate-400">/ {kpis.totalClientes} total</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {kpis.clientesInactivos} inactivos o sin renovar
            </p>
          </div>
        </div>

        {/* Card 3: Asistencias de Hoy */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Asistencias Hoy</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white">{kpis.asistenciasHoy}</h3>
            <p className="text-xs text-amber-400 flex items-center gap-1 mt-1 font-medium">
              <Clock className="w-3.5 h-3.5" /> Ingresos registrados hoy
            </p>
          </div>
        </div>

        {/* Card 4: Entrenadores */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Entrenadores</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Dumbbell className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white">{kpis.totalEntrenadores}</h3>
            <p className="text-xs text-slate-400 mt-1">Personal técnico activo</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Historial de Ingresos */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-base">Evolución de Ingresos Mensuales</h3>
              <p className="text-xs text-slate-400">Recaudación por mes en bolivianos</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {data?.ingresosPorMes && data.ingresosPorMes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.ingresosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `Bs. ${v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                    formatter={(val) => [`Bs. ${Number(val).toFixed(2)}`, 'Total']}
                  />
                  <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                No hay suficientes datos de pagos registrados
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Distribución por Planes */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <h3 className="font-bold text-white text-base mb-1">Membresías por Plan</h3>
          <p className="text-xs text-slate-400 mb-4">Distribución de clientes activos</p>

          <div className="h-52 w-full">
            {data?.planesDistribucion && data.planesDistribucion.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.planesDistribucion}
                    dataKey="total_clientes"
                    nameKey="nombre_plan"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={5}
                  >
                    {data.planesDistribucion.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                Sin datos de membresías
              </div>
            )}
          </div>

          <div className="space-y-1.5 mt-2">
            {data?.planesDistribucion?.map((plan, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="text-slate-300 truncate max-w-[130px]">{plan.nombre_plan}</span>
                </div>
                <span className="font-semibold text-white">{plan.total_clientes} clientes</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alertas de Vencimiento de Membresías */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Alertas: Membresías por Vencer (Próximos 7 días)</h3>
              <p className="text-xs text-slate-400">Contactar a estos clientes para coordinar renovación</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('membresias')}
            className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
          >
            Ver todas las membresías <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {data?.membresiasPorVencer && data.membresiasPorVencer.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-xs uppercase text-slate-400 font-semibold">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Cliente</th>
                  <th className="px-4 py-3">Carnet / CI</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Plan Actual</th>
                  <th className="px-4 py-3">Vence</th>
                  <th className="px-4 py-3 rounded-r-lg text-right">Días Restantes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.membresiasPorVencer.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-semibold text-white">{m.cliente_nombre}</td>
                    <td className="px-4 py-3">{m.carnet}</td>
                    <td className="px-4 py-3 text-slate-400">{m.telefono || 'Sin teléfono'}</td>
                    <td className="px-4 py-3 text-emerald-400 font-medium">{m.nombre_plan}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(m.fecha_fin).toLocaleDateString('es-BO')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        m.dias_restantes <= 2 
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {m.dias_restantes === 0 ? 'Vence Hoy' : `${m.dias_restantes} días`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 text-sm">
            🎉 No hay membresías por vencer en los próximos 7 días.
          </div>
        )}
      </div>
    </div>
  );
}
