// Dados de exemplo para demonstração do sistema

export const SAMPLE_WORKFLOWS = [
  { id: 1, name: 'Comunidade Tech', color: '#EC4899', description: 'Rede de desenvolvedores e entusiastas' },
  { id: 2, name: 'Eventos Corporativos', color: '#10B981', description: 'Projetos e parcerias de eventos' },
  { id: 3, name: 'Parcerias Estratégicas', color: '#8B5CF6', description: 'Alianças e colaborações' },
  { id: 4, name: 'Família e Amigos', color: '#F59E0B', description: 'Círculo pessoal' },
  { id: 5, name: 'Investimentos', color: '#3B82F6', description: 'Portfolio e negócios' }
];

export const SAMPLE_PROJECTS = [
  // Workflow 1: Comunidade Tech (centerX: 500, radius: 280)
  { id: 1, name: 'Hackathon 2025', type: 'project', workflows: [1], category: 'G', status: 'ativo', deadline: '2025-12-15', x: 500, y: 120 },
  { id: 2, name: 'Meetup Mensal', type: 'project', workflows: [1], category: 'P', status: 'ativo', x: 780, y: 400 },
  { id: 3, name: 'Mentoria Tech', type: 'project', workflows: [1, 3], category: 'M', status: 'ativo', x: 500, y: 680 },
  { id: 15, name: 'Podcast Semanal', type: 'project', workflows: [1, 3], category: 'P', status: 'ativo', x: 220, y: 400 },
  
  // Workflow 2: Eventos Corporativos (centerX: 1400, radius: 280)
  { id: 4, name: 'Campari Art Week', type: 'project', workflows: [2], category: 'G', status: 'ativo', deadline: '2025-11-20', x: 1400, y: 120 },
  { id: 5, name: 'Lançamento Shopping', type: 'project', workflows: [2, 3], category: 'G', status: 'ativo', deadline: '2025-10-30', x: 1680, y: 400 },
  { id: 6, name: 'Festa Premium', type: 'project', workflows: [2], category: 'M', status: 'ativo', x: 1400, y: 680 },
  
  // Workflow 3: Parcerias (centerX: 2300, radius: 280)
  { id: 7, name: 'Acordo Tech Corp', type: 'project', workflows: [3], category: 'M', status: 'ativo', x: 2300, y: 120 },
  { id: 8, name: 'Joint Venture X', type: 'project', workflows: [3, 5], category: 'G', status: 'pausado', x: 2580, y: 400 },
  
  // Workflow 4: Família (centerX: 3200, radius: 280)
  { id: 9, name: 'Reunião Familiar', type: 'project', workflows: [4], category: 'P', status: 'ativo', deadline: '2025-12-25', x: 3200, y: 120 },
  { id: 10, name: 'Viagem Fim de Ano', type: 'project', workflows: [4], category: 'M', status: 'ativo', x: 3480, y: 400 },
  
  // Workflow 5: Investimentos (centerX: 4100, radius: 280)
  { id: 11, name: 'Startup Alpha', type: 'project', workflows: [5], category: 'G', status: 'ativo', x: 4100, y: 120 },
  { id: 12, name: 'Fundo Imobiliário', type: 'project', workflows: [5], category: 'M', status: 'ativo', x: 4380, y: 300 },
  { id: 13, name: 'Ações Tech', type: 'project', workflows: [5], category: 'P', status: 'ativo', x: 4200, y: 550 },
  
  // Multi-workflow
  { id: 14, name: 'Conferência Anual', type: 'project', workflows: [1, 2, 3], category: 'G', status: 'ativo', deadline: '2025-09-15', x: 750, y: 250 }
];

export const SAMPLE_PEOPLE = [
  // Workflow 1: Tech (centerX: 500, radius: 280)
  { id: 101, name: 'Felipe Martins', type: 'person', company: 'Agência X', workflows: [1, 2], category: 'Profissional', email: 'felipe@agenciax.com', x: 220, y: 250 },
  { id: 102, name: 'Ana Silva', type: 'person', company: 'Agência X', workflows: [1, 3], category: 'Profissional', email: 'ana@agenciax.com', x: 360, y: 580 },
  { id: 103, name: 'João Tech', type: 'person', company: 'Tech Corp', workflows: [1, 3, 5], category: 'Profissional', x: 640, y: 580 },
  { id: 104, name: 'Maria Dev', type: 'person', company: 'Startup Y', workflows: [1], category: 'Profissional', x: 780, y: 250 },
  { id: 105, name: 'Carlos Code', type: 'person', company: 'Tech Corp', workflows: [1, 3], category: 'Profissional', x: 640, y: 220 },
  { id: 116, name: 'Luiza Design', type: 'person', company: 'Agência X', workflows: [1, 2], category: 'Profissional', x: 360, y: 220 },
  { id: 117, name: 'Rafael Backend', type: 'person', company: 'Tech Corp', workflows: [1], category: 'Profissional', x: 500, y: 620 },
  { id: 118, name: 'Sofia UX', type: 'person', company: 'Startup Y', workflows: [1, 5], category: 'Profissional', x: 220, y: 550 },
  
  // Workflow 2: Eventos (centerX: 1400, radius: 280)
  { id: 106, name: 'Paula Eventos', type: 'person', company: 'EventCo', workflows: [2], category: 'Profissional', x: 1120, y: 250 },
  { id: 107, name: 'Ricardo PR', type: 'person', company: 'Campari', workflows: [2, 3], category: 'Cliente', x: 1260, y: 580 },
  { id: 108, name: 'Juliana Marketing', type: 'person', company: 'Shopping X', workflows: [2], category: 'Cliente', x: 1540, y: 580 },
  
  // Workflow 3: Parcerias (centerX: 2300, radius: 280)
  { id: 109, name: 'Fernando CEO', type: 'person', company: 'Tech Corp', workflows: [3, 5], category: 'Parceiro', x: 2020, y: 250 },
  { id: 110, name: 'Beatriz CFO', type: 'person', company: 'Invest Plus', workflows: [3, 5], category: 'Parceiro', x: 2160, y: 580 },
  
  // Workflow 4: Família (centerX: 3200, radius: 280)
  { id: 111, name: 'Maria (Mãe)', type: 'person', workflows: [4], category: 'Pessoal', x: 2920, y: 250 },
  { id: 112, name: 'Pedro (Irmão)', type: 'person', company: 'Tech Corp', workflows: [4, 1], category: 'Pessoal', x: 3060, y: 580 },
  { id: 113, name: 'João Primo', type: 'person', company: 'Startup Y', workflows: [4, 5], category: 'Pessoal', x: 3340, y: 580 },
  
  // Workflow 5: Investimentos (centerX: 4100, radius: 280)
  { id: 114, name: 'Roberto Investidor', type: 'person', company: 'XP Investimentos', workflows: [5], category: 'Parceiro', x: 3820, y: 250 },
  { id: 115, name: 'Sócio Alpha', type: 'person', company: 'Startup Alpha', workflows: [5, 1], category: 'Parceiro', x: 3960, y: 580 }
];

export const SAMPLE_BRANDS = [
  // Workflow 1: Tech (centerX: 500, radius: 280)
  { id: 204, name: 'Tech Corp', type: 'brand', category: 'Tecnologia', workflows: [1, 3, 5], website: 'techcorp.com', x: 780, y: 550 },
  { id: 206, name: 'Startup Y', type: 'brand', category: 'Tecnologia', workflows: [1, 5], website: 'startupy.com', x: 220, y: 150 },
  { id: 208, name: 'Agência X', type: 'brand', category: 'Serviços', workflows: [1, 2], website: 'agenciax.com', x: 780, y: 150 },
  
  // Workflow 2: Eventos (centerX: 1400, radius: 280)
  { id: 201, name: 'Campari', type: 'brand', category: 'Bebida', workflows: [2], website: 'campari.com', x: 1680, y: 150 },
  { id: 202, name: 'Shopping X', type: 'brand', category: 'Varejo', workflows: [2, 3], website: 'shoppingx.com', x: 1120, y: 550 },
  { id: 203, name: 'Marriott Hotel', type: 'brand', category: 'Hotelaria', workflows: [2], website: 'marriott.com', x: 1680, y: 550 },
  { id: 205, name: 'EventCo', type: 'brand', category: 'Serviços', workflows: [2], website: 'eventco.com', x: 1120, y: 150 },
  
  // Workflow 3: Parcerias (centerX: 2300, radius: 280)
  { id: 210, name: 'Invest Plus', type: 'brand', category: 'Serviços', workflows: [3, 5], website: 'investplus.com', x: 2580, y: 150 },
  
  // Workflow 5: Investimentos (centerX: 4100, radius: 280)
  { id: 207, name: 'XP Investimentos', type: 'brand', category: 'Serviços', workflows: [5], website: 'xpi.com.br', x: 4240, y: 580 },
  { id: 209, name: 'Startup Alpha', type: 'brand', category: 'Tecnologia', workflows: [5], website: 'startupalpha.com', x: 4240, y: 220 }
];

export const SAMPLE_CONNECTIONS = [
  // Conexões do Hackathon 2025
  { from: 101, to: 1, type: 'strong' }, // Felipe → Hackathon
  { from: 102, to: 1, type: 'strong' }, // Ana → Hackathon (mas Felipe e Ana NÃO conectados - insight!)
  { from: 104, to: 1, type: 'weak' },   // Maria → Hackathon
  { from: 116, to: 1, type: 'strong' }, // Luiza → Hackathon
  
  // Meetup Mensal
  { from: 103, to: 2, type: 'strong' }, // João → Meetup
  { from: 105, to: 2, type: 'weak' },   // Carlos → Meetup
  
  // Mentoria Tech (multi-workflow)
  { from: 103, to: 3, type: 'strong' }, // João → Mentoria
  { from: 102, to: 3, type: 'strong' }, // Ana → Mentoria
  
  // Campari Art Week
  { from: 101, to: 4, type: 'strong' }, // Felipe → Campari Art (ponte!)
  { from: 107, to: 4, type: 'strong' }, // Ricardo → Campari Art
  { from: 106, to: 4, type: 'weak' },   // Paula → Campari Art
  { from: 201, to: 4, type: 'strong' }, // Marca Campari → Projeto
  
  // Lançamento Shopping
  { from: 101, to: 5, type: 'strong' }, // Felipe → Shopping (ponte de novo!)
  { from: 108, to: 5, type: 'strong' }, // Juliana → Shopping
  { from: 202, to: 5, type: 'strong' }, // Shopping X → Projeto
  
  // Festa Premium
  { from: 106, to: 6, type: 'strong' }, // Paula → Festa
  { from: 205, to: 6, type: 'weak' },   // EventCo → Festa
  
  // Acordo Tech Corp
  { from: 109, to: 7, type: 'strong' }, // Fernando → Acordo
  { from: 103, to: 7, type: 'weak' },   // João → Acordo (João conhece Fernando!)
  { from: 204, to: 7, type: 'strong' }, // Tech Corp → Acordo
  
  // Joint Venture
  { from: 109, to: 8, type: 'strong' }, // Fernando → Joint
  { from: 110, to: 8, type: 'strong' }, // Beatriz → Joint
  
  // Família
  { from: 111, to: 9, type: 'strong' }, // Mãe → Reunião
  { from: 112, to: 9, type: 'strong' }, // Irmão → Reunião
  { from: 113, to: 9, type: 'weak' },   // Primo → Reunião
  { from: 112, to: 10, type: 'strong' }, // Irmão → Viagem
  { from: 113, to: 10, type: 'strong' }, // Primo → Viagem
  
  // Investimentos
  { from: 114, to: 11, type: 'strong' }, // Roberto → Startup Alpha
  { from: 115, to: 11, type: 'strong' }, // Sócio → Startup Alpha
  { from: 209, to: 11, type: 'strong' }, // Marca Startup Alpha → Projeto
  { from: 114, to: 12, type: 'strong' }, // Roberto → Fundo
  { from: 110, to: 12, type: 'weak' },   // Beatriz → Fundo
  { from: 109, to: 13, type: 'weak' },   // Fernando → Ações
  
  // Conferência (multi-workflow)
  { from: 101, to: 14, type: 'strong' }, // Felipe → Conferência
  { from: 107, to: 14, type: 'strong' }, // Ricardo → Conferência
  { from: 109, to: 14, type: 'weak' },   // Fernando → Conferência
  
  // Podcast
  { from: 102, to: 15, type: 'strong' }, // Ana → Podcast
  { from: 103, to: 15, type: 'weak' },   // João → Podcast
  
  // Conexões pessoa-pessoa (importantes para insights!)
  { from: 101, to: 107, type: 'strong' }, // Felipe ↔ Ricardo
  { from: 103, to: 109, type: 'weak' },   // João ↔ Fernando (oportunidade!)
  { from: 103, to: 105, type: 'strong' }, // João ↔ Carlos (mesma empresa)
  { from: 112, to: 103, type: 'weak' },   // Irmão ↔ João (insight familiar+profissional!)
  { from: 113, to: 115, type: 'weak' },   // Primo ↔ Sócio Alpha
  { from: 104, to: 118, type: 'strong' }, // Maria ↔ Sofia (mesma empresa)
  { from: 116, to: 101, type: 'strong' }, // Luiza ↔ Felipe (mesma empresa)
  
  // Conexões pessoa-marca
  { from: 101, to: 208, type: 'strong' }, // Felipe → Agência X
  { from: 102, to: 208, type: 'strong' }, // Ana → Agência X (trabalham juntos mas não conectados!)
  { from: 116, to: 208, type: 'strong' }, // Luiza → Agência X
  { from: 103, to: 204, type: 'strong' }, // João → Tech Corp
  { from: 105, to: 204, type: 'strong' }, // Carlos → Tech Corp
  { from: 109, to: 204, type: 'strong' }, // Fernando → Tech Corp
  { from: 117, to: 204, type: 'strong' }, // Rafael → Tech Corp
  { from: 112, to: 204, type: 'weak' },   // Irmão → Tech Corp (insight!)
  { from: 104, to: 206, type: 'strong' }, // Maria → Startup Y
  { from: 113, to: 206, type: 'weak' },   // Primo → Startup Y
  { from: 118, to: 206, type: 'strong' }, // Sofia → Startup Y
  { from: 107, to: 201, type: 'strong' }, // Ricardo → Campari
  { from: 108, to: 202, type: 'strong' }, // Juliana → Shopping X
  { from: 106, to: 205, type: 'strong' }, // Paula → EventCo
  { from: 114, to: 207, type: 'strong' }, // Roberto → XP
  { from: 115, to: 209, type: 'strong' }, // Sócio → Startup Alpha
  { from: 110, to: 210, type: 'strong' }, // Beatriz → Invest Plus
  
  // Conexões cross-workflow (Master View)
  { from: 1, to: 4, type: 'weak' },   // Hackathon → Campari Art (Felipe conecta!)
  { from: 4, to: 5, type: 'weak' },   // Campari Art → Shopping (Felipe conecta!)
  { from: 3, to: 7, type: 'weak' },   // Mentoria → Acordo Tech Corp (João/Ana conectam)
  { from: 11, to: 1, type: 'weak' },  // Startup Alpha → Hackathon (Sócio Alpha conecta)
  { from: 10, to: 11, type: 'weak' }  // Viagem → Startup Alpha (Primo conecta)
];
