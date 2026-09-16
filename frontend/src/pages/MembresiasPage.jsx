import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  PlusCircle, 
  DollarSign, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search,
  RefreshCw,
  X,
  Printer
} from 'lucide-react';
import { api } from '../services/api';

export default function MembresiasPage() {
  const [tab, setTab] = useState('membresias'); // 'membresias' | 'pagos'
  const [membresias, setMembresias] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtroEstado, setFiltroEstado] = useState('');

  // Modal Nueva Membresía
  const [modalMembresiaOpen, setModalMembresiaOpen] = useState(false);
  const [formMembresia, setFormMembresia] = useState({
    idCliente: '',
    idPlan: '',
    Fecha_Inicio: new Date().toISOString().split('T')[0],
    registrarPago: true,
    Monto: '',
    Nro_Comprobante: '',
  });

  // Modal Nuevo Pago Individual
  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [formPago, setFormPago] = useState({
    idMembresia: '',
    Monto: '',
    Nro_Comprobante: '',
  });

  // Modal Comprobante Recibo
  const [reciboModalOpen, setReciboModalOpen] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resMembresias, resPagos, resPlanes, resClientes] = await Promise.all([
        api.getMembresias({ estado: filtroEstado }),
        api.getPagos(),
        api.getPlanes(),
        api.getClientes(),
      ]);
      setMembresias(resMembresias);
      setPagos(resPagos);
      setPlanes(resPlanes);
      setClientes(resClientes);
    } catch (err) {
      console.error('Error al cargar membresías/pagos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado]);

  const handlePlanChange = (idPlan) => {
    const plan = planes.find((p) => p.idplan === parseInt(idPlan, 10));
    setFormMembresia({
      ...formMembresia,
      idPlan,
      Monto: plan ? plan.precio : '',
      Nro_Comprobante: `REC-${Date.now().toString().slice(-6)}`,
    });
  };

  const handleCrearMembresia = async (e) => {
    e.preventDefault();
    try {
      await api.createMembresia({
        idCliente: parseInt(formMembresia.idCliente, 10),
        idPlan: parseInt(formMembresia.idPlan, 10),
        Fecha_Inicio: formMembresia.Fecha_Inicio,
        registrarPago: formMembresia.registrarPago,
        Monto: formMembresia.Monto ? parseFloat(formMembresia.Monto) : undefined,
        Nro_Comprobante: formMembresia.Nro_Comprobante,
      });
      setModalMembresiaOpen(false);
      cargarDatos();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleCrearPago = async (e) => {
    e.preventDefault();
    const montoVal = parseFloat(formPago.Monto);
    if (formPago.saldoPendiente !== undefined && montoVal > formPago.saldoPendiente) {
      alert(`El monto a pagar (Bs. ${montoVal.toFixed(2)}) no puede superar el saldo pendiente (Bs. ${formPago.saldoPendiente.toFixed(2)}).`);
      return;
    }
    try {
      const res = await api.createPago({
        idMembresia: parseInt(formPago.idMembresia, 10),
        Monto: montoVal,
        Nro_Comprobante: formPago.Nro_Comprobante || `REC-${Date.now().toString().slice(-6)}`,
      });
      if (res?.message) {
        alert(res.message);
      }
      setModalPagoOpen(false);
      cargarDatos();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleVerRecibo = (pago) => {
    setPagoSeleccionado(pago);
    setReciboModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" /> Membresías & Cobranzas
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Administración de suscripciones activas, cálculo de vigencia y registro de pagos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFormMembresia({
                idCliente: '',
                idPlan: '',
                Fecha_Inicio: new Date().toISOString().split('T')[0],
                registrarPago: true,
                Monto: '',
                Nro_Comprobante: `REC-${Date.now().toString().slice(-6)}`,
              });
              setModalMembresiaOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva Membresía
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setTab('membresias')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            tab === 'membresias'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Suscripciones & Membresías ({membresias.length})
        </button>
        <button
          onClick={() => setTab('pagos')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            tab === 'pagos'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Historial de Pagos & Recibos ({pagos.length})
        </button>
      </div>

      {/* TAB 1: MEMBRESIAS */}
      {tab === 'membresias' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Filtrar estado de membresía:</span>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="">Todas las Membresías</option>
              <option value="Activa">Activas</option>
              <option value="Vencida">Vencidas (Expiradas)</option>
              <option value="Inactiva">Inactivas (Canceladas/Baja)</option>
            </select>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Cliente</th>
                    <th className="px-5 py-3.5">Plan Contratado</th>
                    <th className="px-5 py-3.5">Período de Vigencia</th>
                    <th className="px-5 py-3.5">Días Restantes</th>
                    <th className="px-5 py-3.5">Estado</th>
                    <th className="px-5 py-3.5">Total Pagado</th>
                    <th className="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                        Cargando membresías...
                      </td>
                    </tr>
                  ) : membresias.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-500">
                        No hay membresías registradas con el criterio seleccionado.
                      </td>
                    </tr>
                  ) : (
                    membresias.map((m) => (
                      <tr key={m.idmembresia} className="hover:bg-slate-800/40 transition">
                        <td className="px-5 py-4">
                          <div className="font-bold text-white">{m.cliente_nombre}</div>
                          <div className="text-[11px] text-slate-400">CI: {m.cliente_carnet}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-emerald-400">{m.nombre_plan}</div>
                          <div className="text-xs text-slate-400">Bs. {m.plan_precio} ({m.plan_duracion} días)</div>
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <div className="font-mono text-slate-200">
                            {new Date(m.fecha_inicio).toLocaleDateString('es-BO')} al {new Date(m.fecha_fin).toLocaleDateString('es-BO')}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            m.dias_restantes > 5
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : m.dias_restantes >= 0
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {m.dias_restantes >= 0 ? `${m.dias_restantes} días` : 'Vencida'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            m.estado === 'Activa'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : m.estado === 'Vencida'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {m.estado}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <div className="font-bold text-white">
                            Bs. {Number(m.total_pagado).toFixed(2)} / {Number(m.plan_precio).toFixed(2)}
                          </div>
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1 ${
                              Number(m.total_pagado) >= Number(m.plan_precio)
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : Number(m.total_pagado) > 0
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {Number(m.total_pagado) >= Number(m.plan_precio) 
                                ? '✓ Pagado' 
                                : Number(m.total_pagado) > 0 
                                ? `Resta: Bs. ${(Number(m.plan_precio) - Number(m.total_pagado)).toFixed(2)}` 
                                : 'Impago'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {Number(m.total_pagado) >= Number(m.plan_precio) ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs ml-auto cursor-default">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Pagado Completo
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                const pendiente = Math.max(0, parseFloat(m.plan_precio) - parseFloat(m.total_pagado));
                                setFormPago({
                                  idMembresia: m.idmembresia,
                                  Monto: pendiente.toFixed(2),
                                  Nro_Comprobante: `REC-${Date.now().toString().slice(-6)}`,
                                  saldoPendiente: pendiente,
                                  clienteNombre: m.cliente_nombre,
                                  planNombre: m.nombre_plan,
                                });
                                setModalPagoOpen(true);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg transition border border-emerald-500/40 flex items-center gap-1.5 ml-auto shadow-md shadow-emerald-600/20"
                              title="Abonar pago restante"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              Abonar (Bs. {(parseFloat(m.plan_precio) - parseFloat(m.total_pagado)).toFixed(2)})
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAGOS */}
      {tab === 'pagos' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Nº Comprobante</th>
                  <th className="px-5 py-3.5">Fecha Pago</th>
                  <th className="px-5 py-3.5">Cliente</th>
                  <th className="px-5 py-3.5">Plan Asociado</th>
                  <th className="px-5 py-3.5">Monto Abonado</th>
                  <th className="px-5 py-3.5 text-right">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                      Cargando historial de pagos...
                    </td>
                  </tr>
                ) : pagos.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-500">
                      No hay pagos registrados.
                    </td>
                  </tr>
                ) : (
                  pagos.map((p) => (
                    <tr key={p.idpago} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4 font-mono font-bold text-emerald-400">
                        {p.nro_comprobante || `REC-${p.idpago}`}
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-slate-300">
                        {new Date(p.fecha_pago).toLocaleDateString('es-BO')}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-white">{p.cliente_nombre}</div>
                        <div className="text-[11px] text-slate-400">CI: {p.cliente_carnet}</div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-300 font-medium">
                        {p.nombre_plan}
                      </td>
                      <td className="px-5 py-4 font-black text-white text-base">
                        Bs. {Number(p.monto).toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleVerRecibo(p)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                          title="Ver e Imprimir Recibo"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NUEVA MEMBRESIA */}
      {modalMembresiaOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setModalMembresiaOpen(false)}
              className="absolute right-5 top-5 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Registrar Nueva Membresía</h3>
            <p className="text-xs text-slate-400 mb-5">
              Asigna un plan tarifario al cliente con cálculo automático de fecha de vencimiento.
            </p>

            <form onSubmit={handleCrearMembresia} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Seleccionar Cliente *</label>
                <select
                  required
                  value={formMembresia.idCliente}
                  onChange={(e) => setFormMembresia({ ...formMembresia, idCliente: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-none"
                >
                  <option value="">Selecciona un cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.idcliente} value={c.idcliente}>
                      {c.nombre} (CI: {c.carnet}) {c.estado === 'Inactivo' ? '⚠️ [Inactivo - Se reactivará]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Tarifario *</label>
                <select
                  required
                  value={formMembresia.idPlan}
                  onChange={(e) => handlePlanChange(e.target.value)}
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
                  onClick={() => setModalMembresiaOpen(false)}
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

      {/* MODAL REGISTRO DE PAGO INDIVIDUAL */}
      {modalPagoOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setModalPagoOpen(false)}
              className="absolute right-5 top-5 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Registrar Cobro / Abono</h3>
            <p className="text-xs text-slate-400 mb-5">
              Genera un comprobante de pago para la membresía seleccionada.
            </p>

            <form onSubmit={handleCrearPago} className="space-y-4">
              {formPago.clienteNombre && (
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cliente:</span>
                    <span className="font-bold text-white">{formPago.clienteNombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Plan:</span>
                    <span className="font-semibold text-emerald-400">{formPago.planNombre}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-slate-800">
                    <span className="text-slate-400">Saldo Pendiente a Cobrar:</span>
                    <span className="font-black text-amber-400 text-sm">Bs. {Number(formPago.saldoPendiente || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Monto a Cobrar (Bs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={formPago.saldoPendiente || undefined}
                  required
                  value={formPago.Monto}
                  onChange={(e) => setFormPago({ ...formPago, Monto: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-lg font-black text-white focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">Máximo a abonar: Bs. {Number(formPago.saldoPendiente || 0).toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Número de Recibo / Comprobante</label>
                <input
                  type="text"
                  value={formPago.Nro_Comprobante}
                  onChange={(e) => setFormPago({ ...formPago, Nro_Comprobante: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm font-mono text-white focus:outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalPagoOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition"
                >
                  Registrar Cobro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL COMPROBANTE DE PAGO (RECIBO) */}
      {reciboModalOpen && pagoSeleccionado && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setReciboModalOpen(false)}
              className="absolute right-5 top-5 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Print Area Preview */}
            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs space-y-4 text-slate-300">
              <div className="text-center pb-3 border-b border-slate-800">
                <h4 className="text-base font-black text-white uppercase tracking-wider">GYMPRO FITNESS</h4>
                <p className="text-[10px] text-slate-400">Comprobante Oficial de Pago</p>
                <p className="text-emerald-400 font-bold mt-1 text-sm">{pagoSeleccionado.nro_comprobante}</p>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Fecha:</span>
                  <span className="font-semibold text-white">{new Date(pagoSeleccionado.fecha_pago).toLocaleDateString('es-BO')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <span className="font-semibold text-white">{pagoSeleccionado.cliente_nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Carnet / CI:</span>
                  <span className="font-semibold text-white">{pagoSeleccionado.cliente_carnet}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Concepto:</span>
                  <span className="font-semibold text-emerald-400">{pagoSeleccionado.nombre_plan}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-dashed border-slate-700 flex justify-between items-center text-sm">
                <span className="font-bold text-white">TOTAL PAGADO:</span>
                <span className="font-black text-emerald-400 text-lg">
                  Bs. {Number(pagoSeleccionado.monto).toFixed(2)}
                </span>
              </div>

              <div className="pt-2 text-center text-[10px] text-slate-500">
                ¡Gracias por entrenar con nosotros!
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition"
              >
                <Printer className="w-4 h-4" /> Imprimir Comprobante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
