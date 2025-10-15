import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PackagePlus, CheckCircle2, Clock, AlertCircle, Package } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ItemAvailabilityDialog } from '@/components/dialogs/ItemAvailabilityDialog';

export function GalpaoDashboard() {
  const [lists, setLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);

  useEffect(() => {
    fetchLists();
    setupRealtimeSubscription();
  }, []);

  const fetchLists = async () => {
    try {
      const { data, error } = await supabase
        .from('picking_lists')
        .select(`
          *,
          profiles (full_name, email),
          picking_list_items (
            id,
            quantity,
            form,
            is_collected,
            is_available,
            quantity_sent,
            products (sku, description)
          )
        `)
        .in('status', ['PENDENTE', 'EM_SEPARACAO'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLists(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar listas');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('picking_lists_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'picking_lists'
        },
        (payload) => {
          console.log('Nova lista detectada!', payload);
          setShowNotification(true);
          fetchLists();
          setTimeout(() => setShowNotification(false), 10000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleToggleItem = async (itemId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('picking_list_items')
        .update({ is_collected: !currentStatus })
        .eq('id', itemId);

    if (error) throw error;

      setSelectedList({
        ...selectedList,
        picking_list_items: selectedList.picking_list_items.map((item: any) =>
          item.id === itemId ? { ...item, is_collected: !currentStatus } : item
        ),
      });

      toast.success('Item atualizado');
    } catch (error: any) {
      toast.error('Erro ao atualizar item');
    }
  };

  const handleCompleteList = async () => {
    const allProcessed = selectedList.picking_list_items.every((item: any) =>
      item.is_collected || !item.is_available
    );

    try {
      const { error } = await supabase
        .from('picking_lists')
        .update({
          status: 'CONCLUIDO',
          completed_at: new Date().toISOString(),
        })
        .eq('id', selectedList.id);

      if (error) throw error;

      toast.success('Lista concluída com sucesso!');
      setSelectedList(null);
      fetchLists();
    } catch (error: any) {
      toast.error('Erro ao concluir lista');
    }
  };

  const handleStartList = async (listId: string) => {
    try {
      const { error } = await supabase
        .from('picking_lists')
        .update({ status: 'EM_SEPARACAO' })
        .eq('id', listId);

      if (error) throw error;

      toast.success('Lista em separação!');
      fetchLists();
    } catch (error: any) {
      toast.error('Erro ao iniciar separação');
    }
  };

  const stats = {
    pendentes: lists.filter(l => l.status === 'PENDENTE').length,
    emSeparacao: lists.filter(l => l.status === 'EM_SEPARACAO').length,
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Notificação de Nova Lista */}
      {showNotification && (
        <div className="fixed top-20 inset-x-4 z-50 animate-in slide-in-from-top-5">
          <Card className="border-4 border-warning bg-warning/10 shadow-2xl max-w-md mx-auto">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-warning rounded-full flex items-center justify-center animate-pulse">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-warning-foreground" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg sm:text-xl">Nova Solicitação!</CardTitle>
                  <CardDescription>Uma nova lista de coleta chegou</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowNotification(false)} className="w-full">
                OK, Entendi
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Fila de Trabalho</h2>
          <p className="text-sm text-muted-foreground">Processe as listas de coleta</p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Aguardando
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl text-warning">{stats.pendentes}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <PackagePlus className="w-4 h-4" />
              Em Separação
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl text-primary">{stats.emSeparacao}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Listas */}
      <div className="space-y-3 sm:space-y-4">
        {lists.map((list) => (
          <Card key={list.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1 min-w-0">
                  <CardTitle className="flex items-center gap-2">
                    <span className="truncate">Lista #{list.id.slice(0, 8)}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                        list.status === 'PENDENTE'
                          ? 'bg-warning text-warning-foreground'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      {list.status === 'PENDENTE' ? (
                        <Clock className="w-3 h-3" />
                      ) : (
                        <PackagePlus className="w-3 h-3" />
                      )}
                      {list.status.replace('_', ' ')}
                    </span>
                  </CardTitle>
                  <CardDescription className="truncate">
                    Solicitado por {list.profiles?.full_name || 'Usuário'} •{' '}
                    {format(new Date(list.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </CardDescription>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {list.status === 'PENDENTE' && (
                    <Button size="sm" onClick={() => handleStartList(list.id)} className="w-full sm:w-auto">
                      Iniciar Separação
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedList(list)}
                    className="w-full sm:w-auto"
                  >
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {list.picking_list_items?.length || 0} itens •{' '}
                {list.picking_list_items?.filter((i: any) => i.is_collected).length || 0} coletados
              </p>
            </CardContent>
          </Card>
        ))}

        {lists.length === 0 && !loading && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Nenhuma lista pendente</p>
              <p className="text-sm text-muted-foreground">Todas as listas foram processadas!</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de detalhes */}
      <Dialog open={!!selectedList} onOpenChange={() => setSelectedList(null)}>
        <DialogContent className="w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Lista #{selectedList?.id.slice(0, 8)}</DialogTitle>
            <DialogDescription>Marque os itens conforme forem coletados</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 max-h-[65vh] overflow-y-auto pr-1 sm:pr-0">
            {selectedList?.picking_list_items?.map((item: any) => {
              const qtySent = item.quantity_sent ?? 0;
              const isPartial = qtySent < item.quantity;
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg relative"
                >
                  <div className="order-1 sm:order-none">
                    <Checkbox
                      checked={item.is_collected}
                      onCheckedChange={() => handleToggleItem(item.id, item.is_collected)}
                      className="mt-0.5"
                      disabled={!item.is_available}
                    />
                  </div>

                  <div className="flex-1 min-w-0 order-2">
                    <p className="font-medium truncate">
                      {item.products?.description || 'Produto não identificado'}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {item.products?.sku || 'N/A'}
                    </p>
                    <p className="text-xs sm:text-sm mt-1">
                      Quantidade: <span className="font-medium">{item.quantity} {item.form}</span>
                    </p>

                    {!item.is_available && (
                      <p className="text-[11px] sm:text-xs text-destructive mt-2 font-medium">
                        Item marcado como indisponível
                      </p>
                    )}

                    {isPartial && (
                      <p className="text-[11px] sm:text-xs text-warning mt-2 font-medium">
                        Quantidade enviada: {qtySent} {item.form}
                      </p>
                    )}
                  </div>

                  <div className="order-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedItem(item);
                        setShowAvailabilityDialog(true);
                      }}
                      className="w-full sm:w-auto"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Gerenciar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 sm:pt-4">
            <Button variant="outline" onClick={() => setSelectedList(null)} className="flex-1">
              Fechar
            </Button>
            <Button onClick={handleCompleteList} className="flex-1">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Concluir Lista
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de disponibilidade */}
      <ItemAvailabilityDialog
        item={selectedItem}
        open={showAvailabilityDialog}
        onOpenChange={setShowAvailabilityDialog}
        onSuccess={() => {
          fetchLists();
          if (selectedList) {
            const updatedList = lists.find(l => l.id === selectedList.id);
            if (updatedList) setSelectedList(updatedList);
          }
        }}
      />
    </div>
  );
}
