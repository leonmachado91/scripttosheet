import { useState, useCallback } from 'react';
import Linkify from 'linkify-react';
import { getFriendlyLabel } from '../../utils/linkParser';
import { LinkPreviewTooltip } from './LinkPreviewTooltip';

interface LinkTextProps {
    text: string;
}

function LinkWrapper({ href }: { href: string; children?: React.ReactNode }) {
    const [hovered, setHovered] = useState(false);
    const label = getFriendlyLabel(href);

    const handleMouseEnter = useCallback(() => setHovered(true), []);
    const handleMouseLeave = useCallback(() => setHovered(false), []);

    return (
        <span
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gruv-blue underline underline-offset-2 decoration-gruv-blue/40 hover:text-gruv-fg0 hover:decoration-gruv-fg0/40 transition-colors"
                title={href}
                onClick={(e) => e.stopPropagation()}
            >
                {label}
            </a>
            {hovered && <LinkPreviewTooltip url={href} />}
        </span>
    );
}

const linkifyOptions = {
    render: ({ attributes, content }: { attributes: Record<string, string>; content: string }) => {
        const { href, ...rest } = attributes;
        return <LinkWrapper key={href} href={href} {...rest}>{content}</LinkWrapper>;
    },
    target: '_blank',
    rel: 'noopener noreferrer',
};

/**
 * Renderiza texto com URLs auto-detectadas como links clicáveis com label amigável e tooltip de preview.
 * Usado no modo de visualização de CenaTableRow e CenaDetalhePanel.
 */
export function LinkText({ text }: LinkTextProps) {
    if (!text) return null;
    return <Linkify options={linkifyOptions}>{text}</Linkify>;
}
