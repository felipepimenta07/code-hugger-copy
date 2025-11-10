import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { method } = await req.json();

    if (method === 'code') {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data, error } = await supabase.from('whatsapp_connections').upsert({
        user_id: user.id,
        activation_code: code,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      }, {
        onConflict: 'user_id'
      });

      if (error) {
        console.error('Failed to save activation code:', error);
        throw new Error('Failed to generate activation code');
      }

      console.log('Activation code generated successfully:', { code, user_id: user.id });

      return new Response(JSON.stringify({ code }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (method === 'qrcode') {
      const token = crypto.randomUUID();
      
      const { data, error } = await supabase.from('whatsapp_connections').upsert({
        user_id: user.id,
        qr_code_token: token,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      }, {
        onConflict: 'user_id'
      });

      if (error) {
        console.error('Failed to save QR token:', error);
        throw new Error('Failed to generate QR code');
      }

      console.log('QR token generated successfully:', { token, user_id: user.id });

      const whatsappNumber = '15551529965'; // +1 555 152 9965 (sem + e espaços)
      const qrUrl = `https://wa.me/${whatsappNumber}?text=CONECTAR%20${token}`;

      return new Response(JSON.stringify({ qrUrl, token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error('Invalid method');
  } catch (error) {
    console.error('Error in whatsapp-activate:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
