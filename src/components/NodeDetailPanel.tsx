import React from 'react';
import { X, ExternalLink, Mail, Phone, Building2, Globe, Calendar, MapPin } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  'Pessoal': 'hsl(210, 100%, 56%)',
  'Profissional': 'hsl(158, 64%, 52%)',
  'Cliente': 'hsl(43, 96%, 56%)',
  'Fornecedor': 'hsl(27, 96%, 61%)',
  'Parceiro': 'hsl(258, 90%, 66%)',
  'Bebida': 'hsl(340, 80%, 55%)',
  'Entretenimento': 'hsl(280, 70%, 60%)',
  'Hotelaria': 'hsl(190, 80%, 50%)',
  'Varejo': 'hsl(30, 90%, 55%)',
  'Serviços': 'hsl(170, 60%, 50%)',
  'Tecnologia': 'hsl(210, 90%, 55%)',
  'Alimentação': 'hsl(15, 85%, 55%)',
  'P': 'hsl(120, 50%, 50%)',
  'M': 'hsl(45, 90%, 55%)',
  'G': 'hsl(0, 70%, 55%)',
};

function getCatColor(cat: string): string {
  return CATEGORY_COLORS[cat] || 'hsl(220, 10%, 55%)';
}

const typeLabels: Record<string, string> = {
  person: 'Pessoa',
  project: 'Projeto',
  brand: 'Marca',
};

interface NodeDetailPanelProps {
  node: any;
  connections: any[];
  allNodes: any[];
  onClose: () => void;
  onNavigateToNode: (nodeRef: string) => void;
  onEdit: (node: any) => void;
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  node,
  connections,
  allNodes,
  onClose,
  onNavigateToNode,
  onEdit,
}) => {
  const nodeRef = node.node_ref || `${node.type}:${node.id}`;

  // Find direct connections using from_ref/to_ref
  const directConnections = connections
    .filter(c => c.from_ref === nodeRef || c.to_ref === nodeRef)
    .map(c => {
      const otherRef = c.from_ref === nodeRef ? c.to_ref : c.from_ref;
      const otherNode = allNodes.find(n => n.node_ref === otherRef);
      return otherNode ? { node: otherNode, connectionType: c.connection_type || c.type || 'related', connId: c.id } : null;
    })
    .filter(Boolean) as Array<{ node: any; connectionType: string; connId: any }>;

  const catColor = getCatColor(node.category || '');

  return (
    <div className="fixed right-0 top-0 h-screen w-[380px] z-50 flex flex-col bg-[hsl(220,20%,6%)] border-l-[3px] animate-in slide-in-from-right-full duration-200"
      style={{ borderLeftColor: catColor }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono uppercase tracking-[0.15em] font-semibold"
              style={{ color: catColor }}>
              {typeLabels[node.type] || node.type}
              {node.category ? ` / ${node.category}` : ''}
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground leading-tight truncate">
            {node.name}
          </h2>
          {node.company && (
            <p className="text-base text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Building2 size={14} /> {node.company}
            </p>
          )}
        </div>
        <button onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors flex-shrink-0 mt-0.5">
          <X size={18} />
        </button>
      </div>

      {/* Info fields */}
      <div className="px-5 pb-3 space-y-2">
        {node.email && (
          <div className="flex items-center gap-2.5 text-base text-muted-foreground">
            <Mail size={14} className="flex-shrink-0" />
            <span className="truncate">{node.email}</span>
          </div>
        )}
        {node.phone && (
          <div className="flex items-center gap-2.5 text-base text-muted-foreground">
            <Phone size={14} className="flex-shrink-0" />
            <span>{node.phone}</span>
          </div>
        )}
        {node.website && (
          <div className="flex items-center gap-2.5 text-base text-muted-foreground">
            <Globe size={14} className="flex-shrink-0" />
            <span className="truncate">{node.website}</span>
          </div>
        )}
        {node.address && (
          <div className="flex items-center gap-2.5 text-base text-muted-foreground">
            <MapPin size={14} className="flex-shrink-0" />
            <span className="truncate">{node.address}</span>
          </div>
        )}
        {node.deadline && (
          <div className="flex items-center gap-2.5 text-base text-muted-foreground">
            <Calendar size={14} className="flex-shrink-0" />
            <span>{new Date(node.deadline).toLocaleDateString('pt-BR')}</span>
          </div>
        )}
        {node.notes && (
          <p className="text-base text-muted-foreground/70 mt-2 leading-relaxed line-clamp-3">
            {node.notes}
          </p>
        )}
      </div>

      {/* Edit button */}
      <div className="px-5 pb-3">
        <button onClick={() => onEdit(node)}
          className="w-full h-8 text-sm font-mono uppercase tracking-wider rounded border border-border/30 text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">
          Editar
        </button>
      </div>

      {/* Separator */}
      <div className="mx-5 border-t border-border/20" />

      {/* Direct Connections */}
      <div className="px-5 pt-3 pb-2">
        <span className="text-sm font-mono text-muted-foreground/50 uppercase tracking-[0.15em]">
          Conexões Diretas ({directConnections.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-px">
          {directConnections.map(({ node: otherNode, connectionType, connId }) => {
            const otherCatColor = getCatColor(otherNode.category || '');
            const key = otherNode.node_ref || `${otherNode.type}:${otherNode.id}`;
            return (
              <button
                key={`${key}-${connId}`}
                className="w-full flex items-start gap-2.5 px-2 py-2.5 rounded text-left hover:bg-secondary/30 transition-colors group"
                onClick={() => onNavigateToNode(otherNode.node_ref)}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
                  style={{ backgroundColor: otherCatColor }} />
                <div className="min-w-0 flex-1">
                  <span className="text-base text-foreground group-hover:text-foreground/90 block truncate">
                    {otherNode.name}
                  </span>
                  {connectionType && connectionType !== 'related' && (
                    <span className="text-sm text-muted-foreground/40 font-mono block mt-0.5">
                      {connectionType}
                    </span>
                  )}
                  {otherNode.company && (
                    <span className="text-sm text-muted-foreground/30 block">
                      {otherNode.company}
                    </span>
                  )}
                </div>
                <ExternalLink size={14} className="text-muted-foreground/20 group-hover:text-muted-foreground/50 mt-1 flex-shrink-0" />
              </button>
            );
          })}
          {directConnections.length === 0 && (
            <div className="px-2 py-6 text-sm text-muted-foreground/30 italic text-center">
              Nenhuma conexão direta
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
