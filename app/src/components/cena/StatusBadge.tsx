import type { StatusType } from '../../types';

const STATUS_COLORS: Record<StatusType, { bg: string; text: string }> = {
    'Aberto': { bg: 'bg-gruv-gray', text: 'text-gruv-bg' },
    'Layout': { bg: 'bg-gruv-blue', text: 'text-white' },
    'Animação': { bg: 'bg-gruv-orange', text: 'text-gruv-bg' },
    'Concluído': { bg: 'bg-gruv-green', text: 'text-gruv-bg' },
    'Cancelado': { bg: 'bg-gruv-red', text: 'text-white' },
};

interface StatusBadgeProps {
    status: StatusType;
    size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
    const colors = STATUS_COLORS[status] || STATUS_COLORS['Aberto'];
    const sizeClasses = size === 'md'
        ? 'px-3 py-1.5 text-xs'
        : 'px-2 py-0.5 text-[11px]';

    return (
        <span className={`inline-flex items-center rounded-md font-bold ${colors.bg} ${colors.text} ${sizeClasses} whitespace-nowrap`}>
            {status}
        </span>
    );
}

interface TagBadgeProps {
    tag: string;
}

export function TagBadge({ tag }: TagBadgeProps) {
    // Hash simples pra cor determinística por tag
    const COLORS = [
        { bg: 'bg-gruv-aqua/20', text: 'text-gruv-aqua', border: 'border-gruv-aqua/30' },
        { bg: 'bg-gruv-yellow/20', text: 'text-gruv-yellow', border: 'border-gruv-yellow/30' },
        { bg: 'bg-gruv-blue/20', text: 'text-gruv-blue', border: 'border-gruv-blue/30' },
        { bg: 'bg-gruv-orange/20', text: 'text-gruv-orange', border: 'border-gruv-orange/30' },
        { bg: 'bg-gruv-purple/20', text: 'text-gruv-purple', border: 'border-gruv-purple/30' },
        { bg: 'bg-gruv-red/20', text: 'text-gruv-red', border: 'border-gruv-red/30' },
        { bg: 'bg-gruv-green/20', text: 'text-gruv-green', border: 'border-gruv-green/30' },
    ];

    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = COLORS[Math.abs(hash) % COLORS.length];

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${color.bg} ${color.text} border ${color.border}`}>
            #{tag.trim()}
        </span>
    );
}

/**
 * Converte string de tags (separadas por vírgula) em array de pills.
 */
export function TagList({ tags }: { tags: string }) {
    if (!tags || !tags.trim()) return <span className="text-gruv-gray opacity-40">—</span>;

    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);

    return (
        <div className="flex flex-wrap gap-1">
            {tagArray.map((tag) => (
                <TagBadge key={tag} tag={tag} />
            ))}
        </div>
    );
}
