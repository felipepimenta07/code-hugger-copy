export const makeRef = (type: string, id: number): string => `${type}:${id}`;

export const parseRef = (ref: string): { type: string; id: number } => {
  const idx = ref.indexOf(':');
  return { type: ref.slice(0, idx), id: parseInt(ref.slice(idx + 1), 10) };
};

export const getTableName = (type: string): string =>
  type === 'person' ? 'people' : type === 'brand' ? 'brands' : 'projects';
