import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Send } from 'lucide-react';

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Product {
  id: string;
  sku: string;
  description: string;
}

interface ListItem {
  product_id: string;
  quantity: number;
  form: 'CAIXA' | 'UNIDADE';
  searchTerm?: string;
}

export function CreateListDialog({ open, onOpenChange, onSuccess }: CreateListDialogProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProducts();
      setItems([]);
    }
  }, [open]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('description');

    if (error) {
      toast.error('Erro ao carregar produtos');
    } else {
      setProducts(data || []);
    }
  };

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1, form: 'UNIDADE', searchTerm: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ListItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const getFilteredProducts = (searchTerm: string) => {
    if (!searchTerm) return products;
    return products.filter(product => 
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item à lista');
      return;
    }

    if (items.some(item => !item.product_id || item.quantity <= 0)) {
      toast.error('Preencha todos os campos corretamente');
      return;
    }

    setLoading(true);
    try {
      // Create picking list
      const { data: listData, error: listError } = await supabase
        .from('picking_lists')
        .insert({
          requester_id: user?.id,
          status: 'PENDENTE',
        })
        .select()
        .single();

      if (listError) throw listError;

      // Insert items
      const { error: itemsError } = await supabase
        .from('picking_list_items')
        .insert(
          items.map(item => ({
            list_id: listData.id,
            product_id: item.product_id,
            quantity: item.quantity,
            form: item.form,
          }))
        );

      if (itemsError) throw itemsError;

      toast.success('Lista criada com sucesso!');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao criar lista: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Nova Lista de Coleta</DialogTitle>
          <DialogDescription>
            Adicione os itens que você precisa coletar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {items.map((item, index) => {
            const filteredProducts = getFilteredProducts(item.searchTerm || '');
            return (
              <div key={index} className="space-y-2 p-4 border rounded-lg bg-muted/50">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12">
                    <Label className="text-xs">Buscar Produto</Label>
                    <Input
                      placeholder="Digite o nome ou SKU do produto..."
                      value={item.searchTerm || ''}
                      onChange={(e) => updateItem(index, 'searchTerm', e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-5">
                    <Label className="text-xs">Produto</Label>
                    <Select
                      value={item.product_id}
                      onValueChange={(value) => updateItem(index, 'product_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProducts.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            Nenhum produto encontrado
                          </div>
                        ) : (
                          filteredProducts.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.description} ({product.sku})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

              <div className="col-span-3">
                <Label className="text-xs">Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                />
              </div>

              <div className="col-span-3">
                <Label className="text-xs">Forma</Label>
                <Select
                  value={item.form}
                  onValueChange={(value) => updateItem(index, 'form', value as 'CAIXA' | 'UNIDADE')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNIDADE">Unidade</SelectItem>
                    <SelectItem value="CAIXA">Caixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

                  <div className="col-span-1 flex items-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          <Button type="button" variant="outline" onClick={addItem} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Item
          </Button>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              <Send className="w-4 h-4 mr-2" />
              {loading ? 'Enviando...' : 'Enviar Lista'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
