import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  console.log("analyze-linkedin: received request", req.method);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { contacts, companies } = await req.json();
    console.log("analyze-linkedin: contacts=", contacts?.length, "companies=", companies?.length);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build a compact summary for AI analysis
    const companyPeople: Record<string, string[]> = {};
    for (const c of contacts) {
      const company = c.company?.trim() || "Sem empresa";
      if (!companyPeople[company]) companyPeople[company] = [];
      companyPeople[company].push(`${c.firstName || c.name || ''} ${c.lastName || ''} (${c.position || 'N/A'})`);
    }

    const companySummary = Object.entries(companyPeople)
      .map(([company, people]) => `${company}: ${people.length} pessoas - ${people.slice(0, 3).join(', ')}${people.length > 3 ? '...' : ''}`)
      .join('\n');

    const prompt = `Analise esta lista de empresas e contatos do LinkedIn e retorne dados estruturados.

Empresas e seus funcionários:
${companySummary}

Use a tool suggest_enrichment para retornar:
1. Para cada empresa, classifique o setor (Tecnologia, Bebidas, Hotelaria, Varejo, Serviços, Alimentação, Entretenimento, Financeiro, Saúde, Educação, Indústria, Outro)
2. Para cada empresa, infira o país/região provável baseado no nome da empresa e posições
3. Detecte possíveis conexões fracas: pessoas em empresas de setores similares que poderiam se beneficiar de uma apresentação`;

    console.log("analyze-linkedin: calling AI gateway...");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um analista de networking profissional. Analise contatos do LinkedIn e enriqueça com setores, países e conexões fracas." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_enrichment",
              description: "Return enriched data about companies, sectors, countries, and weak connections",
              parameters: {
                type: "object",
                properties: {
                  companySectors: {
                    type: "object",
                    description: "Map of company name to sector classification",
                    additionalProperties: { type: "string" }
                  },
                  companyCountries: {
                    type: "object",
                    description: "Map of company name to inferred country/region",
                    additionalProperties: { type: "string" }
                  },
                  weakConnections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        person1: { type: "string" },
                        person2: { type: "string" },
                        reason: { type: "string" }
                      },
                      required: ["person1", "person2", "reason"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["companySectors", "companyCountries", "weakConnections"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_enrichment" } },
      }),
    });

    console.log("analyze-linkedin: AI gateway status=", response.status);

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para análise IA." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI analysis failed: " + t);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("analyze-linkedin: no tool call in response", JSON.stringify(aiResult).slice(0, 500));
      throw new Error("No structured response from AI");
    }

    const enrichment = JSON.parse(toolCall.function.arguments);
    console.log("analyze-linkedin: enrichment parsed successfully");

    // Enrich contacts with sector/country from their company
    const enrichedContacts = contacts.map((c: any) => ({
      ...c,
      sector: c.company ? enrichment.companySectors[c.company] || undefined : undefined,
      country: c.company ? enrichment.companyCountries[c.company] || undefined : undefined,
    }));

    return new Response(JSON.stringify({
      contacts: enrichedContacts,
      companySectors: enrichment.companySectors || {},
      companyCountries: enrichment.companyCountries || {},
      weakConnections: enrichment.weakConnections || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-linkedin error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
