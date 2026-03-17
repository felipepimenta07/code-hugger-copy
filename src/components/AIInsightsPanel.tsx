import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, X, Loader2, AlertTriangle, Users, TrendingUp, Zap, Link2, MessageSquare, Send, RefreshCw, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AIInsightsPanelProps {
  nodes: any[];
  connections: any[];
  workflows: any[];
  flows?: any[];
  people?: any[];
  brands?: any[];
  projects?: any[];
  onHighlightPath: (nodeIds: string[]) => void;
  onFocusNode: (nodeId: string) => void;
  onClose: () => void;
  onOpenConnectionModal?: (connection: any, involvedNodes: any[], type: 'hidden' | 'bridge' | 'opportunity' | 'alert' | 'action') => void;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  nodes,
  connections,
  workflows,
  flows = [],
  people = [],
  brands = [],
  projects = [],
  onHighlightPath,
  onFocusNode,
  onClose,
  onOpenConnectionModal,
}) => {
  const [insights, setInsights] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedHash, setLastAnalyzedHash] = useState('');

  // Chat mode
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'insights' | 'chat'>('insights');

  const allNodes = nodes.length > 0 ? nodes : [...people, ...brands, ...projects];

  const analyzeNetwork = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const currentHash = JSON.stringify({
        nodeCount: allNodes.length,
        connectionCount: connections.length,
        nodeIds: allNodes.map(n => n.id).sort().join(',')
      });

      if (currentHash === lastAnalyzedHash && insights) {
        toast.info('Análise já está atualizada');
        setIsAnalyzing(false);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('analyze-network', {
        body: {
          nodes: allNodes,
          connections,
          workflows,
          flows,
          people,
          brands,
          projects,
        }
      });

      if (fnError) throw fnError;
      if (data?.error) {
        if (data.status === 429) toast.error('Limite de requisições atingido. Tente em instantes.');
        else if (data.status === 402) toast.error('Créditos insuficientes na IA. Verifique seu plano.');
        else throw new Error(data.error);
        return;
      }

      setInsights(data.insights);
      setLastAnalyzedHash(currentHash);
      toast.success('Análise concluída!');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao analisar rede';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || isChatLoading) return;

    const networkContext = `
Contexto da rede atual:
- ${people.length} pessoas, ${brands.length} marcas, ${projects.length} projetos
- ${flows.length} flows, ${connections.length} conexões
- Pessoas: ${people.slice(0, 10).map(p => `${p.name}${p.company ? ` (${p.company})` : ''}`).join(', ')}${people.length > 10 ? '...' : ''}
- Projetos: ${projects.slice(0, 5).map(p => p.name).join(', ')}
- Marcas: ${brands.slice(0, 5).map(b => b.name).join(', ')}
    `.trim();

    const userMsg = { role: 'user' as const, content: text };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const systemMsg = {
        role: 'system' as const,
        content: `Você é um assistente de análise de rede estratégica. Ajude o usuário a entender e cruzar dados da sua rede de relacionamentos.

REGRAS DE FORMATAÇÃO (obrigatórias):
- Sempre responda usando Markdown estruturado
- Use headers (## ou ###) para separar seções
- Use listas (- ou 1.) para enumerar itens
- Use **negrito** para destacar nomes e conceitos-chave
- Use emojis (🔗 🧠 🎯 ⚡ 👥 📊) para categorizar visualmente
- Use tabelas markdown quando comparar dados
- NUNCA responda em texto corrido longo — sempre quebre em seções visuais
- Seja direto e conciso

${networkContext}`
      };

      const { data, error: fnError } = await supabase.functions.invoke('analyze-network', {
        body: {
          chatMode: true,
          messages: [systemMsg, ...chatMessages, userMsg],
        }
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const assistantContent = data.reply || 'Sem resposta.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (err) {
      toast.error('Erro no chat com IA');
      console.error(err);
    } finally {
      setIsChatLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getNodeName = (nodeId: string) => {
    return allNodes.find(n => n.node_ref === nodeId)?.name || `Nó ${nodeId}`;
  };

  const getNodesByIds = (ids: any[]) => {
    if (!ids || ids.length === 0) return [];
    return ids.map(id => allNodes.find(n => n.id === id || n.node_ref === String(id))).filter(Boolean);
  };

  const openModal = (connection: any, ids: any[], type: 'hidden' | 'bridge' | 'opportunity' | 'alert' | 'action') => {
    if (onOpenConnectionModal) {
      onOpenConnectionModal(connection, getNodesByIds(ids), type);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] bg-background border-l border-border shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-blue-500/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-bold">IA — Cruzar Dados</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('insights')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === 'insights' ? 'border-b-2 border-purple-500 text-purple-500' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Sparkles className="inline h-3.5 w-3.5 mr-1" />
          Insights
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === 'chat' ? 'border-b-2 border-purple-500 text-purple-500' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <MessageSquare className="inline h-3.5 w-3.5 mr-1" />
          Chat
        </button>
      </div>

      {activeTab === 'insights' && (
        <>
          {/* Botão de Análise */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <span>{allNodes.length} nós</span>
              <span>·</span>
              <span>{connections.length} conexões</span>
              <span>·</span>
              <span>{flows.length} flows</span>
            </div>
            <Button
              onClick={analyzeNetwork}
              disabled={isAnalyzing || allNodes.length === 0}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analisando rede...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {insights ? <><RefreshCw className="mr-1 h-3 w-3" />Reanalisar</> : 'Analisar Rede Completa'}
                </>
              )}
            </Button>
            {allNodes.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Adicione pessoas, projetos ou marcas para analisar
              </p>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-sm font-medium">Erro</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{error}</p>
                </div>
              )}

              {!insights && !error && (
                <div className="text-center text-muted-foreground py-12">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm font-medium mb-1">Pronto para cruzar dados</p>
                  <p className="text-xs opacity-70">A IA vai analisar toda a sua rede e identificar conexões ocultas, pontes estratégicas e oportunidades</p>
                </div>
              )}

              {insights && (
                <Accordion type="multiple" defaultValue={["connections", "bridges", "opportunities", "alerts", "actions"]} className="space-y-2">
                  {/* Conexões Ocultas */}
                  <AccordionItem value="connections" className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold">Conexões Ocultas</span>
                        <Badge variant="secondary">{insights.hidden_connections?.length || 0}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {insights.hidden_connections?.length > 0 ? (
                        <div className="space-y-3">
                          {insights.hidden_connections.map((conn: any, idx: number) => (
                            <div key={idx} className="bg-secondary/50 rounded-lg p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <h4 className="font-medium text-sm">{conn.title}</h4>
                                <Badge variant={getPriorityColor(conn.priority) as any} className="text-xs">
                                  {conn.priority}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{conn.description}</p>
                              <div className="flex flex-wrap gap-1">
                                {conn.node_ids?.map((id: any) => (
                                  <Badge
                                    key={String(id)}
                                    variant="outline"
                                    className="text-xs cursor-pointer hover:bg-accent"
                                    onClick={() => onFocusNode(String(id))}
                                  >
                                    {getNodeName(String(id))}
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <p className="text-xs text-primary font-medium">💡 {conn.action}</p>
                                {onOpenConnectionModal && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs px-2 gap-1 shrink-0"
                                    onClick={() => openModal(conn, conn.node_ids || [], 'hidden')}
                                  >
                                    Ver Conexão <ChevronRight className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Nenhuma conexão oculta detectada</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Pontes Estratégicas */}
                  <AccordionItem value="bridges" className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-500" />
                        <span className="font-semibold">Pontes Estratégicas</span>
                        <Badge variant="secondary">{insights.strategic_bridges?.length || 0}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {insights.strategic_bridges?.length > 0 ? (
                        <div className="space-y-3">
                          {insights.strategic_bridges.map((bridge: any, idx: number) => (
                            <div key={idx} className="bg-purple-500/10 rounded-lg p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <h4
                                  className="font-medium text-sm cursor-pointer hover:text-purple-500"
                                  onClick={() => bridge.node_id && onFocusNode(bridge.node_id)}
                                >
                                  👤 {bridge.person_name}
                                </h4>
                                <Badge variant={getPriorityColor(bridge.priority) as any} className="text-xs">
                                  {bridge.priority}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Conecta: <strong>{bridge.connects_workflows?.join(', ')}</strong>
                              </p>
                              <p className="text-xs">{bridge.importance}</p>
                              <div className="flex items-center justify-between pt-1">
                                <p className="text-xs text-primary font-medium">🎯 {bridge.suggestion}</p>
                                {onOpenConnectionModal && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs px-2 gap-1 shrink-0"
                                    onClick={() => openModal(bridge, bridge.node_id ? [bridge.node_id] : [], 'bridge')}
                                  >
                                    Ver Detalhe <ChevronRight className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Nenhuma ponte estratégica detectada</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Oportunidades */}
                  <AccordionItem value="opportunities" className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="font-semibold">Oportunidades</span>
                        <Badge variant="secondary">{insights.opportunities?.length || 0}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {insights.opportunities?.length > 0 ? (
                        <div className="space-y-3">
                          {insights.opportunities.map((opp: any, idx: number) => (
                            <div key={idx} className="bg-green-500/10 rounded-lg p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <h4 className="font-medium text-sm">{opp.title}</h4>
                                <Badge variant={getPriorityColor(opp.priority) as any} className="text-xs">
                                  {opp.priority}
                                </Badge>
                              </div>
                              <div
                                className="flex items-center gap-1 text-xs cursor-pointer hover:text-green-500 flex-wrap"
                                onClick={() => onHighlightPath((opp.path || []).map(String))}
                              >
                                {opp.path?.map((id: any, i: number) => (
                                  <React.Fragment key={String(id)}>
                                    <span className="font-medium">{getNodeName(String(id))}</span>
                                    {i < opp.path.length - 1 && <span>→</span>}
                                  </React.Fragment>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground">{opp.potential}</p>
                              <div className="flex items-center justify-between pt-1">
                                <p className="text-xs text-primary font-medium">📍 {opp.next_step}</p>
                                {onOpenConnectionModal && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs px-2 gap-1 shrink-0"
                                    onClick={() => openModal(opp, opp.path || [], 'opportunity')}
                                  >
                                    Ver Detalhe <ChevronRight className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Nenhuma oportunidade identificada</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Alertas */}
                  <AccordionItem value="alerts" className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <span className="font-semibold">Alertas</span>
                        <Badge variant="secondary">{insights.alerts?.length || 0}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {insights.alerts?.length > 0 ? (
                        <div className="space-y-3">
                          {insights.alerts.map((alert: any, idx: number) => (
                            <div key={idx} className="bg-orange-500/10 rounded-lg p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <h4 className="font-medium text-sm">{alert.title}</h4>
                                <Badge variant={getPriorityColor(alert.severity) as any} className="text-xs">
                                  {alert.severity}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{alert.description}</p>
                              <div className="flex flex-wrap gap-1">
                                {alert.node_ids?.map((id: any) => (
                                  <Badge
                                    key={String(id)}
                                    variant="outline"
                                    className="text-xs cursor-pointer hover:bg-accent"
                                    onClick={() => onFocusNode(String(id))}
                                  >
                                    {getNodeName(String(id))}
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <p className="text-xs text-primary font-medium">⚡ {alert.action}</p>
                                {onOpenConnectionModal && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs px-2 gap-1 shrink-0"
                                    onClick={() => openModal(alert, alert.node_ids || [], 'alert')}
                                  >
                                    Ver Detalhe <ChevronRight className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Nenhum alerta detectado</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Top 5 Ações */}
                  <AccordionItem value="actions" className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span className="font-semibold">Top Ações</span>
                        <Badge variant="secondary">{insights.top_actions?.length || 0}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {insights.top_actions?.length > 0 ? (
                        <div className="space-y-3">
                          {insights.top_actions.map((action: any, idx: number) => (
                            <div key={idx} className="bg-yellow-500/10 rounded-lg p-3 space-y-2">
                              <div className="flex items-start gap-2">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500 text-black flex items-center justify-center text-xs font-bold">
                                  {idx + 1}
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-start justify-between">
                                    <p className="font-medium text-sm">{action.action}</p>
                                    <Badge variant={getPriorityColor(action.priority) as any} className="text-xs">
                                      {action.priority}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{action.reason}</p>
                                  {action.related_node_ids?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {action.related_node_ids.map((id: number) => (
                                        <Badge
                                          key={id}
                                          variant="outline"
                                          className="text-xs cursor-pointer hover:bg-accent"
                                          onClick={() => onFocusNode(id)}
                                        >
                                          {getNodeName(id)}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Nenhuma ação prioritária</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          </ScrollArea>
        </>
      )}

      {activeTab === 'chat' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium mb-1">Pergunte sobre sua rede</p>
                  <div className="text-xs opacity-70 space-y-1 mt-3">
                    <p className="cursor-pointer hover:text-foreground" onClick={() => setChatInput('Quem são as pessoas mais conectadas?')}>
                      → Quem são as pessoas mais conectadas?
                    </p>
                    <p className="cursor-pointer hover:text-foreground" onClick={() => setChatInput('Existe alguém que conecta múltiplos projetos?')}>
                      → Existe alguém que conecta múltiplos projetos?
                    </p>
                    <p className="cursor-pointer hover:text-foreground" onClick={() => setChatInput('Qual o caminho entre pessoa X e projeto Y?')}>
                      → Qual o caminho entre pessoa X e projeto Y?
                    </p>
                  </div>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-invert max-w-none [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_p]:my-1 [&_table]:text-xs [&_th]:px-2 [&_td]:px-2 [&_strong]:text-foreground">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t border-border flex gap-2">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendChatMessage();
                }
              }}
              placeholder="Pergunte sobre sua rede..."
              className="resize-none min-h-[60px] text-sm"
              rows={2}
            />
            <Button
              onClick={sendChatMessage}
              disabled={!chatInput.trim() || isChatLoading}
              size="icon"
              className="self-end bg-purple-500 hover:bg-purple-600 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
