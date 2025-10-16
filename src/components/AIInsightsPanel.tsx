import React, { useState } from 'react';
import { Sparkles, X, ChevronDown, ChevronUp, Loader2, AlertTriangle, Users, TrendingUp, Zap, Link2 } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { toast } from 'sonner';

interface AIInsightsPanelProps {
  nodes: any[];
  connections: any[];
  workflows: any[];
  onHighlightPath: (nodeIds: number[]) => void;
  onFocusNode: (nodeId: number) => void;
  onClose: () => void;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  nodes,
  connections,
  workflows,
  onHighlightPath,
  onFocusNode,
  onClose
}) => {
  const [insights, setInsights] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedHash, setLastAnalyzedHash] = useState('');

  const analyzeNetwork = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Gerar hash para cache
      const currentHash = JSON.stringify({
        nodeCount: nodes.length,
        connectionCount: connections.length,
        nodeIds: nodes.map(n => n.id).sort().join(',')
      });

      // Se já analisou e não mudou nada, não reanalisa
      if (currentHash === lastAnalyzedHash && insights) {
        toast.info('Análise já está atualizada');
        setIsAnalyzing(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-network`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ nodes, connections, workflows })
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      setInsights(data.insights);
      setLastAnalyzedHash(currentHash);
      toast.success('Análise concluída!');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao analisar rede';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Erro ao analisar rede:', err);
    } finally {
      setIsAnalyzing(false);
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getNodeName = (nodeId: number) => {
    return nodes.find(n => n.id === nodeId)?.name || `Nó ${nodeId}`;
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] bg-background border-l border-border shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-blue-500/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-bold">Insights com IA</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Botão de Análise */}
      <div className="p-4 border-b border-border">
        <Button 
          onClick={analyzeNetwork} 
          disabled={isAnalyzing}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Analisar Rede
            </>
          )}
        </Button>
      </div>

      {/* Conteúdo */}
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
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Clique em "Analisar Rede" para descobrir insights</p>
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
                            <Badge variant={getPriorityColor(conn.priority)} className="text-xs">
                              {conn.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{conn.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {conn.node_ids?.map((id: number) => (
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
                          <p className="text-xs text-primary font-medium">💡 {conn.action}</p>
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
                              onClick={() => onFocusNode(bridge.node_id)}
                            >
                              👤 {bridge.person_name}
                            </h4>
                            <Badge variant={getPriorityColor(bridge.priority)} className="text-xs">
                              {bridge.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Conecta: <strong>{bridge.connects_workflows.join(', ')}</strong>
                          </p>
                          <p className="text-xs">{bridge.importance}</p>
                          <p className="text-xs text-primary font-medium">🎯 {bridge.suggestion}</p>
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
                            <Badge variant={getPriorityColor(opp.priority)} className="text-xs">
                              {opp.priority}
                            </Badge>
                          </div>
                          <div 
                            className="flex items-center gap-1 text-xs cursor-pointer hover:text-green-500 flex-wrap"
                            onClick={() => onHighlightPath(opp.path)}
                          >
                            {opp.path?.map((id: number, i: number) => (
                              <React.Fragment key={id}>
                                <span className="font-medium">{getNodeName(id)}</span>
                                {i < opp.path.length - 1 && <span>→</span>}
                              </React.Fragment>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">{opp.potential}</p>
                          <p className="text-xs text-primary font-medium">📍 {opp.next_step}</p>
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
                            <Badge variant={getSeverityColor(alert.severity)} className="text-xs">
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{alert.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {alert.node_ids?.map((id: number) => (
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
                          <p className="text-xs text-primary font-medium">⚡ {alert.action}</p>
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
                                <Badge variant={getPriorityColor(action.priority)} className="text-xs">
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
    </div>
  );
};
