import { useState, useEffect, useRef } from 'react';
import { getPreviewStrategy, getYoutubeId, getYoutubeThumbnail, getServiceMeta, getFriendlyLabel } from '../../utils/linkParser';
import { api } from '../../services/api';

interface LinkPreviewTooltipProps {
    url: string;
}

interface PreviewData {
    title?: string;
    image?: string;
    description?: string;
}

// Cache de preview em memória (persiste durante a sessão)
const previewCache = new Map<string, PreviewData | null>();

// Cache de oEmbed YouTube em memória
const youtubeCache = new Map<string, string>();

export function LinkPreviewTooltip({ url }: LinkPreviewTooltipProps) {
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [loading, setLoading] = useState(false);
    const [imgError, setImgError] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const strategy = getPreviewStrategy(url);
    const meta = getServiceMeta(url);

    useEffect(() => {
        let cancelled = false;

        async function fetchPreview() {
            // Imagens diretas — sem fetch
            if (strategy === 'image') {
                setPreview({ image: url });
                return;
            }

            // YouTube — thumbnail grátis + título via oEmbed
            if (strategy === 'youtube') {
                const videoId = getYoutubeId(url);
                if (videoId) {
                    const thumb = getYoutubeThumbnail(videoId);
                    const cached = youtubeCache.get(videoId);
                    if (cached) {
                        setPreview({ image: thumb, title: cached });
                        return;
                    }

                    setPreview({ image: thumb });
                    try {
                        const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
                        if (res.ok) {
                            const data = await res.json();
                            if (!cancelled) {
                                youtubeCache.set(videoId, data.title);
                                setPreview({ image: thumb, title: data.title });
                            }
                        }
                    } catch { /* fallback: mostra só a thumb */ }
                }
                return;
            }

            // Vimeo — oEmbed (CORS liberado)
            if (strategy === 'vimeo') {
                try {
                    setLoading(true);
                    const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (!cancelled) {
                            setPreview({ image: data.thumbnail_url, title: data.title, description: data.author_name });
                        }
                    }
                } catch { /* fallback estático */ }
                finally { if (!cancelled) setLoading(false); }
                return;
            }

            // Genérico — via backend GAS (buscarPreviewLink)
            if (previewCache.has(url)) {
                setPreview(previewCache.get(url) ?? null);
                return;
            }

            try {
                setLoading(true);
                const data = await api.buscarPreviewLink(url);
                if (!cancelled) {
                    previewCache.set(url, data);
                    setPreview(data);
                }
            } catch {
                if (!cancelled) previewCache.set(url, null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchPreview();
        return () => { cancelled = true; };
    }, [url, strategy]);

    // Hostname para exibição
    let hostname = '';
    try { hostname = new URL(url).hostname.replace(/^www\./, ''); } catch { hostname = url; }

    // Truncar URL longa
    const truncatedUrl = url.length > 60 ? url.slice(0, 57) + '…' : url;

    return (
        <div
            ref={tooltipRef}
            className="absolute z-50 bottom-full left-0 mb-2 w-72 bg-gruv-bg-hard border border-gruv-bg-soft rounded-lg shadow-xl overflow-hidden pointer-events-none animate-fade-in"
            style={{ animationDuration: '150ms' }}
        >
            {/* Imagem / Thumbnail */}
            {preview?.image && !imgError && (
                <div className="w-full h-36 bg-gruv-bg overflow-hidden">
                    <img
                        src={preview.image}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                        loading="lazy"
                    />
                </div>
            )}

            {/* Loading state */}
            {loading && !preview && (
                <div className="flex items-center gap-2 px-3 py-3">
                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-gruv-yellow" />
                    <span className="text-xs text-gruv-gray">Carregando preview...</span>
                </div>
            )}

            {/* Content */}
            <div className="px-3 py-2.5 space-y-1">
                {/* Título (se veio do fetch) */}
                {preview?.title && (
                    <p className="text-xs font-semibold text-gruv-fg0 leading-snug line-clamp-2">
                        {preview.title}
                    </p>
                )}

                {/* Descrição */}
                {preview?.description && (
                    <p className="text-[11px] text-gruv-fg4 leading-snug line-clamp-2">
                        {preview.description}
                    </p>
                )}

                {/* Serviço + hostname */}
                <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-xs">{meta.icon}</span>
                    <span className="text-[11px] font-medium text-gruv-fg4">
                        {getFriendlyLabel(url)}
                    </span>
                    {getFriendlyLabel(url) !== hostname && (
                        <span className="text-[10px] text-gruv-gray">· {hostname}</span>
                    )}
                </div>

                {/* URL truncada */}
                <p className="text-[10px] text-gruv-gray/60 font-mono truncate" title={url}>
                    {truncatedUrl}
                </p>
            </div>
        </div>
    );
}
