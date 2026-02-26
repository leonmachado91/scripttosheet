import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useCenaStore } from '../../stores/useCenaStore';
import { useProjetoStore } from '../../stores/useProjetoStore';
import { api } from '../../services/api';
import { FileText, X, Maximize2, Minimize2, Save as SaveIcon, Pencil, Check } from 'lucide-react';
import type { StatusType } from '../../types';
import { StatusBadge, TagBadge } from './StatusBadge';
import { LinkText } from './LinkText';

const ALL_STATUSES: StatusType[] = ['Aberto', 'Layout', 'Animação', 'Concluído', 'Cancelado'];

type EditingField = 'roteiro' | 'comentario' | 'obs' | string | null;

export function CenaDetalhePanel() {
    const projetoAtual = useProjetoStore(s => s.projetoAtual);
    const cenaAberta = useCenaStore(s => s.cenaAberta);
    const setCenaAberta = useCenaStore(s => s.setCenaAberta);
    const updateCena = useCenaStore(s => s.updateCena);
    const cenas = useCenaStore(s => s.cenas);
    const extraColumns = useCenaStore(s => s.extraColumns);

    const [editingField, setEditingField] = useState<EditingField>(null);
    const [editValue, setEditValue] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [status, setStatus] = useState<StatusType>('Aberto');
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(true); // Default expanded
    const [statusOpen, setStatusOpen] = useState(false);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [editingTags, setEditingTags] = useState(false);
    const editRef = useRef<HTMLTextAreaElement>(null);
    const tagInputRef = useRef<HTMLInputElement>(null);
    const statusRef = useRef<HTMLDivElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    const allProjectTags = useMemo(() => {
        const set = new Set<string>();
        cenas.forEach(c => {
            if (c.tag) c.tag.split(',').forEach(t => {
                const clean = t.trim().toLowerCase();
                if (clean) set.add(clean);
            });
        });
        return Array.from(set).sort();
    }, [cenas]);

    const filteredSuggestions = useMemo(() => {
        if (!tagInput.trim()) return allProjectTags.filter(t => !tags.includes(t));
        const q = tagInput.trim().toLowerCase();
        return allProjectTags.filter(t => t.includes(q) && !tags.includes(t));
    }, [tagInput, allProjectTags, tags]);

    // Sync state when cena changes
    useEffect(() => {
        if (cenaAberta) {
            setTags(cenaAberta.tag ? cenaAberta.tag.split(',').map(t => t.trim()).filter(Boolean) : []);
            setTagInput('');
            setStatus(cenaAberta.status || 'Aberto');
            setLastSaved(null);
            setShowUnsavedModal(false);
            setShowSuggestions(false);
            setEditingField(null);
            setEditingTags(false);
        }
    }, [cenaAberta]);

    // Auto-focus + auto-expand on edit start
    useEffect(() => {
        if (editingField && editRef.current) {
            const el = editRef.current;
            el.focus();
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        }
    }, [editingField]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) setShowSuggestions(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Check if status or tags changed
    const isDirty = useCallback(() => {
        if (!cenaAberta) return false;
        return tags.join(', ') !== (cenaAberta.tag || '') || status !== (cenaAberta.status || 'Aberto');
    }, [cenaAberta, tags, status]);

    if (!cenaAberta || !projetoAtual) return null;

    // Get current value for a field (from cena or extras)
    const getFieldValue = (field: string): string => {
        if (['roteiro', 'comentario', 'obs'].includes(field)) {
            return (cenaAberta[field as keyof typeof cenaAberta] as string) || '';
        }
        return cenaAberta.extras?.[field] || '';
    };

    // Start editing a text field
    const startFieldEdit = (field: string) => {
        setEditingField(field);
        setEditValue(getFieldValue(field));
    };

    // Confirm a single field edit and save immediately
    const confirmFieldEdit = async () => {
        if (!editingField) return;
        const field = editingField;
        setEditingField(null);

        if (['roteiro', 'comentario', 'obs'].includes(field)) {
            if (editValue === getFieldValue(field)) return; // No change
            updateCena(cenaAberta.linha, { [field]: editValue });
            try {
                await api.atualizarCena(projetoAtual.sheetId, cenaAberta.linha, { [field]: editValue });
                setLastSaved(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
            } catch (err) { console.error('Erro ao salvar:', err); }
        } else {
            // Extra field
            const newExtras = { ...cenaAberta.extras, [field]: editValue };
            updateCena(cenaAberta.linha, { extras: newExtras } as any);
            try {
                await api.atualizarCena(projetoAtual.sheetId, cenaAberta.linha, { extras: newExtras });
                setLastSaved(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
            } catch (err) { console.error('Erro ao salvar:', err); }
        }
    };

    const cancelFieldEdit = () => setEditingField(null);

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') cancelFieldEdit();
        if (e.key === 'Enter' && !e.shiftKey && editingField !== 'roteiro' && editingField !== 'comentario') {
            e.preventDefault(); confirmFieldEdit();
        }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditValue(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    // Close panel logic
    const attemptClose = () => { if (isDirty()) { setShowUnsavedModal(true); } else { setCenaAberta(null); } };
    const handleDiscard = () => { setShowUnsavedModal(false); setCenaAberta(null); };
    const handleSaveAndClose = async () => { setShowUnsavedModal(false); await handleSave(); setCenaAberta(null); };
    const handleCancelModal = () => setShowUnsavedModal(false);

    // Tags
    const addTag = (value: string) => {
        const clean = value.trim().toLowerCase();
        if (clean && !tags.includes(clean)) setTags([...tags, clean]);
        setTagInput('');
        setShowSuggestions(false);
    };
    const removeTag = (t: string) => setTags(tags.filter(x => x !== t));
    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
        else if (e.key === 'Backspace' && !tagInput && tags.length > 0) setTags(tags.slice(0, -1));
        else if (e.key === 'Escape') { setShowSuggestions(false); setEditingTags(false); }
    };

    // Save tags + status
    const handleSave = async () => {
        if (editingField) await confirmFieldEdit();
        try {
            setIsSaving(true);
            const tagString = tags.join(', ');
            await api.atualizarCena(projetoAtual.sheetId, cenaAberta.linha, { tag: tagString, status });
            updateCena(cenaAberta.linha, { tag: tagString, status });
            setLastSaved(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        } catch (err) {
            console.error('Erro ao salvar:', err);
        } finally {
            setIsSaving(false);
        }
    };

    // Render a view/edit field
    const renderField = (field: string, label: string, placeholder: string, mono = false) => {
        const value = getFieldValue(field);
        const isEditing = editingField === field;

        return (
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-gruv-gray uppercase tracking-wider">{label}</label>
                    {!isEditing && (
                        <button onClick={() => startFieldEdit(field)} className="p-1 rounded text-gruv-gray hover:text-gruv-yellow hover:bg-gruv-bg-soft/60 transition-all" title={`Editar ${label}`}>
                            <Pencil size={12} />
                        </button>
                    )}
                </div>
                {isEditing ? (
                    <div>
                        <textarea
                            ref={editRef}
                            value={editValue}
                            onChange={handleTextareaChange}
                            onKeyDown={handleEditKeyDown}
                            placeholder={placeholder}
                            className={`w-full bg-gruv-bg-hard border border-gruv-yellow rounded-lg p-3 text-[13px] leading-relaxed focus:ring-1 focus:ring-gruv-yellow outline-none resize-none overflow-hidden ${mono ? 'text-gruv-yellow font-mono' : 'text-gruv-fg'}`}
                        />
                        <div className="flex gap-1 justify-end mt-1">
                            <button onClick={cancelFieldEdit} className="p-1 rounded hover:bg-gruv-bg-soft text-gruv-gray hover:text-gruv-red" title="Cancelar (Esc)"><X size={13} /></button>
                            <button onClick={confirmFieldEdit} className="p-1 rounded hover:bg-gruv-bg-soft text-gruv-gray hover:text-gruv-green" title="Confirmar"><Check size={13} /></button>
                        </div>
                    </div>
                ) : (
                    <div
                        className={`w-full rounded-lg p-3 text-[13px] leading-relaxed border border-transparent whitespace-pre-wrap break-words ${mono ? 'text-gruv-yellow font-mono' : 'text-gruv-fg'}`}
                    >
                        {value ? <LinkText text={value} /> : <span className="text-gruv-gray/40 italic">vazio</span>}
                    </div>
                )}
            </div>
        );
    };

    const panelClasses = expanded ? 'fixed inset-8 w-auto max-w-[800px] mx-auto' : 'fixed top-3 right-3 bottom-3 w-[420px]';

    return (
        <>
            <div className="fixed inset-0 bg-black/30 z-30" onClick={attemptClose} />

            <aside className={`${panelClasses} bg-gruv-bg rounded-xl border border-gruv-bg-soft shadow-2xl flex flex-col z-40 overflow-hidden`}>

                {/* Header */}
                <div className="relative px-6 pt-5 pb-4 border-b border-gruv-bg-soft shrink-0">
                    <div className="absolute top-4 right-4 flex gap-1">
                        <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg text-gruv-fg4 hover:text-gruv-fg0 hover:bg-gruv-bg-soft/60 transition-colors" title={expanded ? 'Painel lateral' : 'Tela cheia'}>
                            {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                        </button>
                        <button onClick={attemptClose} className="p-1.5 rounded-lg text-gruv-fg4 hover:text-gruv-fg0 hover:bg-gruv-bg-soft/60 transition-colors" title="Fechar">
                            <X size={15} />
                        </button>
                    </div>
                    <div className="h-12 w-12 bg-gruv-bg-soft rounded-xl flex items-center justify-center mb-3">
                        <FileText className="text-gruv-yellow" size={24} />
                    </div>
                    <h2 className="text-lg font-bold text-gruv-fg0">Cena {cenaAberta.ordem}</h2>
                    <p className="text-[11px] text-gruv-gray font-mono mt-0.5">Linha {cenaAberta.linha}</p>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                    {/* Status */}
                    <div ref={statusRef} className="relative">
                        <label className="block text-[10px] font-bold text-gruv-gray uppercase tracking-wider mb-2">Status</label>
                        <button onClick={() => setStatusOpen(!statusOpen)} className="hover:opacity-80 transition-opacity" title="Alterar status">
                            <StatusBadge status={status} size="md" />
                        </button>
                        {statusOpen && (
                            <div className="absolute top-full left-0 mt-1 bg-gruv-bg-hard border border-gruv-bg-soft rounded-lg shadow-xl py-1 z-50 min-w-[130px]">
                                {ALL_STATUSES.map((s) => (
                                    <button key={s} onClick={() => { setStatus(s); setStatusOpen(false); }} title={`Definir como ${s}`}
                                        className={`w-full flex items-center px-3 py-1.5 hover:bg-gruv-bg-soft/60 transition-colors ${status === s ? 'bg-gruv-bg-soft/40' : ''}`}>
                                        <StatusBadge status={s} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tags */}
                    <div ref={suggestionsRef} className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-bold text-gruv-gray uppercase tracking-wider">Tags</label>
                            {!editingTags && (
                                <button onClick={() => { setEditingTags(true); setTimeout(() => tagInputRef.current?.focus(), 50); }} className="p-1 rounded text-gruv-gray hover:text-gruv-yellow hover:bg-gruv-bg-soft/60 transition-all" title="Editar tags">
                                    <Pencil size={12} />
                                </button>
                            )}
                        </div>
                        {editingTags ? (
                            <div>
                                <div className="flex flex-wrap gap-1.5 bg-gruv-bg-hard border border-gruv-yellow rounded-lg p-2 min-h-[38px] cursor-text focus-within:ring-1 focus-within:ring-gruv-yellow transition-all"
                                    onClick={() => { tagInputRef.current?.focus(); setShowSuggestions(true); }}>
                                    {tags.map((t) => (
                                        <span key={t} className="inline-flex items-center gap-1">
                                            <TagBadge tag={t} />
                                            <button onClick={(e) => { e.stopPropagation(); removeTag(t); }}
                                                className="w-4 h-4 rounded-full bg-gruv-bg-soft flex items-center justify-center text-gruv-gray hover:bg-gruv-red hover:text-white transition-colors text-[10px] font-bold leading-none"
                                                title={`Remover #${t}`}>×</button>
                                        </span>
                                    ))}
                                    <input ref={tagInputRef} type="text" value={tagInput}
                                        onChange={(e) => { setTagInput(e.target.value); setShowSuggestions(true); }}
                                        onKeyDown={handleTagKeyDown}
                                        onFocus={() => setShowSuggestions(true)}
                                        onBlur={() => { setTimeout(() => { if (tagInput) addTag(tagInput); }, 150); }}
                                        placeholder={tags.length === 0 ? 'Digite ou escolha...' : '+'}
                                        className="flex-1 min-w-[60px] bg-transparent text-xs font-mono text-gruv-fg outline-none placeholder-gruv-gray" />
                                </div>
                                <div className="flex gap-1 justify-end mt-1">
                                    <button onClick={() => setEditingTags(false)} className="p-1 rounded hover:bg-gruv-bg-soft text-gruv-gray hover:text-gruv-green" title="Fechar edição de tags"><Check size={13} /></button>
                                </div>
                                {showSuggestions && filteredSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-gruv-bg-hard border border-gruv-bg-soft rounded-lg shadow-xl py-1 z-50 max-h-[140px] overflow-y-auto">
                                        {filteredSuggestions.map((s) => (
                                            <button key={s} onMouseDown={(e) => { e.preventDefault(); addTag(s); }} title={`Adicionar #${s}`}
                                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gruv-bg-soft/60 transition-colors text-left">
                                                <TagBadge tag={s} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div onClick={() => { setEditingTags(true); setTimeout(() => tagInputRef.current?.focus(), 50); }}
                                className="flex flex-wrap gap-1.5 rounded-lg p-2 min-h-[38px] cursor-pointer border border-transparent hover:border-gruv-bg-soft transition-colors">
                                {tags.length > 0
                                    ? tags.map(t => <TagBadge key={t} tag={t} />)
                                    : <span className="text-gruv-gray/40 italic text-xs">sem tags — clique para editar</span>
                                }
                            </div>
                        )}
                    </div>

                    {/* Core text fields — view mode by default */}
                    {renderField('roteiro', 'Roteiro', 'Texto do roteiro...')}
                    {renderField('comentario', 'Comentário', 'Direções de edição...', true)}
                    {renderField('obs', 'OBS do Editor', 'Anotações internas...')}

                    {/* Dynamic Extra Columns */}
                    {extraColumns.length > 0 && (
                        <div className="border-t border-gruv-bg-soft pt-4 space-y-4">
                            <p className="text-[10px] font-bold text-gruv-gray uppercase tracking-wider">Campos Adicionais</p>
                            {extraColumns.map((col) => renderField(col, col, `${col}...`))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gruv-bg-soft flex items-center justify-between shrink-0">
                    <span className="text-[11px] text-gruv-gray">{lastSaved ? `Salvo às ${lastSaved}` : isDirty() ? '⚠ Não salvo' : 'Sem alterações'}</span>
                    <button onClick={handleSave} disabled={isSaving || !isDirty()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gruv-red text-white text-xs font-bold hover:bg-gruv-red/90 transition-colors disabled:opacity-40 shadow-sm">
                        {isSaving ? <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span> : <SaveIcon size={14} />}
                        {isSaving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </aside>

            {/* Unsaved modal */}
            {showUnsavedModal && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-50" />
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="bg-gruv-bg border border-gruv-bg-soft rounded-xl shadow-2xl p-6 w-[380px]">
                            <h3 className="text-base font-bold text-gruv-fg0 mb-2">Alterações não salvas</h3>
                            <p className="text-sm text-gruv-fg4 mb-5">Você tem alterações que não foram salvas. O que deseja fazer?</p>
                            <div className="flex gap-2 justify-end">
                                <button onClick={handleCancelModal} className="px-4 py-2 rounded-lg text-xs font-bold text-gruv-fg4 hover:text-gruv-fg0 hover:bg-gruv-bg-soft transition-colors">Voltar à edição</button>
                                <button onClick={handleDiscard} className="px-4 py-2 rounded-lg text-xs font-bold text-gruv-red border border-gruv-red/30 hover:bg-gruv-red/10 transition-colors">Descartar</button>
                                <button onClick={handleSaveAndClose} className="px-4 py-2 rounded-lg text-xs font-bold bg-gruv-green text-gruv-bg hover:bg-gruv-green/90 transition-colors">Salvar</button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
