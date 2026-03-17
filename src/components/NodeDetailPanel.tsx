import React from 'react';
import { X, ExternalLink, Mail, Phone, Building2, Globe, Calendar, MapPin, Edit2, User, Briefcase, Tag, FileText, PhoneCall, AtSign, Cake } from 'lucide-react';

const SEED_COLORS: string[] = [
  'hsl(210, 100%, 56%)', 'hsl(158, 64%, 52%)', 'hsl(43, 96%, 56%)',
  'hsl(27, 96%, 61%)', 'hsl(258, 90%, 66%)', 'hsl(340, 80%, 55%)',
  'hsl(280, 70%, 60%)', 'hsl(190, 80%, 50%)', 'hsl(30, 90%, 55%)',
  'hsl(170, 60%, 50%)', 'hsl(210, 90%, 55%)', 'hsl(15, 85%, 55%)',
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getCatColor(cat: string): string {
  if (!cat) return 'hsl(220, 10%, 55%)';
  return SEED_COLORS[hashStr(cat) % SEED_COLORS.length];
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

  const directConnections = connections
    .filter(c => c.from_ref === nodeRef || c.to_ref === nodeRef)
    .map(c => {
      const otherRef = c.from_ref === nodeRef ? c.to_ref : c.from_ref;
      const otherNode = allNodes.find(n => n.node_ref === otherRef);
      return otherNode ? { node: otherNode, connectionType: c.connection_type || c.type || 'related', connId: c.id } : null;
    })
    .filter(Boolean) as Array<{ node: any; connectionType: string; connId: any }>;

  const catColor = getCatColor(node.category || '');

  // Build detail fields dynamically
  const detailFields: Array<{ icon: React.ReactNode; label: string; value: string }> = [];
  
  if (node.company) detailFields.push({ icon: <Building2 size={13} />, label: 'Empresa', value: node.company });
  if (node.email) detailFields.push({ icon: <Mail size={13} />, label: 'Email', value: node.email });
  if (node.email_secondary) detailFields.push({ icon: <AtSign size={13} />, label: 'Email 2', value: node.email_secondary });
  if (node.phone) detailFields.push({ icon: <Phone size={13} />, label: 'Telefone', value: node.phone });
  if (node.phone_secondary) detailFields.push({ icon: <Phone size={13} />, label: 'Telefone 2', value: node.phone_secondary });
  if (node.phone_work) detailFields.push({ icon: <PhoneCall size={13} />, label: 'Tel. Trabalho', value: node.phone_work });
  if (node.website) detailFields.push({ icon: <Globe size={13} />, label: 'Website', value: node.website });
  if (node.address) detailFields.push({ icon: <MapPin size={13} />, label: 'Endereço', value: node.address });
  if (node.department) detailFields.push({ icon: <Briefcase size={13} />, label: 'Departamento', value: node.department });
  if (node.status) detailFields.push({ icon: <Tag size={13} />, label: 'Status', value: node.status });
  if (node.deadline) detailFields.push({ icon: <Calendar size={13} />, label: 'Prazo', value: new Date(node.deadline).toLocaleDateString('pt-BR') });
  if (node.birthday) detailFields.push({ icon: <Cake size={13} />, label: 'Aniversário', value: new Date(node.birthday).toLocaleDateString('pt-BR') });
  if (node.category) detailFields.push({ icon: <Tag size={13} />, label: 'Categoria', value: node.category });

  return (
    <div className="fixed right-0 top-0 h-screen w-[340px] z-50 flex flex-col bg-[hsl(220,20%,6%)]/95 backdrop-blur-xl border-l border-border/20 animate-in slide-in-from-right-full duration-200">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between border-b border-border/15">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] font-semibold"
            style={{ color: catColor }}>
            {typeLabels[node.type] || node.type}
          </span>
          <h2 className="text-lg font-bold text-foreground leading-tight truncate mt-0.5">
            {node.name}
          </h2>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onEdit(node)}
            className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-secondary/40 transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-secondary/40 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Direct Connections */}
      <div className="px-4 pt-3 pb-1.5">
        <span className="text-[11px] font-mono text-muted-foreground/40 uppercase tracking-[0.2em]">
          Conexões ({directConnections.length})
        </span>
      </div>

      <div className="overflow-y-auto px-2 pb-2 max-h-[40vh] border-b border-border/15">
        <div className="space-y-px">
          {directConnections.map(({ node: otherNode, connectionType, connId }) => {
            const otherCatColor = getCatColor(otherNode.category || '');
            const key = otherNode.node_ref || `${otherNode.type}:${otherNode.id}`;
            return (
              <button
                key={`${key}-${connId}`}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left hover:bg-secondary/30 transition-colors group"
                onClick={() => onNavigateToNode(otherNode.node_ref)}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: otherCatColor, boxShadow: `0 0 6px ${otherCatColor}40` }} />
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-foreground group-hover:text-foreground/90 block truncate">
                    {otherNode.name}
                  </span>
                  {connectionType && connectionType !== 'related' && (
                    <span className="text-[11px] text-muted-foreground/30 font-mono">
                      {connectionType}
                    </span>
                  )}
                </div>
                <ExternalLink size={12} className="text-muted-foreground/15 group-hover:text-muted-foreground/40 flex-shrink-0" />
              </button>
            );
          })}
          {directConnections.length === 0 && (
            <div className="px-2 py-4 text-xs text-muted-foreground/25 italic text-center">
              Nenhuma conexão direta
            </div>
          )}
        </div>
      </div>

      {/* Detail fields */}
      <div className="px-4 pt-3 pb-1.5">
        <span className="text-[11px] font-mono text-muted-foreground/40 uppercase tracking-[0.2em]">
          Detalhes
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-2.5 mt-1">
          {detailFields.map((field, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <span className="flex-shrink-0 text-muted-foreground/40">{field.icon}</span>
              <span className="truncate">{field.value}</span>
            </div>
          ))}
          
          {node.notes && (
            <div className="mt-3 pt-3 border-t border-border/10">
              <div className="flex items-center gap-2 mb-1.5">
                <FileText size={13} className="text-muted-foreground/40" />
                <span className="text-[11px] font-mono text-muted-foreground/40 uppercase tracking-wider">Notas</span>
              </div>
              <p className="text-sm text-muted-foreground/60 leading-relaxed">
                {node.notes}
              </p>
            </div>
          )}
          
          {detailFields.length === 0 && !node.notes && (
            <div className="text-xs text-muted-foreground/25 italic text-center py-3">
              Sem detalhes adicionais
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
