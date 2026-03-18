/**
 * Gerenciamento de Cores para Grupos e Workflows
 * Cores consistentes, vibrantes e acessíveis
 */

export const COLOR_PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#52C0A1',
  '#5D9CEC', '#FC6E51', '#D15D7C', '#48B0A3', '#E8A87C',
  '#A8E6CF', '#FFD3B6', '#FFAAA5', '#FF8B94', '#8BC6EC',
];

export const getConsistentColor = (groupId: number): string => {
  const index = (groupId * 7) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
};

export const generateGroupColor = (groupId: number, seed: number = 0): string => {
  const index = (groupId + seed * 13) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
};

export const hexToRgba = (hex: string, opacity: number = 1): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
};

export const isLightColor = (hex: string): boolean => {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
};

export const getContrastingTextColor = (bgColor: string): string => {
  return isLightColor(bgColor) ? '#000000' : '#FFFFFF';
};

export class GroupColorManager {
  private colorCache: Map<number, string> = new Map();

  getColor(groupId: number): string {
    if (!this.colorCache.has(groupId)) {
      this.colorCache.set(groupId, getConsistentColor(groupId));
    }
    return this.colorCache.get(groupId)!;
  }

  clear(): void {
    this.colorCache.clear();
  }

  getAll(): Map<number, string> {
    return new Map(this.colorCache);
  }
}

export const groupColorManager = new GroupColorManager();
