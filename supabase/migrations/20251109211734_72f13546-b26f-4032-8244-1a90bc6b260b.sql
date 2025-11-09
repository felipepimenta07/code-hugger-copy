-- Habilitar REPLICA IDENTITY FULL para capturar mudanças completas
ALTER TABLE flows REPLICA IDENTITY FULL;
ALTER TABLE people REPLICA IDENTITY FULL;
ALTER TABLE projects REPLICA IDENTITY FULL;
ALTER TABLE brands REPLICA IDENTITY FULL;
ALTER TABLE connections REPLICA IDENTITY FULL;

-- Adicionar tabelas à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE flows;
ALTER PUBLICATION supabase_realtime ADD TABLE people;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE brands;
ALTER PUBLICATION supabase_realtime ADD TABLE connections;