-- Tabela para vincular usuário → WhatsApp
CREATE TABLE whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT,
  activation_code TEXT,
  qr_code_token TEXT,
  is_active BOOLEAN DEFAULT false,
  connected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT now() + interval '5 minutes'
);

ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connection"
  ON whatsapp_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connection"
  ON whatsapp_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connection"
  ON whatsapp_connections FOR UPDATE
  USING (auth.uid() = user_id);

-- Tabela para gerenciar conversação temporária
CREATE TABLE whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  state TEXT NOT NULL,
  pending_contact JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT now() + interval '10 minutes'
);

ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON whatsapp_sessions FOR ALL
  USING (auth.uid() = user_id);

-- Tabela para notificações em tempo real
CREATE TABLE whatsapp_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE whatsapp_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON whatsapp_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON whatsapp_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Ativar Realtime para notificações
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_notifications;