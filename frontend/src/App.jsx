import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import RecepcionPage from './pages/RecepcionPage';
import ClientesPage from './pages/ClientesPage';
import MembresiasPage from './pages/MembresiasPage';
import EntrenadoresPage from './pages/EntrenadoresPage';
import PlanesPage from './pages/PlanesPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const titles = {
    dashboard: { title: 'Panel de Control', subtitle: 'Métricas, finanzas y alertas operativas' },
    recepcion: { title: 'Control de Recepción', subtitle: 'Validación en vivo y registro de asistencia' },
    clientes: { title: 'Gestión de Clientes', subtitle: 'Directorio, fichas y asignación de entrenadores' },
    membresias: { title: 'Membresías & Cobranzas', subtitle: 'Planes activos, pagos y comprobantes' },
    entrenadores: { title: 'Entrenadores & Horarios', subtitle: 'Plantel técnico y franjas de entrenamiento' },
    planes: { title: 'Planes Tarifarios', subtitle: 'Configuración de paquetes y precios' },
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar fijo */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Contenedor Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar 
          title={titles[activeTab]?.title || 'Sistema de Gimnasio'} 
          subtitle={titles[activeTab]?.subtitle || ''} 
        />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && <DashboardPage setActiveTab={setActiveTab} />}
          {activeTab === 'recepcion' && <RecepcionPage />}
          {activeTab === 'clientes' && <ClientesPage onSelectClienteParaMembresia={() => setActiveTab('membresias')} />}
          {activeTab === 'membresias' && <MembresiasPage />}
          {activeTab === 'entrenadores' && <EntrenadoresPage />}
          {activeTab === 'planes' && <PlanesPage />}
        </main>
      </div>
    </div>
  );
}
