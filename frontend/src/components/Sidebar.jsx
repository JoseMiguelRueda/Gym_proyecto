import React from 'react';
import { 
  LayoutDashboard, 
  ScanLine, 
  Users, 
  CreditCard, 
  Dumbbell, 
  CalendarRange, 
  Activity,
  Layers
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'recepcion', label: 'Recepción & Acceso', icon: ScanLine, badge: 'Live', highlight: true },
    { id: 'clientes', label: 'Clientes', icon: Users, badge: null },
    { id: 'membresias', label: 'Membresías & Pagos', icon: CreditCard, badge: null },
    { id: 'entrenadores', label: 'Entrenadores & Horarios', icon: Dumbbell, badge: null },
    { id: 'planes', label: 'Planes Tarifarios', icon: Layers, badge: null },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
            Gym<span className="text-emerald-400">Pro</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">Gestión & Control</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Módulos Principales
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              } ${item.highlight && !isActive ? 'ring-1 ring-emerald-500/20' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${
                  isActive ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
          <div className="text-xs">
            <p className="text-slate-200 font-medium">PostgreSQL 18</p>
            <p className="text-[10px] text-slate-400">pgAdmin 4 Integrado</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
