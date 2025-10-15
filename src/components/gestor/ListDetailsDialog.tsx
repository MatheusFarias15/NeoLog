import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, Clock, PackagePlus, AlertCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ListDetailsDialogProps {
  list: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ListDetailsDialog({ list, open, onOpenChange }: ListDetailsDialogProps) {
  if (!list) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Lista #{list.id.slice(0, 8)}
            {getStatusBadge(list.status)}
          </DialogTitle>
          <DialogDescription>
            Solicitado por {list.profiles?.full_name || 'Usuário'} em{' '}
            {format(new Date(list.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total de Itens</p>
              <p className="text-2xl font-bold">{list.picking_list_items?.length || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Itens Coletados</p>
              <p className="text-2xl font-bold text-accent">
                {list.picking_list_items?.filter((i: any) => i.is_collected).length || 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Pendências</p>
              <p className="text-2xl font-bold text-warning">
                {list.picking_list_items?.filter((i: any) => !i.is_available || (i.quantity_sent && i.quantity_sent < i.quantity)).length || 0}
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Itens da Lista</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-center">Qtd. Solicitada</TableHead>
                  <TableHead className="text-center">Qtd. Enviada</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.picking_list_items?.map((item: any) => {
                  const isUnavailable = !item.is_available;
                  const isPartial = item.quantity_sent && item.quantity_sent < item.quantity;

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.products?.description || 'Produto não identificado'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.products?.sku || 'N/A'}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity} {item.form}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {isUnavailable ? (
                          <span className="text-destructive">0</span>
                        ) : isPartial ? (
                          <span className="text-warning">{item.quantity_sent} {item.form}</span>
                        ) : item.is_collected ? (
                          <span className="text-accent">{item.quantity} {item.form}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isUnavailable ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Indisponível
                          </Badge>
                        ) : isPartial ? (
                          <Badge variant="secondary" className="gap-1 bg-warning text-warning-foreground">
                            <AlertTriangle className="w-3 h-3" />
                            Parcial
                          </Badge>
                        ) : item.is_collected ? (
                          <Badge variant="outline" className="gap-1 bg-accent/10 text-accent border-accent">
                            <CheckCircle2 className="w-3 h-3" />
                            Coletado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="w-3 h-3" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
