/**
 * Shared category color system — deterministic HSL colors per category name.
 * Used by NetworkSidebar, MasterCanvas, and SingleCanvas3D.
 */

const SEED_COLORS: string[] = [
  'hsl(210, 100%, 56%)', 'hsl(158, 64%, 52%)', 'hsl(43, 96%, 56%)',
  'hsl(27, 96%, 61%)', 'hsl(258, 90%, 66%)', 'hsl(340, 80%, 55%)',
  'hsl(280, 70%, 60%)', 'hsl(190, 80%, 50%)', 'hsl(30, 90%, 55%)',
  'hsl(170, 60%, 50%)', 'hsl(210, 90%, 55%)', 'hsl(15, 85%, 55%)',
  'hsl(260, 80%, 60%)', 'hsl(200, 70%, 50%)', 'hsl(180, 70%, 45%)',
  'hsl(320, 70%, 55%)', 'hsl(340, 60%, 60%)', 'hsl(220, 60%, 50%)',
  'hsl(120, 50%, 50%)', 'hsl(45, 90%, 55%)', 'hsl(0, 70%, 55%)',
  'hsl(50, 85%, 50%)', 'hsl(75, 60%, 48%)', 'hsl(100, 55%, 45%)',
  'hsl(135, 65%, 42%)', 'hsl(155, 75%, 40%)', 'hsl(185, 85%, 48%)',
  'hsl(225, 75%, 55%)', 'hsl(245, 70%, 58%)', 'hsl(270, 65%, 55%)',
  'hsl(295, 60%, 52%)', 'hsl(310, 75%, 50%)', 'hsl(355, 75%, 50%)',
  'hsl(10, 80%, 52%)', 'hsl(65, 70%, 45%)', 'hsl(145, 55%, 48%)',
];

// Inner core colors — offset from outer color for visual contrast
const CORE_COLORS: string[] = [
  'hsl(30, 100%, 65%)', 'hsl(280, 80%, 65%)', 'hsl(180, 90%, 55%)',
  'hsl(330, 85%, 60%)', 'hsl(60, 95%, 55%)', 'hsl(200, 85%, 60%)',
  'hsl(120, 70%, 55%)', 'hsl(350, 75%, 55%)', 'hsl(240, 80%, 65%)',
  'hsl(90, 75%, 50%)', 'hsl(310, 70%, 58%)', 'hsl(160, 80%, 48%)',
  'hsl(40, 90%, 58%)', 'hsl(270, 75%, 60%)', 'hsl(10, 85%, 55%)',
  'hsl(140, 65%, 50%)', 'hsl(220, 90%, 60%)', 'hsl(50, 80%, 52%)',
  'hsl(300, 65%, 55%)', 'hsl(170, 75%, 50%)', 'hsl(25, 90%, 58%)',
  'hsl(250, 70%, 58%)', 'hsl(80, 65%, 48%)', 'hsl(340, 80%, 55%)',
  'hsl(110, 60%, 48%)', 'hsl(190, 80%, 52%)', 'hsl(0, 80%, 55%)',
  'hsl(215, 85%, 58%)', 'hsl(55, 85%, 52%)', 'hsl(285, 70%, 55%)',
  'hsl(145, 70%, 45%)', 'hsl(325, 70%, 52%)', 'hsl(70, 75%, 48%)',
  'hsl(195, 80%, 55%)', 'hsl(260, 75%, 58%)', 'hsl(105, 60%, 50%)',
];

export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getCategoryColor(category: string | null | undefined): string {
  const cat = category || 'Sem categoria';
  return SEED_COLORS[hashStr(cat) % SEED_COLORS.length];
}

export function getCategoryCoreColor(category: string | null | undefined): string {
  const cat = category || 'Sem categoria';
  return CORE_COLORS[hashStr(cat) % CORE_COLORS.length];
}
