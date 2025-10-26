/**
 * Deleta uma conexão do estado sem afetar nós, flows ou view
 * @param connectionId - ID da conexão a ser deletada
 * @param connections - Array de conexões atual
 * @returns Array de conexões atualizado
 */
export const deleteConnection = (
  connectionId: number,
  connections: any[]
): any[] => {
  return connections.filter(c => c.id !== connectionId);
};

/**
 * Deleta múltiplas conexões do estado
 * @param connectionIds - IDs das conexões a serem deletadas
 * @param connections - Array de conexões atual
 * @returns Array de conexões atualizado
 */
export const deleteMultipleConnections = (
  connectionIds: number[],
  connections: any[]
): any[] => {
  return connections.filter(c => !connectionIds.includes(c.id));
};
