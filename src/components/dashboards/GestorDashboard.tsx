import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Users, Package, TrendingUp } from 'lucide-react';
import { GestorOverview } from '@/components/gestor/GestorOverview';
import { GestorUsers } from '@/components/gestor/GestorUsers';
import { GestorProducts } from '@/components/gestor/GestorProducts';
import { GestorTopItems } from '@/components/gestor/GestorTopItems';

export function GestorDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Painel do Gestor</h2>
        <p className="text-muted-foreground">Visão completa do sistema</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="top-items" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Itens mais pedidos
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

        <TabsContent value="top-items">
          <GestorTopItems />
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
