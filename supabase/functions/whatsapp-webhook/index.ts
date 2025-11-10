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
  console.log('📇 vCard completo recebido:', JSON.stringify(contactData, null, 2));
  
  const contact: any = { name: '', phone: '' };
  
  // Extract name
  if (contactData.name) {
    contact.name = contactData.name.formatted_name || 
                   contactData.name.first_name || 
                   '';
  }
  
  // Extract primary phone
  if (contactData.phones && contactData.phones.length > 0) {
    contact.phone = contactData.phones[0].phone || '';
    
    // Extract secondary phone
    if (contactData.phones.length > 1) {
      contact.phone_secondary = contactData.phones[1].phone || '';
    }
    
    // Extract work phone (look for specific type)
    const workPhone = contactData.phones.find((p: any) => 
      p.type && p.type.toLowerCase() === 'work'
    );
    if (workPhone) {
      contact.phone_work = workPhone.phone;
    }
  }
  
  // Extract primary email
  if (contactData.emails && contactData.emails.length > 0) {
    contact.email = contactData.emails[0].email || '';
    
    // Extract secondary email
    if (contactData.emails.length > 1) {
      contact.email_secondary = contactData.emails[1].email || '';
    }
  }
  
  // Extract full address
  if (contactData.addresses && contactData.addresses.length > 0) {
    const addr = contactData.addresses[0];
    const parts = [
      addr.street,
      addr.city,
      addr.state,
      addr.zip,
      addr.country
    ].filter(Boolean);
    
    if (parts.length > 0) {
      contact.address = parts.join(', ');
    }
  }
  
  // Extract website
  if (contactData.urls && contactData.urls.length > 0) {
    contact.website = contactData.urls[0].url || '';
  }
  
  // Extract birthday
  if (contactData.birthday) {
    contact.birthday = contactData.birthday;
  }
  
  // Extract notes
  if (contactData.note) {
    contact.notes = contactData.note;
  }
  
  // Extract company
  if (contactData.org && contactData.org.company) {
    contact.company = contactData.org.company;
  }
  
  // Extract role/title
  if (contactData.org && contactData.org.title) {
    contact.role = contactData.org.title;
  }
  
  // Extract department
  if (contactData.org && contactData.org.department) {
    contact.department = contactData.org.department;
  }
  
  console.log('📋 Dados extraídos:', JSON.stringify(contact, null, 2));
  
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
      const allContacts = message.contacts; // Pega TODOS os contatos
      const parsedContacts = allContacts.map((c: any) => parseContact(c));

      console.log(`Received ${parsedContacts.length} contact(s)`);
      console.log('All contacts:', JSON.stringify(parsedContacts, null, 2));

      // Auto-create flow with all contacts connected
      try {
        // Define flow name based on number of contacts
        const flowName = parsedContacts.length > 1 
          ? `Grupo WhatsApp - ${parsedContacts.length} pessoas`
          : (parsedContacts[0].company || `${parsedContacts[0].name || 'Contato'} Network`);

        // Create the flow first with temporary center
        console.log('Step: Creating flow with temporary center');
        const { data: newFlow, error: flowError } = await supabase
          .from('flows')
          .insert({
            user_id: connection.user_id,
            name: flowName,
            center_type: 'person',
            center_id: 0 // temporary, will update after first person creation
          })
          .select()
          .single();
        
        if (flowError) {
          console.error('Step: Flow creation failed', flowError);
          throw flowError;
        }
        console.log('Step: Flow created with id', newFlow.id);
        const flowId = newFlow.id;

        // Create ALL people in a single batch with complete data
        const peopleToInsert = parsedContacts.map((contact: any, index: number) => ({
          user_id: connection.user_id,
          flow_id: flowId,
          name: contact.name || `Contato ${index + 1}`,
          email: contact.email || null,
          phone: contact.phone || null,
          phone_secondary: contact.phone_secondary || null,
          phone_work: contact.phone_work || null,
          email_secondary: contact.email_secondary || null,
          address: contact.address || null,
          website: contact.website || null,
          birthday: contact.birthday || null,
          notes: contact.notes || null,
          department: contact.department || null,
          company: contact.company || null,
          category: contact.role || 'Profissional',
          x: 0,
          y: 0,
          master_x: 0,
          master_y: 0
        }));

        console.log('Step: Creating', peopleToInsert.length, 'people');
        const { data: createdPeople, error: peopleError } = await supabase
          .from('people')
          .insert(peopleToInsert)
          .select();

        if (peopleError || !createdPeople || createdPeople.length === 0) {
          console.error('Step: People creation failed', peopleError);
          throw peopleError;
        }
        console.log('Step: Created', createdPeople.length, 'people');

        // Update flow to have first person as center
        console.log('Step: Updating flow center to first person', createdPeople[0].id);
        const { error: updateError } = await supabase
          .from('flows')
          .update({ center_id: createdPeople[0].id })
          .eq('id', flowId);
        
        if (updateError) {
          console.error('Step: Flow center update failed', updateError);
          throw updateError;
        }
        console.log('Step: Flow center updated successfully');

        // Create connections between ALL people (complete graph)
        const connectionsToCreate: any[] = [];
        for (let i = 0; i < createdPeople.length; i++) {
          for (let j = i + 1; j < createdPeople.length; j++) {
            connectionsToCreate.push({
              user_id: connection.user_id,
              flow_id: flowId,
              from_id: createdPeople[i].id,
              from_type: 'person',
              to_id: createdPeople[j].id,
              to_type: 'person',
              connection_type: 'professional'
            });
          }
        }

        if (connectionsToCreate.length > 0) {
          console.log('Step: Creating', connectionsToCreate.length, 'connections');
          const { error: connectionsError } = await supabase
            .from('connections')
            .insert(connectionsToCreate);
          
          if (connectionsError) {
            console.error('Step: Connections creation failed (non-critical)', connectionsError);
          } else {
            console.log('Step: Connections created successfully');
          }
        }

        // Create notification
        await supabase.from('whatsapp_notifications').insert({
          user_id: connection.user_id,
          type: 'flow_created',
          title: 'Flow criado via WhatsApp',
          message: `Flow "${flowName}" criado com ${parsedContacts.length} pessoa(s) conectada(s)`,
          data: { 
            flow_id: flowId, 
            flow_name: flowName, 
            total_people: parsedContacts.length,
            people_ids: createdPeople.map((p: any) => p.id)
          }
        });
        console.log('Step: Notification created');

        // Try to notify on WhatsApp (may fail due to country restriction)
        try {
          await sendWhatsAppMessage(from,
            `✅ *Flow criado com sucesso!*\n\n` +
            `🌀 ${flowName}\n` +
            `👥 ${parsedContacts.length} pessoa(s) conectada(s)\n` +
            `👤 Centro: ${parsedContacts[0].name || 'Contato 1'}\n\n` +
            `Acesse o Network Matrix para visualizar.`
          );
          console.log('Step: WhatsApp message sent successfully');
        } catch (whatsappError) {
          console.error('Step: WhatsApp message failed (non-critical):', whatsappError);
        }
      } catch (err) {
        console.error('Auto-create flow error:', err);
        
        // Create error notification
        try {
          await supabase.from('whatsapp_notifications').insert({
            user_id: connection.user_id,
            type: 'flow_create_error',
            title: 'Erro ao criar flow via WhatsApp',
            message: `Falha ao processar ${parsedContacts.length} contato(s)`,
            data: { error: String(err), contacts: parsedContacts }
          });
        } catch (notifError) {
          console.error('Failed to create error notification:', notifError);
        }
      }

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
        
        // First create the person node with complete data
        const { data: newPerson, error: personError } = await supabase.from('people').insert({
          user_id: connection.user_id,
          flow_id: 0, // Temporary, will update after flow creation
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          phone_secondary: contact.phone_secondary,
          phone_work: contact.phone_work,
          email_secondary: contact.email_secondary,
          address: contact.address,
          website: contact.website,
          birthday: contact.birthday,
          notes: contact.notes,
          department: contact.department,
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
