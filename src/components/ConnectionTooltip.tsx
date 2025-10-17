import React from 'react';
import { Info } from 'lucide-react';

interface ConnectionTooltipProps {
  connection: any;
  fromNode: any;
  toNode: any;
  position: { x: number; y: number };
  connectionType?: 'strong' | 'weak';
}

export const ConnectionTooltip: React.FC<ConnectionTooltipProps> = ({
  connection,
  fromNode,
  toNode,
  position,
  connectionType = 'strong'
}) => {
  // Gerar mensagem descritiva baseada nos tipos de nós
  const getConnectionDescription = () => {
    const descriptions: string[] = [];
    
    // Pessoa ↔ Pessoa
    if (fromNode.type === 'person' && toNode.type === 'person') {
      descriptions.push(`${fromNode.name} conectado(a) a ${toNode.name}`);
      if (connectionType === 'weak') {
        descriptions.push('Conexão indireta ou através de terceiros');
      } else {
        descriptions.push('Conexão direta estabelecida');
      }
    }
    // Pessoa ↔ Marca
    else if ((fromNode.type === 'person' && toNode.type === 'brand') || (fromNode.type === 'brand' && toNode.type === 'person')) {
      const person = fromNode.type === 'person' ? fromNode : toNode;
      const brand = fromNode.type === 'brand' ? fromNode : toNode;
      descriptions.push(`${person.name} trabalha na ${brand.name}`);
      if (connectionType === 'weak') {
        descriptions.push('Relação profissional indireta');
      } else {
        descriptions.push('Relação profissional direta');
      }
    }
    // Marca ↔ Marca
    else if (fromNode.type === 'brand' && toNode.type === 'brand') {
      descriptions.push(`${fromNode.name} parceira de ${toNode.name}`);
      if (connectionType === 'weak') {
        descriptions.push('Parceria indireta ou através de terceiros');
      } else {
        descriptions.push('Parceria estabelecida');
      }
    }
    // Pessoa ↔ Projeto
    else if ((fromNode.type === 'person' && toNode.type === 'project') || (fromNode.type === 'project' && toNode.type === 'person')) {
      const person = fromNode.type === 'person' ? fromNode : toNode;
      const project = fromNode.type === 'project' ? fromNode : toNode;
      descriptions.push(`${person.name} participa do projeto ${project.name}`);
      if (connectionType === 'weak') {
        descriptions.push('Participação indireta ou consultoria');
      } else {
        descriptions.push('Participação ativa no projeto');
      }
    }
    // Marca ↔ Projeto
    else if ((fromNode.type === 'brand' && toNode.type === 'project') || (fromNode.type === 'project' && toNode.type === 'brand')) {
      const brand = fromNode.type === 'brand' ? fromNode : toNode;
      const project = fromNode.type === 'project' ? fromNode : toNode;
      descriptions.push(`${brand.name} vinculada ao projeto ${project.name}`);
      if (connectionType === 'weak') {
        descriptions.push('Apoio ou patrocínio indireto');
      } else {
        descriptions.push('Patrocinador ou parceiro principal');
      }
    }
    // Projeto ↔ Projeto
    else if (fromNode.type === 'project' && toNode.type === 'project') {
      descriptions.push(`Projetos ${fromNode.name} e ${toNode.name} relacionados`);
      if (connectionType === 'weak') {
        descriptions.push('Compartilham recursos ou pessoas');
      } else {
        descriptions.push('Projetos complementares ou dependentes');
      }
    }
    
    // Informação adicional se existir
    if (connection.notes) {
      descriptions.push(connection.notes);
    }
    
    return descriptions;
  };

  const descriptions = getConnectionDescription();
  
  return (
    <div 
      className="fixed z-[100] pointer-events-none animate-fade-in"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -120%)'
      }}
    >
      <div className="bg-black/90 backdrop-blur-md border border-purple-500/40 rounded-lg px-3 py-2 shadow-2xl max-w-xs">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
          <div className="flex flex-col gap-1">
            {descriptions.map((desc, idx) => (
              <p 
                key={idx} 
                className={`text-xs ${idx === 0 ? 'text-white font-medium' : 'text-gray-300'}`}
              >
                {desc}
              </p>
            ))}
          </div>
        </div>
        
        {/* Tipo de conexão */}
        <div className="mt-2 pt-2 border-t border-purple-500/20">
          <div className="flex items-center gap-2">
            <div 
              className={`w-2 h-2 rounded-full ${
                connectionType === 'strong' ? 'bg-purple-400' : 'bg-blue-400'
              }`}
            />
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">
              Conexão {connectionType === 'strong' ? 'Forte' : 'Fraca'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Seta apontando para a conexão */}
      <div 
        className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full"
        style={{
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid rgba(0, 0, 0, 0.9)',
        }}
      />
    </div>
  );
};
