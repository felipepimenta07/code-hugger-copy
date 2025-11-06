-- Migração 1: Adicionar campos flow_id e original_node_id

-- 1. Adicionar flow_id às tabelas people e brands
ALTER TABLE public.people 
  ADD COLUMN flow_id bigint REFERENCES flows(id) ON DELETE CASCADE;

ALTER TABLE public.brands 
  ADD COLUMN flow_id bigint REFERENCES flows(id) ON DELETE CASCADE;

-- 2. Adicionar original_node_id para rastrear cópias
ALTER TABLE public.people 
  ADD COLUMN original_node_id bigint REFERENCES people(id) ON DELETE SET NULL;

ALTER TABLE public.brands 
  ADD COLUMN original_node_id bigint REFERENCES brands(id) ON DELETE SET NULL;

ALTER TABLE public.projects 
  ADD COLUMN original_node_id bigint REFERENCES projects(id) ON DELETE SET NULL;

-- 3. Criar índices para performance
CREATE INDEX idx_people_flow_id ON public.people(flow_id);
CREATE INDEX idx_brands_flow_id ON public.brands(flow_id);
CREATE INDEX idx_people_original ON public.people(original_node_id);
CREATE INDEX idx_brands_original ON public.brands(original_node_id);
CREATE INDEX idx_projects_original ON public.projects(original_node_id);
CREATE INDEX idx_people_name_user ON public.people(name, user_id);
CREATE INDEX idx_brands_name_user ON public.brands(name, user_id);
CREATE INDEX idx_projects_name_user ON public.projects(name, user_id);

-- 4. Migrar dados existentes para flow_id=12
UPDATE public.people 
SET flow_id = 12 
WHERE flow_id IS NULL;

UPDATE public.brands 
SET flow_id = 12 
WHERE flow_id IS NULL;

UPDATE public.projects 
SET flow_id = 12 
WHERE flow_id IS NULL;

-- 5. Tornar flow_id obrigatório
ALTER TABLE public.people ALTER COLUMN flow_id SET NOT NULL;
ALTER TABLE public.brands ALTER COLUMN flow_id SET NOT NULL;
ALTER TABLE public.projects ALTER COLUMN flow_id SET NOT NULL;

-- 6. Remover home_project_id (substituído por flow_id)
ALTER TABLE public.people DROP COLUMN IF EXISTS home_project_id;
ALTER TABLE public.brands DROP COLUMN IF EXISTS home_project_id;