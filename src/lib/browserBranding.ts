type BrowserBranding = {
  nome?: string;
  favicon_logo?: string;
};

const DEFAULT_FAVICON = '/favicon.svg';

const getIconType = (href: string) => {
  if (href.startsWith('data:image/png')) return 'image/png';
  if (href.startsWith('data:image/jpeg') || href.startsWith('data:image/jpg')) return 'image/jpeg';
  if (href.startsWith('data:image/webp')) return 'image/webp';
  return 'image/svg+xml';
};

export const applyBrowserBranding = ({ nome, favicon_logo }: BrowserBranding) => {
  const storeName = String(nome || 'Armarinho').trim() || 'Armarinho';
  document.title = `${storeName} ERP`;

  let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }

  const href = favicon_logo || DEFAULT_FAVICON;
  favicon.type = getIconType(href);
  favicon.href = href;
};
