import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useCenaStore, type FilterRule } from '../../stores/useCenaStore';
import { Filter, ArrowUpDown, Tags, Download, Plus, Trash2, Columns3, Eye, EyeOff, Copy, FileDown, Youtube, Link, Table2 } from 'lucide-react';
import { extractYoutubeLinks, extractAllLinks } from '../../utils/linkParser';

const OPERATORS: { value: FilterRule['operator']; label: string }[] = [
    { value: 'contains', label: 'contém' },
    { value: 'not_contains', label: 'não contém' },
    { value: 'equals', label: 'é exatamente' },
    { value: 'not_equals', label: 'não é' },
    { value: 'is_empty', label: 'está vazio' },
    { value: 'is_not_empty', label: 'não está vazio' },
];

const NO_VALUE_OPS = ['is_empty', 'is_not_empty'];

export function Toolbar() {
    const cenas = useCenaStore(s => s.cenas);
    const extraColumns = useCenaStore(s => s.extraColumns);
    const filters = useCenaStore(s => s.filters);
    const addFilter = useCenaStore(s => s.addFilter);
    const updateFilter = useCenaStore(s => s.updateFilter);
    const removeFilter = useCenaStore(s => s.removeFilter);
    const clearFilters = useCenaStore(s => s.clearFilters);
    const hiddenColumns = useCenaStore(s => s.hiddenColumns);
    const toggleColumn = useCenaStore(s => s.toggleColumn);
    const showAllColumns = useCenaStore(s => s.showAllColumns);

    const [filterOpen, setFilterOpen] = useState(false);
    const [columnsOpen, setColumnsOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [exportFeedback, setExportFeedback] = useState<string | null>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const columnsRef = useRef<HTMLDivElement>(null);
    const exportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!filterOpen && !columnsOpen && !exportOpen) return;
        const handler = (e: MouseEvent) => {
            if (filterOpen && filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
            if (columnsOpen && columnsRef.current && !columnsRef.current.contains(e.target as Node)) setColumnsOpen(false);
            if (exportOpen && exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [filterOpen, columnsOpen, exportOpen]);

    // Apply same filter logic as CenaTable so export respects active filters
    const visibleCenas = useMemo(() => {
        let result = [...cenas];

        for (const filter of filters) {
            if (filter.operator === 'is_empty' || filter.operator === 'is_not_empty' || filter.value.trim()) {
                result = result.filter(c => {
                    const col = filter.column;
                    const cellVal = (['roteiro', 'comentario', 'tag', 'status', 'obs'].includes(col)
                        ? String((c as unknown as Record<string, string>)[col] || '')
                        : c.extras?.[col] || ''
                    ).toLowerCase();
                    const filterVal = filter.value.trim().toLowerCase();
                    switch (filter.operator) {
                        case 'contains': return cellVal.includes(filterVal);
                        case 'not_contains': return !cellVal.includes(filterVal);
                        case 'equals': return cellVal === filterVal;
                        case 'not_equals': return cellVal !== filterVal;
                        case 'is_empty': return cellVal === '';
                        case 'is_not_empty': return cellVal !== '';
                        default: return true;
                    }
                });
            }
        }

        return result;
    }, [cenas, filters]);

    const youtubeLinks = useMemo(() => extractYoutubeLinks(visibleCenas), [visibleCenas]);
    const allLinks = useMemo(() => extractAllLinks(visibleCenas), [visibleCenas]);

    const showFeedback = useCallback((msg: string) => {
        setExportFeedback(msg);
        setExportOpen(false);
        setTimeout(() => setExportFeedback(null), 2000);
    }, []);

    const handleCopyLinks = useCallback(async (links: string[]) => {
        if (links.length === 0) return;
        try {
            await navigator.clipboard.writeText(links.join('\n'));
            showFeedback('Copiado!');
        } catch {
            showFeedback('Erro ao copiar');
        }
    }, [showFeedback]);

    const handleDownloadLinks = useCallback((links: string[], filename: string) => {
        if (links.length === 0) return;
        const blob = new Blob([links.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showFeedback('Baixado!');
    }, [showFeedback]);

    const handleDownloadCsv = useCallback(() => {
        if (visibleCenas.length === 0) return;
        const escapeCsv = (val: string) => {
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                return '"' + val.replace(/"/g, '""') + '"';
            }
            return val;
        };

        // Fixed columns with their keys and labels
        const fixedDefs: { key: string; label: string }[] = [
            { key: 'ordem', label: 'Cena' },
            { key: 'roteiro', label: 'Roteiro' },
            { key: 'comentario', label: 'Comentário' },
            { key: 'tag', label: 'Tags' },
            { key: 'status', label: 'Status' },
            { key: 'obs', label: 'OBS' },
        ];
        const visibleFixed = fixedDefs.filter(d => !hiddenColumns.includes(d.key));
        const visibleExtras = extraColumns.filter(col => !hiddenColumns.includes(col));

        const header = [...visibleFixed.map(d => d.label), ...visibleExtras].map(escapeCsv).join(',');
        const rows = visibleCenas.map(c => {
            const fixedVals = visibleFixed.map(d => {
                if (d.key === 'ordem') return String(c.ordem);
                return String((c as unknown as Record<string, string>)[d.key] || '');
            });
            const extraVals = visibleExtras.map(col => c.extras?.[col] || '');
            return [...fixedVals, ...extraVals].map(escapeCsv).join(',');
        });
        const csv = '\uFEFF' + [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tabela-cenas.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showFeedback('CSV exportado!');
    }, [visibleCenas, extraColumns, hiddenColumns, showFeedback]);

    const columns = useMemo(() => [
        { key: 'roteiro', label: 'Roteiro' },
        { key: 'comentario', label: 'Comentário' },
        { key: 'tag', label: 'Tags' },
        { key: 'status', label: 'Status' },
        { key: 'obs', label: 'OBS' },
        ...extraColumns.map(c => ({ key: c, label: c })),
    ], [extraColumns]);

    // Collect unique values for the selected column (for quick-pick)
    const getColumnValues = (colKey: string) => {
        const vals = new Set<string>();
        cenas.forEach(c => {
            let v = '';
            if (['roteiro', 'comentario', 'tag', 'status', 'obs'].includes(colKey)) {
                v = String((c as unknown as Record<string, string>)[colKey] || '');
            } else {
                v = c.extras?.[colKey] || '';
            }
            if (v.trim()) {
                // For tags, split by comma
                if (colKey === 'tag') {
                    v.split(',').forEach(t => { const clean = t.trim(); if (clean) vals.add(clean); });
                } else {
                    vals.add(v.trim());
                }
            }
        });
        return Array.from(vals).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    };

    const activeCount = filters.length;

    return (
        <div className="flex flex-wrap gap-3 px-6 py-4 border-b border-gruv-bg-soft bg-gruv-bg-hard items-center box-border h-[65px]">

            {/* View Switcher */}
            <div className="flex items-center bg-gruv-bg rounded border border-gruv-bg-soft p-1">
                <button className="px-3 py-1.5 rounded text-xs font-bold bg-gruv-bg-soft text-gruv-fg0 shadow-sm">
                    Tabela
                </button>
                <button className="px-3 py-1.5 rounded text-xs font-medium text-gruv-gray hover:text-gruv-fg2 transition-colors disabled:opacity-50" disabled title="Em breve">
                    Lista
                </button>
                <button className="px-3 py-1.5 rounded text-xs font-medium text-gruv-gray hover:text-gruv-fg2 transition-colors disabled:opacity-50" disabled title="Em breve">
                    Kanban
                </button>
            </div>

            <div className="h-6 w-px bg-gruv-bg-soft mx-1"></div>

            {/* Filter Button */}
            <div ref={filterRef} className="relative">
                <button
                    onClick={() => setFilterOpen(!filterOpen)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors text-xs font-medium
                        ${activeCount > 0
                            ? 'border-gruv-yellow bg-gruv-yellow/10 text-gruv-yellow'
                            : 'border-gruv-bg-soft bg-gruv-bg hover:bg-gruv-bg-soft text-gruv-fg4'}`}
                    title="Filtrar linhas"
                >
                    <Filter size={16} />
                    Filtrar
                    {activeCount > 0 && (
                        <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-gruv-yellow text-gruv-bg text-[10px] font-bold leading-none">
                            {activeCount}
                        </span>
                    )}
                </button>

                {/* Filter Panel */}
                {filterOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-gruv-bg-hard border border-gruv-bg-soft rounded-xl shadow-2xl z-50 w-[480px] max-h-[400px] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gruv-bg-soft">
                            <span className="text-xs font-bold text-gruv-fg2">Filtros</span>
                            <div className="flex items-center gap-2">
                                {activeCount > 0 && (
                                    <button onClick={clearFilters} className="text-[11px] text-gruv-red hover:text-gruv-red/80 font-medium transition-colors" title="Limpar todos">
                                        Limpar todos
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filter rules */}
                        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
                            {filters.length === 0 && (
                                <p className="text-xs text-gruv-gray py-3 text-center">Nenhum filtro ativo. Clique em "+ Adicionar filtro" abaixo.</p>
                            )}

                            {filters.map((filter, idx) => {
                                const colVals = getColumnValues(filter.column);
                                const needsValue = !NO_VALUE_OPS.includes(filter.operator);
                                return (
                                    <div key={filter.id} className="flex items-center gap-2 group">
                                        {/* WHERE / AND label */}
                                        <span className="text-[10px] font-bold text-gruv-gray uppercase w-[36px] shrink-0 text-right">
                                            {idx === 0 ? 'Onde' : 'E'}
                                        </span>

                                        {/* Column selector */}
                                        <select
                                            value={filter.column}
                                            onChange={(e) => updateFilter(filter.id, { column: e.target.value, value: '' })}
                                            className="bg-gruv-bg border border-gruv-bg-soft rounded px-2 py-1.5 text-xs text-gruv-fg outline-none focus:border-gruv-yellow min-w-[100px]"
                                        >
                                            {columns.map(c => (
                                                <option key={c.key} value={c.key}>{c.label}</option>
                                            ))}
                                        </select>

                                        {/* Operator */}
                                        <select
                                            value={filter.operator}
                                            onChange={(e) => updateFilter(filter.id, { operator: e.target.value as FilterRule['operator'] })}
                                            className="bg-gruv-bg border border-gruv-bg-soft rounded px-2 py-1.5 text-xs text-gruv-fg outline-none focus:border-gruv-yellow min-w-[110px]"
                                        >
                                            {OPERATORS.map(o => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>

                                        {/* Value input or dropdown */}
                                        {needsValue && (
                                            colVals.length > 0 && colVals.length <= 20 ? (
                                                <div className="flex-1 flex gap-1">
                                                    <select
                                                        value={filter.value}
                                                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                                        className="flex-1 bg-gruv-bg border border-gruv-bg-soft rounded px-2 py-1.5 text-xs text-gruv-fg outline-none focus:border-gruv-yellow"
                                                    >
                                                        <option value="">selecione...</option>
                                                        {colVals.map(v => (
                                                            <option key={v} value={v}>{v}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={filter.value}
                                                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                                        placeholder="ou digite..."
                                                        className="w-[90px] bg-gruv-bg border border-gruv-bg-soft rounded px-2 py-1.5 text-xs text-gruv-fg outline-none focus:border-gruv-yellow placeholder-gruv-gray"
                                                    />
                                                </div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={filter.value}
                                                    onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                                    placeholder="valor..."
                                                    className="flex-1 bg-gruv-bg border border-gruv-bg-soft rounded px-2 py-1.5 text-xs text-gruv-fg outline-none focus:border-gruv-yellow placeholder-gruv-gray"
                                                />
                                            )
                                        )}

                                        {/* Remove */}
                                        <button
                                            onClick={() => removeFilter(filter.id)}
                                            className="p-1 rounded text-gruv-gray hover:text-gruv-red hover:bg-gruv-bg-soft/60 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                            title="Remover filtro"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2.5 border-t border-gruv-bg-soft">
                            <button
                                onClick={addFilter}
                                className="flex items-center gap-1.5 text-xs font-medium text-gruv-blue hover:text-gruv-blue/80 transition-colors"
                                title="Adicionar filtro"
                            >
                                <Plus size={13} />
                                Adicionar filtro
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Column Visibility Button */}
            <div ref={columnsRef} className="relative">
                <button
                    onClick={() => setColumnsOpen(!columnsOpen)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors text-xs font-medium
                        ${hiddenColumns.length > 0
                            ? 'border-gruv-aqua bg-gruv-aqua/10 text-gruv-aqua'
                            : 'border-gruv-bg-soft bg-gruv-bg hover:bg-gruv-bg-soft text-gruv-fg4'}`}
                    title="Mostrar/ocultar colunas"
                >
                    <Columns3 size={16} />
                    Colunas
                    {hiddenColumns.length > 0 && (
                        <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-gruv-aqua text-gruv-bg text-[10px] font-bold leading-none">
                            {hiddenColumns.length}
                        </span>
                    )}
                </button>

                {columnsOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-gruv-bg-hard border border-gruv-bg-soft rounded-xl shadow-2xl z-50 w-[220px] max-h-[350px] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gruv-bg-soft">
                            <span className="text-xs font-bold text-gruv-fg2">Colunas</span>
                            {hiddenColumns.length > 0 && (
                                <button onClick={showAllColumns} className="text-[11px] text-gruv-aqua hover:text-gruv-aqua/80 font-medium transition-colors">
                                    Mostrar todas
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
                            {columns.map(c => {
                                const isHidden = hiddenColumns.includes(c.key);
                                return (
                                    <button
                                        key={c.key}
                                        onClick={() => toggleColumn(c.key)}
                                        className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs transition-colors
                                            ${isHidden
                                                ? 'text-gruv-gray hover:bg-gruv-bg-soft/50'
                                                : 'text-gruv-fg hover:bg-gruv-bg-soft'}`}
                                    >
                                        {isHidden
                                            ? <EyeOff size={13} className="text-gruv-gray shrink-0" />
                                            : <Eye size={13} className="text-gruv-aqua shrink-0" />}
                                        <span className={isHidden ? 'line-through opacity-60' : ''}>{c.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <button className="flex items-center gap-2 px-3 py-1.5 rounded border border-gruv-bg-soft bg-gruv-bg hover:bg-gruv-bg-soft transition-colors text-gruv-fg4 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled title="Em breve">
                <ArrowUpDown size={16} />
                Ordenar
            </button>

            <button className="flex items-center gap-2 px-3 py-1.5 rounded border border-gruv-bg-soft bg-gruv-bg hover:bg-gruv-bg-soft transition-colors text-gruv-fg4 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled title="Em breve">
                <Tags size={16} />
                Tags
            </button>

            <div className="flex-1"></div>

            <span className="text-xs text-gruv-gray font-mono">{cenas.length} cenas</span>

            <div ref={exportRef} className="relative">
                <button
                    onClick={() => setExportOpen(!exportOpen)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors text-xs font-medium
                        ${exportOpen
                            ? 'border-gruv-green bg-gruv-green/10 text-gruv-green'
                            : 'border-gruv-bg-soft bg-gruv-bg hover:bg-gruv-bg-soft text-gruv-fg4'}`}
                    title="Exportar dados"
                >
                    <Download size={16} />
                    Exportar
                    {allLinks.length > 0 && (
                        <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-gruv-green text-gruv-bg text-[10px] font-bold leading-none">
                            {allLinks.length}
                        </span>
                    )}
                </button>

                {exportOpen && (
                    <div className="absolute top-full right-0 mt-1 bg-gruv-bg-hard border border-gruv-bg-soft rounded-xl shadow-2xl z-50 w-[260px] overflow-hidden flex flex-col">
                        <div className="px-4 py-3 border-b border-gruv-bg-soft">
                            <span className="text-xs font-bold text-gruv-fg2">Exportar</span>
                        </div>
                        <div className="px-2 py-2 space-y-0.5">
                            {/* YouTube Links */}
                            <div className="px-3 py-1.5 flex items-center gap-2 text-[10px] uppercase font-bold text-gruv-gray tracking-wide">
                                <Youtube size={12} />
                                Links YouTube
                                {youtubeLinks.length > 0 && (
                                    <span className="text-gruv-green font-mono">({youtubeLinks.length})</span>
                                )}
                            </div>
                            <button
                                onClick={() => handleCopyLinks(youtubeLinks)}
                                disabled={youtubeLinks.length === 0}
                                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs transition-colors
                                    text-gruv-fg hover:bg-gruv-bg-soft disabled:text-gruv-gray disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                title={youtubeLinks.length === 0 ? 'Nenhum link YouTube encontrado' : `Copiar ${youtubeLinks.length} link(s)`}
                            >
                                <Copy size={13} className="shrink-0" />
                                Copiar para área de transferência
                            </button>
                            <button
                                onClick={() => handleDownloadLinks(youtubeLinks, 'youtube-links.txt')}
                                disabled={youtubeLinks.length === 0}
                                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs transition-colors
                                    text-gruv-fg hover:bg-gruv-bg-soft disabled:text-gruv-gray disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                title={youtubeLinks.length === 0 ? 'Nenhum link YouTube encontrado' : `Baixar ${youtubeLinks.length} link(s) como .txt`}
                            >
                                <FileDown size={13} className="shrink-0" />
                                Baixar como .txt
                            </button>

                            {/* Divider */}
                            <div className="my-1 border-t border-gruv-bg-soft" />

                            {/* All Links */}
                            <div className="px-3 py-1.5 flex items-center gap-2 text-[10px] uppercase font-bold text-gruv-gray tracking-wide">
                                <Link size={12} />
                                Todos os Links
                                {allLinks.length > 0 && (
                                    <span className="text-gruv-blue font-mono">({allLinks.length})</span>
                                )}
                            </div>
                            <button
                                onClick={() => handleCopyLinks(allLinks)}
                                disabled={allLinks.length === 0}
                                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs transition-colors
                                    text-gruv-fg hover:bg-gruv-bg-soft disabled:text-gruv-gray disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                title={allLinks.length === 0 ? 'Nenhum link encontrado' : `Copiar ${allLinks.length} link(s)`}
                            >
                                <Copy size={13} className="shrink-0" />
                                Copiar para área de transferência
                            </button>
                            <button
                                onClick={() => handleDownloadLinks(allLinks, 'todos-links.txt')}
                                disabled={allLinks.length === 0}
                                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs transition-colors
                                    text-gruv-fg hover:bg-gruv-bg-soft disabled:text-gruv-gray disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                title={allLinks.length === 0 ? 'Nenhum link encontrado' : `Baixar ${allLinks.length} link(s) como .txt`}
                            >
                                <FileDown size={13} className="shrink-0" />
                                Baixar como .txt
                            </button>

                            {/* Divider */}
                            <div className="my-1 border-t border-gruv-bg-soft" />

                            {/* CSV */}
                            <div className="px-3 py-1.5 flex items-center gap-2 text-[10px] uppercase font-bold text-gruv-gray tracking-wide">
                                <Table2 size={12} />
                                Tabela
                                {visibleCenas.length > 0 && (
                                    <span className="text-gruv-orange font-mono">({visibleCenas.length} cenas)</span>
                                )}
                            </div>
                            <button
                                onClick={handleDownloadCsv}
                                disabled={visibleCenas.length === 0}
                                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs transition-colors
                                    text-gruv-fg hover:bg-gruv-bg-soft disabled:text-gruv-gray disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                title={visibleCenas.length === 0 ? 'Nenhuma cena visível' : `Exportar ${visibleCenas.length} cena(s) como CSV`}
                            >
                                <FileDown size={13} className="shrink-0" />
                                Baixar como .csv
                            </button>
                        </div>
                    </div>
                )}

                {exportFeedback && (
                    <div className="absolute top-full right-0 mt-1 px-3 py-1.5 rounded-lg bg-gruv-green text-gruv-bg text-xs font-bold shadow-lg animate-pulse z-50">
                        {exportFeedback}
                    </div>
                )}
            </div>
        </div>
    );
}
