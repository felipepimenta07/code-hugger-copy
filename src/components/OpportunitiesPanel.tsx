import React, { useState } from 'react';
import { X, Search, Sparkles, TrendingUp, Users, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { OpportunityGraph } from './OpportunityGraph';

interface Opportunity {
  type: string;
  id: number;
  name: string;
  relevanceScore: number;
  reason: string;
  connectionPath: string[];
  actionSuggestion: string;
  category?: string;
  company?: string;
}

interface OpportunitiesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  people: any[];
  brands: any[];
  projects: any[];
  connections: any[];
  onSelectNode?: (nodeId: string) => void;
}

export const OpportunitiesPanel: React.FC<OpportunitiesPanelProps> = ({
  isOpen,
  onClose,
  people,
  brands,
  projects,
  connections,
  onSelectNode
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<{
    opportunities: Opportunity[];
    insights: string;
    totalFound: number;
  } | null>(null);
  const [showGraph, setShowGraph] = useState(true);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Digite sua busca');
      return;
    }

    setIsSearching(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('find-opportunities', {
        body: {
          query: query.trim(),
          people,
          brands,
          projects,
          connections
        }
      });

      if (error) throw error;

      console.log('🎯 Opportunities found:', data);
      setResults(data);

      if (data.opportunities?.length === 0) {
        toast.info('Nenhuma oportunidade encontrada para esta busca');
      } else {
        toast.success(`${data.opportunities?.length || 0} oportunidades encontradas`);
      }

    } catch (error: any) {
      console.error('Error finding opportunities:', error);
      toast.error(error.message || 'Erro ao buscar oportunidades');
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'hsl(var(--connection-path))';
    if (score >= 60) return 'hsl(var(--connection-cross))';
    return 'hsl(var(--connection-weak))';
  };

  const getScoreMedal = (score: number) => {
    if (score >= 90) return '🥇';
    if (score >= 75) return '🥈';
    if (score >= 60) return '🥉';
    return '⭐';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed right-0 top-0 h-full w-full md:w-[800px] bg-card border-l border-border shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Buscar Oportunidades com IA</h2>
                <p className="text-sm text-muted-foreground">Encontre conexões estratégicas no seu network</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="px-6 py-4 border-b border-border bg-muted/20">
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Preciso de fornecedores de bebidas para um evento..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
                disabled={isSearching}
              />
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !query.trim()}
                className="px-6"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Results */}
          <ScrollArea className="flex-1 px-6">
            {!results ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
                <div className="p-6 bg-primary/10 rounded-full mb-4">
                  <TrendingUp className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Descubra Oportunidades Ocultas</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Digite sua necessidade ou objetivo e a IA vai analisar todo seu network para encontrar
                  as melhores conexões, diretas ou indiretas.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-4 text-left w-full max-w-md">
                  <Card className="p-4 bg-muted/50">
                    <Users className="h-6 w-6 text-primary mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Analisa {people.length} pessoas no seu network
                    </p>
                  </Card>
                  <Card className="p-4 bg-muted/50">
                    <Award className="h-6 w-6 text-accent mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Identifica conexões de até 3 graus
                    </p>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="py-6 space-y-6">
                {/* Insights Summary */}
                {results.insights && (
                  <Card className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold mb-1">Insights da IA</h4>
                        <p className="text-sm text-muted-foreground">{results.insights}</p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Graph View Toggle */}
                {results.opportunities.length > 0 && (
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {results.totalFound} Oportunidade{results.totalFound !== 1 ? 's' : ''} Encontrada{results.totalFound !== 1 ? 's' : ''}
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGraph(!showGraph)}
                    >
                      {showGraph ? 'Ver Lista' : 'Ver Grafo'}
                    </Button>
                  </div>
                )}

                {/* Graph Visualization */}
                {showGraph && results.opportunities.length > 0 && (
                  <OpportunityGraph
                    opportunities={results.opportunities}
                    onNodeClick={(id: any) => onSelectNode?.(String(id))}
                  />
                )}

                {/* Opportunities List */}
                {(!showGraph || results.opportunities.length === 0) && (
                  <div className="space-y-3">
                    {results.opportunities.map((opp, idx) => (
                      <Card 
                        key={`${opp.id}-${idx}`}
                        className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => onSelectNode?.(opp.id)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Medal/Score */}
                          <div className="text-3xl flex-shrink-0">{getScoreMedal(opp.relevanceScore)}</div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-semibold text-base">{opp.name}</h4>
                              <div 
                                className="px-2 py-1 rounded text-xs font-bold"
                                style={{ 
                                  backgroundColor: `${getScoreColor(opp.relevanceScore)}20`,
                                  color: getScoreColor(opp.relevanceScore)
                                }}
                              >
                                {opp.relevanceScore}%
                              </div>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {opp.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {opp.category}
                                </Badge>
                              )}
                              {opp.company && (
                                <Badge variant="outline" className="text-xs">
                                  {opp.company}
                                </Badge>
                              )}
                              <Badge className="text-xs bg-primary/20 text-primary">
                                {opp.connectionPath.length - 1} {opp.connectionPath.length === 2 ? 'grau' : 'graus'}
                              </Badge>
                            </div>

                            {/* Reason */}
                            <p className="text-sm text-muted-foreground mb-2">{opp.reason}</p>

                            {/* Connection Path */}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2 flex-wrap">
                              {opp.connectionPath.map((name, i) => (
                                <React.Fragment key={i}>
                                  <span className={i === 0 ? 'font-medium text-foreground' : ''}>{name}</span>
                                  {i < opp.connectionPath.length - 1 && <span>→</span>}
                                </React.Fragment>
                              ))}
                            </div>

                            {/* Action Suggestion */}
                            <div className="text-sm text-primary font-medium">
                              💡 {opp.actionSuggestion}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {results.opportunities.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Nenhuma oportunidade encontrada para esta busca.</p>
                    <p className="text-sm text-muted-foreground mt-2">Tente reformular sua pergunta ou adicionar mais detalhes.</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
