import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, PackagePlus, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { CreateListDialog } from '@/components/dialogs/CreateListDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ExpedicaoDashboard() {
  const { user } = useAuth();
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchLists();
  }, [user]);

  const fetchLists = async () => {
    try {
      const { data, error } = await supabase
        .from('picking_lists')
        .select(`
          *,
          picking_list_items (
            id,
            quantity,
            form,
            is_collected,
            products (sku, description)
          )
        `)
        .eq('requester_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLists(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar listas');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDENTE: 'bg-warning text-warning-foreground',
      EM_SEPARACAO: 'bg-primary text-primary-foreground',
      CONCLUIDO: 'bg-accent text-accent-foreground',
    };
    return badges[status as keyof typeof badges] || 'bg-secondary';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      PENDENTE: Clock,
      EM_SEPARACAO: PackagePlus,
      CONCLUIDO: CheckCircle2,
    };
    const Icon = icons[status as keyof typeof icons] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  const stats = {
    total: lists.length,
    pendente: lists.filter(l => l.status === 'PENDENTE').length,
    emSeparacao: lists.filter(l => l.status === 'EM_SEPARACAO').length,
    concluido: lists.filter(l => l.status === 'CONCLUIDO').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Minhas Listas de Coleta</h2>
          <p className="text-muted-foreground">Gerencie suas solicitações de coleta</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="lg" className="shadow-lg">
          <Plus className="w-5 h-5 mr-2" />
          Nova Lista
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Listas</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pendentes
            </CardDescription>
            <CardTitle className="text-3xl text-warning">{stats.pendente}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <PackagePlus className="w-4 h-4" />
              Em Separação
            </CardDescription>
            <CardTitle className="text-3xl text-primary">{stats.emSeparacao}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Concluídas
            </CardDescription>
            <CardTitle className="text-3xl text-accent">{stats.concluido}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        {lists.map((list) => (
          <Card key={list.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    Lista #{list.id.slice(0, 8)}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(list.status)}`}>
                      {getStatusIcon(list.status)}
                      {list.status.replace('_', ' ')}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Criada em {format(new Date(list.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium">Itens ({list.picking_list_items?.length || 0}):</p>
                <div className="grid gap-2">
                  {list.picking_list_items?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${item.is_collected ? 'bg-accent' : 'bg-muted-foreground'}`} />
                        <div>
                          <p className="text-sm font-medium">{item.products.description}</p>
                          <p className="text-xs text-muted-foreground">{item.products.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{item.quantity} {item.form}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateListDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchLists}
      />
    </div>
  );
}
