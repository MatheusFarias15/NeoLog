import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Users, Package } from 'lucide-react';
import { GestorOverview } from '@/components/gestor/GestorOverview';
import { GestorUsers } from '@/components/gestor/GestorUsers';
import { GestorProducts } from '@/components/gestor/GestorProducts';

export function GestorDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Painel do Gestor</h2>
        <p className="text-muted-foreground">Visão completa do sistema</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2">
            <Package className="w-4 h-4" />
            Produtos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <GestorOverview />
        </TabsContent>

        <TabsContent value="users">
          <GestorUsers />
        </TabsContent>

        <TabsContent value="products">
          <GestorProducts />
        </TabsContent>
      </Tabs>
    </div>
  );
}
