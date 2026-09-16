import React, { useState, useEffect, useRef } from 'react';
import { 
  ScanLine, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  UserCheck, 
  AlertCircle, 
  Dumbbell, 
  Calendar,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

export default function RecepcionPage() {
  const [carnetInput, setCarnetInput] = useState('');
  const [validando, setValidando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorValidacion, setErrorValidacion] = useState(null);

  const [registrando, setRegistrando] = useState(false);
  const [exitoRegistro, setExitoRegistro] = useState(null);

  const [asistenciasHoy, setAsistenciasHoy] = useState([]);
  const [cargandoAsistencias, setCargandoAsistencias] = useState(false);

  const inputRef = useRef(null);

  const hoyFecha = new Date().toISOString().split('T')[0];

  const cargarAsistenciasHoy = async () => {
    try {
      setCargandoAsistencias(true);
      const res = await api.getAsistencias({ fecha: hoyFecha });
      setAsistenciasHoy(res);
    } catch (err) {
      console.error('Error al cargar asistencias:', err);
    } finally {
      setCargandoAsistencias(false);
    }
  };

  useEffect(() => {
    cargarAsistenciasHoy();
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleBuscar = async (e) => {
    e?.preventDefault();
    if (!carnetInput.trim()) return;

    setValidando(true);
    setResultado(null);
    setErrorValidacion(null);
    setExitoRegistro(null);

    try {
      const data = await api.validarCliente(carnetInput.trim());
      setResultado(data);
    } catch (err) {
      setErrorValidacion(err.message || 'Error al validar cliente');
    } finally {
      setValidando(false);
    }
  };

  const handleRegistrarIngreso = async () => {
    if (!resultado?.cliente?.idcliente) return;

    setRegistrando(true);
    setExitoRegistro(null);

    try {
      const res = await api.registrarAsistencia(resultado.cliente.idcliente);
      setExitoRegistro(res);
      // Limpiar input y resultado tras un breve delay o mantener feedback
      cargarAsistenciasHoy();
    } catch (err) {
      alert('⚠️ ' + (err.message || 'Error al registrar ingreso'));
    } finally {
      setRegistrando(false);
    }
  };

  const handleReset = () => {
    setCarnetInput('');
    setResultado(null);
    setErrorValidacion(null);
    setExitoRegistro(null);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950/40 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <ScanLine className="w-4 h-4" /> Control de Acceso en Recepción
          </div>
          <h1 className="text-2xl font-black text-white">Validación de Ingreso en Tiempo Real</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Verificación instantánea de vigencia de membresía (RF-014 / RNF-001).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Ingresos Hoy</span>
            <span className="text-xl font-black text-emerald-400">{asistenciasHoy.length}</span>
          </div>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Input & Verification Card */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-400" /> Búsqueda por Carnet de Identidad o ID
            </h2>

            <form onSubmit={handleBuscar} className="flex gap-3">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={carnetInput}
                  onChange={(e) => setCarnetInput(e.target.value)}
                  placeholder="Ej: 123456 o escanee código de barras..."
                  className="w-full bg-slate-950 border-2 border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3.5 text-lg font-bold text-white placeholder:text-slate-500 placeholder:font-normal focus:outline-none transition"
                />
              </div>
              <button
                type="submit"
                disabled={validando || !carnetInput.trim()}
                className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {validando ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                <span>Verificar</span>
              </button>
            </form>

            {/* Verification Result Card */}
            {resultado && (
              <div className="mt-6 animate-fadeIn">
                <div className={`p-6 rounded-2xl border-2 transition-all ${
                  resultado.permitido 
                    ? 'bg-emerald-950/20 border-emerald-500/60 shadow-lg shadow-emerald-500/10' 
                    : 'bg-red-950/20 border-red-500/60 shadow-lg shadow-red-500/10'
                }`}>
                  {/* Status Banner */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      {resultado.permitido ? (
                        <div className="p-2.5 rounded-full bg-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-full bg-red-500/20 text-red-400">
                          <XCircle className="w-8 h-8" />
                        </div>
                      )}
                      <div>
                        <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          resultado.permitido ? 'bg-emerald-500 text-slate-950' : 'bg-red-500 text-white'
                        }`}>
                          {resultado.permitido ? 'ACCESO PERMITIDO' : 'ACCESO DENEGADO'}
                        </span>
                        <p className="text-sm font-semibold text-slate-200 mt-1">{resultado.motivo}</p>
                      </div>
                    </div>

                    {resultado.permitido && (
                      <span className="hidden sm:inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold">
                        {resultado.cliente.dias_restantes} días de vigencia
                      </span>
                    )}
                  </div>

                  {/* Client Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Nombre Cliente:</span>
                      <span className="text-base font-bold text-white block mt-0.5">{resultado.cliente.nombre}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Carnet / CI:</span>
                      <span className="text-base font-bold text-slate-200 block mt-0.5">{resultado.cliente.carnet}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Plan Contratado:</span>
                      <span className="text-base font-bold text-emerald-400 block mt-0.5">
                        {resultado.cliente.nombre_plan || 'Sin Plan'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Entrenador:</span>
                      <span className="text-sm font-semibold text-slate-200 block mt-0.5">
                        {resultado.cliente.entrenador_nombre || 'No asignado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Vencimiento:</span>
                      <span className="text-sm font-semibold text-slate-200 block mt-0.5">
                        {resultado.cliente.fecha_fin ? new Date(resultado.cliente.fecha_fin).toLocaleDateString('es-BO') : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Asistencia Hoy:</span>
                      <span className={`text-sm font-bold block mt-0.5 ${resultado.yaIngresoHoy ? 'text-amber-400' : 'text-slate-400'}`}>
                        {resultado.yaIngresoHoy ? `Ya ingresó (${resultado.horaUltimoIngreso})` : 'Primer ingreso'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800/80">
                    {resultado.permitido ? (
                      <button
                        onClick={handleRegistrarIngreso}
                        disabled={registrando}
                        className="flex-1 px-5 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
                      >
                        {registrando ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <UserCheck className="w-5 h-5" />
                        )}
                        <span>Confirmar y Registrar Ingreso</span>
                      </button>
                    ) : (
                      <div className="flex-1 p-3 bg-red-900/30 border border-red-500/30 rounded-xl text-center text-xs text-red-300 font-semibold">
                        Para habilitar el acceso, el cliente debe regularizar su membresía en el módulo de Membresías y Pagos.
                      </div>
                    )}
                    <button
                      onClick={handleReset}
                      className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition border border-slate-700"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Feedback Registro Exitoso */}
            {exitoRegistro && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-between shadow-lg animate-bounce">
                <div className="flex items-center gap-2 font-black text-sm">
                  <Sparkles className="w-5 h-5" />
                  <span>¡Ingreso registrado exitosamente para {exitoRegistro.cliente?.nombre}!</span>
                </div>
                <button 
                  onClick={handleReset} 
                  className="px-3 py-1 bg-slate-950 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                >
                  Siguiente
                </button>
              </div>
            )}

            {/* Error Message */}
            {errorValidacion && (
              <div className="mt-6 p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <p className="font-bold">Error de verificación</p>
                  <p className="text-xs text-red-400">{errorValidacion}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Live Log of Today's Attendances */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 h-full flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Historial de Accesos de Hoy</h3>
              </div>
              <button
                onClick={cargarAsistenciasHoy}
                disabled={cargandoAsistencias}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition"
                title="Actualizar lista"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cargandoAsistencias ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[480px] space-y-2 mt-3 pr-1">
              {asistenciasHoy.length > 0 ? (
                asistenciasHoy.map((a, idx) => (
                  <div
                    key={a.idasistencia || idx}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-100 text-sm leading-tight">{a.cliente_nombre}</p>
                        <p className="text-[11px] text-slate-400">CI: {a.carnet}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-xs font-semibold">
                        {a.hora}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-slate-500 text-xs">
                  Aún no se han registrado ingresos hoy.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
