-- Adicionar flow_id às tabelas projects e connections
ALTER TABLE public.projects 
ADD COLUMN flow_id bigint REFERENCES public.flows(id) ON DELETE SET NULL;

ALTER TABLE public.connections 
ADD COLUMN flow_id bigint REFERENCES public.flows(id) ON DELETE CASCADE;

-- Criar índices para melhor performance
CREATE INDEX idx_projects_flow_id ON public.projects(flow_id);
CREATE INDEX idx_connections_flow_id ON public.connections(flow_id);

-- Comentários para documentação
COMMENT ON COLUMN public.projects.flow_id IS 'ID do flow ao qual este projeto pertence';
COMMENT ON COLUMN public.connections.flow_id IS 'ID do flow ao qual esta conexão pertence';