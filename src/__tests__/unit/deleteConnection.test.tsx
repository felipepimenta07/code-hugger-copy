import { describe, it, expect, beforeEach } from 'vitest';
import { deleteConnection, deleteMultipleConnections } from '@/utils/deleteConnection';

describe('Unit: deleteConnection baseline', () => {
  let mockConnections: any[];
  let mockNodes: any[];

  beforeEach(() => {
    mockNodes = [
      { id: 1, type: 'project', name: 'Node A', x: 0, y: 0 },
      { id: 2, type: 'project', name: 'Node B', x: 200, y: 0 },
      { id: 3, type: 'person', name: 'Node C', x: 100, y: 200 },
    ];

    mockConnections = [
      { id: 1, from: 1, to: 2, strength: 'strong' },
      { id: 2, from: 2, to: 3, strength: 'medium' },
      { id: 3, from: 1, to: 3, strength: 'weak' },
    ];
  });

  it('deve remover apenas a conexão especificada', () => {
    const result = deleteConnection(1, mockConnections);
    
    expect(result).toHaveLength(2);
    expect(result.find(c => c.id === 1)).toBeUndefined();
    expect(result.find(c => c.id === 2)).toBeDefined();
    expect(result.find(c => c.id === 3)).toBeDefined();
  });

  it('não deve afetar outras conexões', () => {
    const result = deleteConnection(2, mockConnections);
    
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(mockConnections[0]);
    expect(result[1]).toEqual(mockConnections[2]);
  });

  it('deve retornar array vazio se deletar todas as conexões', () => {
    let result = mockConnections;
    result = deleteConnection(1, result);
    result = deleteConnection(2, result);
    result = deleteConnection(3, result);
    
    expect(result).toHaveLength(0);
  });

  it('não deve modificar o array original', () => {
    const original = [...mockConnections];
    deleteConnection(1, mockConnections);
    
    expect(mockConnections).toEqual(original);
  });

  it('deve deletar múltiplas conexões', () => {
    const result = deleteMultipleConnections([1, 3], mockConnections);
    
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });
});
