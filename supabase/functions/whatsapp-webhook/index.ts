import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function cleanPhoneNumber(phone: string): string {
  // Remove tudo exceto dígitos
  return phone.replace(/[^\d]/g, '');
}

function parseContact(contactData: any) {
  const contact: any = { name: '', phone: '' };
  
  // Extract name
  if (contactData.name) {
    contact.name = contactData.name.formatted_name || 
                   contactData.name.first_name || 
                   '';
  }
  
  // Extract phone
  if (contactData.phones && contactData.phones.length > 0) {
    contact.phone = contactData.phones[0].phone || '';
  }
  
  // Extract email
  if (contactData.emails && contactData.emails.length > 0) {
    contact.email = contactData.emails[0].email || '';
  }
  
  // Extract company
  if (contactData.org && contactData.org.company) {
    contact.company = contactData.org.company;
  }
  
  // Extract role
  if (contactData.org && contactData.org.title) {
    contact.role = contactData.org.title;
  }
  
  return contact;
}

async function sendWhatsAppMessage(to: string, text: string) {
  const WHATSAPP_TOKEN = (Deno.env.get('WHATSAPP_ACCESS_TOKEN') || '').trim();
  const PHONE_NUMBER_ID = (Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '').trim();
  const cleanTo = cleanPhoneNumber(to);
  
  console.log('📤 Sending message:', {
    original_to: to,
    cleaned_to: cleanTo,
    phone_number_id: PHONE_NUMBER_ID
  });

  const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: cleanTo,
      type: 'text',
      text: { body: text }
    })
  });

  let data: any = null;
  try { data = await response.json(); } catch (_) {}
  if (!response.ok) {
    console.error('WhatsApp API error (text):', response.status, data);
    return { ok: false, status: response.status, data, error: data?.error };
  }
  return { ok: response.ok, status: response.status, data };
}

async function sendInteractiveButtons(to: string, text: string, buttons: any[]) {
  const WHATSAPP_TOKEN = (Deno.env.get('WHATSAPP_ACCESS_TOKEN') || '').trim();
  const PHONE_NUMBER_ID = (Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '').trim();
  const cleanTo = cleanPhoneNumber(to);
  
  console.log('📤 Sending interactive:', {
    original_to: to,
    cleaned_to: cleanTo,
    phone_number_id: PHONE_NUMBER_ID
  });

  const response = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: cleanTo,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text },
        action: { buttons }
      }
    })
  });

  let data: any = null;
  try { data = await response.json(); } catch (_) {}
  if (!response.ok) {
    console.error('WhatsApp API error (interactive):', response.status, data);
  }
  return { ok: response.ok, status: response.status, data };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      if (mode === 'subscribe' && token === Deno.env.get('WHATSAPP_VERIFY_TOKEN')) {
        console.log('Webhook verified successfully');
        return new Response(challenge, { status: 200 });
      }
      return new Response('Forbidden', { status: 403 });
    }

    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    if (!body.entry?.[0]?.changes?.[0]?.value?.messages) {
      return new Response('OK', { status: 200 });
    }

    const message = body.entry[0].changes[0].value.messages[0];
    const from = message.from;
    const messageType = message.type;

    console.log(`Message from ${from}, type: ${messageType}`);

    if (messageType === 'text') {
      const originalText = (message.text?.body || '').trim();
      const upperText = originalText.toUpperCase();
      
      if (upperText.startsWith('CONECTAR')) {
        const codeRaw = originalText.slice('CONECTAR'.length).trim();
        if (codeRaw.length === 0) {
          await sendWhatsAppMessage(from,
            'ℹ️ Envie no formato: CONECTAR <CÓDIGO>\nEx.: CONECTAR ABC123'
          );
          return new Response('OK', { status: 200 });
        }

        const codeUpper = codeRaw.toUpperCase();

        const { data: connection } = await supabase
          .from('whatsapp_connections')
          .select('*')
          .or(`activation_code.eq.${codeUpper},qr_code_token.eq.${codeRaw}`)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (connection) {
          await supabase.from('whatsapp_connections').update({
            phone_number: from,
            is_active: true,
            connected_at: new Date().toISOString(),
            activation_code: null,
            qr_code_token: null
          }).eq('id', connection.id);

          const sendResult = await sendWhatsAppMessage(from, 
            '✅ *Conectado com sucesso!*\n\n' +
            'Agora você pode compartilhar contatos comigo.\n\n' +
            'Basta usar o botão de compartilhar contato do WhatsApp!'
          );

          // Log notification if message failed to deliver
          if (sendResult.error) {
            await supabase.from('whatsapp_notifications').insert({
              user_id: connection.user_id,
              type: 'delivery_failed',
              title: 'Mensagem de confirmação não entregue',
              message: sendResult.error.message || 'Erro desconhecido',
              data: { 
                error_code: sendResult.error.code,
                error_details: sendResult.error.error_data 
              }
            });
          }

          return new Response('OK', { status: 200 });
        } else {
          console.log('Invalid or expired activation code:', { code: codeRaw, from });
          
          // Try to find user by phone to send notification
          const { data: existingConnection } = await supabase
            .from('whatsapp_connections')
            .select('user_id')
            .eq('phone_number', from)
            .maybeSingle();

          if (existingConnection) {
            await supabase.from('whatsapp_notifications').insert({
              user_id: existingConnection.user_id,
              type: 'activation_failed',
              title: 'Código inválido',
              message: 'O código enviado está inválido ou expirou. Gere um novo código.',
              data: { code: codeRaw, phone: from }
            });
          }

          await sendWhatsAppMessage(from, 
            '❌ Código inválido ou expirado.\n\n' +
            'Acesse a plataforma e gere um novo código.'
          );
          return new Response('OK', { status: 200 });
        }
      }
    }

    const { data: connection } = await supabase
      .from('whatsapp_connections')
      .select('user_id, is_active')
      .eq('phone_number', from)
      .eq('is_active', true)
      .maybeSingle();

    if (!connection) {
      await sendWhatsAppMessage(from, 
        '⚠️ *Número não conectado!*\n\n' +
        'Acesse a plataforma Network Matrix e clique em "WhatsApp" no menu superior para conectar seu número.'
      );
      return new Response('OK', { status: 200 });
    }

    if (messageType === 'contacts') {
      const contactData = message.contacts[0];
      const parsed = parseContact(contactData);

      console.log('Contact received:', JSON.stringify(contactData, null, 2));
      console.log('Parsed contact:', parsed);

      await supabase.from('whatsapp_sessions').insert({
        user_id: connection.user_id,
        phone_number: from,
        state: 'awaiting_choice',
        pending_contact: parsed
      });

      await sendInteractiveButtons(from,
        `📋 *Contato recebido:*\n\n` +
        `👤 ${parsed.name}\n` +
        (parsed.company ? `🏢 ${parsed.company}\n` : '') +
        (parsed.role ? `💼 ${parsed.role}\n` : '') +
        (parsed.phone ? `📞 ${parsed.phone}\n` : '') +
        (parsed.email ? `📧 ${parsed.email}\n` : '') +
        `\nO que deseja fazer?`,
        [
          { type: 'reply', reply: { id: 'create_node', title: '➕ Criar nó' } },
          { type: 'reply', reply: { id: 'create_flow', title: '🌀 Criar flow' } },
          { type: 'reply', reply: { id: 'cancel', title: '❌ Cancelar' } }
        ]
      );

      return new Response('OK', { status: 200 });
    }

    if (messageType === 'interactive') {
      const buttonId = message.interactive.button_reply.id;

      const { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('phone_number', from)
        .eq('user_id', connection.user_id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!session) {
        await sendWhatsAppMessage(from, '⏱️ Sessão expirada. Envie o contato novamente.');
        return new Response('OK', { status: 200 });
      }

      const contact = session.pending_contact;

      if (buttonId === 'cancel') {
        await supabase.from('whatsapp_sessions').delete().eq('id', session.id);
        await sendWhatsAppMessage(from, '❌ Operação cancelada.');
        return new Response('OK', { status: 200 });
      }

      if (buttonId === 'create_node') {
        // Always create a new flow for contacts received via WhatsApp
        const flowName = contact.company || `${contact.name} Network`;
        
        // First create the person node
        const { data: newPerson, error: personError } = await supabase.from('people').insert({
          user_id: connection.user_id,
          flow_id: 0, // Temporary, will update after flow creation
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          category: contact.role || 'Profissional',
          x: 0,
          y: 0,
          master_x: 0,
          master_y: 0
        }).select().maybeSingle();

        if (personError) {
          console.error('Error creating person:', personError);
          await sendWhatsAppMessage(from, '❌ Erro ao criar nó. Tente novamente.');
          return new Response('OK', { status: 200 });
        }

        // Create the flow with this person as center
        const { data: newFlow, error: flowError } = await supabase.from('flows').insert({
          user_id: connection.user_id,
          name: flowName,
          center_type: 'person',
          center_id: newPerson.id
        }).select().maybeSingle();

        if (flowError) {
          console.error('Error creating flow:', flowError);
          await sendWhatsAppMessage(from, '❌ Erro ao criar flow. Tente novamente.');
          return new Response('OK', { status: 200 });
        }

        // Update person with the correct flow_id
        await supabase.from('people').update({
          flow_id: newFlow.id
        }).eq('id', newPerson.id);

        await supabase.from('whatsapp_notifications').insert({
          user_id: connection.user_id,
          type: 'flow_created',
          title: 'Flow criado via WhatsApp',
          message: `Flow "${flowName}" criado com ${contact.name}`,
          data: { flow_id: newFlow.id, flow_name: flowName, node_id: newPerson.id }
        });

        await sendWhatsAppMessage(from, 
          `✅ *Flow criado com sucesso!*\n\n` +
          `🌀 ${flowName}\n` +
          `👤 Centro: ${contact.name}\n\n` +
          `Acesse o Network Matrix para visualizar.`
        );

        await supabase.from('whatsapp_sessions').delete().eq('id', session.id);
        return new Response('OK', { status: 200 });
      }

      if (buttonId === 'create_flow') {
        await supabase.from('whatsapp_sessions').update({
          state: 'awaiting_flow_name'
        }).eq('id', session.id);

        await sendWhatsAppMessage(from, 
          `🌀 *Criar novo flow*\n\n` +
          `Qual será o nome do flow?\n` +
          (contact.company ? `\nSugestão: "${contact.company}"` : '')
        );

        return new Response('OK', { status: 200 });
      }
    }

    if (messageType === 'text') {
      const { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('phone_number', from)
        .eq('user_id', connection.user_id)
        .eq('state', 'awaiting_flow_name')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (session) {
        const flowName = message.text.body;
        const contact = session.pending_contact;

        const { data: newPerson } = await supabase.from('people').insert({
          user_id: connection.user_id,
          flow_id: 0,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          category: contact.role || 'Profissional',
          x: 0,
          y: 0,
          master_x: 0,
          master_y: 0
        }).select().maybeSingle();

        const { data: newFlow } = await supabase.from('flows').insert({
          user_id: connection.user_id,
          name: flowName,
          center_type: 'person',
          center_id: newPerson.id
        }).select().maybeSingle();

        await supabase.from('people').update({
          flow_id: newFlow.id
        }).eq('id', newPerson.id);

        await supabase.from('whatsapp_notifications').insert({
          user_id: connection.user_id,
          type: 'flow_created',
          title: 'Flow criado via WhatsApp',
          message: `Flow "${flowName}" criado com ${contact.name}`,
          data: { flow_id: newFlow.id, flow_name: flowName }
        });

        await sendWhatsAppMessage(from,
          `✅ *Flow criado com sucesso!*\n\n` +
          `🌀 ${flowName}\n` +
          `👤 Centro: ${contact.name}\n\n` +
          `Acesse o Network Matrix para visualizar.`
        );

        await supabase.from('whatsapp_sessions').delete().eq('id', session.id);
        return new Response('OK', { status: 200 });
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error in webhook:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
