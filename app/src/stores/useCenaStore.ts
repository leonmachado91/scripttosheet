import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cena } from '../types';

export interface FilterRule {
    id: string;
    column: string;
    operator: 'contains' | 'not_contains' | 'equals' | 'not_equals' | 'is_empty' | 'is_not_empty';
    value: string;
}

interface CenaStore {
    cenas: Cena[];
    extraColumns: string[];
    filters: FilterRule[];
    hiddenColumns: string[];
    cenaAberta: Cena | null;
    setCenas: (cenas: Cena[]) => void;
    setExtraColumns: (cols: string[]) => void;
    setFilters: (filters: FilterRule[]) => void;
    addFilter: () => void;
    updateFilter: (id: string, updates: Partial<FilterRule>) => void;
    removeFilter: (id: string) => void;
    clearFilters: () => void;
    toggleColumn: (col: string) => void;
    showAllColumns: () => void;
    setCenaAberta: (cena: Cena | null) => void;
    updateCena: (linha: number, updates: Partial<Cena>) => void;
}

let filterId = 0;

export const useCenaStore = create<CenaStore>()(
    persist(
        (set) => ({
            cenas: [],
            extraColumns: [],
            filters: [],
            hiddenColumns: [],
            cenaAberta: null,

            setCenas: (cenas) => set({ cenas, cenaAberta: null }),
            setExtraColumns: (extraColumns) => set({ extraColumns }),

            setFilters: (filters) => set({ filters }),
            addFilter: () => set((state) => ({
                filters: [...state.filters, { id: String(++filterId), column: 'status', operator: 'contains', value: '' }]
            })),
            updateFilter: (id, updates) => set((state) => ({
                filters: state.filters.map(f => f.id === id ? { ...f, ...updates } : f)
            })),
            removeFilter: (id) => set((state) => ({
                filters: state.filters.filter(f => f.id !== id)
            })),
            clearFilters: () => set({ filters: [] }),

            toggleColumn: (col) => set((state) => ({
                hiddenColumns: state.hiddenColumns.includes(col)
                    ? state.hiddenColumns.filter(c => c !== col)
                    : [...state.hiddenColumns, col]
            })),
            showAllColumns: () => set({ hiddenColumns: [] }),

            setCenaAberta: (cenaAberta) => set({ cenaAberta }),

            updateCena: (linha, updates) => set((state) => {
                const novas = state.cenas.map(c =>
                    c.linha === linha ? { ...c, ...updates } : c
                );

                const atualAtualizada = state.cenaAberta?.linha === linha
                    ? { ...state.cenaAberta, ...updates }
                    : state.cenaAberta;

                return { cenas: novas, cenaAberta: atualAtualizada };
            })
        }),
        {
            name: 'sts-cena-prefs',
            // Persistir apenas filtros e colunas ocultas (não dados transientes)
            partialize: (state) => ({
                filters: state.filters,
                hiddenColumns: state.hiddenColumns,
            }),
        }
    )
);
