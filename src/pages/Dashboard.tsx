import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { ExpedicaoDashboard } from '@/components/dashboards/ExpedicaoDashboard';
import { GalpaoDashboard } from '@/components/dashboards/GalpaoDashboard';
import { GestorDashboard } from '@/components/dashboards/GestorDashboard';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {role === 'EXPEDIÇÃO' && <ExpedicaoDashboard />}
        {role === 'GALPÃO' && <GalpaoDashboard />}
        {role === 'GESTOR' && <GestorDashboard />}
      </main>
    </div>
  );
}
