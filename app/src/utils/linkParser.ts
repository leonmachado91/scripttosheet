/**
 * Mapeamento de domínios → labels amigáveis e metadados para preview.
 */

export interface ServiceInfo {
    label: string;
    icon: string;
    color: string;
}

/** Mapa de domínio → metadados do serviço (usado no tooltip e no label) */
export const SERVICE_META: Record<string, ServiceInfo> = {
    'drive.google.com': { label: 'Google Drive', icon: '📁', color: '#4285F4' },
    'docs.google.com': { label: 'Google Docs', icon: '📄', color: '#4285F4' },
    'sheets.google.com': { label: 'Google Sheets', icon: '📊', color: '#0F9D58' },
    'youtube.com': { label: 'YouTube', icon: '▶️', color: '#FF0000' },
    'youtu.be': { label: 'YouTube', icon: '▶️', color: '#FF0000' },
    'vimeo.com': { label: 'Vimeo', icon: '🎬', color: '#1AB7EA' },
    'figma.com': { label: 'Figma', icon: '🎨', color: '#A259FF' },
    'github.com': { label: 'GitHub', icon: '🐙', color: '#333333' },
    'notion.so': { label: 'Notion', icon: '📝', color: '#000000' },
    'trello.com': { label: 'Trello', icon: '📋', color: '#0052CC' },
    'miro.com': { label: 'Miro', icon: '🟡', color: '#FFD02F' },
    'canva.com': { label: 'Canva', icon: '🖼️', color: '#00C4CC' },
    'dropbox.com': { label: 'Dropbox', icon: '📦', color: '#0061FF' },
    'airtable.com': { label: 'Airtable', icon: '📑', color: '#18BFFF' },
};

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif'];

/**
 * Domínios que usam extensões de imagem em rotas de páginas HTML.
 * URLs desses sites nunca devem ser tratadas como imagem direta.
 */
const HTML_WRAPPER_DOMAINS = [
    'wikipedia.org', 'wikimedia.org', 'commons.wikimedia.org',
    'flickr.com', 'flic.kr', 'deviantart.com',
    'pinterest.com', 'pin.it',
    'imgur.com',     // imgur sem /i/ no path é página HTML
    'tumblr.com',
];

/**
 * Verifica se uma URL aponta para um arquivo de imagem direto.
 * Evita falsos positivos de sites que usam .jpg/.png em rotas de páginas.
 */
function isDirectImageUrl(parsed: URL): boolean {
    const pathname = parsed.pathname.toLowerCase();
    const host = parsed.hostname.replace(/^www\./, '');

    // Checar se termina com extensão de imagem
    if (!IMAGE_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
        return false;
    }

    // Excluir domínios que usam extensões de imagem em rotas HTML
    if (HTML_WRAPPER_DOMAINS.some(d => host === d || host.endsWith('.' + d))) {
        return false;
    }

    // O último segmento deve ser um nome de arquivo simples (sem ":" como em File:xxx.jpg)
    const lastSegment = pathname.split('/').filter(Boolean).pop() || '';
    if (lastSegment.includes(':')) {
        return false;
    }

    // Caminhos com muitos segmentos tipo /wiki/File/xxx.jpg são rotas, não arquivos
    // Mas /uploads/2024/photo.jpg é válido — checar se é "route-like"
    const routePatterns = ['/wiki/', '/page/', '/article/', '/post/', '/entry/'];
    if (routePatterns.some(p => pathname.includes(p))) {
        return false;
    }

    return true;
}

/**
 * Classifica a URL e retorna a estratégia de preview ideal.
 */
export type PreviewStrategy = 'image' | 'youtube' | 'vimeo' | 'generic';

export function getPreviewStrategy(url: string): PreviewStrategy {
    try {
        const parsed = new URL(url);

        // URL direta de imagem (com validação robusta)
        if (isDirectImageUrl(parsed)) {
            return 'image';
        }

        const host = parsed.hostname.replace(/^www\./, '');

        if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
            return 'youtube';
        }
        if (host === 'vimeo.com') {
            return 'vimeo';
        }

        return 'generic';
    } catch {
        return 'generic';
    }
}

/**
 * Extrai o ID do vídeo de uma URL do YouTube.
 */
export function getYoutubeId(url: string): string | null {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, '');

        if (host === 'youtu.be') {
            return parsed.pathname.slice(1) || null;
        }
        if (host === 'youtube.com' || host === 'm.youtube.com') {
            if (parsed.pathname.startsWith('/shorts/')) {
                return parsed.pathname.split('/shorts/')[1]?.split('/')[0] || null;
            }
            return parsed.searchParams.get('v');
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Retorna a URL do thumbnail de um vídeo do YouTube.
 */
export function getYoutubeThumbnail(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * Retorna o label amigável de uma URL baseado no domínio.
 * Ex.: "Google Drive", "YouTube", "figma.com"
 */
export function getFriendlyLabel(url: string): string {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, '');
        const pathname = parsed.pathname.toLowerCase();

        // Subtipos do Google Docs
        if (host === 'docs.google.com') {
            if (pathname.includes('/spreadsheets')) return 'Google Sheets';
            if (pathname.includes('/document')) return 'Google Docs';
            if (pathname.includes('/presentation')) return 'Google Slides';
            if (pathname.includes('/forms')) return 'Google Forms';
            return 'Google Docs';
        }

        // Buscar no SERVICE_META
        const meta = SERVICE_META[host];
        if (meta) return meta.label;

        // Fallback: hostname sem www
        return host;
    } catch {
        return url;
    }
}

/**
 * Retorna os metadados do serviço a partir de uma URL.
 */
export function getServiceMeta(url: string): ServiceInfo {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, '');

        const meta = SERVICE_META[host];
        if (meta) return meta;

        return { label: host, icon: '🔗', color: '#458588' };
    } catch {
        return { label: url, icon: '🔗', color: '#458588' };
    }
}
