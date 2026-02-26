import { memo, useRef, useState, useEffect } from 'react';
import { ChevronRight, Pencil, X, Check } from 'lucide-react';
import { TagList, StatusBadge, TagBadge } from './StatusBadge';
import { LinkText } from './LinkText';
import type { Cena, StatusType } from '../../types';

type EditField = 'roteiro' | 'comentario' | 'tag' | 'obs' | string;

interface CenaTableRowProps {
    cena: Cena;
    idx: number;
    isSelected: boolean;
    expanded: boolean;
    allProjectTags: string[];
    isStatusEditing: boolean;
    extraColumns: string[];
    editingCell: { linha: number; field: string; isExtra?: boolean } | null;
    onToggleRow: (linha: number, e: React.MouseEvent) => void;
    onOpenPanel: (cena: Cena) => void;
    onStartEdit: (cena: Cena, field: EditField, e: React.MouseEvent, isExtra?: boolean) => void;
    onConfirmEdit: (linha: number, field: string, isExtra: boolean, value: string) => Promise<void>;
    onCancelEdit: () => void;
    onStatusChange: (cena: Cena, newStatus: StatusType, e: React.MouseEvent) => void;
    onToggleStatusEdit: (linha: number | null, e: React.MouseEvent) => void;
}

const ALL_STATUSES: StatusType[] = ['Aberto', 'Layout', 'Animação', 'Concluído', 'Cancelado'];

export const CenaTableRow = memo(function CenaTableRow({
    cena,
    idx,
    isSelected,
    expanded,
    allProjectTags,
    isStatusEditing,
    extraColumns,
    editingCell,
    onToggleRow,
    onOpenPanel,
    onStartEdit,
    onConfirmEdit,
    onCancelEdit,
    onStatusChange,
    onToggleStatusEdit
}: CenaTableRowProps) {
    const zebraClass = idx % 2 === 1 ? 'bg-[#32302f]' : '';
    const statusDropdownRef = useRef<HTMLTableCellElement>(null);
    const editRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

    const [editValue, setEditValue] = useState('');
    const [tagSuggestions, setTagSuggestions] = useState(false);

    const isEditing = (field: string) => editingCell?.linha === cena.linha && editingCell?.field === field;

    useEffect(() => {
        if (editingCell?.linha === cena.linha) {
            setTimeout(() => {
                if (editRef.current) {
                    editRef.current.focus();
                    if (editRef.current instanceof HTMLTextAreaElement) {
                        editRef.current.style.height = 'auto';
                        editRef.current.style.height = editRef.current.scrollHeight + 'px';
                    }
                }
            }, 0);
        }
    }, [editingCell, cena.linha]);

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditValue(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    const handleStartEdit = (field: string, e: React.MouseEvent, isExtra = false) => {
        const textValue = isExtra ? (cena.extras?.[field] || '') : (cena[field as keyof Cena] as string || '');
        setEditValue(textValue);
        onStartEdit(cena, field, e, isExtra);
    };

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setTagSuggestions(false);
            onCancelEdit();
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            setTagSuggestions(false);
            onConfirmEdit(cena.linha, editingCell!.field, !!editingCell!.isExtra, editValue);
        }
    };

    const addTagSuggestion = (tag: string) => {
        const parts = editValue.split(',').map(t => t.trim()).filter(Boolean);
        const lastPart = editValue.split(',').pop()?.trim() || '';
        if (lastPart && tag.includes(lastPart.toLowerCase())) parts.pop();
        parts.push(tag);
        setEditValue(parts.join(', '));
        setTagSuggestions(false);
        editRef.current?.focus();
    };

    const currentEditTags = editValue.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    const lastPart = editValue.split(',').pop()?.trim().toLowerCase() || '';
    const filteredTagSuggestions = allProjectTags.filter(t => !currentEditTags.includes(t) && (lastPart === '' || t.includes(lastPart)));

    const renderTextCell = (field: EditField, isExtra = false) => {
        if (isEditing(field)) {
            return (
                <div onClick={(e) => e.stopPropagation()} className="relative w-full">
                    <textarea ref={editRef as React.RefObject<HTMLTextAreaElement>} value={editValue} onChange={handleTextareaChange} onKeyDown={handleEditKeyDown}
                        className="w-full bg-gruv-bg-hard border border-gruv-yellow rounded px-2 py-1.5 text-xs text-gruv-fg outline-none resize-none overflow-hidden min-h-[32px]" />
                    <div className="flex gap-1 justify-end absolute -bottom-7 right-0 bg-gruv-bg-hard border border-gruv-bg-soft rounded shadow-md p-1 z-20">
                        <button onClick={() => { setTagSuggestions(false); onCancelEdit(); }} className="p-0.5 rounded hover:bg-gruv-bg-soft text-gruv-gray hover:text-gruv-red" title="Cancelar (Esc)"><X size={12} /></button>
                        <button onClick={() => { setTagSuggestions(false); onConfirmEdit(cena.linha, field, isExtra, editValue); }} className="p-0.5 rounded hover:bg-gruv-bg-soft text-gruv-gray hover:text-gruv-green" title="Confirmar (Enter)"><Check size={12} /></button>
                    </div>
                </div>
            );
        }
        const text = isExtra ? (cena.extras?.[field] || '') : (cena[field as keyof Cena] as string || '');
        if (!text) return (
            <div className="flex items-center gap-1 group/cell h-full min-h-[24px]">
                <div className="flex-1 opacity-0 group-hover/cell:opacity-100 transition-opacity"></div>
                <button onClick={(e) => handleStartEdit(field, e, isExtra)} className="p-0.5 mt-0.5 rounded opacity-0 group-hover/cell:opacity-60 hover:opacity-100! text-gruv-gray hover:text-gruv-yellow transition-all flex-shrink-0" title="Editar">
                    <Pencil size={11} />
                </button>
            </div>
        );

        return (
            <div className="flex items-start gap-1 group/cell h-full w-full">
                <div className={`flex-1 text-gruv-fg text-xs leading-relaxed overflow-hidden ${expanded ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
                    <LinkText text={text} />
                </div>
                <button onClick={(e) => handleStartEdit(field, e, isExtra)} className="p-0.5 mt-0.5 rounded opacity-0 group-hover/cell:opacity-60 hover:opacity-100! text-gruv-gray hover:text-gruv-yellow transition-all flex-shrink-0" title="Editar">
                    <Pencil size={11} />
                </button>
            </div>
        );
    };

    const renderTagCell = () => {
        if (isEditing('tag')) {
            return (
                <div className="flex flex-col gap-1 relative" onClick={(e) => e.stopPropagation()}>
                    <input ref={editRef as React.RefObject<HTMLInputElement>} type="text" value={editValue} onChange={(e) => { setEditValue(e.target.value); setTagSuggestions(true); }}
                        onKeyDown={handleEditKeyDown} onFocus={() => setTagSuggestions(true)} aria-label="Editar tags" placeholder="tag1, tag2"
                        className="w-full bg-gruv-bg-hard border border-gruv-yellow rounded px-2 py-1.5 text-xs text-gruv-fg outline-none font-mono" />
                    {tagSuggestions && filteredTagSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-0.5 bg-gruv-bg-hard border border-gruv-bg-soft rounded-lg shadow-xl py-1 z-50 max-h-[120px] overflow-y-auto">
                            {filteredTagSuggestions.map((s) => (
                                <button key={s} onMouseDown={(e) => { e.preventDefault(); addTagSuggestion(s); }} title={`Adicionar #${s}`}
                                    className="w-full flex items-center gap-2 px-2 py-1 hover:bg-gruv-bg-soft/60 transition-colors text-left">
                                    <TagBadge tag={s} />
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-1 justify-end">
                        <button onClick={() => { setTagSuggestions(false); onCancelEdit(); }} className="p-1 rounded hover:bg-gruv-bg-soft text-gruv-gray hover:text-gruv-red" title="Cancelar"><X size={12} /></button>
                        <button onClick={() => { setTagSuggestions(false); onConfirmEdit(cena.linha, 'tag', false, editValue); }} className="p-1 rounded hover:bg-gruv-bg-soft text-gruv-gray hover:text-gruv-green" title="Confirmar"><Check size={12} /></button>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1 group/cell h-full min-h-[24px]">
                <div className="flex-1 min-w-0"><TagList tags={cena.tag} /></div>
                <button onClick={(e) => handleStartEdit('tag', e, false)} className="p-0.5 rounded opacity-0 group-hover/cell:opacity-60 hover:opacity-100! text-gruv-gray hover:text-gruv-yellow transition-all shrink-0" title="Editar tags">
                    <Pencil size={11} />
                </button>
            </div>
        );
    };

    return (
        <tr className={`group transition-colors border-b border-gruv-bg-soft/40 ${isSelected ? 'bg-gruv-bg-soft/60' : `${zebraClass} hover:bg-gruv-bg-soft/30`}`}>
            <td className="pl-4 pr-2 py-3 align-top" style={{ width: 'var(--col-ordem)', overflow: 'hidden' }}>
                <div className="flex items-start gap-1.5 overflow-hidden">
                    <button onClick={(e) => onToggleRow(cena.linha, e)} className="p-0.5 rounded hover:bg-gruv-bg-soft transition-all shrink-0" title={expanded ? 'Recolher' : 'Expandir'}>
                        <ChevronRight size={14} className={`text-gruv-gray transition-transform duration-150 ${expanded ? 'rotate-90 text-gruv-yellow' : ''}`} />
                    </button>
                    <span onClick={() => onOpenPanel(cena)} className={`font-bold text-[13px] whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer hover:text-gruv-yellow transition-colors ${isSelected ? 'text-gruv-yellow' : 'text-gruv-fg2'}`} title={`Cena ${cena.ordem}`}>
                        Cena {cena.ordem}
                    </span>
                </div>
            </td>
            <td className="px-2 py-2 align-top" style={{ width: 'var(--col-roteiro)', maxWidth: 'var(--col-roteiro)', overflow: isEditing('roteiro') ? 'visible' : 'hidden' }}>{renderTextCell('roteiro')}</td>
            <td className="px-2 py-2 align-top" style={{ width: 'var(--col-comentario)', maxWidth: 'var(--col-comentario)', overflow: isEditing('comentario') ? 'visible' : 'hidden' }}>{renderTextCell('comentario')}</td>
            <td className="px-2 py-2 align-top" style={{ width: 'var(--col-tag)', maxWidth: 'var(--col-tag)', overflow: isEditing('tag') ? 'visible' : 'hidden' }}>{renderTagCell()}</td>
            <td className="px-2 py-2 align-top relative" style={{ width: 'var(--col-status)', maxWidth: 'var(--col-status)', overflow: 'visible' }} ref={isStatusEditing ? statusDropdownRef : undefined}>
                <div onClick={(e) => onToggleStatusEdit(cena.linha, e)} className="cursor-pointer hover:opacity-80 transition-opacity flex items-center h-full min-h-[24px]" title="Alterar status">
                    <StatusBadge status={cena.status} />
                </div>
                {isStatusEditing && (
                    <div className="absolute top-full left-1 mt-0.5 bg-gruv-bg-hard border border-gruv-bg-soft rounded-lg shadow-xl py-1 z-50 min-w-[120px]">
                        {ALL_STATUSES.map((s) => (
                            <button key={s} onClick={(e) => onStatusChange(cena, s, e)} title={`Alterar para ${s}`}
                                className={`w-full flex items-center px-2.5 py-1.5 hover:bg-gruv-bg-soft/60 transition-colors ${cena.status === s ? 'bg-gruv-bg-soft/40' : ''}`}>
                                <StatusBadge status={s} />
                            </button>
                        ))}
                    </div>
                )}
            </td>
            {extraColumns.map((col) => (
                <td key={col} className="px-2 py-2 align-top" style={{ width: `var(--col-${col})`, maxWidth: `var(--col-${col})`, overflow: isEditing(col) ? 'visible' : 'hidden' }}>{renderTextCell(col, true)}</td>
            ))}
            <td className="pr-2 py-3 text-center" style={{ width: 'var(--col-spacer)' }}>
                <button onClick={() => onOpenPanel(cena)} className="p-1 rounded hover:bg-gruv-bg-soft transition-all" title="Ver detalhes da cena">
                    <ChevronRight size={14} className={`transition-opacity ${isSelected ? 'text-gruv-yellow' : 'text-gruv-gray opacity-0 group-hover:opacity-50'}`} />
                </button>
            </td>
        </tr>
    );
});
