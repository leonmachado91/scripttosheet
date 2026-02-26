import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useProjetoStore } from '../../stores/useProjetoStore';
import { useCenaStore } from '../../stores/useCenaStore';
import { AlignJustify, AlignLeft, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { CenaTableRow } from './CenaTableRow';
import type { Cena, StatusType } from '../../types';

type SortKey = 'ordem' | 'roteiro' | 'comentario' | 'tag' | 'status' | string;
type SortDir = 'asc' | 'desc' | null;
type EditField = 'roteiro' | 'comentario' | 'tag' | 'obs' | string;
type EditingCell = { linha: number; field: EditField; isExtra?: boolean } | null;

export function CenaTable() {
    const projetoAtual = useProjetoStore(s => s.projetoAtual);
    const searchQuery = useProjetoStore(s => s.searchQuery);
    const cenas = useCenaStore(s => s.cenas);
    const extraColumns = useCenaStore(s => s.extraColumns);
    const setCenas = useCenaStore(s => s.setCenas);
    const setExtraColumns = useCenaStore(s => s.setExtraColumns);
    const cenaAberta = useCenaStore(s => s.cenaAberta);
    const setCenaAberta = useCenaStore(s => s.setCenaAberta);
    const updateCena = useCenaStore(s => s.updateCena);
    const filters = useCenaStore(s => s.filters);
    const hiddenColumns = useCenaStore(s => s.hiddenColumns);

    const [allExpanded, setAllExpanded] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>(null);
    const [editingStatus, setEditingStatus] = useState<number | null>(null);
    const [editingCell, setEditingCell] = useState<EditingCell>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ROWS_PER_PAGE = 50;
    const tableContainerRef = useRef<HTMLDivElement>(null);

    // Resizing state
    const [colWidths,] = useState<Record<string, number>>({
        ordem: 110, // Cena
        roteiro: 300,
        comentario: 250,
        tag: 150,
        status: 120,
    });
    const resizingRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

    const handleResizeStart = (col: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const styleWidth = tableContainerRef.current?.style.getPropertyValue(`--col-${col}`);
        const currentWidth = styleWidth ? parseInt(styleWidth) : (colWidths[col] || (extraColumns.includes(col) ? 140 : 150));
        resizingRef.current = { col, startX: e.clientX, startWidth: currentWidth };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
            if (!resizingRef.current || !tableContainerRef.current) return;
            const { col: resCol, startX, startWidth: sWidth } = resizingRef.current;
            const deltaX = mouseMoveEvent.clientX - startX;
            const newWidth = Math.max(60, sWidth + deltaX); // Min width 60px
            tableContainerRef.current.style.setProperty(`--col-${resCol}`, `${newWidth}px`);
        };

        const handleMouseUp = () => {
            resizingRef.current = null;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };



    // Initial CSS variables injection
    useEffect(() => {
        if (tableContainerRef.current) {
            Object.entries(colWidths).forEach(([key, val]) => {
                tableContainerRef.current?.style.setProperty(`--col-${key}`, `${val}px`);
            });
            extraColumns.forEach(col => {
                if (!colWidths[col]) {
                    tableContainerRef.current?.style.setProperty(`--col-${col}`, `140px`);
                }
            });
            // Set a CSS variable for the spacer column
            tableContainerRef.current.style.setProperty('--col-spacer', '40px');
        }
    }, [colWidths, extraColumns]);

    // Build CSS calc expression for table width (exclude hidden columns)
    const FIXED_COLS = ['ordem', 'roteiro', 'comentario', 'tag', 'status'];
    const colCalcParts: string[] = [];
    for (const col of FIXED_COLS) {
        if (!hiddenColumns.includes(col)) colCalcParts.push(`var(--col-${col})`);
    }
    for (const col of extraColumns) {
        if (!hiddenColumns.includes(col)) colCalcParts.push(`var(--col-${col})`);
    }
    colCalcParts.push('var(--col-spacer)');
    const tableWidthCalc = `calc(${colCalcParts.join(' + ')})`;

    const { data, isLoading, error } = useQuery({
        queryKey: ['cenas', projetoAtual?.sheetId],
        queryFn: () => projetoAtual?.sheetId ? api.listarCenas(projetoAtual.sheetId) : Promise.resolve({ cenas: [], extraColumns: [] }),
        enabled: !!projetoAtual?.sheetId,
    });

    useEffect(() => {
        if (data) {
            // Handle both old format (array) and new format ({ cenas, extraColumns })
            if (Array.isArray(data)) {
                setCenas(data);
                setExtraColumns([]);
            } else {
                setCenas(data.cenas || []);
                setExtraColumns(data.extraColumns || []);
            }
        }
    }, [data, setCenas, setExtraColumns]);

    // Auto-focus + auto-expand on edit start - moved mostly to CenaTableRow

    // Tag autocomplete
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

    const isRowExpanded = (linha: number) => allExpanded || expandedRows.has(linha);

    const toggleRow = (linha: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (allExpanded) {
            const allSet = new Set(cenas.map(c => c.linha));
            allSet.delete(linha);
            setExpandedRows(allSet);
            setAllExpanded(false);
        } else {
            const next = new Set(expandedRows);
            if (next.has(linha)) next.delete(linha); else next.add(linha);
            setExpandedRows(next);
        }
    };

    const toggleAll = () => { setAllExpanded(!allExpanded); setExpandedRows(new Set()); };

    const openPanel = useCallback((cena: Cena) => {
        setEditingCell(null);
        setEditingStatus(null);
        setCenaAberta(cena);
    }, [setCenaAberta]);

    // Inline editing
    const cancelEdit = useCallback(() => { setEditingCell(null); }, []);

    // Status
    const handleStatusChange = async (cena: Cena, newStatus: StatusType, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingStatus(null);
        if (!projetoAtual?.sheetId) return;
        updateCena(cena.linha, { status: newStatus });
        try {
            await api.atualizarCena(projetoAtual.sheetId, cena.linha, { status: newStatus });
        } catch (err) {
            console.error('Erro ao salvar status:', err);
            updateCena(cena.linha, { status: cena.status });
        }
    };

    const handleToggleStatusEdit = (linha: number | null, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingCell(null);
        setEditingStatus(editingStatus === linha ? null : linha);
    };

    // Helper to get cell value by column key
    const getCellValue = (c: Cena, col: string): string => {
        if (['roteiro', 'comentario', 'tag', 'status', 'obs'].includes(col)) {
            return String((c as unknown as Record<string, string>)[col] || '');
        }
        return c.extras?.[col] || '';
    };

    // Sort + Filter
    const filteredCenas = useMemo(() => {
        let result = [...cenas];

        // Search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c =>
                `Cena ${c.ordem}`.toLowerCase().includes(q) ||
                (c.roteiro || '').toLowerCase().includes(q) ||
                (c.comentario || '').toLowerCase().includes(q) ||
                (c.tag || '').toLowerCase().includes(q) ||
                (c.status || '').toLowerCase().includes(q) ||
                Object.values(c.extras || {}).some(v => v.toLowerCase().includes(q))
            );
        }

        // Apply filter rules (AND logic)
        for (const filter of filters) {
            if (filter.operator === 'is_empty' || filter.operator === 'is_not_empty' || filter.value.trim()) {
                result = result.filter(c => {
                    const cellVal = getCellValue(c, filter.column).toLowerCase();
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

        // Sort
        if (sortKey && sortDir) {
            result.sort((a, b) => {
                const va = getCellValue(a, sortKey).toLowerCase();
                const vb = getCellValue(b, sortKey).toLowerCase();
                return sortDir === 'asc' ? va.localeCompare(vb, 'pt-BR', { numeric: true }) : vb.localeCompare(va, 'pt-BR', { numeric: true });
            });
        }
        return result;
    }, [cenas, searchQuery, sortKey, sortDir, filters]);

    // Clamp page to valid range based on filtered data
    const totalPages = Math.max(1, Math.ceil(filteredCenas.length / ROWS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            if (sortDir === 'asc') setSortDir('desc');
            else { setSortKey(null); setSortDir(null); }
        } else { setSortKey(key); setSortDir('asc'); }
    };

    const sortIcon = (col: SortKey) => {
        if (sortKey !== col) return <ArrowUpDown size={11} className="text-gruv-gray opacity-0 group-hover/th:opacity-60 transition-opacity" />;
        if (sortDir === 'asc') return <ArrowUp size={11} className="text-gruv-yellow" />;
        return <ArrowDown size={11} className="text-gruv-yellow" />;
    };

    const handleStartEditFromRow = useCallback((cena: Cena, field: string, e: React.MouseEvent, isExtra: boolean = false) => {
        e.stopPropagation();
        setEditingCell({ linha: cena.linha, field, isExtra: !!isExtra });
        setEditingStatus(null);
    }, []);

    const handleConfirmEditFromRow = useCallback(async (linha: number, field: string, isExtra: boolean, editValue: string) => {
        setEditingCell({ linha, field, isExtra: !!isExtra });
        if (!projetoAtual?.sheetId) return;
        if (isExtra) {
            const cena = cenas.find(c => c.linha === linha);
            if (cena) {
                const newExtras = { ...cena.extras, [field]: editValue };
                updateCena(linha, { extras: newExtras } as Partial<Cena>);
                try {
                    await api.atualizarCena(projetoAtual.sheetId, linha, { extras: newExtras });
                } catch (err) { console.error('Erro ao salvar:', err); }
            }
        } else {
            updateCena(linha, { [field]: editValue });
            try {
                await api.atualizarCena(projetoAtual.sheetId, linha, { [field]: editValue });
            } catch (err) { console.error('Erro ao salvar:', err); }
        }
        setEditingCell(null);
    }, [cenas, projetoAtual, updateCena]);

    if (isLoading) return <div className="flex-1 p-6 flex flex-col items-center justify-center text-gruv-gray"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gruv-yellow mb-3"></div><p className="text-sm">Carregando...</p></div>;
    if (error) return <div className="flex-1 p-6 flex flex-col items-center justify-center text-gruv-red"><p className="font-bold text-sm">Erro</p><p className="text-xs mt-1">{(error as Error).message}</p></div>;
    if (!cenas || cenas.length === 0) return <div className="flex-1 p-6 flex flex-col items-center justify-center text-gruv-gray"><p className="text-sm">Shotlist vazia.</p></div>;

    return (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            <div className="flex-1 overflow-y-auto overflow-x-auto w-full" ref={tableContainerRef}>
                <table className="text-left border-collapse table-fixed" style={{
                    width: tableWidthCalc,
                    minWidth: '100%'
                }}>
                    <thead className="sticky top-0 z-10 bg-gruv-bg-soft">
                        <tr className="text-[10px] uppercase tracking-widest text-gruv-gray font-bold">
                            {!hiddenColumns.includes('ordem') && (
                                <th className="pl-4 pr-1 py-3 border-b border-gruv-bg-soft relative group/resizer align-top" style={{ width: 'var(--col-ordem)' }}>
                                    <div className="flex items-start gap-2 overflow-hidden">
                                        <button onClick={toggleAll} title={allExpanded ? 'Recolher todos' : 'Expandir todos'} className="p-0.5 rounded hover:bg-gruv-bg transition-colors text-gruv-gray hover:text-gruv-yellow shrink-0">
                                            {allExpanded ? <AlignJustify size={12} /> : <AlignLeft size={12} />}
                                        </button>
                                        <button onClick={() => toggleSort('ordem')} className="flex items-center gap-1 group/th hover:text-gruv-fg2 transition-colors truncate">Cena {sortIcon('ordem')}</button>
                                    </div>
                                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-gruv-bg-soft/80 group-hover/resizer:bg-gruv-bg-hard transition-colors" onMouseDown={(e) => handleResizeStart('ordem', e)} />
                                </th>
                            )}
                            {!hiddenColumns.includes('roteiro') && (
                                <th className="px-2 py-3 border-b border-gruv-bg-soft relative group/resizer" style={{ width: 'var(--col-roteiro)' }}>
                                    <div className="overflow-hidden">
                                        <button onClick={() => toggleSort('roteiro')} className="flex items-center gap-1 group/th hover:text-gruv-fg2 transition-colors truncate w-full">Roteiro {sortIcon('roteiro')}</button>
                                    </div>
                                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-gruv-bg-soft/80 group-hover/resizer:bg-gruv-bg-hard transition-colors" onMouseDown={(e) => handleResizeStart('roteiro', e)} />
                                </th>
                            )}
                            {!hiddenColumns.includes('comentario') && (
                                <th className="px-2 py-3 border-b border-gruv-bg-soft relative group/resizer" style={{ width: 'var(--col-comentario)' }}>
                                    <div className="overflow-hidden">
                                        <button onClick={() => toggleSort('comentario')} className="flex items-center gap-1 group/th hover:text-gruv-fg2 transition-colors truncate w-full">Comentário {sortIcon('comentario')}</button>
                                    </div>
                                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-gruv-bg-soft/80 group-hover/resizer:bg-gruv-bg-hard transition-colors" onMouseDown={(e) => handleResizeStart('comentario', e)} />
                                </th>
                            )}
                            {!hiddenColumns.includes('tag') && (
                                <th className="px-2 py-3 border-b border-gruv-bg-soft relative group/resizer" style={{ width: 'var(--col-tag)' }}>
                                    <div className="overflow-hidden">
                                        <button onClick={() => toggleSort('tag')} className="flex items-center gap-1 group/th hover:text-gruv-fg2 transition-colors truncate w-full">Tags {sortIcon('tag')}</button>
                                    </div>
                                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-gruv-bg-soft/80 group-hover/resizer:bg-gruv-bg-hard transition-colors" onMouseDown={(e) => handleResizeStart('tag', e)} />
                                </th>
                            )}
                            {!hiddenColumns.includes('status') && (
                                <th className="px-2 py-3 border-b border-gruv-bg-soft relative group/resizer" style={{ width: 'var(--col-status)' }}>
                                    <div className="overflow-hidden">
                                        <button onClick={() => toggleSort('status')} className="flex items-center gap-1 group/th hover:text-gruv-fg2 transition-colors truncate w-full">Status {sortIcon('status')}</button>
                                    </div>
                                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-gruv-bg-soft/80 group-hover/resizer:bg-gruv-bg-hard transition-colors" onMouseDown={(e) => handleResizeStart('status', e)} />
                                </th>
                            )}
                            {/* Dynamic extra columns */}
                            {extraColumns.filter(col => !hiddenColumns.includes(col)).map((col) => (
                                <th key={col} className="px-2 py-3 border-b border-gruv-bg-soft relative group/resizer" style={{ width: `var(--col-${col})` }}>
                                    <div className="overflow-hidden">
                                        <button onClick={() => toggleSort(col)} className="flex items-center gap-1 group/th hover:text-gruv-fg2 transition-colors truncate w-full">
                                            {col} {sortIcon(col)}
                                        </button>
                                    </div>
                                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-gruv-bg-soft/80 group-hover/resizer:bg-gruv-bg-hard transition-colors" onMouseDown={(e) => handleResizeStart(col, e)} />
                                </th>
                            ))}
                            <th className="pr-2 py-3 border-b border-gruv-bg-soft" style={{ width: 'var(--col-spacer)' }}></th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {filteredCenas.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE).map((cena, idx) => (
                            <CenaTableRow
                                key={cena.linha}
                                cena={cena}
                                idx={idx}
                                isSelected={cenaAberta?.linha === cena.linha}
                                expanded={isRowExpanded(cena.linha)}
                                allProjectTags={allProjectTags}
                                isStatusEditing={editingStatus === cena.linha}
                                extraColumns={extraColumns}
                                hiddenColumns={hiddenColumns}
                                editingCell={editingCell}
                                onToggleRow={toggleRow}
                                onOpenPanel={openPanel}
                                onStartEdit={handleStartEditFromRow}
                                onConfirmEdit={handleConfirmEditFromRow}
                                onCancelEdit={cancelEdit}
                                onStatusChange={handleStatusChange}
                                onToggleStatusEdit={handleToggleStatusEdit}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex items-center justify-between px-5 py-2 border-t border-gruv-bg-soft text-[11px] text-gruv-gray shrink-0 bg-gruv-bg">
                <span>
                    Mostrando {(safePage - 1) * ROWS_PER_PAGE + 1} a {Math.min(safePage * ROWS_PER_PAGE, filteredCenas.length)} de {filteredCenas.length}
                    {searchQuery && ` (filtro: "${searchQuery}")`}
                </span>
                <div className="flex gap-2">
                    <button
                        className="px-3 py-1 rounded border border-gruv-bg-soft hover:bg-gruv-bg-soft transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                        disabled={safePage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                        Anterior
                    </button>
                    <button
                        className="px-3 py-1 rounded border border-gruv-bg-soft hover:bg-gruv-bg-soft transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                        disabled={safePage * ROWS_PER_PAGE >= filteredCenas.length}
                        onClick={() => setCurrentPage(p => p + 1)}
                    >
                        Próximo
                    </button>
                </div>
            </div>
        </div>
    );
}
