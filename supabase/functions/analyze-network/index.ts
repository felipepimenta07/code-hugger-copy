import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nodes, connections, workflows } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurado');
    }

    console.log('[analyze-network] Analisando rede:', { 
      totalNodes: nodes.length, 
      totalConnections: connections.length,
      totalWorkflows: workflows.length 
    });

    // Construir prompt detalhado com dados da rede
    const networkData = `
WORKFLOWS:
${workflows.map((w: any) => `- ${w.name} (ID: ${w.id})`).join('\n')}

NÓS (${nodes.length} total):
${nodes.map((n: any) => `- [${n.type.toUpperCase()}] ${n.name} (ID: ${n.id}) - Workflows: ${n.workflows?.join(', ') || 'N/A'}${n.company ? ` - Empresa: ${n.company}` : ''}`).join('\n')}

CONEXÕES (${connections.length} total):
${connections.map((c: any) => {
  const from = nodes.find((n: any) => n.id === c.from);
  const to = nodes.find((n: any) => n.id === c.to);
  return `- ${from?.name || c.from} → ${to?.name || c.to} (${c.type})`;
}).join('\n')}
    `;

    const systemPrompt = `Você é um analista expert de redes de relacionamento estratégico. 

Analise os dados da rede fornecidos e identifique:

1. CONEXÕES OCULTAS - Pessoas que compartilham empresas, projetos ou conhecidos em comum mas NÃO estão diretamente conectadas no grafo
2. PONTES ESTRATÉGICAS - Pessoas que conectam diferentes workflows/contextos (aparecem em múltiplos workflows)
3. OPORTUNIDADES - Caminhos de apresentação entre pessoas/projetos desconectados
4. ALERTAS - Pessoas isoladas, projetos sem stakeholders, redundâncias, riscos
5. PRIORIDADES - Top 5 ações recomendadas baseado em potencial estratégico

Para cada insight:
- Seja específico (use nomes reais dos nós)
- Explique POR QUE é importante
- Sugira uma AÇÃO concreta
- Priorize por impacto (alto/médio/baixo)

IMPORTANTE: 
- Conexão oculta = pessoas com algo em comum mas SEM linha direta entre elas
- Ponte estratégica = pessoa que aparece em 2+ workflows diferentes
- Use os IDs dos nós para referências precisas`;

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
                      title: { type: "string", description: "Título curto e impactante" },
                      node_ids: { type: "array", items: { type: "number" }, description: "IDs dos nós envolvidos" },
                      connection_type: { 
                        type: "string", 
                        enum: ["same_company", "same_project", "mutual_friend", "same_workflow"],
                        description: "Tipo de conexão oculta"
                      },
                      description: { type: "string", description: "Descrição detalhada do insight" },
                      action: { type: "string", description: "Ação sugerida" },
                      priority: { type: "string", enum: ["high", "medium", "low"] }
                    },
                    required: ["title", "node_ids", "connection_type", "description", "action", "priority"]
                  }
                },
                strategic_bridges: {
                  type: "array",
                  description: "Pessoas que conectam múltiplos workflows",
                  items: {
                    type: "object",
                    properties: {
                      node_id: { type: "number", description: "ID do nó da ponte estratégica" },
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
                  description: "Oportunidades de apresentação ou conexão",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      path: { type: "array", items: { type: "number" }, description: "IDs dos nós no caminho" },
                      potential: { type: "string" },
                      next_step: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] }
                    },
                    required: ["title", "path", "potential", "next_step", "priority"]
                  }
                },
                alerts: {
                  type: "array",
                  description: "Alertas e problemas detectados",
                  items: {
                    type: "object",
                    properties: {
                      type: { 
                        type: "string", 
                        enum: ["isolated_person", "project_without_people", "redundancy", "single_point_failure"],
                        description: "Tipo de alerta"
                      },
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
                  description: "Top 5 ações prioritárias",
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
      const errorText = await response.text();
      console.error('[analyze-network] Erro na API:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[analyze-network] Resposta da IA recebida');

    // Extrair insights do tool call
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
      topActions: insights.top_actions?.length || 0
    });

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[analyze-network] Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        details: error instanceof Error ? error.stack : undefined
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
