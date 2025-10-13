import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Box } from 'lucide-react';
import { toast } from 'sonner';

interface ItemStats {
  product_id: string;
  sku: string;
  description: string;
  total_quantity: number;
  form: string;
}

export function GestorTopItems() {
  const [unitItems, setUnitItems] = useState<ItemStats[]>([]);
  const [boxItems, setBoxItems] = useState<ItemStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopItems();
  }, []);

  const fetchTopItems = async () => {
    try {
      // Fetch all picking list items with product details
      const { data: items, error } = await supabase
        .from('picking_list_items')
        .select(`
          quantity,
          form,
          product_id,
          products (sku, description)
        `);

      if (error) throw error;

      // Group by product and form
      const itemsMap = new Map<string, ItemStats>();

      items?.forEach((item: any) => {
        const key = `${item.product_id}-${item.form}`;
        const existing = itemsMap.get(key);

        if (existing) {
          existing.total_quantity += item.quantity;
        } else {
          itemsMap.set(key, {
            product_id: item.product_id,
            sku: item.products.sku,
            description: item.products.description,
            total_quantity: item.quantity,
            form: item.form,
          });
        }
      });

      // Convert to array and split by form
      const allItems = Array.from(itemsMap.values());
      
      const unidadeItems = allItems
        .filter(item => item.form === 'UNIDADE')
        .sort((a, b) => b.total_quantity - a.total_quantity);

      const caixaItems = allItems
        .filter(item => item.form === 'CAIXA')
        .sort((a, b) => b.total_quantity - a.total_quantity);

      setUnitItems(unidadeItems);
      setBoxItems(caixaItems);
    } catch (error: any) {
      toast.error('Erro ao carregar itens mais pedidos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderTable = (items: ItemStats[], icon: React.ReactNode, title: string, emptyMessage: string) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>
          Total de {items.reduce((acc, item) => acc + item.total_quantity, 0).toLocaleString()} unidades pedidas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Quantidade Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow key={`${item.product_id}-${item.form}`} className="hover:bg-muted/50">
                    <TableCell className="font-bold text-muted-foreground">
                      {index + 1}°
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {item.total_quantity.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">Itens Mais Pedidos</h3>
        <p className="text-muted-foreground">Ranking de produtos mais solicitados pela expedição</p>
      </div>

      {renderTable(
        unitItems,
        <Package className="w-5 h-5" />,
        'Itens por Unidade',
        'Nenhum item por unidade pedido ainda'
      )}

      {renderTable(
        boxItems,
        <Box className="w-5 h-5" />,
        'Itens por Caixa',
        'Nenhum item por caixa pedido ainda'
      )}
    </div>
  );
}
