-- CRITICAL SECURITY FIX: Move roles to separate table to prevent privilege escalation

-- 1. Drop ALL existing policies that depend on the role column
DROP POLICY IF EXISTS "Gestores podem atualizar perfis" ON public.profiles;
DROP POLICY IF EXISTS "Gestores podem inserir perfis" ON public.profiles;
DROP POLICY IF EXISTS "Gestores podem ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Gestores podem gerenciar produtos" ON public.products;
DROP POLICY IF EXISTS "Expedição pode criar listas" ON public.picking_lists;
DROP POLICY IF EXISTS "Galpão pode atualizar listas" ON public.picking_lists;
DROP POLICY IF EXISTS "Galpão pode ver todas as listas" ON public.picking_lists;
DROP POLICY IF EXISTS "Gestores têm acesso total às listas" ON public.picking_lists;
DROP POLICY IF EXISTS "Usuários podem ver itens de suas listas" ON public.picking_list_items;
DROP POLICY IF EXISTS "Galpão pode atualizar itens" ON public.picking_list_items;
DROP POLICY IF EXISTS "Gestores têm acesso total aos itens" ON public.picking_list_items;
DROP POLICY IF EXISTS "Expedição pode inserir itens em suas listas" ON public.picking_list_items;

-- 2. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('EXPEDIÇÃO', 'GALPÃO', 'GESTOR');

-- 3. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 4. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 6. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::text::app_role
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. Now safely drop the role column
ALTER TABLE public.profiles DROP COLUMN role;

-- 8. Create NEW policies using has_role function

-- Profiles policies
CREATE POLICY "Gestores podem atualizar perfis"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'GESTOR'));

CREATE POLICY "Gestores podem inserir perfis"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'GESTOR'));

CREATE POLICY "Gestores podem ver todos os perfis"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'GESTOR'));

-- Products policies
CREATE POLICY "Gestores podem gerenciar produtos"
ON public.products FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'GESTOR'));

-- Picking lists policies
CREATE POLICY "Expedição pode criar listas"
ON public.picking_lists FOR INSERT
TO authenticated
WITH CHECK (
  requester_id = auth.uid() AND 
  public.has_role(auth.uid(), 'EXPEDIÇÃO')
);

CREATE POLICY "Galpão pode atualizar listas"
ON public.picking_lists FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'GALPÃO') OR 
  public.has_role(auth.uid(), 'GESTOR')
);

CREATE POLICY "Galpão pode ver todas as listas"
ON public.picking_lists FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'GALPÃO') OR 
  public.has_role(auth.uid(), 'GESTOR')
);

CREATE POLICY "Gestores têm acesso total às listas"
ON public.picking_lists FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'GESTOR'));

-- Picking list items policies
CREATE POLICY "Expedição pode inserir itens em suas listas"
ON public.picking_list_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM picking_lists pl
    WHERE pl.id = picking_list_items.list_id 
    AND pl.requester_id = auth.uid()
  )
);

CREATE POLICY "Galpão pode atualizar itens"
ON public.picking_list_items FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'GALPÃO') OR 
  public.has_role(auth.uid(), 'GESTOR')
);

CREATE POLICY "Gestores têm acesso total aos itens"
ON public.picking_list_items FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'GESTOR'));

CREATE POLICY "Usuários podem ver itens de suas listas"
ON public.picking_list_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM picking_lists pl
    WHERE pl.id = picking_list_items.list_id
    AND (
      pl.requester_id = auth.uid() OR
      public.has_role(auth.uid(), 'GALPÃO') OR
      public.has_role(auth.uid(), 'GESTOR')
    )
  )
);

-- 9. RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Gestores can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'GESTOR'));

-- 10. Add initial products data
INSERT INTO public.products (sku, description) VALUES
('1005600', 'Partida Retrátil 5.5 a 6.5 hp'),
('1066600', 'PONTEIRA TRANSMISSÃO ROÇADEIRA 9 ESTRIAS NO EIXO PARA TUBO 28MM'),
('70060600', 'PULVERIZADOR DE PRESSAO AMARELA SNOW FOAM - 700606'),
('1254512', 'Fio Nylon Roçadeira Quadrado 2kg - 3.0mm'),
('15015050', 'ESCOVA DE AÇO ROTATIVA PARA ROÇADEIRA'),
('1957810', 'Carburador Motor Acionador 5.5/6.5 [ P]'),
('1022400', 'Sapata Ajustável / Regulável Andaime Tubular Aço 1 ¼ 1 Peça'),
('23011919', 'MOTOR WEG 3CV 110/220V 60HZ3CV 4P MONO'),
('23011982', 'MOTOR MONO WEG 1CV 110/220V IP21 W56 B3D'),
('23929323', 'MOTOR 2CV EBERLE BAIXA ROTAÇÃO 4 POLOS LNE3181'),
('9339700', 'Motor para Betoneira monofásico 110/220V 60HZ 2CV 4P'),
('1506400', 'Ponteira Completa Roçadeira Stihl Fs160 Fs220 Fs280 Fs290'),
('1506500', 'Ponteira Roçadeira Tubo 26mm Compativel Stihl Fs55 / Fs80 / Fs85'),
('1223330', 'Roda Plastica Para Betoneira Menegotti 250 / 400 Litros'),
('1506600', 'Ponteira para Roçadeira 7T26')
ON CONFLICT (sku) DO NOTHING;

-- 11. Update handle_new_user function to use user_roles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles (without role)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário')
  );
  
  -- Insert role into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'EXPEDIÇÃO')
  );
  
  RETURN NEW;
END;
$$;