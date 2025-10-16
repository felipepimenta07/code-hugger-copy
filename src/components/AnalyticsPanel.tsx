import React from 'react';
import { X, TrendingUp, Users, Target, Building2 } from 'lucide-react';

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
    <div className="w-96 bg-card/95 backdrop-blur-xl border-l border-border p-6 overflow-y-auto h-full shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <TrendingUp size={20} className="text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Analytics</h3>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl text-muted-foreground">
          <X size={20} />
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Visão Geral</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[hsl(var(--node-person))]" />
                <span className="text-sm text-foreground">Total de Nós</span>
              </div>
              <span className="text-lg font-bold text-foreground">{nodes.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-primary" />
                <span className="text-sm text-foreground">Conexões</span>
              </div>
              <span className="text-lg font-bold text-foreground">{connections.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                <span className="text-sm text-foreground">Densidade</span>
              </div>
              <span className="text-lg font-bold text-foreground">{density}%</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Insights</h4>
          <div className="space-y-2">
            {isolated.length > 0 && (
              <div className="p-3 bg-secondary rounded-xl flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span className="text-sm text-foreground">{isolated.length} nó{isolated.length > 1 ? 's' : ''} sem conexões</span>
              </div>
            )}
            {activeProjects.length > 0 && (
              <div className="p-3 bg-secondary rounded-xl flex items-center gap-2">
                <span className="text-lg">✅</span>
                <span className="text-sm text-foreground">{activeProjects.length} projeto{activeProjects.length > 1 ? 's' : ''} ativo{activeProjects.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {topConnectors.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Top Conectores</h4>
            <div className="space-y-2">
              {topConnectors.map((item, idx) => (
                <div key={item.node.id} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    #{idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{item.node.name}</div>
                    <div className="text-xs text-muted-foreground">{item.connections} conexões</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
