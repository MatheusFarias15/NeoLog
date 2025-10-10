import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Package, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function Navbar() {
  const { profile, role, signOut } = useAuth();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'GESTOR':
        return 'bg-accent text-accent-foreground';
      case 'GALPÃO':
        return 'bg-primary text-primary-foreground';
      case 'EXPEDIÇÃO':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
            <Package className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Neolog</h1>
            <p className="text-xs text-muted-foreground">Gestão de Coletas</p>
          </div>
        </div>
        
        {profile && (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{profile.full_name}</p>
              {role && (
                <Badge className={`text-xs ${getRoleBadgeColor(role)}`}>
                  {role}
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
