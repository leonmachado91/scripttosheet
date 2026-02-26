import { useProjetoStore } from '../../stores/useProjetoStore';
import { Search, Bell, Settings, RefreshCcw, Grid } from 'lucide-react';

export function Header() {
    const projetoAtual = useProjetoStore(state => state.projetoAtual);
    const searchQuery = useProjetoStore(state => state.searchQuery);
    const setSearchQuery = useProjetoStore(state => state.setSearchQuery);

    return (
        <header className="flex items-center justify-between border-b border-gruv-bg-soft px-6 py-3 bg-gruv-bg-hard/95 backdrop-blur-sm sticky top-0 z-10 h-[60px] shrink-0">
            <div className="flex items-center gap-3">
                <Grid size={22} className="text-gruv-yellow shrink-0" />
                <h2 className="text-gruv-fg0 text-lg font-bold tracking-tight truncate">
                    {projetoAtual ? projetoAtual.nome : 'ScriptToSheet'}
                </h2>

                {projetoAtual && (
                    <div className="hidden md:flex items-center gap-2 ml-3 text-sm text-gruv-gray border-l border-gruv-bg-soft pl-3">
                        <span className="hover:text-gruv-fg2 transition-colors cursor-pointer">Projetos</span>
                        <span>/</span>
                        <span className="text-gruv-fg">{projetoAtual.nome}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                {/* Search — ativo */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gruv-gray">
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar cenas..."
                        className="bg-gruv-bg border border-gruv-bg-soft text-gruv-fg text-xs rounded-lg focus:ring-1 focus:ring-gruv-yellow focus:border-gruv-yellow block w-52 pl-9 pr-8 py-2 placeholder-gruv-gray transition-all"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <kbd className="inline-flex items-center border border-gruv-bg-soft rounded px-1 text-[10px] font-mono text-gruv-gray">⌘K</kbd>
                    </div>
                </div>

                <div className="flex items-center gap-1 border-l border-gruv-bg-soft pl-3">
                    <button className="p-1.5 text-gruv-gray hover:text-gruv-yellow hover:bg-gruv-bg rounded-lg transition-colors relative disabled:opacity-50" disabled title="Em breve">
                        <Bell size={18} />
                    </button>
                    <button className="p-1.5 text-gruv-gray hover:text-gruv-fg transition-colors hover:bg-gruv-bg rounded-lg disabled:opacity-50" disabled title="Em breve">
                        <Settings size={18} />
                    </button>
                    <button className="p-1.5 text-gruv-gray hover:text-gruv-fg transition-colors hover:bg-gruv-bg rounded-lg disabled:opacity-50" disabled title="Em breve">
                        <RefreshCcw size={18} />
                    </button>
                </div>
            </div>
        </header>
    );
}
