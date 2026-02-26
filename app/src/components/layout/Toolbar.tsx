import { useState, useRef, useEffect, useMemo } from 'react';
import { useCenaStore, type FilterRule } from '../../stores/useCenaStore';
import { Filter, ArrowUpDown, Tags, Download, Plus, Trash2 } from 'lucide-react';

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

    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!filterOpen) return;
        const handler = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [filterOpen]);

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

            <button className="flex items-center gap-2 px-3 py-1.5 rounded border border-gruv-bg-soft bg-gruv-bg hover:bg-gruv-bg-soft transition-colors text-gruv-fg4 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed" disabled title="Em breve">
                <Download size={16} />
                Exportar
            </button>
        </div>
    );
}
