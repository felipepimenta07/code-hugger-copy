import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: { message: 'Não autorizado' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active connection
    const { data: connection, error: connError } = await supabase
      .from('whatsapp_connections')
      .select('phone_number')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { message: 'WhatsApp não conectado' } 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body safely
    let message = 'Teste de conexão - Network Matrix ✅';
    try {
      const body = await req.json();
      if (body?.message) {
        message = body.message;
      }
    } catch {
      // Use default message if no body provided
    }
    
    const WHATSAPP_TOKEN = (Deno.env.get('WHATSAPP_ACCESS_TOKEN') || '').trim();
    const PHONE_NUMBER_ID = (Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '').trim();

    console.log('📤 Test message:', {
      to: connection.phone_number,
      message,
      phone_number_id: PHONE_NUMBER_ID
    });

    const response = await fetch(
      `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: connection.phone_number,
          type: 'text',
          text: { body: message }
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API error:', response.status, result);
      
      // Log notification for error
      await supabase.from('whatsapp_notifications').insert({
        user_id: user.id,
        type: 'delivery_failed',
        title: 'Falha no envio de teste',
        message: result.error?.message || 'Erro desconhecido',
        data: { error: result.error }
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error || { message: 'Erro desconhecido' }
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Test message sent:', result);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: { message: errorMessage } 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
