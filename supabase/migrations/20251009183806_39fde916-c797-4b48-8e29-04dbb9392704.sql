-- ============================================
-- NEOLOG - Sistema de Gestão de Listas de Coleta
-- ============================================

-- Criar ENUM para roles de usuário
CREATE TYPE public.user_role AS ENUM ('EXPEDIÇÃO', 'GALPÃO', 'GESTOR');

-- Criar ENUM para status das listas
CREATE TYPE public.list_status AS ENUM ('PENDENTE', 'EM_SEPARACAO', 'CONCLUIDO');

-- Criar ENUM para forma dos itens
CREATE TYPE public.item_form AS ENUM ('CAIXA', 'UNIDADE');

-- ============================================
-- TABELA: profiles (extensão de auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role public.user_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Gestores podem ver todos os perfis"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'GESTOR'
    )
  );

CREATE POLICY "Gestores podem inserir perfis"
  ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'GESTOR'
    )
  );

CREATE POLICY "Gestores podem atualizar perfis"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'GESTOR'
    )
  );

-- ============================================
-- TABELA: products (catálogo de produtos)
-- ============================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para products
CREATE POLICY "Todos podem visualizar produtos ativos"
  ON public.products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Gestores podem gerenciar produtos"
  ON public.products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'GESTOR'
    )
  );

-- ============================================
-- TABELA: picking_lists (listas de coleta)
-- ============================================
CREATE TABLE public.picking_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.list_status NOT NULL DEFAULT 'PENDENTE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.picking_lists ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para picking_lists
CREATE POLICY "Expedição pode ver suas próprias listas"
  ON public.picking_lists FOR SELECT
  USING (requester_id = auth.uid());

CREATE POLICY "Expedição pode criar listas"
  ON public.picking_lists FOR INSERT
  WITH CHECK (
    requester_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'EXPEDIÇÃO'
    )
  );

CREATE POLICY "Galpão pode ver todas as listas"
  ON public.picking_lists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('GALPÃO', 'GESTOR')
    )
  );

CREATE POLICY "Galpão pode atualizar listas"
  ON public.picking_lists FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('GALPÃO', 'GESTOR')
    )
  );

CREATE POLICY "Gestores têm acesso total às listas"
  ON public.picking_lists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'GESTOR'
    )
  );

-- ============================================
-- TABELA: picking_list_items (itens das listas)
-- ============================================
CREATE TABLE public.picking_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.picking_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  form public.item_form NOT NULL,
  is_collected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.picking_list_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para picking_list_items
CREATE POLICY "Usuários podem ver itens de suas listas"
  ON public.picking_list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.picking_lists pl
      WHERE pl.id = list_id AND (
        pl.requester_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role IN ('GALPÃO', 'GESTOR')
        )
      )
    )
  );

CREATE POLICY "Expedição pode inserir itens em suas listas"
  ON public.picking_list_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.picking_lists pl
      WHERE pl.id = list_id AND pl.requester_id = auth.uid()
    )
  );

CREATE POLICY "Galpão pode atualizar itens"
  ON public.picking_list_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('GALPÃO', 'GESTOR')
    )
  );

CREATE POLICY "Gestores têm acesso total aos itens"
  ON public.picking_list_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'GESTOR'
    )
  );

-- ============================================
-- TRIGGERS para updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_picking_lists_updated_at
  BEFORE UPDATE ON public.picking_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- TRIGGER para criar perfil ao registrar usuário
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'EXPEDIÇÃO')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- HABILITAR REALTIME para notificações
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.picking_lists;

-- ============================================
-- DADOS INICIAIS (Produtos de exemplo)
-- ============================================
INSERT INTO public.products (sku, description, is_active) VALUES
  ('1005600', 'Partida  Retrátil  5.5 a 6.5 hp', true),
  ('1066600', 'PONTEIRA TRANSMISSÃO ROÇADEIRA 9 ESTRIAS NO EIXO PARA TUBO 28MM', true),
  ('1254512', 'Fio Nylon Roçadeira Quadrado 2kg - 3.0mm', true),
  ('1957810', 'Carburador Motor Acionador 5.5/6.5', true),
  ('1022400', 'Sapata Ajustável Regulável Andaime Tubular Aço', true),
  ('23011919', 'MOTOR WEG 3CV 110/220V 60HZ3CV 4P MONO', true),
  ('9339700', 'Motor para Betoneira monofásico 110/220V 60HZ 2CV 4P', true),
  ('1022300', 'Vela De Ignição Roçadeira Roçadeira L7T', true),
  ('1003606', 'Mangueira de Pressão 44MPA 5M Lavadora', true),
  ('9019211', 'MANGUEIRA DE PRESSÃO 10M COMPATIVEL COM KARCHER', true);