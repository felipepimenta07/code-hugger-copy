import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY não configurado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── CHAT MODE ─────────────────────────────────────────────────────────────
    if (body.chatMode === true) {
      const { messages = [] } = body;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit atingido. Tente em instantes.', status: 429 }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: 'Créditos insuficientes. Verifique seu plano.', status: 402 }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI gateway error: ${status}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || 'Sem resposta.';

      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── INSIGHTS MODE ─────────────────────────────────────────────────────────
    const {
      nodes = [],
      connections = [],
      workflows = [],
      flows = [],
      people = [],
      brands = [],
      projects = [],
    } = body;

    // Merge all nodes if separate arrays were sent
    const allNodes: any[] = nodes.length > 0
      ? nodes
      : [
          ...people.map((p: any) => ({ ...p, type: 'person' })),
          ...brands.map((b: any) => ({ ...b, type: 'brand' })),
          ...projects.map((pr: any) => ({ ...pr, type: 'project' })),
        ];

    console.log('[analyze-network] Analisando rede:', {
      totalNodes: allNodes.length,
      totalConnections: connections.length,
      totalFlows: flows.length,
      people: people.length,
      brands: brands.length,
      projects: projects.length,
    });

    // Build rich network description
    const networkData = `
FLOWS (${flows.length}):
${flows.map((f: any) => `- Flow "${f.name}" (ID: ${f.id}) — centro: ${f.center_type} #${f.center_id}`).join('\n') || 'Nenhum'}

PESSOAS (${people.length}):
${people.slice(0, 80).map((p: any) => `- ${p.name} (ID: ${p.id}) | empresa: ${p.company || 'N/A'} | flow_id: ${p.flow_id || 'N/A'}${p.email ? ` | email: ${p.email}` : ''}`).join('\n') || 'Nenhuma'}

PROJETOS (${projects.length}):
${projects.slice(0, 40).map((pr: any) => `- ${pr.name} (ID: ${pr.id}) | status: ${pr.status || 'N/A'} | flow_id: ${pr.flow_id || 'N/A'}`).join('\n') || 'Nenhum'}

MARCAS (${brands.length}):
${brands.slice(0, 40).map((b: any) => `- ${b.name} (ID: ${b.id}) | flow_id: ${b.flow_id || 'N/A'}`).join('\n') || 'Nenhuma'}

CONEXÕES (${connections.length}):
${connections.slice(0, 100).map((c: any) => {
  const from = allNodes.find((n: any) => n.id === (c.from || c.from_id));
  const to = allNodes.find((n: any) => n.id === (c.to || c.to_id));
  return `- ${from?.name || c.from || c.from_id} [${c.from_type || from?.type || '?'}] → ${to?.name || c.to || c.to_id} [${c.to_type || to?.type || '?'}] (${c.type || c.connection_type || 'related'})`;
}).join('\n') || 'Nenhuma'}
    `.trim();

    const systemPrompt = `Você é um analista expert de redes de relacionamento estratégico.

Analise os dados da rede e identifique:
1. CONEXÕES OCULTAS — Pessoas que compartilham empresas, flows ou interesses mas NÃO estão diretamente conectadas no grafo
2. PONTES ESTRATÉGICAS — Pessoas que aparecem em múltiplos flows ou conectam projetos/marcas diferentes
3. OPORTUNIDADES — Caminhos de apresentação entre pessoas/projetos desconectados que teriam sinergia
4. ALERTAS — Pessoas isoladas, projetos sem pessoas, flows com apenas 1 nó, riscos
5. TOP 5 AÇÕES — Prioridades baseadas em potencial estratégico

Para cada insight: use nomes reais, explique POR QUE é importante, sugira AÇÃO concreta, priorize por impacto.
CRUCIAL: use os IDs numéricos dos nós para node_ids/path (não nomes, apenas os números).`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analise esta rede:\n\n${networkData}` }
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_network_insights",
            description: "Retorna insights estruturados da análise de rede",
            parameters: {
              type: "object",
              properties: {
                hidden_connections: {
                  type: "array",
                  description: "Conexões ocultas detectadas",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      node_ids: { type: "array", items: { type: "number" } },
                      connection_type: { type: "string", enum: ["same_company", "same_project", "mutual_friend", "same_workflow", "same_flow"] },
                      description: { type: "string" },
                      action: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] }
                    },
                    required: ["title", "node_ids", "connection_type", "description", "action", "priority"]
                  }
                },
                strategic_bridges: {
                  type: "array",
                  description: "Pessoas que conectam múltiplos flows/projetos",
                  items: {
                    type: "object",
                    properties: {
                      node_id: { type: "number" },
                      person_name: { type: "string" },
                      connects_workflows: { type: "array", items: { type: "string" } },
                      importance: { type: "string" },
                      suggestion: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] }
                    },
                    required: ["node_id", "person_name", "connects_workflows", "importance", "suggestion", "priority"]
                  }
                },
                opportunities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      path: { type: "array", items: { type: "number" } },
                      potential: { type: "string" },
                      next_step: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] }
                    },
                    required: ["title", "path", "potential", "next_step", "priority"]
                  }
                },
                alerts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["isolated_person", "project_without_people", "redundancy", "single_point_failure", "empty_flow"] },
                      title: { type: "string" },
                      node_ids: { type: "array", items: { type: "number" } },
                      description: { type: "string" },
                      severity: { type: "string", enum: ["high", "medium", "low"] },
                      action: { type: "string" }
                    },
                    required: ["type", "title", "node_ids", "description", "severity", "action"]
                  }
                },
                top_actions: {
                  type: "array",
                  maxItems: 5,
                  items: {
                    type: "object",
                    properties: {
                      action: { type: "string" },
                      reason: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] },
                      related_node_ids: { type: "array", items: { type: "number" } }
                    },
                    required: ["action", "reason", "priority", "related_node_ids"]
                  }
                }
              },
              required: ["hidden_connections", "strategic_bridges", "opportunities", "alerts", "top_actions"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "return_network_insights" } }
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit atingido. Tente em instantes.', status: 429 }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes. Verifique seu plano.', status: 402 }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('[analyze-network] AI gateway error:', status, errorText);
      throw new Error(`AI API error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('Nenhum tool call retornado pela IA');
    }

    const insights = JSON.parse(toolCall.function.arguments);
    console.log('[analyze-network] Insights gerados:', {
      hiddenConnections: insights.hidden_connections?.length || 0,
      bridges: insights.strategic_bridges?.length || 0,
      opportunities: insights.opportunities?.length || 0,
      alerts: insights.alerts?.length || 0,
      topActions: insights.top_actions?.length || 0,
    });

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[analyze-network] Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
