-- Criar tabela flows para gerenciar qualquer tipo de flow (projeto, pessoa ou marca)
CREATE TABLE public.flows (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  center_type TEXT NOT NULL CHECK (center_type IN ('project', 'person', 'brand')),
  center_id BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX idx_flows_user_id ON public.flows(user_id);
CREATE INDEX idx_flows_center ON public.flows(center_id, center_type);

-- Habilitar RLS
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: usuário só acessa seus próprios flows
CREATE POLICY "Users can view their own flows"
ON public.flows
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flows"
ON public.flows
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flows"
ON public.flows
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flows"
ON public.flows
FOR DELETE
USING (auth.uid() = user_id);

-- Migrar projects existentes para flows (retrocompatibilidade)
-- Criar um flow para cada projeto que ainda não tenha um
INSERT INTO public.flows (user_id, name, center_type, center_id, created_at)
SELECT p.user_id, p.name, 'project', p.id, p.created_at
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.flows f 
  WHERE f.center_type = 'project' 
  AND f.center_id = p.id
  AND f.user_id = p.user_id
);