import { useState, useEffect, useRef } from 'react';
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
  // texto que o usuário digita (nome ou SKU)
  product_label?: string;
}

export function CreateListDialog({ open, onOpenChange, onSuccess }: CreateListDialogProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<ListItem[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
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
    setItems([...items, { product_id: '', quantity: 1, form: 'UNIDADE', product_label: '' }]);
  };

  // refs for dropdown items: map of index -> array of item refs per row
  const itemRefs = useRef<Record<number, HTMLDivElement[]>>({});
  // refs for text inputs to preserve focus while typing
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    if (openIndex === null || highlightedIndex === null) return;
    const refs = itemRefs.current[openIndex];
    if (!refs) return;
    const el = refs[highlightedIndex];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, openIndex]);

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ListItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const selectProductForItem = (index: number, product: Product) => {
    updateItem(index, 'product_id', product.id);
    updateItem(index, 'product_label', `${product.description} (${product.sku})`);
    setOpenIndex(null);
    setHighlightedIndex(null);
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item à lista');
      return;
    }

    // Attempt to resolve items where user typed SKU/name but didn't select
    const resolvedItems = items.map(item => {
      if (item.product_id) return item;
      const q = (item.product_label || '').trim().toLowerCase();
      if (!q) return item;
      const exact = products.find(p => p.sku.toLowerCase() === q);
      if (exact) return { ...item, product_id: exact.id };
      const filtered = products.filter(p => p.description.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
      if (filtered.length === 1) return { ...item, product_id: filtered[0].id };
      return item;
    });

    if (resolvedItems.some(item => !item.product_id || item.quantity <= 0)) {
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
          resolvedItems.map(item => ({
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
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-3 p-4 border rounded-lg bg-muted/50">
              <div className="col-span-5 relative">
                <Label className="text-xs">Produto</Label>
                <Input
                  placeholder="Digite nome ou SKU..."
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={item.product_label || ''}
                  ref={(el: any) => (inputRefs.current[index] = el)}
                  onChange={(e) => {
                    // debug log to help identify focus/typing issues
                    console.debug('product input change', index, e.target.value);
                    updateItem(index, 'product_label', e.target.value);
                    updateItem(index, 'product_id', '');
                    setOpenIndex(index);
                  }}
                  onFocus={() => {
                    console.debug('product input focus', index);
                    setOpenIndex(index);
                  }}
                  onKeyDown={(e) => {
                    const q = (item.product_label || '').trim().toLowerCase();
                    const filtered = q
                      ? products.filter(p => p.description.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
                      : products;

                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (filtered.length === 0) return;
                      setOpenIndex(index);
                      setHighlightedIndex(prev => {
                        const next = prev === null ? 0 : Math.min(filtered.length - 1, prev + 1);
                        return next;
                      });
                    }

                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (filtered.length === 0) return;
                      setOpenIndex(index);
                      setHighlightedIndex(prev => {
                        const next = prev === null ? filtered.length - 1 : Math.max(0, prev - 1);
                        return next;
                      });
                    }

                    if (e.key === 'Enter') {
                      if (highlightedIndex !== null && filtered[highlightedIndex]) {
                        e.preventDefault();
                        selectProductForItem(index, filtered[highlightedIndex]);
                        return;
                      }
                      if (!q) return;
                      // try exact SKU match first
                      const exact = products.find(p => p.sku.toLowerCase() === q);
                      if (exact) {
                        e.preventDefault();
                        selectProductForItem(index, exact);
                        return;
                      }
                      // if only one filtered result, select it
                      if (filtered.length === 1) {
                        e.preventDefault();
                        selectProductForItem(index, filtered[0]);
                      }
                    }

                    if (e.key === 'Escape') {
                      setOpenIndex(null);
                      setHighlightedIndex(null);
                    }
                  }}
                  onBlur={() => setTimeout(() => setOpenIndex(null), 150)}
                />

                {/* Dropdown */}
                {openIndex === index && (
                  <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-md border bg-popover p-1 shadow-md">
                    {(() => {
                      const q = (item.product_label || '').trim().toLowerCase();
                      const filtered = q
                        ? products.filter(p => p.description.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
                        : products;
                      if (filtered.length === 0) return <div className="p-2 text-sm text-muted-foreground">Nenhum produto encontrado</div>;
                      return filtered.map((p, i) => (
                        <div
                          key={p.id}
                          ref={(el) => {
                            if (!itemRefs.current[index]) itemRefs.current[index] = [];
                            itemRefs.current[index][i] = el as HTMLDivElement;
                          }}
                          onPointerDown={(ev) => {
                            ev.preventDefault();
                            selectProductForItem(index, p);
                          }}
                          onTouchStart={(ev) => {
                            ev.preventDefault();
                            selectProductForItem(index, p);
                          }}
                          className={
                            `cursor-pointer rounded px-3 py-3 touch-manipulation hover:bg-accent/80 hover:text-accent-foreground text-sm ${highlightedIndex === i ? 'bg-accent text-accent-foreground' : ''}`
                          }
                        >
                          <div className="font-medium">{p.description}</div>
                          <div className="text-xs text-muted-foreground">{p.sku}</div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              <div className="col-span-3">
                <Label className="text-xs">Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={String(item.quantity)}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    updateItem(index, 'quantity', Number.isNaN(v) ? 1 : v);
                  }}
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
          ))}

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
