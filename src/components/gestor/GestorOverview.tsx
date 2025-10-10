import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PackagePlus, Clock, CheckCircle2, Users, Package, TrendingUp, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PickingList {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
  picking_list_items: any[];
}

export function GestorOverview() {
  const [stats, setStats] = useState({
    totalLists: 0,
    pendente: 0,
    emSeparacao: 0,
    concluido: 0,
    totalUsers: 0,
    totalProducts: 0,
    avgSeparationTime: 0,
  });
  const [recentLists, setRecentLists] = useState<PickingList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch all lists with details
      const { data: lists, error: listsError } = await supabase
        .from('picking_lists')
        .select(`
          *,
          profiles (full_name, email),
          picking_list_items (id)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (listsError) throw listsError;

      // Fetch users count
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Fetch products count
      const { count: productsCount, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (productsError) throw productsError;

      // Calculate average separation time for completed lists
      const completedLists = lists?.filter(l => l.status === 'CONCLUIDO' && l.completed_at) || [];
      let avgTime = 0;
      
      if (completedLists.length > 0) {
        const totalMinutes = completedLists.reduce((acc, list) => {
          // Calculate time between list update (when separation started) and completion
          const minutes = differenceInMinutes(
            new Date(list.completed_at!),
            new Date(list.updated_at)
          );
          return acc + minutes;
        }, 0);
        avgTime = Math.round(totalMinutes / completedLists.length);
      }

      setStats({
        totalLists: lists?.length || 0,
        pendente: lists?.filter(l => l.status === 'PENDENTE').length || 0,
        emSeparacao: lists?.filter(l => l.status === 'EM_SEPARACAO').length || 0,
        concluido: completedLists.length,
        totalUsers: usersCount || 0,
        totalProducts: productsCount || 0,
        avgSeparationTime: avgTime,
      });

      setRecentLists(lists || []);
    } catch (error: any) {
      toast.error('Erro ao carregar estatísticas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDENTE: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
      EM_SEPARACAO: { label: 'Em Separação', variant: 'default' as const, icon: PackagePlus },
      CONCLUIDO: { label: 'Concluído', variant: 'outline' as const, icon: CheckCircle2 },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDENTE;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* KPIs principais */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total de Usuários
            </CardDescription>
            <CardTitle className="text-4xl">{stats.totalUsers}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Produtos Ativos
            </CardDescription>
            <CardTitle className="text-4xl">{stats.totalProducts}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total de Listas
            </CardDescription>
            <CardTitle className="text-4xl">{stats.totalLists}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-l-4 border-l-primary bg-primary/5">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              Tempo Médio
            </CardDescription>
            <CardTitle className="text-4xl">
              {stats.avgSeparationTime > 0 ? formatDuration(stats.avgSeparationTime) : '-'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Tempo de separação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status das listas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              Listas Pendentes
            </CardDescription>
            <CardTitle className="text-3xl text-warning">{stats.pendente}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Aguardando processamento
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <PackagePlus className="w-4 h-4 text-primary" />
              Em Separação
            </CardDescription>
            <CardTitle className="text-3xl text-primary">{stats.emSeparacao}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Sendo processadas agora
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              Concluídas
            </CardDescription>
            <CardTitle className="text-3xl text-accent">{stats.concluido}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Finalizadas com sucesso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de listas recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Listas Recentes</CardTitle>
          <CardDescription>Histórico das últimas 20 listas de coleta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Concluída em</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : recentLists.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma lista encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  recentLists.map((list) => {
                    const separationTime = list.completed_at 
                      ? differenceInMinutes(new Date(list.completed_at), new Date(list.updated_at))
                      : null;
                    
                    return (
                      <TableRow key={list.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">
                          {list.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>{list.profiles?.full_name || 'Usuário'}</TableCell>
                        <TableCell>{getStatusBadge(list.status)}</TableCell>
                        <TableCell>{list.picking_list_items?.length || 0}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(list.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {list.completed_at 
                            ? format(new Date(list.completed_at), "dd/MM/yy HH:mm", { locale: ptBR })
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {separationTime !== null && separationTime > 0
                            ? formatDuration(separationTime)
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
