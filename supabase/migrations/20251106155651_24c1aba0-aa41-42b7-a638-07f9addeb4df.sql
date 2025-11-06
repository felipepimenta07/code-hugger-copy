-- Adicionar colunas para posições do Master View
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS master_x numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS master_y numeric DEFAULT 0;

ALTER TABLE people 
  ADD COLUMN IF NOT EXISTS master_x numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS master_y numeric DEFAULT 0;

ALTER TABLE brands 
  ADD COLUMN IF NOT EXISTS master_x numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS master_y numeric DEFAULT 0;

-- Copiar posições atuais para master (migração inicial)
UPDATE projects SET master_x = x, master_y = y WHERE master_x = 0 AND master_y = 0;
UPDATE people SET master_x = x, master_y = y WHERE master_x = 0 AND master_y = 0;
UPDATE brands SET master_x = x, master_y = y WHERE master_x = 0 AND master_y = 0;