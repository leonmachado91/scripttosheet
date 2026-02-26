import { useProjetoStore } from '../../stores/useProjetoStore';
import { FileText, Plus, Folder, Book, Layers, Archive } from 'lucide-react';
import { useState } from 'react';
import { NovoProjetoModal } from '../projeto/NovoProjetoModal';

interface SidebarProps {
    isLoading: boolean;
    error: string | null;
}

const ICONS = [FileText, Book, Folder, Layers, Archive];

export function Sidebar({ isLoading, error }: SidebarProps) {
    const projetos = useProjetoStore(state => state.projetos);
    const projetoAtual = useProjetoStore(state => state.projetoAtual);
    const setProjetoAtual = useProjetoStore(state => state.setProjetoAtual);
    const collapsed = useProjetoStore(state => state.sidebarCollapsed);
    const toggleSidebar = useProjetoStore(state => state.toggleSidebar);
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <aside className={`bg-gruv-bg border-r border-gruv-bg-soft flex flex-col h-full shrink-0 transition-all duration-200 ${collapsed ? 'w-16' : 'w-64'}`}>

            {/* App header — click icon to toggle */}
            <div className="p-3 border-b border-gruv-bg-soft">
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleSidebar}
                        className="bg-gruv-yellow/20 rounded-lg h-10 w-10 shrink-0 border border-gruv-yellow/50 flex items-center justify-center hover:bg-gruv-yellow/30 transition-colors"
                        title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
                    >
                        <span className="material-symbols-outlined text-gruv-yellow text-[22px]">movie_edit</span>
                    </button>
                    {!collapsed && (
                        <div className="flex flex-col overflow-hidden">
                            <h1 className="text-gruv-fg0 text-sm font-bold truncate">ScriptToSheet</h1>
                            <p className="text-gruv-gray text-[11px] truncate">Manager</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Project list */}
            <nav className="flex-1 overflow-y-auto py-3 px-1.5 flex flex-col gap-0.5">
                {isLoading ? (
                    <div className="px-3 text-sm text-gruv-gray animate-pulse">{collapsed ? '...' : 'Carregando...'}</div>
                ) : error ? (
                    <div className="px-3 text-sm text-gruv-red">{collapsed ? '!' : `Erro: ${error}`}</div>
                ) : projetos.length === 0 ? (
                    <div className="px-3 text-sm text-gruv-gray">{collapsed ? '—' : 'Nenhum projeto.'}</div>
                ) : (
                    projetos.map((p, idx) => {
                        const isActive = projetoAtual?.linha === p.linha;
                        const Icon = ICONS[idx % ICONS.length];
                        return (
                            <button
                                key={p.linha}
                                onClick={() => setProjetoAtual(p)}
                                title={collapsed ? p.nome : undefined}
                                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left w-full
                                    ${isActive
                                        ? 'bg-gruv-bg-soft text-gruv-fg0'
                                        : 'hover:bg-gruv-bg-soft/50 text-gruv-fg4 hover:text-gruv-fg2'
                                    } ${collapsed ? 'justify-center' : ''}`}
                            >
                                <Icon size={18} className={`shrink-0 ${isActive ? 'text-gruv-yellow' : ''}`} />
                                {!collapsed && <span className="text-sm font-medium truncate">{p.nome}</span>}
                            </button>
                        );
                    })
                )}

                {/* Favoritos placeholder */}
                {!collapsed && (
                    <div className="mt-4 pt-3 border-t border-gruv-bg-soft px-2.5 opacity-40" title="Em breve">
                        <p className="text-[10px] font-bold text-gruv-gray uppercase tracking-wider mb-1">Favoritos</p>
                        <p className="text-[11px] text-gruv-gray">Em breve</p>
                    </div>
                )}
            </nav>

            {/* Novo Projeto */}
            <div className="p-2.5 border-t border-gruv-bg-soft">
                <button
                    className={`flex items-center justify-center gap-2 rounded-lg bg-gruv-yellow text-gruv-bg font-bold py-2 text-sm hover:bg-gruv-yellow/90 transition-colors w-full ${collapsed ? 'px-0' : ''}`}
                    onClick={() => setIsModalOpen(true)}
                    title={collapsed ? 'Novo Projeto' : undefined}
                >
                    <Plus size={18} />
                    {!collapsed && <span>Novo Projeto</span>}
                </button>
            </div>

            <NovoProjetoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </aside>
    );
}
