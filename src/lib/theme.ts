export interface ThemeSettings {
  primaryColor: string;
  bgColor: string;
  sidebarColor: string;
  borderRadius: 'sharp' | 'default' | 'rounded';
  fontFamily: 'inter' | 'outfit' | 'mono';
  density: 'compact' | 'default' | 'comfortable';
  sidebarStyle: 'glass' | 'solid' | 'minimal';
  chartColor: string;
}

export const DEFAULT_THEME: ThemeSettings = {
  primaryColor: '#f59e0b',
  bgColor: '#09090b',
  sidebarColor: '#18181b',
  borderRadius: 'default',
  fontFamily: 'inter',
  density: 'default',
  sidebarStyle: 'glass',
  chartColor: '#f59e0b',
};

// ── Color Utilities ──────────────────────────────────────────────────────────

export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
};

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) => {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
};

const blendRgb = (
  foreground: { r: number; g: number; b: number },
  background: { r: number; g: number; b: number },
  opacity: number,
) => ({
  r: foreground.r * opacity + background.r * (1 - opacity),
  g: foreground.g * opacity + background.g * (1 - opacity),
  b: foreground.b * opacity + background.b * (1 - opacity),
});

/** WCAG 2.1 relative luminance */
const relativeLuminance = (r: number, g: number, b: number): number => {
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

/** Contrast ratio between two hex colors (WCAG) */
const contrastRatio = (hex1: string, hex2: string): number => {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  if (!c1 || !c2) return 1;
  const L1 = relativeLuminance(c1.r, c1.g, c1.b);
  const L2 = relativeLuminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
};

/** Pick text color that meets at least WCAG AA (4.5:1) against a background */
const adaptiveTextColor = (bgHex: string, preferLight = '#f4f4f5', preferDark = '#09090b'): string => {
  const lightContrast = contrastRatio(bgHex, preferLight);
  const darkContrast  = contrastRatio(bgHex, preferDark);
  return darkContrast >= lightContrast ? preferDark : preferLight;
};


export const adjustBrightness = (hex: string, percent: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const adjust = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + percent / 100))));
  return `#${adjust(rgb.r).toString(16).padStart(2,'0')}${adjust(rgb.g).toString(16).padStart(2,'0')}${adjust(rgb.b).toString(16).padStart(2,'0')}`;
};

// ── Apply Functions ──────────────────────────────────────────────────────────

/** Primary accent color + adaptive text on primary */
export const applyTheme = (hexColor: string) => {
  const root = document.documentElement;
  const rgb = hexToRgb(hexColor);
  if (rgb) {
    root.style.setProperty('--app-primary-hex', hexColor);
    root.style.setProperty('--app-primary-hover-hex', adjustBrightness(hexColor, -10));
    root.style.setProperty('--app-primary-glow', `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`);
    root.style.setProperty('--app-primary-rgb', `${rgb.r},${rgb.g},${rgb.b}`);
    // Text on primary buttons — adaptive
    const textOnPrimary = adaptiveTextColor(hexColor, '#f4f4f5', '#09090b');
    root.style.setProperty('--app-primary-text', textOnPrimary);
    localStorage.setItem('app-theme-color', hexColor);
  }
};

/** Background color + full adaptive text + guaranteed surface contrast */
export const applyBgTheme = (hexColor: string) => {
  const root = document.documentElement;
  const rgb = hexToRgb(hexColor);
  if (!rgb) return;

  const lum = relativeLuminance(rgb.r, rgb.g, rgb.b);
  const isDark = lum < 0.5;

  // ── Base background ──
  root.style.setProperty('--app-bg-base', hexColor);
  root.style.setProperty('--app-bg-rgb', `${rgb.r},${rgb.g},${rgb.b}`);

  // ── Surface layers with STRONG contrast (not just 5%) ──
  // On dark bg: surface is lighter. On light bg: surface is darker.
  if (isDark) {
    root.style.setProperty('--app-bg-surface',      adjustBrightness(hexColor, 18));
    root.style.setProperty('--app-bg-surface-2',    adjustBrightness(hexColor, 30));
    root.style.setProperty('--app-border',          adjustBrightness(hexColor, 22));
    root.style.setProperty('--app-border-light',    adjustBrightness(hexColor, 35));
    root.style.setProperty('--app-card-bg',         adjustBrightness(hexColor, 18));
    root.style.setProperty('--app-input-bg',        adjustBrightness(hexColor, 14));
    root.style.setProperty('--app-input-border',    adjustBrightness(hexColor, 25));
    root.style.setProperty('--app-hover-overlay',   adjustBrightness(hexColor, 28));
    root.style.setProperty('--app-card-shadow',     '0 4px 24px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)');
    root.style.setProperty('--app-card-border',     adjustBrightness(hexColor, 20));
    root.style.setProperty('--app-scrollbar',       adjustBrightness(hexColor, 30));
    root.style.setProperty('--app-chart-grid',      adjustBrightness(hexColor, 25));
    root.style.setProperty('--app-subtle-overlay',  'rgba(255,255,255,0.06)');
  } else {
    // Light background: surface DARKER than base
    root.style.setProperty('--app-bg-surface',      adjustBrightness(hexColor, -10));
    root.style.setProperty('--app-bg-surface-2',    adjustBrightness(hexColor, -18));
    root.style.setProperty('--app-border',          adjustBrightness(hexColor, -18));
    root.style.setProperty('--app-border-light',    adjustBrightness(hexColor, -28));
    root.style.setProperty('--app-card-bg',         '#ffffff');
    root.style.setProperty('--app-input-bg',        '#ffffff');
    root.style.setProperty('--app-input-border',    adjustBrightness(hexColor, -20));
    root.style.setProperty('--app-hover-overlay',   adjustBrightness(hexColor, -8));
    root.style.setProperty('--app-card-shadow',     '0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)');
    root.style.setProperty('--app-card-border',     adjustBrightness(hexColor, -16));
    root.style.setProperty('--app-scrollbar',       adjustBrightness(hexColor, -25));
    root.style.setProperty('--app-chart-grid',      adjustBrightness(hexColor, -15));
    root.style.setProperty('--app-subtle-overlay',  'rgba(0,0,0,0.045)');
  }

  // ── Adaptive Text Colors ──
  root.style.setProperty('--app-text-primary',     isDark ? '#f4f4f5'             : '#111113');
  root.style.setProperty('--app-text-secondary',   isDark ? '#d4d4d8'             : '#3f3f46');
  root.style.setProperty('--app-text-muted',       isDark ? 'rgba(160,160,170,1)' : 'rgba(63,63,70,0.78)');
  root.style.setProperty('--app-text-faint',       isDark ? 'rgba(120,120,130,1)' : 'rgba(82,82,91,0.72)');
  root.style.setProperty('--app-text-placeholder', isDark ? 'rgba(120,120,130,1)' : 'rgba(82,82,91,0.65)');

  // Apply to body immediately
  document.body.style.backgroundColor = hexColor;
  document.body.style.color = isDark ? '#f4f4f5' : '#111113';

  localStorage.setItem('app-theme-bg', hexColor);
};

/** Sidebar color + adaptive sidebar text/hover */
export const applySidebarColor = (hexColor: string) => {
  const stored = loadFullTheme();
  applySidebarVisuals(hexColor, stored.sidebarStyle, stored.bgColor);
  localStorage.setItem('app-sidebar-color', hexColor);
};

export const applySidebarVisuals = (
  sidebarColor: string,
  style: ThemeSettings['sidebarStyle'],
  bgColor: string,
) => {
  const root = document.documentElement;
  const rgb = hexToRgb(sidebarColor);
  const bgRgb = hexToRgb(bgColor);
  if (!rgb || !bgRgb) return;

  const opacityMap = {
    glass: 0.72,
    solid: 1,
    minimal: 0,
  };

  const opacity = opacityMap[style];
  const effectiveRgb = style === 'minimal' ? bgRgb : blendRgb(rgb, bgRgb, opacity);
  const effectiveHex = rgbToHex(effectiveRgb);

  const lum = relativeLuminance(effectiveRgb.r, effectiveRgb.g, effectiveRgb.b);
  const isDark = lum < 0.5;

  root.style.setProperty('--sidebar-bg-raw',     sidebarColor);
  root.style.setProperty('--sidebar-bg-rgb',     `${rgb.r},${rgb.g},${rgb.b}`);
  root.style.setProperty('--sidebar-opacity',     String(opacity));
  root.style.setProperty('--sidebar-blur',        style === 'glass' ? 'blur(24px)' : 'none');
  root.style.setProperty('--sidebar-bg-color',    `rgba(${rgb.r},${rgb.g},${rgb.b},${opacity})`);
  root.style.setProperty('--sidebar-border-color', style === 'minimal' ? 'transparent' : adjustBrightness(effectiveHex, isDark ? 14 : -14));
  root.style.setProperty('--sidebar-text-color',  isDark ? '#f8fafc' : '#111113');
  root.style.setProperty('--sidebar-muted-color', isDark ? 'rgba(226,232,240,0.72)' : 'rgba(39,39,42,0.72)');
  root.style.setProperty('--sidebar-hover-bg',    isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)');
  root.style.setProperty('--sidebar-surface-overlay', style === 'minimal' ? 'transparent' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.045)');
  root.style.setProperty('--sidebar-shadow', style === 'glass' ? '18px 0 45px rgba(0,0,0,0.14)' : 'none');
};

export const applyBorderRadius = (radius: ThemeSettings['borderRadius']) => {
  const root = document.documentElement;
  const map = {
    sharp:   { sm:'4px', md:'6px',  lg:'8px',  xl:'12px', '2xl':'16px', '3xl':'20px' },
    default: { sm:'6px', md:'8px',  lg:'12px', xl:'16px', '2xl':'20px', '3xl':'24px' },
    rounded: { sm:'10px',md:'14px', lg:'20px', xl:'24px', '2xl':'32px', '3xl':'40px' },
  };
  const v = map[radius];
  root.style.setProperty('--radius-sm',  v.sm);
  root.style.setProperty('--radius-md',  v.md);
  root.style.setProperty('--radius-lg',  v.lg);
  root.style.setProperty('--radius-xl',  v.xl);
  root.style.setProperty('--radius-2xl', v['2xl']);
  root.style.setProperty('--radius-3xl', v['3xl']);
  localStorage.setItem('app-border-radius', radius);
};

export const applyFontFamily = (font: ThemeSettings['fontFamily']) => {
  const map = {
    inter:  '"Inter", sans-serif',
    outfit: '"Outfit", sans-serif',
    mono:   '"JetBrains Mono","Fira Code",monospace',
  };
  document.documentElement.style.setProperty('--app-font', map[font]);
  document.body.style.fontFamily = map[font];
  localStorage.setItem('app-font', font);
};

export const applyDensity = (density: ThemeSettings['density']) => {
  const root = document.documentElement;
  const map = {
    compact:     { spacing:'0.84', textSm:'12px', card:'16px', section:'20px', tableY:'10px', page:'24px', controlY:'9px' },
    default:     { spacing:'1',    textSm:'14px', card:'24px', section:'32px', tableY:'16px', page:'32px', controlY:'11px' },
    comfortable: { spacing:'1.18', textSm:'15px', card:'32px', section:'40px', tableY:'20px', page:'44px', controlY:'13px' },
  };
  const v = map[density];
  root.style.setProperty('--app-density',      v.spacing);
  root.style.setProperty('--app-card-padding', v.card);
  root.style.setProperty('--app-section-padding', v.section);
  root.style.setProperty('--app-table-cell-y', v.tableY);
  root.style.setProperty('--app-page-padding', v.page);
  root.style.setProperty('--app-control-y', v.controlY);
  root.style.setProperty('--app-text-sm',      v.textSm);
  localStorage.setItem('app-density', density);
};

export const applySidebarStyle = (style: ThemeSettings['sidebarStyle']) => {
  const stored = loadFullTheme();
  applySidebarVisuals(stored.sidebarColor, style, stored.bgColor);
  localStorage.setItem('app-sidebar-style', style);
};

// ── Persistence ──────────────────────────────────────────────────────────────

export const saveFullTheme = (settings: Partial<ThemeSettings>) => {
  localStorage.setItem('app-full-theme', JSON.stringify({ ...loadFullTheme(), ...settings }));
};

export const loadFullTheme = (): ThemeSettings => {
  try {
    const stored = localStorage.getItem('app-full-theme');
    if (stored) return { ...DEFAULT_THEME, ...JSON.parse(stored) };
  } catch {
    return { ...DEFAULT_THEME };
  }
  return { ...DEFAULT_THEME };
};

export const initTheme = () => {
  const t = loadFullTheme();
  applyTheme(t.primaryColor);
  applyBgTheme(t.bgColor);
  applySidebarVisuals(t.sidebarColor, t.sidebarStyle, t.bgColor);
  applyBorderRadius(t.borderRadius);
  applyFontFamily(t.fontFamily);
  applyDensity(t.density);
};

export const resetTheme = () => {
  ['app-full-theme','app-theme-color','app-theme-bg','app-sidebar-color',
   'app-border-radius','app-font','app-density','app-sidebar-style'].forEach(k => localStorage.removeItem(k));
  initTheme();
};
