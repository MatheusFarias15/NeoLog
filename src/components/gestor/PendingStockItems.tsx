import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'sonner';

export function PendingStockItems() {
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingItems();
  }, []);

  const fetchPendingItems = async () => {
    try {
      const { data, error } = await supabase
        .from('picking_list_items')
        .select(`
          *,
          products (sku, description),
          picking_lists!inner (
            id,
            status,
            created_at,
            profiles (full_name)
          )
        `)
        // inclui: indisponíveis, enviados < solicitados, e casos com sent = null
        .or('is_available.eq.false,quantity_sent.lt.quantity,quantity_sent.is.null')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const groupedItems = data?.reduce((acc: any, item: any) => {
        const productId = item.product_id;

        if (!acc[productId]) {
          acc[productId] = {
            product: item.products,
            unavailableCount: 0,
            partialCount: 0,
            totalRequested: 0,
            totalSent: 0,
            lists: []
          };
        }

        const qtySent = item.quantity_sent ?? 0;

        if (item.is_available === false) {
          acc[productId].unavailableCount += 1;
          acc[productId].totalRequested += item.quantity;
          acc[productId].totalSent += qtySent;
        } else if (qtySent < item.quantity) {
          acc[productId].partialCount += 1;
          acc[productId].totalRequested += item.quantity;
          acc[productId].totalSent += qtySent;
        }

        acc[productId].lists.push({
          listId: item.picking_lists.id,
          requester: item.picking_lists.profiles?.full_name || 'Desconhecido',
          quantity: item.quantity,
          quantitySent: item.quantity_sent,
          form: item.form,
          isAvailable: item.is_available,
          isPartial: qtySent < item.quantity
        });

        return acc;
      }, {});

      setPendingItems(Object.values(groupedItems || {}));
    } catch (error: any) {
      toast.error('Erro ao carregar itens pendentes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Itens Pendentes de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (pendingItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Itens Pendentes de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum item com pendência de estoque</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Itens Pendentes de Estoque
        </CardTitle>
        <CardDescription>
          Produtos com indisponibilidade ou quantidade insuficiente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Qtd. Solicitada</TableHead>
              <TableHead className="text-right">Qtd. Enviada</TableHead>
              <TableHead className="text-right">Ocorrências</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingItems.map((item, idx) => (
              <TableRow
                key={idx}
                className={
                  item.unavailableCount > 0
                    ? 'bg-destructive/10'
                    : item.partialCount > 0
                    ? 'bg-warning/10'
                    : undefined
                }
              >
                <TableCell className="font-medium">{item.product.description}</TableCell>
                <TableCell className="text-muted-foreground">{item.product.sku}</TableCell>
                <TableCell className="text-center">
                  <div className="flex gap-1 justify-center">
                    {item.unavailableCount > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Indisponível
                      </Badge>
                    )}
                    {item.partialCount > 0 && (
                      <Badge className="gap-1 bg-warning text-warning-foreground">
                        <AlertTriangle className="w-3 h-3" />
                        Parcial
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {item.totalRequested}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {item.totalSent || 0}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline">
                    {item.unavailableCount + item.partialCount}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
