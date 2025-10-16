import React from 'react';
import { X, TrendingUp, Users, Target, Building2, Star, Lightbulb, BarChart2 } from 'lucide-react';

interface AnalyticsPanelProps {
  nodes: any[];
  connections: any[];
  onClose: () => void;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ nodes, connections, onClose }) => {
  const isolated = nodes.filter(n => !connections.some(c => c.from === n.id || c.to === n.id));
  const activeProjects = nodes.filter(n => n.type === 'project' && n.projectStatus === 'ativo');
  const maxConnections = nodes.length * (nodes.length - 1) / 2;
  const density = maxConnections > 0 ? (connections.length / maxConnections * 100).toFixed(1) : 0;

  const connectionCounts = nodes.map(node => ({
    node,
    connections: connections.filter(c => c.from === node.id || c.to === node.id).length
  }));
  const topConnectors = connectionCounts.filter(item => item.connections > 0).sort((a, b) => b.connections - a.connections).slice(0, 5);

  return (
    <div className="w-[600px] bg-card/95 backdrop-blur-xl border-l border-border overflow-y-auto h-full shadow-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <BarChart2 size={20} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">Análises</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl text-muted-foreground transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Top Conectores */}
          {topConnectors.length > 0 && (
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-2xl p-6 border border-yellow-500/20">
              <div className="flex items-center gap-2 mb-4">
                <Star className="text-yellow-500" size={20} />
                <h4 className="text-lg font-bold text-foreground">Top Conectores</h4>
              </div>
              <div className="space-y-3">
                {topConnectors.map((item, idx) => {
                  const typeLabel = item.node.type === 'person' ? 'Profissional' : 
                                   item.node.type === 'project' ? 'Projeto' : 'Marca';
                  return (
                    <div key={item.node.id} className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {item.connections}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold text-foreground truncate">{item.node.name}</div>
                        <div className="text-sm text-muted-foreground">{typeLabel}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Insights */}
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="text-purple-500" size={20} />
              <h4 className="text-lg font-bold text-foreground">Insights</h4>
            </div>
            <div className="space-y-3">
              {activeProjects.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-card/50 rounded-xl border border-border/50">
                  <span className="text-2xl flex-shrink-0">🎯</span>
                  <div>
                    <div className="font-semibold text-foreground mb-1">1 projeto ativo</div>
                    <div className="text-sm text-muted-foreground">
                      Densidade da rede: {density}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Estatísticas */}
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl p-6 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="text-blue-500" size={20} />
              <h4 className="text-lg font-bold text-foreground">Estatísticas</h4>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total de nós:</span>
                <span className="text-3xl font-bold text-foreground">{nodes.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Conexões:</span>
                <span className="text-3xl font-bold text-foreground">{connections.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Densidade:</span>
                <span className="text-3xl font-bold text-foreground">{density}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};