import { create } from 'zustand';
import type { Projeto } from '../types';

interface ProjetoStore {
    projetos: Projeto[];
    projetoAtual: Projeto | null;
    sidebarCollapsed: boolean;
    searchQuery: string;
    setProjetos: (projetos: Projeto[]) => void;
    setProjetoAtual: (projeto: Projeto | null) => void;
    addProjeto: (projeto: Projeto) => void;
    removeProjeto: (linha: number) => void;
    updateProjeto: (linha: number, updates: Partial<Projeto>) => void;
    toggleSidebar: () => void;
    setSearchQuery: (q: string) => void;
}

export const useProjetoStore = create<ProjetoStore>((set) => ({
    projetos: [],
    projetoAtual: null,
    sidebarCollapsed: false,
    searchQuery: '',

    setProjetos: (projetos) => set({ projetos }),
    setProjetoAtual: (projetoAtual) => set({ projetoAtual }),
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    setSearchQuery: (searchQuery) => set({ searchQuery }),

    addProjeto: (projeto) => set((state) => ({
        projetos: [...state.projetos, projeto]
    })),

    removeProjeto: (linha) => set((state) => {
        const novos = state.projetos.filter(p => p.linha !== linha);
        return {
            projetos: novos,
            projetoAtual: state.projetoAtual?.linha === linha ? null : state.projetoAtual
        };
    }),

    updateProjeto: (linha, updates) => set((state) => {
        const novos = state.projetos.map(p =>
            p.linha === linha ? { ...p, ...updates } : p
        );
        const atualAtualizado = state.projetoAtual?.linha === linha
            ? { ...state.projetoAtual, ...updates }
            : state.projetoAtual;
        return { projetos: novos, projetoAtual: atualAtualizado };
    })
}));
