import React from 'react';
import { Bell, ShieldCheck, UserCircle2 } from 'lucide-react';

export default function Navbar({ title, subtitle }) {
  const todayFormatted = new Intl.DateTimeFormat('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }).format(new Date());

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs text-slate-300 capitalize">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          {todayFormatted}
        </div>

        <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
            AD
          </div>
          <div className="hidden sm:block text-left text-xs">
            <p className="font-semibold text-slate-200">Administrador</p>
            <p className="text-[10px] text-emerald-400 font-medium">Recepción & Gerencia</p>
          </div>
        </div>
      </div>
    </header>
  );
}
