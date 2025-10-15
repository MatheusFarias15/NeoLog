import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { toast } from 'sonner';
import { AlertCircle, PackageX } from 'lucide-react';

interface ItemAvailabilityDialogProps {
  item: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ItemAvailabilityDialog({ item, open, onOpenChange, onSuccess }: ItemAvailabilityDialogProps) {
  const [quantitySent, setQuantitySent] = useState<number>(item?.quantity || 0);
  const [loading, setLoading] = useState(false);

  const handleMarkUnavailable = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('picking_list_items')
        .update({ 
          is_available: false,
          quantity_sent: 0,
          is_collected: false
        })
        .eq('id', item.id);

      if (error) throw error;

      toast.success('Item marcado como indisponível');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao atualizar item');
    } finally {
      setLoading(false);
    }
  };

  const handlePartialQuantity = async () => {
    if (quantitySent <= 0 || quantitySent > item.quantity) {
      toast.error('Quantidade inválida');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('picking_list_items')
        .update({ 
          quantity_sent: quantitySent,
          is_collected: true
        })
        .eq('id', item.id);

      if (error) throw error;

      toast.success('Quantidade atualizada');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao atualizar quantidade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Disponibilidade</DialogTitle>
          <DialogDescription>
            {item?.products?.description || 'Item'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium">Quantidade Solicitada:</p>
            <p className="text-2xl font-bold">{item?.quantity} {item?.form}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity_sent">Quantidade Disponível para Envio</Label>
              <Input
                id="quantity_sent"
                type="number"
                min="0"
                max={item?.quantity}
                value={quantitySent}
                onChange={(e) => setQuantitySent(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Informe a quantidade que será enviada (menor que a solicitada)
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={handlePartialQuantity} 
                disabled={loading || quantitySent <= 0 || quantitySent >= item?.quantity}
                className="w-full"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Enviar Quantidade Parcial ({quantitySent})
              </Button>

              <Button 
                onClick={handleMarkUnavailable} 
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                <PackageX className="w-4 h-4 mr-2" />
                Item Não Disponível (0 enviados)
              </Button>

              <Button 
                onClick={() => onOpenChange(false)} 
                variant="outline"
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
