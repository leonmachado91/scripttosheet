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
 * Classifica a URL e retorna a estratégia de preview ideal.
 */
export type PreviewStrategy = 'image' | 'youtube' | 'vimeo' | 'generic';

export function getPreviewStrategy(url: string): PreviewStrategy {
    try {
        const parsed = new URL(url);
        const pathname = parsed.pathname.toLowerCase();

        // URL direta de imagem
        if (IMAGE_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
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
