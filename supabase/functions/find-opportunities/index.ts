import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, people, brands, projects, connections } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('🔍 Finding opportunities for query:', query);
    console.log('📊 Data: ', { 
      peopleCount: people.length, 
      brandsCount: brands.length, 
      projectsCount: projects.length 
    });

    // Preparar contexto dos dados
    const peopleContext = people.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      company: p.company,
      notes: p.notes,
      email: p.email
    }));

    const brandsContext = brands.map((b: any) => ({
      id: b.id,
      name: b.name,
      category: b.category,
      notes: b.notes
    }));

    const projectsContext = projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      notes: p.notes
    }));

    const systemPrompt = `Você é um assistente especializado em identificar oportunidades de networking e negócios.

DADOS DO NETWORK:
- ${people.length} pessoas
- ${brands.length} marcas/empresas
- ${projects.length} projetos
- ${connections.length} conexões

PESSOAS: ${JSON.stringify(peopleContext, null, 2)}
MARCAS: ${JSON.stringify(brandsContext, null, 2)}
PROJETOS: ${JSON.stringify(projectsContext, null, 2)}

TAREFA:
Analisar a solicitação do usuário e identificar as melhores oportunidades considerando:
1. Relevância das pessoas (categoria, empresa, skills mencionadas em notas)
2. Conexões diretas e indiretas (calcular graus de separação)
3. Marcas/empresas relevantes
4. Projetos anteriores similares

RETORNAR APENAS JSON válido neste formato exato:
{
  "opportunities": [
    {
      "type": "person",
      "id": número_id,
      "name": "nome",
      "relevanceScore": número_0_a_100,
      "reason": "explicação breve da relevância",
      "connectionPath": ["Você", "Nome1", "Nome2"],
      "actionSuggestion": "sugestão de ação",
      "category": "categoria_da_pessoa",
      "company": "empresa_se_tiver"
    }
  ],
  "insights": "resumo das oportunidades encontradas e estatísticas",
  "totalFound": número
}

IMPORTANTE:
- Retorne APENAS o JSON, sem explicações adicionais
- relevanceScore deve ser numérico (0-100)
- connectionPath deve ter pelo menos 2 elementos
- Priorize pessoas com maior relevância
- Considere palavras-chave na query para matching
- Máximo 10 oportunidades`;

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
          { role: 'user', content: query }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('🤖 AI Response:', aiResponse);

    // Tentar extrair JSON da resposta
    let result;
    try {
      // Procurar por JSON no texto
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: retornar estrutura vazia
      result = {
        opportunities: [],
        insights: 'Não foi possível processar a resposta da IA. Tente reformular sua busca.',
        totalFound: 0
      };
    }

    console.log('✅ Returning opportunities:', result.opportunities?.length || 0);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in find-opportunities:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        opportunities: [],
        insights: 'Erro ao buscar oportunidades. Tente novamente.',
        totalFound: 0
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
