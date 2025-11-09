-- Add unique constraint to whatsapp_connections.user_id to enable proper upsert
ALTER TABLE public.whatsapp_connections
ADD CONSTRAINT whatsapp_connections_user_id_key UNIQUE (user_id);